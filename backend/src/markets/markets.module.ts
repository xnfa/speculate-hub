import { Module } from '@nestjs/common';
import { MarketsService } from './markets.service';
import { MarketsController } from './markets.controller';
import { AMMModule } from '../amm/amm.module';

@Module({
  imports: [AMMModule],
  providers: [MarketsService],
  controllers: [MarketsController],
  exports: [MarketsService],
})
export class MarketsModule {}

