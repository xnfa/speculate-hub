import { Module } from '@nestjs/common';
import { TradesService } from './trades.service';
import { TradesController } from './trades.controller';
import { MarketsModule } from '../markets/markets.module';
import { WalletsModule } from '../wallets/wallets.module';
import { AMMModule } from '../amm/amm.module';
import { PositionsService } from './positions.service';

@Module({
  imports: [MarketsModule, WalletsModule, AMMModule],
  providers: [TradesService, PositionsService],
  controllers: [TradesController],
  exports: [TradesService, PositionsService],
})
export class TradesModule {}

