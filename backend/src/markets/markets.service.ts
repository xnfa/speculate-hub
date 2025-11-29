import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { AMMService } from "../amm/amm.service";
import { Database } from "../supabase/database.types";
import { CreateMarketDto } from "./dto/create-market.dto";
import { UpdateMarketDto } from "./dto/update-market.dto";

type Market = Database["public"]["Tables"]["markets"]["Row"];

@Injectable()
export class MarketsService {
  constructor(
    private supabase: SupabaseService,
    private ammService: AMMService
  ) {}

  async create(dto: CreateMarketDto, createdBy: string): Promise<Market> {
    // Initialize AMM with default liquidity
    const initialLiquidity = dto.liquidity || 1000;
    const ammState = this.ammService.initializeLiquidity(initialLiquidity);

    const { data, error } = await this.supabase.client
      .from("markets")
      .insert({
        title: dto.title,
        description: dto.description,
        category: dto.category,
        image_url: dto.imageUrl,
        resolution_source: dto.resolutionSource,
        status: "draft",
        yes_shares: ammState.yesShares,
        no_shares: ammState.noShares,
        liquidity: initialLiquidity,
        volume: 0,
        start_time: dto.startTime,
        end_time: dto.endTime,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`创建市场失败: ${error.message}`);
    }

    return data;
  }

  async findById(id: string): Promise<Market | null> {
    const { data, error } = await this.supabase.client
      .from("markets")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
    status?: string,
    category?: string
  ) {
    const offset = (page - 1) * limit;

    let query = this.supabase.client
      .from("markets")
      .select("*", { count: "exact" });

    if (status) {
      query = query.eq("status", status);
    }

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`获取市场列表失败: ${error.message}`);
    }

    // 计算价格
    const marketsWithPrices = data?.map((market) => {
      const liquidityParam = this.ammService.getLiquidityForMarket(
        market.liquidity
      );
      const prices = this.ammService.getCurrentPrices(
        {
          yesShares: market.yes_shares,
          noShares: market.no_shares,
        },
        liquidityParam
      );
      return {
        ...market,
        yes_price: prices.yesPrice,
        no_price: prices.noPrice,
      };
    });

    return {
      data: marketsWithPrices,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async getActiveMarkets(page: number = 1, limit: number = 20) {
    return this.findAll(page, limit, "active");
  }

  async getMarketWithPrices(id: string) {
    const market = await this.findById(id);
    if (!market) {
      throw new NotFoundException("市场不存在");
    }

    const liquidityParam = this.ammService.getLiquidityForMarket(
      market.liquidity
    );
    const prices = this.ammService.getCurrentPrices(
      {
        yesShares: market.yes_shares,
        noShares: market.no_shares,
      },
      liquidityParam
    );

    return {
      ...market,
      yes_price: prices.yesPrice,
      no_price: prices.noPrice,
      current_liquidity: liquidityParam,
    };
  }

  async update(id: string, dto: UpdateMarketDto): Promise<Market> {
    const market = await this.findById(id);
    if (!market) {
      throw new NotFoundException("市场不存在");
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (dto.title) updateData.title = dto.title;
    if (dto.description) updateData.description = dto.description;
    if (dto.category) updateData.category = dto.category;
    if (dto.imageUrl !== undefined) updateData.image_url = dto.imageUrl;
    if (dto.resolutionSource !== undefined)
      updateData.resolution_source = dto.resolutionSource;
    if (dto.startTime) updateData.start_time = dto.startTime;
    if (dto.endTime) updateData.end_time = dto.endTime;

    const { data, error } = await this.supabase.client
      .from("markets")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`更新市场失败: ${error.message}`);
    }

    return data;
  }

  async updateStatus(
    id: string,
    status: "draft" | "active" | "suspended" | "resolved" | "cancelled"
  ): Promise<Market> {
    const market = await this.findById(id);
    if (!market) {
      throw new NotFoundException("市场不存在");
    }

    // 状态转换验证
    const validTransitions: Record<string, string[]> = {
      draft: ["active", "cancelled"],
      active: ["suspended", "resolved", "cancelled"],
      suspended: ["active", "resolved", "cancelled"],
      resolved: [],
      cancelled: [],
    };

    if (!validTransitions[market.status]?.includes(status)) {
      throw new BadRequestException(
        `无法从 ${market.status} 状态转换到 ${status} 状态`
      );
    }

    const { data, error } = await this.supabase.client
      .from("markets")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`更新市场状态失败: ${error.message}`);
    }

    return data;
  }

  async resolveMarket(id: string, outcome: "yes" | "no"): Promise<Market> {
    const market = await this.findById(id);
    if (!market) {
      throw new NotFoundException("市场不存在");
    }

    if (market.status !== "active" && market.status !== "suspended") {
      throw new BadRequestException("只能结算进行中或已暂停的市场");
    }

    const { data, error } = await this.supabase.client
      .from("markets")
      .update({
        status: "resolved",
        outcome,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`结算市场失败: ${error.message}`);
    }

    return data;
  }

  async updateShares(
    id: string,
    yesShares: number,
    noShares: number,
    volumeIncrease: number
  ): Promise<Market> {
    const market = await this.findById(id);
    if (!market) {
      throw new NotFoundException("市场不存在");
    }

    const { data, error } = await this.supabase.client
      .from("markets")
      .update({
        yes_shares: yesShares,
        no_shares: noShares,
        volume: market.volume + volumeIncrease,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`更新市场份额失败: ${error.message}`);
    }

    return data;
  }

  async getCategories(): Promise<string[]> {
    const { data, error } = await this.supabase.client
      .from("markets")
      .select("category")
      .order("category");

    if (error) {
      throw new Error(`获取分类失败: ${error.message}`);
    }

    // 去重
    const categories = [...new Set(data?.map((m) => m.category))];
    return categories;
  }

  async getStats() {
    const { count: totalMarkets } = await this.supabase.client
      .from("markets")
      .select("*", { count: "exact", head: true });

    const { count: activeMarkets } = await this.supabase.client
      .from("markets")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    const { data: volumeData } = await this.supabase.client
      .from("markets")
      .select("volume");

    const totalVolume = volumeData?.reduce((sum, m) => sum + m.volume, 0) || 0;

    return {
      totalMarkets: totalMarkets || 0,
      activeMarkets: activeMarkets || 0,
      totalVolume,
    };
  }
}
