import {
  IsOptional,
  IsInt,
  Min,
  IsString,
  IsNumber,
  IsBoolean,
  IsIn,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetPropertiesQuery {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxPrice?: number;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  minBedrooms?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minAreaSqm?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxAreaSqm?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isAvailable?: boolean;

  @IsOptional()
  @IsUUID('7')
  cursor?: string;

  @IsOptional()
  @IsIn(['AND', 'OR'])
  operator?: 'AND' | 'OR' = 'AND';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit: number = 10;
}
