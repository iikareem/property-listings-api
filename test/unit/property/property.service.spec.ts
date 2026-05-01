import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PropertyService } from '../../../src/property/property.service';
import { Property } from '../../../src/property/entities/property.entity';

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

  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    clear: jest.fn(),
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
          provide: CACHE_MANAGER,
          useValue: mockCache,
        },
      ],
    }).compile();

    service = module.get<PropertyService>(PropertyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createSampleProperties = (count: number): Property[] => {
    return Array.from({ length: count }, (_, i) => {
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
  };

  describe('findAll', () => {
    it('should return first page with limit items', async () => {
      const data = createSampleProperties(10);
      mockQb.getMany.mockResolvedValue(data);

      const result = await service.findAll({ limit: 10 });

      expect(result.data).toHaveLength(10);
      expect(result.meta.hasMore).toBe(false);
      expect(result.meta.nextCursor).toBeUndefined();
    });

    it('should return hasMore=true when extra item exists', async () => {
      const data = createSampleProperties(11);
      mockQb.getMany.mockResolvedValue(data);

      const result = await service.findAll({ limit: 10 });

      expect(result.data).toHaveLength(10);
      expect(result.meta.hasMore).toBe(true);
      expect(result.meta.nextCursor).toBe(data[9].id);
    });

    it('should use cursor to fetch next page', async () => {
      const cursor = 'test-cursor-id';
      mockQb.getMany.mockResolvedValue([]);

      await service.findAll({ limit: 10, cursor });

      expect(mockQb.andWhere).toHaveBeenCalledWith('property.id < :cursor', {
        cursor,
      });
    });

    it('should request limit + 1 items for hasMore detection', async () => {
      mockQb.getMany.mockResolvedValue([]);

      await service.findAll({ limit: 10 });

      expect(mockQb.take).toHaveBeenCalledWith(11);
    });

    it('should order by price DESC then id DESC for stable pagination', async () => {
      mockQb.getMany.mockResolvedValue([]);

      await service.findAll({ limit: 10 });

      expect(mockQb.orderBy).toHaveBeenCalledWith('property.price', 'DESC');
      expect(mockQb.addOrderBy).toHaveBeenCalledWith('property.id', 'DESC');
    });

    it('should apply filters along with cursor', async () => {
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

    it('should always exclude deleted properties', async () => {
      mockQb.getMany.mockResolvedValue([]);

      await service.findAll({ limit: 10 });

      expect(mockQb.where).toHaveBeenCalledWith(
        'property.is_deleted = :isDeleted',
        { isDeleted: false },
      );
    });

    it('should return empty data when no results found', async () => {
      mockQb.getMany.mockResolvedValue([]);

      const result = await service.findAll({ limit: 10 });

      expect(result.data).toEqual([]);
      expect(result.meta.hasMore).toBe(false);
      expect(result.meta.nextCursor).toBeUndefined();
    });

    it('should return cached result when available', async () => {
      const cachedResult = {
        data: createSampleProperties(5),
        meta: { hasMore: false, nextCursor: undefined, limit: 10 },
      };
      mockCache.get.mockResolvedValue(cachedResult);

      const result = await service.findAll({ limit: 10 });

      expect(mockCache.get).toHaveBeenCalled();
      expect(mockQb.getMany).not.toHaveBeenCalled();
      expect(result).toEqual(cachedResult);
    });

    it('should fetch from DB and store in cache on cache miss', async () => {
      mockCache.get.mockResolvedValue(undefined);
      const data = createSampleProperties(5);
      mockQb.getMany.mockResolvedValue(data);

      await service.findAll({ limit: 10 });

      expect(mockCache.get).toHaveBeenCalled();
      expect(mockQb.getMany).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should generate unique cache keys for different query params', async () => {
      mockCache.get.mockResolvedValue(undefined);
      mockQb.getMany.mockResolvedValue([]);

      await service.findAll({ limit: 10, minPrice: 100000 });
      await service.findAll({ limit: 10, minPrice: 200000 });

      const keys = mockCache.get.mock.calls.map(call => call[0]);
      expect(keys[0]).not.toBe(keys[1]);
    });
  });

  describe('invalidateCache', () => {
    it('should clear all cached data', async () => {
      await service.invalidateCache();

      expect(mockCache.clear).toHaveBeenCalled();
    });
  });
});
