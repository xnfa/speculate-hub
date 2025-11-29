import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

export class QuoteDto {
  @ApiProperty({ enum: ['buy', 'sell'], description: '交易类型' })
  @IsEnum(['buy', 'sell'])
  type: 'buy' | 'sell';

  @ApiProperty({ enum: ['yes', 'no'], description: '交易方向' })
  @IsEnum(['yes', 'no'])
  side: 'yes' | 'no';

  @ApiPropertyOptional({ example: 100, description: '金额（买入时可选）' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({ example: 10, description: '份额' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  shares?: number;
}

