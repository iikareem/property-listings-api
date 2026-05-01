import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Property } from './entities/property.entity';
import { GetPropertiesQuery } from './dtos/get-properties.dto';
import { PropertiesPaginatedResponse } from './dtos/responses.dto';
import { applyFilters } from './filters.utils';
import {
  RedisService,
  type PropertyListCacheParams,
} from '../cache/redis.service';

@Injectable()
export class PropertyService {
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
    private readonly redisService: RedisService,
  ) {}

  async findAll(
    query: GetPropertiesQuery,
  ): Promise<PropertiesPaginatedResponse> {
    return this.redisService.getPropertyList(this.toCacheParams(query), () =>
      this.fetchFromDb(query),
    );
  }

  async invalidateCache(): Promise<void> {
    await this.redisService.invalidatePropertyList();
  }

  private toCacheParams(query: GetPropertiesQuery): PropertyListCacheParams {
    return {
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      city: query.city,
      minBedrooms: query.minBedrooms,
      minAreaSqm: query.minAreaSqm,
      maxAreaSqm: query.maxAreaSqm,
      isAvailable: query.isAvailable,
      cursor: query.cursor,
      operator: query.operator,
      limit: query.limit,
    };
  }

  private async fetchFromDb(
    query: GetPropertiesQuery,
  ): Promise<PropertiesPaginatedResponse> {
    const { cursor, limit } = query;

    const qb = this.buildQuery(query);
    qb.take(limit + 1);

    if (cursor) {
      qb.andWhere('property.id < :cursor', { cursor });
    }

    const data = await qb.getMany();
    const hasMore = data.length > limit;

    if (hasMore) {
      data.pop();
    }

    return {
      data,
      meta: {
        hasMore,
        nextCursor:
          hasMore && data.length > 0 ? data[data.length - 1].id : undefined,
        limit,
      },
    };
  }

  private buildQuery(query: GetPropertiesQuery): SelectQueryBuilder<Property> {
    const { operator = 'AND' as const } = query;

    const qb = this.propertyRepo
      .createQueryBuilder('property')
      .where('property.is_deleted = :isDeleted', { isDeleted: false });

    applyFilters(
      qb,
      {
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        city: query.city,
        minBedrooms: query.minBedrooms,
        minAreaSqm: query.minAreaSqm,
        maxAreaSqm: query.maxAreaSqm,
        isAvailable: query.isAvailable,
      },
      operator,
    );

    return qb
      .orderBy('property.price', 'DESC')
      .addOrderBy('property.id', 'DESC');
  }
}
