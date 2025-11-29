import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { MarketsService } from '../markets/markets.service';
import { WalletsService } from '../wallets/wallets.service';
import { AMMService } from '../amm/amm.service';
import { PositionsService } from './positions.service';
import { Database } from '../supabase/database.types';
import { ExecuteTradeDto } from './dto/execute-trade.dto';

type Trade = Database['public']['Tables']['trades']['Row'];

@Injectable()
export class TradesService {
  private readonly FEE_RATE = 0.02;

  constructor(
    private supabase: SupabaseService,
    private marketsService: MarketsService,
    private walletsService: WalletsService,
    private ammService: AMMService,
    private positionsService: PositionsService,
  ) {}

  async executeTrade(userId: string, dto: ExecuteTradeDto) {
    // Get market
    const market = await this.marketsService.findById(dto.marketId);
    if (!market) {
      throw new NotFoundException('市场不存在');
    }

    if (market.status !== 'active') {
      throw new BadRequestException('市场未开放交易');
    }

    const now = new Date();
    if (now < new Date(market.start_time) || now > new Date(market.end_time)) {
      throw new BadRequestException('不在交易时间内');
    }

    const state = {
      yesShares: market.yes_shares,
      noShares: market.no_shares,
    };

    if (dto.type === 'buy') {
      return this.executeBuy(userId, market, state, dto);
    } else {
      return this.executeSell(userId, market, state, dto);
    }
  }

  private async executeBuy(
    userId: string,
    market: any,
    state: { yesShares: number; noShares: number },
    dto: ExecuteTradeDto,
  ) {
    let shares: number;
    let cost: number;
    let avgPrice: number;

    const liquidityParam = this.ammService.getLiquidityForMarket(market.liquidity);

    if (dto.amount) {
      // 根据金额计算份额
      const result = this.ammService.calculateSharesForAmount(
        state,
        dto.side,
        dto.amount,
        liquidityParam,
      );
      shares = result.shares;
      cost = dto.amount;
      avgPrice = result.avgPrice;
    } else if (dto.shares) {
      // 根据份额计算成本
      const result = this.ammService.calculateBuyCost(state, dto.side, dto.shares, liquidityParam);
      shares = dto.shares;
      cost = result.cost;
      avgPrice = result.avgPrice;
    } else {
      throw new BadRequestException('请指定金额或份额');
    }

    if (shares <= 0) {
      throw new BadRequestException('无效的交易');
    }

    // Check and deduct wallet balance
    await this.walletsService.deductForTrade(userId, cost, market.id);

    // Calculate new AMM state
    const buyResult = this.ammService.calculateBuyCost(state, dto.side, shares, liquidityParam);

    // Update market shares
    await this.marketsService.updateShares(
      market.id,
      buyResult.newYesShares,
      buyResult.newNoShares,
      cost,
    );

    // Update user position
    await this.positionsService.createOrUpdate(
      userId,
      market.id,
      dto.side,
      shares,
      avgPrice,
      true,
    );

    // Record trade
    const fee = cost * this.FEE_RATE / (1 + this.FEE_RATE);
    const trade = await this.recordTrade({
      user_id: userId,
      market_id: market.id,
      type: 'buy',
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
    dto: ExecuteTradeDto,
  ) {
    if (!dto.shares || dto.shares <= 0) {
      throw new BadRequestException('请指定卖出份额');
    }

    // Check user position
    const position = await this.positionsService.findByUserAndMarket(
      userId,
      market.id,
    );

    if (!position) {
      throw new BadRequestException('没有持仓');
    }

    const currentShares =
      dto.side === 'yes' ? position.yes_shares : position.no_shares;

    if (currentShares < dto.shares) {
      throw new BadRequestException('持仓不足');
    }

    const liquidityParam = this.ammService.getLiquidityForMarket(market.liquidity);

    // Calculate sell return
    const sellResult = this.ammService.calculateSellReturn(
      state,
      dto.side,
      dto.shares,
      liquidityParam,
    );

    // Add to wallet
    await this.walletsService.addFromTrade(
      userId,
      sellResult.amountReceived,
      market.id,
    );

    // Update market shares
    await this.marketsService.updateShares(
      market.id,
      sellResult.newYesShares,
      sellResult.newNoShares,
      sellResult.amountReceived,
    );

    // Update user position
    await this.positionsService.createOrUpdate(
      userId,
      market.id,
      dto.side,
      dto.shares,
      sellResult.avgPrice,
      false,
    );

    // Record trade
    const grossAmount = sellResult.amountReceived / (1 - this.FEE_RATE);
    const fee = grossAmount - sellResult.amountReceived;

    const trade = await this.recordTrade({
      user_id: userId,
      market_id: market.id,
      type: 'sell',
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
    type: 'buy' | 'sell';
    side: 'yes' | 'no';
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
      .from('trades')
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
      .from('trades')
      .select(
        `
        *,
        markets:market_id (
          id,
          title,
          status
        )
      `,
        { count: 'exact' },
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
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
      .from('trades')
      .select(
        `
        *,
        users:user_id (
          id,
          username
        )
      `,
        { count: 'exact' },
      )
      .eq('market_id', marketId)
      .order('created_at', { ascending: false })
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
      .from('trades')
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
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
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
      .from('trades')
      .select('*', { count: 'exact', head: true });

    const { data: volumeData } = await this.supabase.client
      .from('trades')
      .select('cost, fee');

    const totalVolume = volumeData?.reduce((sum, t) => sum + t.cost, 0) || 0;
    const totalFees = volumeData?.reduce((sum, t) => sum + t.fee, 0) || 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: tradesToday } = await this.supabase.client
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

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
      throw new NotFoundException('市场不存在');
    }

    if (market.status !== 'resolved' || !market.outcome) {
      throw new BadRequestException('市场尚未结算');
    }

    // Get all positions for this market
    const positions = await this.positionsService.findByMarket(marketId);

    // Settle each position
    for (const position of positions || []) {
      const winningShares =
        market.outcome === 'yes' ? position.yes_shares : position.no_shares;

      if (winningShares > 0) {
        // Each winning share is worth 1
        await this.walletsService.settlePosition(
          position.user_id,
          winningShares,
          marketId,
        );
      }
    }

    return { settledPositions: positions?.length || 0 };
  }
}

