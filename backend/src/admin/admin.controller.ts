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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import {
  CurrentUser,
  CurrentUserData,
} from '../auth/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { WalletsService } from '../wallets/wallets.service';
import { MarketsService } from '../markets/markets.service';
import { TradesService } from '../trades/trades.service';
import { CreateMarketDto } from '../markets/dto/create-market.dto';
import { UpdateMarketDto } from '../markets/dto/update-market.dto';

@ApiTags('管理后台')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private usersService: UsersService,
    private walletsService: WalletsService,
    private marketsService: MarketsService,
    private tradesService: TradesService,
  ) {}

  // Dashboard stats
  @Get('stats')
  @ApiOperation({ summary: '获取仪表盘统计' })
  async getDashboardStats() {
    const [userStats, walletStats, marketStats, tradeStats] = await Promise.all(
      [
        this.usersService.getStats(),
        this.walletsService.getStats(),
        this.marketsService.getStats(),
        this.tradesService.getStats(),
      ],
    );

    return {
      users: userStats,
      wallets: walletStats,
      markets: marketStats,
      trades: tradeStats,
    };
  }

  // Users management
  @Get('users')
  @ApiOperation({ summary: '获取用户列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.usersService.findAll(page, limit);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: '更新用户状态' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.usersService.updateStatus(id, isActive);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: '更新用户角色' })
  async updateUserRole(
    @Param('id') id: string,
    @Body('role') role: 'user' | 'admin',
  ) {
    return this.usersService.updateRole(id, role);
  }

  // Wallets management
  @Get('wallets')
  @ApiOperation({ summary: '获取钱包列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getWallets(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.walletsService.findAll(page, limit);
  }

  @Post('wallets/:userId/deposit')
  @ApiOperation({ summary: '管理员充值' })
  async adminDeposit(
    @Param('userId') userId: string,
    @Body('amount') amount: number,
  ) {
    return this.walletsService.deposit(userId, amount);
  }

  // Markets management
  @Get('markets')
  @ApiOperation({ summary: '获取市场列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  async getMarkets(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.marketsService.findAll(page, limit, status);
  }

  @Post('markets')
  @ApiOperation({ summary: '创建市场' })
  async createMarket(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateMarketDto,
  ) {
    return this.marketsService.create(dto, user.id);
  }

  @Patch('markets/:id')
  @ApiOperation({ summary: '更新市场' })
  async updateMarket(@Param('id') id: string, @Body() dto: UpdateMarketDto) {
    return this.marketsService.update(id, dto);
  }

  @Patch('markets/:id/status')
  @ApiOperation({ summary: '更新市场状态' })
  async updateMarketStatus(
    @Param('id') id: string,
    @Body('status') status: 'draft' | 'active' | 'suspended' | 'resolved' | 'cancelled',
  ) {
    return this.marketsService.updateStatus(id, status);
  }

  @Post('markets/:id/resolve')
  @ApiOperation({ summary: '结算市场' })
  async resolveMarket(
    @Param('id') id: string,
    @Body('outcome') outcome: 'yes' | 'no',
  ) {
    // First resolve the market
    const market = await this.marketsService.resolveMarket(id, outcome);

    // Then settle all positions
    const settlement = await this.tradesService.settleMarket(id);

    return {
      market,
      settlement,
    };
  }

  // Trades management
  @Get('trades')
  @ApiOperation({ summary: '获取交易列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTrades(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.tradesService.findAll(page, limit);
  }

  @Get('trades/market/:marketId')
  @ApiOperation({ summary: '获取市场交易记录' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMarketTrades(
    @Param('marketId') marketId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.tradesService.findByMarket(marketId, page, limit);
  }

  // Analytics - 盈利分析
  @Get('analytics/overview')
  @ApiOperation({ summary: '获取盈利分析概览' })
  async getAnalyticsOverview() {
    return this.tradesService.getProfitAnalyticsOverview();
  }

  @Get('analytics/markets')
  @ApiOperation({ summary: '获取已结算市场盈亏明细' })
  async getMarketsPnL() {
    return this.tradesService.getAMMProfitLoss();
  }

  @Get('analytics/exposure')
  @ApiOperation({ summary: '获取未结算市场风险敞口' })
  async getExposure() {
    return this.tradesService.getUnsettledExposure();
  }

  @Get('analytics/top-contributors')
  @ApiOperation({ summary: '获取用户手续费贡献排行' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTopContributors(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.tradesService.getTopContributors(limit);
  }
}

