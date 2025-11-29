import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';

export class UpdateMarketDto {
  @ApiPropertyOptional({ description: '市场标题' })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '标题最多200个字符' })
  title?: string;

  @ApiPropertyOptional({ description: '市场描述' })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: '描述最多2000个字符' })
  description?: string;

  @ApiPropertyOptional({ description: '分类' })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '分类最多50个字符' })
  category?: string;

  @ApiPropertyOptional({ description: '封面图片URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: '结果来源说明' })
  @IsOptional()
  @IsString()
  resolutionSource?: string;

  @ApiPropertyOptional({ description: '开始时间' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ description: '结束时间' })
  @IsOptional()
  @IsDateString()
  endTime?: string;
}

