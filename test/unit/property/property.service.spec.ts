import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PropertyService } from '../../../src/property/property.service';
import { Property } from '../../../src/property/entities/property.entity';
import { RedisService } from '../../../src/cache/redis.service';

describe('PropertyService', () => {
  let service: PropertyService;

  const mockQb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const mockRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQb),
  };

  const mockRedisService = {
    getPropertyList: jest.fn(),
    invalidatePropertyList: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertyService,
        {
          provide: getRepositoryToken(Property),
          useValue: mockRepo,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<PropertyService>(PropertyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createSampleProperties = (count: number): Property[] =>
    Array.from({ length: count }, (_, i) => {
      const prop = new Property();
      prop.id = `019ddfe0-${String(i).padStart(4, '0')}-0000-0000-00000000000${i}`;
      prop.title = `Property ${i}`;
      prop.description = 'Test property';
      prop.price = 100000 + i * 10000;
      prop.city = 'Houston';
      prop.address = '123 Test St';
      prop.bedrooms = 3;
      prop.bathrooms = 2;
      prop.areaSqm = 150;
      prop.isAvailable = true;
      prop.isDeleted = false;
      prop.deletedAt = null;
      prop.createdAt = new Date();
      prop.updatedAt = new Date();
      return prop;
    });

  const mockCacheMiss = () =>
    mockRedisService.getPropertyList.mockImplementation(
      async (_params, fetchFn) => fetchFn(),
    );

  describe('findAll', () => {
    it('should return first page with limit items', async () => {
      mockCacheMiss();
      const data = createSampleProperties(10);
      mockQb.getMany.mockResolvedValue(data);

      const result = await service.findAll({ limit: 10 });

      expect(result.data).toHaveLength(10);
      expect(result.meta.hasMore).toBe(false);
      expect(result.meta.nextCursor).toBeUndefined();
    });

    it('should return hasMore=true when extra item exists', async () => {
      mockCacheMiss();
      const data = createSampleProperties(11);
      mockQb.getMany.mockResolvedValue(data);

      const result = await service.findAll({ limit: 10 });

      expect(result.data).toHaveLength(10);
      expect(result.meta.hasMore).toBe(true);
      expect(result.meta.nextCursor).toBe(data[9].id);
    });

    it('should use cursor to fetch next page', async () => {
      mockCacheMiss();
      mockQb.getMany.mockResolvedValue([]);

      await service.findAll({ limit: 10, cursor: 'test-cursor' });

      expect(mockQb.andWhere).toHaveBeenCalledWith('property.id < :cursor', {
        cursor: 'test-cursor',
      });
    });

    it('should request limit + 1 items for hasMore detection', async () => {
      mockCacheMiss();
      mockQb.getMany.mockResolvedValue([]);

      await service.findAll({ limit: 10 });

      expect(mockQb.take).toHaveBeenCalledWith(11);
    });

    it('should order by price DESC then id DESC', async () => {
      mockCacheMiss();
      mockQb.getMany.mockResolvedValue([]);

      await service.findAll({ limit: 10 });

      expect(mockQb.orderBy).toHaveBeenCalledWith('property.price', 'DESC');
      expect(mockQb.addOrderBy).toHaveBeenCalledWith('property.id', 'DESC');
    });

    it('should apply filters with cursor', async () => {
      mockCacheMiss();
      mockQb.getMany.mockResolvedValue([]);

      await service.findAll({
        limit: 5,
        minPrice: 200000,
        city: 'Houston',
        cursor: 'test-cursor',
      });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('property.price'),
        expect.any(Object),
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith('property.id < :cursor', {
        cursor: 'test-cursor',
      });
    });

    it('should exclude deleted properties', async () => {
      mockCacheMiss();
      mockQb.getMany.mockResolvedValue([]);

      await service.findAll({ limit: 10 });

      expect(mockQb.where).toHaveBeenCalledWith(
        'property.is_deleted = :isDeleted',
        { isDeleted: false },
      );
    });

    it('should return empty data when no results', async () => {
      mockCacheMiss();
      mockQb.getMany.mockResolvedValue([]);

      const result = await service.findAll({ limit: 10 });

      expect(result.data).toEqual([]);
      expect(result.meta.hasMore).toBe(false);
      expect(result.meta.nextCursor).toBeUndefined();
    });

    it('should return cached result without fetching', async () => {
      const cached = {
        data: createSampleProperties(5),
        meta: { hasMore: false, nextCursor: undefined, limit: 10 },
      };
      mockRedisService.getPropertyList.mockResolvedValue(cached);

      const result = await service.findAll({ limit: 10 });

      expect(mockRedisService.getPropertyList).toHaveBeenCalled();
      expect(mockQb.getMany).not.toHaveBeenCalled();
      expect(result).toEqual(cached);
    });

    it('should fetch from DB on cache miss', async () => {
      mockCacheMiss();
      const data = createSampleProperties(5);
      mockQb.getMany.mockResolvedValue(data);

      await service.findAll({ limit: 10 });

      expect(mockRedisService.getPropertyList).toHaveBeenCalled();
      expect(mockQb.getMany).toHaveBeenCalled();
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate property list cache', async () => {
      await service.invalidateCache();

      expect(mockRedisService.invalidatePropertyList).toHaveBeenCalled();
    });
  });
});
