import { SelectQueryBuilder } from 'typeorm';
import { applyFilters } from '../../../src/property/filters.utils';
import { Property } from '../../../src/property/entities/property.entity';

function createMockQueryBuilder(): Partial<SelectQueryBuilder<Property>> {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };
}

describe('applyFilters', () => {
  let mockQb: Partial<SelectQueryBuilder<Property>>;

  beforeEach(() => {
    mockQb = createMockQueryBuilder();
  });

  it('should not call andWhere when no filters are provided', () => {
    applyFilters(mockQb as SelectQueryBuilder<Property>, {}, 'AND');

    expect(mockQb.andWhere).not.toHaveBeenCalled();
  });

  it('should not call andWhere when filters are empty or blank', () => {
    const filters = {
      city: '',
      minPrice: undefined,
      maxPrice: null,
    };

    applyFilters(
      mockQb as SelectQueryBuilder<Property>,
      filters as Record<string, unknown>,
      'AND',
    );

    expect(mockQb.andWhere).not.toHaveBeenCalled();
  });

  it('should apply single price filter with AND operator', () => {
    applyFilters(
      mockQb as SelectQueryBuilder<Property>,
      { minPrice: 100000 },
      'AND',
    );

    expect(mockQb.andWhere).toHaveBeenCalledWith(
      '(property.price >= :minPrice)',
      { minPrice: 100000 },
    );
  });

  it('should apply city filter with ILIKE', () => {
    applyFilters(
      mockQb as SelectQueryBuilder<Property>,
      { city: 'Houston' },
      'AND',
    );

    expect(mockQb.andWhere).toHaveBeenCalledWith(
      '(property.city ILIKE :city)',
      { city: '%Houston%' },
    );
  });

  it('should apply multiple filters with AND operator', () => {
    applyFilters(
      mockQb as SelectQueryBuilder<Property>,
      { minPrice: 100000, maxPrice: 500000, city: 'Houston' },
      'AND',
    );

    expect(mockQb.andWhere).toHaveBeenCalledWith(
      '(property.price >= :minPrice AND property.price <= :maxPrice AND property.city ILIKE :city)',
      { minPrice: 100000, maxPrice: 500000, city: '%Houston%' },
    );
  });

  it('should apply multiple filters with OR operator', () => {
    applyFilters(
      mockQb as SelectQueryBuilder<Property>,
      { city: 'Houston', minBedrooms: 3 },
      'OR',
    );

    expect(mockQb.andWhere).toHaveBeenCalledWith(
      '(property.city ILIKE :city OR property.bedrooms >= :minBedrooms)',
      { city: '%Houston%', minBedrooms: 3 },
    );
  });

  it('should apply area range filters', () => {
    applyFilters(
      mockQb as SelectQueryBuilder<Property>,
      { minAreaSqm: 50, maxAreaSqm: 200 },
      'AND',
    );

    expect(mockQb.andWhere).toHaveBeenCalledWith(
      '(property.area_sqm >= :minAreaSqm AND property.area_sqm <= :maxAreaSqm)',
      { minAreaSqm: 50, maxAreaSqm: 200 },
    );
  });

  it('should apply isAvailable filter', () => {
    applyFilters(
      mockQb as SelectQueryBuilder<Property>,
      { isAvailable: true },
      'AND',
    );

    expect(mockQb.andWhere).toHaveBeenCalledWith(
      '(property.is_available = :isAvailable)',
      { isAvailable: true },
    );
  });

  it('should apply all available filters together', () => {
    applyFilters(
      mockQb as SelectQueryBuilder<Property>,
      {
        minPrice: 100000,
        maxPrice: 500000,
        city: 'Houston',
        minBedrooms: 3,
        minAreaSqm: 100,
        maxAreaSqm: 300,
        isAvailable: true,
      },
      'AND',
    );

    expect(mockQb.andWhere).toHaveBeenCalledTimes(1);
    const callArgs = (mockQb.andWhere as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    const whereClause = callArgs[0];
    expect(whereClause).toContain('property.price >= :minPrice');
    expect(whereClause).toContain('property.price <= :maxPrice');
    expect(whereClause).toContain('property.city ILIKE :city');
    expect(whereClause).toContain('property.bedrooms >= :minBedrooms');
    expect(whereClause).toContain('property.area_sqm >= :minAreaSqm');
    expect(whereClause).toContain('property.area_sqm <= :maxAreaSqm');
    expect(whereClause).toContain('property.is_available = :isAvailable');
  });
});
