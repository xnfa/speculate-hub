import {
  Controller,
  Get,
  Post,
  Body,
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
import { TradesService } from './trades.service';
import { PositionsService } from './positions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserData,
} from '../auth/decorators/current-user.decorator';
import { ExecuteTradeDto } from './dto/execute-trade.dto';

@ApiTags('交易')
@Controller('trades')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TradesController {
  constructor(
    private tradesService: TradesService,
    private positionsService: PositionsService,
  ) {}

  @Post()
  @ApiOperation({ summary: '执行交易' })
  async executeTrade(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: ExecuteTradeDto,
  ) {
    return this.tradesService.executeTrade(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: '获取我的交易记录' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMyTrades(
    @CurrentUser() user: CurrentUserData,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.tradesService.findByUser(user.id, page, limit);
  }

  @Get('positions')
  @ApiOperation({ summary: '获取我的持仓' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMyPositions(
    @CurrentUser() user: CurrentUserData,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.positionsService.findByUser(user.id, page, limit);
  }
}

