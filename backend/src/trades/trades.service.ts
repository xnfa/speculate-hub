import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { MarketsService } from "../markets/markets.service";
import { WalletsService } from "../wallets/wallets.service";
import { AMMService } from "../amm/amm.service";
import { PositionsService } from "./positions.service";
import { Database } from "../supabase/database.types";
import { ExecuteTradeDto } from "./dto/execute-trade.dto";

type Trade = Database["public"]["Tables"]["trades"]["Row"];

@Injectable()
export class TradesService {
  private readonly FEE_RATE = 0.02;

  constructor(
    private supabase: SupabaseService,
    private marketsService: MarketsService,
    private walletsService: WalletsService,
    private ammService: AMMService,
    private positionsService: PositionsService
  ) {}

  async executeTrade(userId: string, dto: ExecuteTradeDto) {
    // Get market
    const market = await this.marketsService.findById(dto.marketId);
    if (!market) {
      throw new NotFoundException("市场不存在");
    }

    if (market.status !== "active") {
      throw new BadRequestException("市场未开放交易");
    }

    const now = new Date();
    if (now < new Date(market.start_time) || now > new Date(market.end_time)) {
      throw new BadRequestException("不在交易时间内");
    }

    const state = {
      yesShares: market.yes_shares ?? 0,
      noShares: market.no_shares ?? 0,
    };

    if (dto.type === "buy") {
      return this.executeBuy(userId, market, state, dto);
    } else {
      return this.executeSell(userId, market, state, dto);
    }
  }

  private async executeBuy(
    userId: string,
    market: any,
    state: { yesShares: number; noShares: number },
    dto: ExecuteTradeDto
  ) {
    let shares: number;
    let cost: number;
    let avgPrice: number;

    const liquidityParam = this.ammService.getLiquidityForMarket(
      market.liquidity
    );

    if (dto.amount) {
      // 根据金额计算份额
      const result = this.ammService.calculateSharesForAmount(
        state,
        dto.side,
        dto.amount,
        liquidityParam
      );
      shares = result.shares;
      cost = dto.amount;
      avgPrice = result.avgPrice;
    } else if (dto.shares) {
      // 根据份额计算成本
      const result = this.ammService.calculateBuyCost(
        state,
        dto.side,
        dto.shares,
        liquidityParam
      );
      shares = dto.shares;
      cost = result.cost;
      avgPrice = result.avgPrice;
    } else {
      throw new BadRequestException("请指定金额或份额");
    }

    if (shares <= 0) {
      throw new BadRequestException("无效的交易");
    }

    // Check and deduct wallet balance
    await this.walletsService.deductForTrade(userId, cost, market.id);

    // Calculate new AMM state
    const buyResult = this.ammService.calculateBuyCost(
      state,
      dto.side,
      shares,
      liquidityParam
    );

    // Update market shares
    await this.marketsService.updateShares(
      market.id,
      buyResult.newYesShares,
      buyResult.newNoShares,
      cost
    );

    // Update user position
    await this.positionsService.createOrUpdate(
      userId,
      market.id,
      dto.side,
      shares,
      avgPrice,
      true
    );

    // Record trade
    const fee = (cost * this.FEE_RATE) / (1 + this.FEE_RATE);
    const trade = await this.recordTrade({
      user_id: userId,
      market_id: market.id,
      type: "buy",
      side: dto.side,
      shares,
      price: avgPrice,
      cost,
      fee,
      yes_shares_before: state.yesShares,
      no_shares_before: state.noShares,
      yes_shares_after: buyResult.newYesShares,
      no_shares_after: buyResult.newNoShares,
    });

    return {
      trade,
      shares,
      cost,
      avgPrice,
      fee,
    };
  }

  private async executeSell(
    userId: string,
    market: any,
    state: { yesShares: number; noShares: number },
    dto: ExecuteTradeDto
  ) {
    if (!dto.shares || dto.shares <= 0) {
      throw new BadRequestException("请指定卖出份额");
    }

    // Check user position
    const position = await this.positionsService.findByUserAndMarket(
      userId,
      market.id
    );

    if (!position) {
      throw new BadRequestException("没有持仓");
    }

    const currentShares =
      (dto.side === "yes" ? position.yes_shares : position.no_shares) ?? 0;

    if (currentShares < dto.shares) {
      throw new BadRequestException("持仓不足");
    }

    const liquidityParam = this.ammService.getLiquidityForMarket(
      market.liquidity
    );

    // Calculate sell return
    const sellResult = this.ammService.calculateSellReturn(
      state,
      dto.side,
      dto.shares,
      liquidityParam
    );

    // Add to wallet
    await this.walletsService.addFromTrade(
      userId,
      sellResult.amountReceived,
      market.id
    );

    // Update market shares
    await this.marketsService.updateShares(
      market.id,
      sellResult.newYesShares,
      sellResult.newNoShares,
      sellResult.amountReceived
    );

    // Update user position
    await this.positionsService.createOrUpdate(
      userId,
      market.id,
      dto.side,
      dto.shares,
      sellResult.avgPrice,
      false
    );

    // Record trade
    const grossAmount = sellResult.amountReceived / (1 - this.FEE_RATE);
    const fee = grossAmount - sellResult.amountReceived;

    const trade = await this.recordTrade({
      user_id: userId,
      market_id: market.id,
      type: "sell",
      side: dto.side,
      shares: dto.shares,
      price: sellResult.avgPrice,
      cost: sellResult.amountReceived,
      fee,
      yes_shares_before: state.yesShares,
      no_shares_before: state.noShares,
      yes_shares_after: sellResult.newYesShares,
      no_shares_after: sellResult.newNoShares,
    });

    return {
      trade,
      shares: dto.shares,
      amountReceived: sellResult.amountReceived,
      avgPrice: sellResult.avgPrice,
      fee,
    };
  }

  private async recordTrade(data: {
    user_id: string;
    market_id: string;
    type: "buy" | "sell";
    side: "yes" | "no";
    shares: number;
    price: number;
    cost: number;
    fee: number;
    yes_shares_before: number;
    no_shares_before: number;
    yes_shares_after: number;
    no_shares_after: number;
  }): Promise<Trade> {
    const { data: trade, error } = await this.supabase.client
      .from("trades")
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`记录交易失败: ${error.message}`);
    }

    return trade;
  }

  async findByUser(userId: string, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const { data, error, count } = await this.supabase.client
      .from("trades")
      .select(
        `
        *,
        markets:market_id (
          id,
          title,
          status
        )
      `,
        { count: "exact" }
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`获取交易记录失败: ${error.message}`);
    }

    return {
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async findByMarket(marketId: string, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const { data, error, count } = await this.supabase.client
      .from("trades")
      .select(
        `
        *,
        users:user_id (
          id,
          username
        )
      `,
        { count: "exact" }
      )
      .eq("market_id", marketId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`获取市场交易记录失败: ${error.message}`);
    }

    return {
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async findAll(page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const { data, error, count } = await this.supabase.client
      .from("trades")
      .select(
        `
        *,
        users:user_id (
          id,
          username,
          email
        ),
        markets:market_id (
          id,
          title
        )
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`获取交易记录失败: ${error.message}`);
    }

    return {
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async getStats() {
    const { count: totalTrades } = await this.supabase.client
      .from("trades")
      .select("*", { count: "exact", head: true });

    const { data: volumeData } = await this.supabase.client
      .from("trades")
      .select("cost, fee");

    const totalVolume = volumeData?.reduce((sum, t) => sum + t.cost, 0) || 0;
    const totalFees = volumeData?.reduce((sum, t) => sum + t.fee, 0) || 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: tradesToday } = await this.supabase.client
      .from("trades")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString());

    return {
      totalTrades: totalTrades || 0,
      tradesToday: tradesToday || 0,
      totalVolume,
      totalFees,
    };
  }

  async settleMarket(marketId: string) {
    const market = await this.marketsService.findById(marketId);
    if (!market) {
      throw new NotFoundException("市场不存在");
    }

    if (market.status !== "resolved" || !market.outcome) {
      throw new BadRequestException("市场尚未结算");
    }

    // Get all positions for this market
    const positions = await this.positionsService.findByMarket(marketId);

    // Settle each position
    for (const position of positions || []) {
      const winningShares =
        (market.outcome === "yes" ? position.yes_shares : position.no_shares) ??
        0;

      if (winningShares > 0) {
        // Each winning share is worth 1
        await this.walletsService.settlePosition(
          position.user_id,
          winningShares,
          marketId
        );
      }
    }

    return { settledPositions: positions?.length || 0 };
  }

  /**
   * 获取手续费收入分析
   * 统计总手续费、今日/本周/本月手续费收入
   */
  async getFeeAnalytics() {
    const { data: allTrades } = await this.supabase.client
      .from("trades")
      .select("fee, created_at");

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalFees = 0;
    let todayFees = 0;
    let weekFees = 0;
    let monthFees = 0;

    for (const trade of allTrades || []) {
      const fee = trade.fee || 0;
      if (!trade.created_at) continue;
      const createdAt = new Date(trade.created_at);

      totalFees += fee;

      if (createdAt >= todayStart) {
        todayFees += fee;
      }
      if (createdAt >= weekStart) {
        weekFees += fee;
      }
      if (createdAt >= monthStart) {
        monthFees += fee;
      }
    }

    return {
      totalFees,
      todayFees,
      weekFees,
      monthFees,
    };
  }

  /**
   * 获取做市商盈亏分析
   * AMM盈亏 = 用户买入总成本 - 用户卖出总收入 - 市场结算支付
   */
  async getAMMProfitLoss() {
    // 获取所有交易数据
    const { data: trades } = await this.supabase.client
      .from("trades")
      .select("market_id, type, cost, fee");

    // 获取所有已结算的市场
    const { data: resolvedMarkets } = await this.supabase.client
      .from("markets")
      .select("id, title, outcome, status")
      .eq("status", "resolved");

    // 获取所有持仓（用于计算结算支付）
    const { data: allPositions } = await this.supabase.client
      .from("positions")
      .select("market_id, yes_shares, no_shares");

    // 按市场分组计算
    const marketPnL: Record<
      string,
      {
        marketId: string;
        title: string;
        buyVolume: number;
        sellVolume: number;
        settlementPayout: number;
        pnl: number;
      }
    > = {};

    // 计算每个市场的买入/卖出金额
    for (const trade of trades || []) {
      if (!marketPnL[trade.market_id]) {
        marketPnL[trade.market_id] = {
          marketId: trade.market_id,
          title: "",
          buyVolume: 0,
          sellVolume: 0,
          settlementPayout: 0,
          pnl: 0,
        };
      }

      // cost 字段对于买入是用户支付的金额，对于卖出是用户收到的金额
      // 手续费已经包含在 cost 中
      if (trade.type === "buy") {
        // 用户买入，AMM 收到资金（扣除手续费后的净额）
        marketPnL[trade.market_id].buyVolume += trade.cost - trade.fee;
      } else {
        // 用户卖出，AMM 支付资金
        marketPnL[trade.market_id].sellVolume += trade.cost;
      }
    }

    // 计算已结算市场的结算支付
    for (const market of resolvedMarkets || []) {
      if (marketPnL[market.id]) {
        marketPnL[market.id].title = market.title;

        // 计算该市场的结算支付
        const marketPositions = (allPositions || []).filter(
          (p) => p.market_id === market.id
        );

        let settlementPayout = 0;
        for (const position of marketPositions) {
          const winningShares =
            market.outcome === "yes" ? position.yes_shares : position.no_shares;
          settlementPayout += winningShares || 0;
        }

        marketPnL[market.id].settlementPayout = settlementPayout;
      }
    }

    // 计算每个市场的盈亏
    const marketDetails: Array<{
      marketId: string;
      title: string;
      buyVolume: number;
      sellVolume: number;
      settlementPayout: number;
      pnl: number;
      status: string;
    }> = [];

    let totalAMMPnL = 0;
    let resolvedAMMPnL = 0;

    for (const marketId of Object.keys(marketPnL)) {
      const data = marketPnL[marketId];
      const market = (resolvedMarkets || []).find((m) => m.id === marketId);
      const isResolved = market?.status === "resolved";

      // AMM 盈亏 = 买入收入 - 卖出支出 - 结算支付
      data.pnl = data.buyVolume - data.sellVolume - data.settlementPayout;

      if (isResolved) {
        resolvedAMMPnL += data.pnl;
        marketDetails.push({
          ...data,
          status: "resolved",
        });
      }

      totalAMMPnL += data.buyVolume - data.sellVolume;
    }

    // 按盈亏排序
    marketDetails.sort((a, b) => b.pnl - a.pnl);

    return {
      totalAMMPnL, // 总 AMM 资金流（未计算未结算市场的结算）
      resolvedAMMPnL, // 已结算市场的 AMM 盈亏
      marketDetails: marketDetails.slice(0, 20), // 返回前 20 个市场明细
    };
  }

  /**
   * 获取未结算市场的风险敞口
   * 风险敞口 = 未结算市场中所有用户持仓的潜在最大支付金额
   */
  async getUnsettledExposure() {
    // 获取所有活跃/未结算的市场
    const { data: activeMarkets } = await this.supabase.client
      .from("markets")
      .select("id, title, status")
      .in("status", ["active", "suspended", "draft"]);

    // 获取这些市场的持仓
    const { data: allPositions } = await this.supabase.client
      .from("positions")
      .select("market_id, yes_shares, no_shares");

    const marketExposures: Array<{
      marketId: string;
      title: string;
      status: string;
      totalYesShares: number;
      totalNoShares: number;
      maxExposure: number;
    }> = [];

    let totalMaxExposure = 0;

    for (const market of activeMarkets || []) {
      const positions = (allPositions || []).filter(
        (p) => p.market_id === market.id
      );

      let totalYesShares = 0;
      let totalNoShares = 0;

      for (const position of positions) {
        totalYesShares += position.yes_shares || 0;
        totalNoShares += position.no_shares || 0;
      }

      // 最大风险敞口 = max(YES赢的支付, NO赢的支付)
      // 每份获胜份额价值 1 元
      const maxExposure = Math.max(totalYesShares, totalNoShares);
      totalMaxExposure += maxExposure;

      if (maxExposure > 0) {
        marketExposures.push({
          marketId: market.id,
          title: market.title,
          status: market.status || "unknown",
          totalYesShares,
          totalNoShares,
          maxExposure,
        });
      }
    }

    // 按风险敞口排序
    marketExposures.sort((a, b) => b.maxExposure - a.maxExposure);

    return {
      totalMaxExposure,
      marketCount: marketExposures.length,
      marketExposures: marketExposures.slice(0, 10), // 返回前 10 个高风险市场
    };
  }

  /**
   * 获取用户手续费贡献排行
   */
  async getTopContributors(limit: number = 10) {
    const { data: trades } = await this.supabase.client
      .from("trades")
      .select("user_id, fee, cost");

    // 按用户聚合
    const userStats: Record<
      string,
      {
        userId: string;
        totalFees: number;
        totalVolume: number;
        tradeCount: number;
      }
    > = {};

    for (const trade of trades || []) {
      if (!userStats[trade.user_id]) {
        userStats[trade.user_id] = {
          userId: trade.user_id,
          totalFees: 0,
          totalVolume: 0,
          tradeCount: 0,
        };
      }

      userStats[trade.user_id].totalFees += trade.fee || 0;
      userStats[trade.user_id].totalVolume += trade.cost || 0;
      userStats[trade.user_id].tradeCount += 1;
    }

    // 转为数组并排序
    const sortedUsers = Object.values(userStats).sort(
      (a, b) => b.totalFees - a.totalFees
    );

    const topUsers = sortedUsers.slice(0, limit);

    // 获取用户详情
    if (topUsers.length > 0) {
      const userIds = topUsers.map((u) => u.userId);
      const { data: users } = await this.supabase.client
        .from("users")
        .select("id, username, email")
        .in("id", userIds);

      const userMap = new Map((users || []).map((u) => [u.id, u]));

      return topUsers.map((stat) => ({
        ...stat,
        user: userMap.get(stat.userId) || null,
      }));
    }

    return [];
  }

  /**
   * 获取综合盈利分析概览
   */
  async getProfitAnalyticsOverview() {
    const [feeAnalytics, ammPnL, exposure] = await Promise.all([
      this.getFeeAnalytics(),
      this.getAMMProfitLoss(),
      this.getUnsettledExposure(),
    ]);

    // 平台综合利润 = 手续费收入 + 已结算市场的做市商盈亏
    const totalProfit = feeAnalytics.totalFees + ammPnL.resolvedAMMPnL;

    return {
      fees: feeAnalytics,
      amm: {
        totalPnL: ammPnL.totalAMMPnL,
        resolvedPnL: ammPnL.resolvedAMMPnL,
      },
      exposure: {
        totalMaxExposure: exposure.totalMaxExposure,
        marketCount: exposure.marketCount,
      },
      totalProfit,
    };
  }
}
