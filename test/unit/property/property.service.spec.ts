import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PropertyService } from '../../../src/property/property.service';
import { Property } from '../../../src/property/entities/property.entity';
import { GetPropertiesQuery } from '../../../src/property/dtos/get-properties.dto';

describe('PropertyService', () => {
  let service: PropertyService;
  let repo: Repository<Property>;

  const mockRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockQb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertyService,
        {
          provide: getRepositoryToken(Property),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<PropertyService>(PropertyService);
    repo = module.get<Repository<Property>>(getRepositoryToken(Property));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createSampleProperties = (count: number): Property[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `test-id-${i}`,
      title: `Property ${i}`,
      description: 'Test property',
      price: 100000 + i * 10000,
      city: 'Houston',
      address: `123 Test St`,
      bedrooms: 3,
      bathrooms: 2,
      areaSqm: 150,
      isAvailable: true,
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as Property[];
  };

  describe('findAll', () => {
    it('should return paginated results with default params', async () => {
      const data = createSampleProperties(10);
      mockQb.getManyAndCount.mockResolvedValue([data, 50]);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(10);
      expect(result.meta).toEqual({
        total: 50,
        page: 1,
        limit: 10,
        totalPages: 5,
      });
    });

    it('should apply correct pagination for page 2', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 50]);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ page: 2, limit: 10 });

      expect(mockQb.skip).toHaveBeenCalledWith(10);
      expect(mockQb.take).toHaveBeenCalledWith(10);
    });

    it('should order results by price descending', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ page: 1, limit: 10 });

      expect(mockQb.orderBy).toHaveBeenCalledWith('property.price', 'DESC');
    });

    it('should filter by minimum price', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 5]);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ page: 1, limit: 10, minPrice: 200000 });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('property.price >= :minPrice'),
        expect.objectContaining({ minPrice: 200000 }),
      );
    });

    it('should filter by maximum price', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 3]);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ page: 1, limit: 10, maxPrice: 500000 });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('property.price <= :maxPrice'),
        expect.objectContaining({ maxPrice: 500000 }),
      );
    });

    it('should filter by city with case-insensitive match', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 10]);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ page: 1, limit: 10, city: 'Houston' });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('property.city ILIKE :city'),
        expect.objectContaining({ city: '%Houston%' }),
      );
    });

    it('should filter by minimum bedrooms', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 15]);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ page: 1, limit: 10, minBedrooms: 4 });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('property.bedrooms >= :minBedrooms'),
        expect.objectContaining({ minBedrooms: 4 }),
      );
    });

    it('should filter by minimum area', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 8]);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ page: 1, limit: 10, minAreaSqm: 100 });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('property.area_sqm >= :minAreaSqm'),
        expect.objectContaining({ minAreaSqm: 100 }),
      );
    });

    it('should filter by maximum area', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 6]);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ page: 1, limit: 10, maxAreaSqm: 300 });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('property.area_sqm <= :maxAreaSqm'),
        expect.objectContaining({ maxAreaSqm: 300 }),
      );
    });

    it('should filter by availability', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 20]);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ page: 1, limit: 10, isAvailable: true });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('property.is_available = :isAvailable'),
        expect.objectContaining({ isAvailable: true }),
      );
    });

    it('should combine multiple filters with AND operator', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 5]);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({
        page: 1,
        limit: 10,
        minPrice: 100000,
        city: 'Houston',
        minBedrooms: 3,
        operator: 'AND',
      });

      const andWhereCalls = (mockQb.andWhere as jest.Mock).mock.calls;
      const filterCall = andWhereCalls.find((call: any[]) =>
        call[0].includes('property.price'),
      );

      expect(filterCall[0]).toContain('AND');
    });

    it('should combine multiple filters with OR operator', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 5]);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({
        page: 1,
        limit: 10,
        city: 'Houston',
        minBedrooms: 3,
        operator: 'OR',
      });

      const andWhereCalls = (mockQb.andWhere as jest.Mock).mock.calls;
      const filterCall = andWhereCalls.find((call: any[]) =>
        call[0].includes('property.city'),
      );

      expect(filterCall[0]).toContain('OR');
    });

    it('should always exclude deleted properties', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 10]);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ page: 1, limit: 10 });

      expect(mockQb.where).toHaveBeenCalledWith(
        'property.is_deleted = :isDeleted',
        { isDeleted: false },
      );
    });

    it('should calculate totalPages correctly', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 95]);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.meta.totalPages).toBe(10);
    });

    it('should return empty array when no results found', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });
});
