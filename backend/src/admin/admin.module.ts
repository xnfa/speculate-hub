import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { WalletsModule } from '../wallets/wallets.module';
import { MarketsModule } from '../markets/markets.module';
import { TradesModule } from '../trades/trades.module';

@Module({
  imports: [UsersModule, WalletsModule, MarketsModule, TradesModule],
  controllers: [AdminController],
})
export class AdminModule {}

