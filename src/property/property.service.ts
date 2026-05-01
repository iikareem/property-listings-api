import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Property } from './entities/property.entity';
import { GetPropertiesQuery } from './dtos/get-properties.dto';
import { PropertiesPaginatedResponse } from './dtos/responses.dto';
import { applyFilters } from './filters.utils';

@Injectable()
export class PropertyService {
  private readonly CACHE_PREFIX = 'properties:list:';

  constructor(
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
  ) {}

  async findAll(
    query: GetPropertiesQuery,
  ): Promise<PropertiesPaginatedResponse> {
    const cacheKey = this.getCacheKey(query);
    const cached =
      await this.cache.get<PropertiesPaginatedResponse>(cacheKey);

    if (cached) {
      return cached;
    }

    const result = await this.fetchFromDb(query);
    await this.cache.set(cacheKey, result);

    return result;
  }

  private async fetchFromDb(
    query: GetPropertiesQuery,
  ): Promise<PropertiesPaginatedResponse> {
    const { cursor, limit } = query;
    const hasCursor = cursor !== undefined;
    const takeCount = limit + 1;

    const qb = this.buildQuery(query);
    qb.take(takeCount);

    if (hasCursor) {
      qb.andWhere('property.id < :cursor', { cursor });
    }

    const data = await qb.getMany();

    const hasMore = data.length > limit;
    if (hasMore) {
      data.pop();
    }

    const nextCursor =
      hasMore && data.length > 0 ? data[data.length - 1].id : undefined;

    return {
      data,
      meta: {
        hasMore,
        nextCursor,
        limit,
      },
    };
  }

  async invalidateCache(): Promise<void> {
    await this.cache.clear();
  }

  private getCacheKey(query: GetPropertiesQuery): string {
    const params = new URLSearchParams();

    if (query.minPrice) params.set('minPrice', String(query.minPrice));
    if (query.maxPrice) params.set('maxPrice', String(query.maxPrice));
    if (query.city) params.set('city', query.city);
    if (query.minBedrooms) params.set('minBedrooms', String(query.minBedrooms));
    if (query.minAreaSqm) params.set('minAreaSqm', String(query.minAreaSqm));
    if (query.maxAreaSqm) params.set('maxAreaSqm', String(query.maxAreaSqm));
    if (query.isAvailable !== undefined)
      params.set('isAvailable', String(query.isAvailable));
    if (query.cursor) params.set('cursor', query.cursor);
    if (query.operator) params.set('operator', query.operator);
    if (query.limit) params.set('limit', String(query.limit));

    return `${this.CACHE_PREFIX}${params.toString()}`;
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
