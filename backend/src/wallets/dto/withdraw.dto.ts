import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class WithdrawDto {
  @ApiProperty({ example: 100, description: '提现金额' })
  @IsNumber()
  @Min(1, { message: '提现金额至少为1' })
  amount: number;
}

