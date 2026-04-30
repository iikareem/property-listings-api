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
    const qb = this.buildQuery(query);
    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: this.buildMeta(total, query.page, query.limit),
    };
  }

  private buildQuery(query: GetPropertiesQuery): SelectQueryBuilder<Property> {
    const { operator = 'AND' as const, page, limit } = query;
    const offset = (page - 1) * limit;

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

    return qb.orderBy('property.price', 'DESC').skip(offset).take(limit);
  }

  private buildMeta(total: number, page: number, limit: number) {
    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
