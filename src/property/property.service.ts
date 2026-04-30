import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Property } from './entities/property.entity';
import { GetPropertiesQuery } from './dtos/get-properties.dto';
import { PropertiesPaginatedResponse } from './dtos/responses.dto';
import { applyFilters } from './filters.utils';

@Injectable()
export class PropertyService {
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
  ) {}

  async findAll(
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
