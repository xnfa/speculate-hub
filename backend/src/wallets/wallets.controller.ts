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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserData,
} from '../auth/decorators/current-user.decorator';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';

@ApiTags('钱包')
@Controller('wallets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletsController {
  constructor(private walletsService: WalletsService) {}

  @Get()
  @ApiOperation({ summary: '获取当前用户钱包' })
  async getWallet(@CurrentUser() user: CurrentUserData) {
    return this.walletsService.findByUserId(user.id);
  }

  @Post('deposit')
  @ApiOperation({ summary: '充值' })
  async deposit(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: DepositDto,
  ) {
    return this.walletsService.deposit(user.id, dto.amount);
  }

  @Post('withdraw')
  @ApiOperation({ summary: '提现' })
  async withdraw(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: WithdrawDto,
  ) {
    return this.walletsService.withdraw(user.id, dto.amount);
  }

  @Get('transactions')
  @ApiOperation({ summary: '获取交易记录' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTransactions(
    @CurrentUser() user: CurrentUserData,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.walletsService.getTransactions(user.id, page, limit);
  }
}

