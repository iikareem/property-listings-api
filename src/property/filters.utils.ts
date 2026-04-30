import { SelectQueryBuilder } from 'typeorm';
import { Property } from './entities/property.entity';

type FilterOperator = '>=' | '<=' | 'ILIKE' | '=';

interface FilterConfig {
  column: string;
  operator: FilterOperator;
  transform?: (value: unknown) => unknown;
}

type PropertyFilters = {
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  minBedrooms?: number;
  minAreaSqm?: number;
  maxAreaSqm?: number;
  isAvailable?: boolean;
};

const FILTER_CONFIG: Record<string, FilterConfig> = {
  minPrice: { column: 'property.price', operator: '>=' },
  maxPrice: { column: 'property.price', operator: '<=' },
  city: {
    column: 'property.city',
    operator: 'ILIKE',
    transform: (v) => `%${String(v)}%`,
  },
  minBedrooms: { column: 'property.bedrooms', operator: '>=' },
  minAreaSqm: { column: 'property.area_sqm', operator: '>=' },
  maxAreaSqm: { column: 'property.area_sqm', operator: '<=' },
  isAvailable: { column: 'property.is_available', operator: '=' },
};

export function applyFilters(
  qb: SelectQueryBuilder<Property>,
  filters: PropertyFilters,
  operator: 'AND' | 'OR',
): void {
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(filters)) {
    const config = FILTER_CONFIG[key];
    if (!config || isBlank(value)) {
      continue;
    }

    const paramValue: unknown = config.transform
      ? config.transform(value)
      : value;

    conditions.push(`${config.column} ${config.operator} :${key}`);
    params[key] = paramValue;
  }

  if (conditions.length === 0) {
    return;
  }

  const whereClause = `(${conditions.join(` ${operator} `)})`;
  qb.andWhere(whereClause, params);
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}
