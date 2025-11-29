import { Module, Global } from '@nestjs/common';
import { AMMService } from './amm.service';

@Global()
@Module({
  providers: [AMMService],
  exports: [AMMService],
})
export class AMMModule {}

