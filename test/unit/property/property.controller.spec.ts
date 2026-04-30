import { Test, TestingModule } from '@nestjs/testing';
import { PropertyController } from '../../../src/property/property.controller';
import { PropertyService } from '../../../src/property/property.service';

describe('PropertyController', () => {
  let controller: PropertyController;
  let mockFindAll: jest.Mock;

  beforeEach(async () => {
    mockFindAll = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PropertyController],
      providers: [
        {
          provide: PropertyService,
          useValue: { findAll: mockFindAll },
        },
      ],
    }).compile();

    controller = module.get<PropertyController>(PropertyController);
  });

  describe('findAll', () => {
    it('should call service.findAll with default query params', async () => {
      mockFindAll.mockResolvedValue({
        data: [],
        meta: { hasMore: false, limit: 10 },
      });

      const result = await controller.findAll({ limit: 10 });

      expect(mockFindAll).toHaveBeenCalledWith({ limit: 10 });
      expect(result).toEqual({
        data: [],
        meta: { hasMore: false, limit: 10 },
      });
    });

    it('should call service.findAll with cursor', async () => {
      mockFindAll.mockResolvedValue({
        data: [],
        meta: { hasMore: true, nextCursor: 'next-id', limit: 10 },
      });

      await controller.findAll({
        limit: 10,
        cursor: '019ddfe0-cefe-73e9-b5cb-812fc04f0140',
      });

      expect(mockFindAll).toHaveBeenCalledWith({
        limit: 10,
        cursor: '019ddfe0-cefe-73e9-b5cb-812fc04f0140',
      });
    });

    it('should call service.findAll with price range filters', async () => {
      mockFindAll.mockResolvedValue({
        data: [],
        meta: { hasMore: false, limit: 10 },
      });

      await controller.findAll({
        limit: 10,
        minPrice: 100000,
        maxPrice: 500000,
      });

      expect(mockFindAll).toHaveBeenCalledWith({
        limit: 10,
        minPrice: 100000,
        maxPrice: 500000,
      });
    });

    it('should call service.findAll with city and bedroom filters', async () => {
      mockFindAll.mockResolvedValue({
        data: [],
        meta: { hasMore: true, nextCursor: 'cursor-id', limit: 5 },
      });

      await controller.findAll({
        limit: 5,
        city: 'Houston',
        minBedrooms: 3,
      });

      expect(mockFindAll).toHaveBeenCalledWith({
        limit: 5,
        city: 'Houston',
        minBedrooms: 3,
      });
    });

    it('should call service.findAll with OR operator', async () => {
      mockFindAll.mockResolvedValue({
        data: [],
        meta: { hasMore: false, limit: 10 },
      });

      await controller.findAll({
        limit: 10,
        city: 'Houston',
        minBedrooms: 3,
        operator: 'OR',
      });

      expect(mockFindAll).toHaveBeenCalledWith({
        limit: 10,
        city: 'Houston',
        minBedrooms: 3,
        operator: 'OR',
      });
    });

    it('should return paginated response with correct meta', async () => {
      mockFindAll.mockResolvedValue({
        data: [
          {
            id: '019ddfe0-cefe-73e9-b5cb-812fc04f0140',
            title: 'Test Property',
            price: 500000,
            city: 'Houston',
          },
        ],
        meta: { hasMore: true, nextCursor: 'next-cursor-id', limit: 10 },
      });

      const result = await controller.findAll({ limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.hasMore).toBe(true);
      expect(result.meta.nextCursor).toBe('next-cursor-id');
    });
  });
});
