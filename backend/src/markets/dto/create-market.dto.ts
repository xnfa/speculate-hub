import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateMarketDto {
  @ApiProperty({ example: 'BTC 将在 2024 年底突破 10 万美元', description: '市场标题' })
  @IsString()
  @MaxLength(200, { message: '标题最多200个字符' })
  title: string;

  @ApiProperty({ example: '预测 BTC 价格走势...', description: '市场描述' })
  @IsString()
  @MaxLength(2000, { message: '描述最多2000个字符' })
  description: string;

  @ApiProperty({ example: '加密货币', description: '分类' })
  @IsString()
  @MaxLength(50, { message: '分类最多50个字符' })
  category: string;

  @ApiPropertyOptional({ description: '封面图片URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: '结果来源说明' })
  @IsOptional()
  @IsString()
  resolutionSource?: string;

  @ApiPropertyOptional({ example: 1000, description: '初始流动性' })
  @IsOptional()
  @IsNumber()
  @Min(100, { message: '初始流动性至少为100' })
  liquidity?: number;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', description: '开始时间' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2024-12-31T23:59:59Z', description: '结束时间' })
  @IsDateString()
  endTime: string;
}

