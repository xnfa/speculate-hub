import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { MarketsService } from "./markets.service";
import { AMMService } from "../amm/amm.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { QuoteDto } from "./dto/quote.dto";

@ApiTags("市场")
@Controller("markets")
export class MarketsController {
  constructor(
    private marketsService: MarketsService,
    private ammService: AMMService
  ) {}

  @Get()
  @ApiOperation({ summary: "获取市场列表" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "category", required: false, type: String })
  async findAll(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("status") status?: string,
    @Query("category") category?: string
  ) {
    return this.marketsService.findAll(page, limit, status, category);
  }

  @Get("active")
  @ApiOperation({ summary: "获取活跃市场列表" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getActiveMarkets(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number
  ) {
    return this.marketsService.getActiveMarkets(page, limit);
  }

  @Get("categories")
  @ApiOperation({ summary: "获取市场分类" })
  async getCategories() {
    return this.marketsService.getCategories();
  }

  @Get(":id")
  @ApiOperation({ summary: "获取市场详情" })
  async findOne(@Param("id") id: string) {
    return this.marketsService.getMarketWithPrices(id);
  }

  @Post(":id/quote")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取交易报价" })
  async getQuote(@Param("id") id: string, @Body() dto: QuoteDto) {
    const market = await this.marketsService.findById(id);
    if (!market) {
      throw new Error("市场不存在");
    }

    const state = {
      yesShares: market.yes_shares ?? 0,
      noShares: market.no_shares ?? 0,
    };

    const liquidityParam = this.ammService.getLiquidityForMarket(
      market.liquidity ?? 1000
    );

    if (dto.type === "buy") {
      if (dto.amount) {
        // 根据金额计算份额
        const result = this.ammService.calculateSharesForAmount(
          state,
          dto.side,
          dto.amount,
          liquidityParam
        );
        return {
          type: "buy",
          side: dto.side,
          amount: dto.amount,
          shares: result.shares,
          avgPrice: result.avgPrice,
        };
      } else if (dto.shares) {
        // 根据份额计算成本
        const result = this.ammService.calculateBuyCost(
          state,
          dto.side,
          dto.shares,
          liquidityParam
        );
        return {
          type: "buy",
          side: dto.side,
          shares: dto.shares,
          cost: result.cost,
          avgPrice: result.avgPrice,
          priceImpact: result.priceImpact,
        };
      }
    } else {
      if (dto.shares) {
        const result = this.ammService.calculateSellReturn(
          state,
          dto.side,
          dto.shares,
          liquidityParam
        );
        return {
          type: "sell",
          side: dto.side,
          shares: dto.shares,
          amountReceived: result.amountReceived,
          avgPrice: result.avgPrice,
          priceImpact: result.priceImpact,
        };
      }
    }

    throw new Error("请提供有效的交易参数");
  }
}
