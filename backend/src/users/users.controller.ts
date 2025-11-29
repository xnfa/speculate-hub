import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { WalletsService } from '../wallets/wallets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserData,
} from '../auth/decorators/current-user.decorator';

@ApiTags('用户')
@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private walletsService: WalletsService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  async getCurrentUser(@CurrentUser() user: CurrentUserData) {
    const wallet = await this.walletsService.findByUserId(user.id);
    return {
      ...user,
      wallet: wallet
        ? {
            balance: wallet.balance,
            frozen_balance: wallet.frozen_balance,
          }
        : null,
    };
  }
}

