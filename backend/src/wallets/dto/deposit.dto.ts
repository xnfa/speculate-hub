import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class DepositDto {
  @ApiProperty({ example: 100, description: '充值金额' })
  @IsNumber()
  @Min(1, { message: '充值金额至少为1' })
  amount: number;
}

