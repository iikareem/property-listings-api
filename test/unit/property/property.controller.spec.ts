import { Test, TestingModule } from '@nestjs/testing';
import { PropertyController } from '../../../src/property/property.controller';
import { PropertyService } from '../../../src/property/property.service';

describe('PropertyController', () => {
  let controller: PropertyController;
  let service: PropertyService;

  const mockService = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PropertyController],
      providers: [
        {
          provide: PropertyService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<PropertyController>(PropertyController);
    service = module.get<PropertyService>(PropertyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should call service.findAll with default query params', async () => {
      const mockResponse = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };
      mockService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(service.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should call service.findAll with price range filters', async () => {
      const mockResponse = {
        data: [],
        meta: { total: 5, page: 1, limit: 10, totalPages: 1 },
      };
      mockService.findAll.mockResolvedValue(mockResponse);

      await controller.findAll({
        page: 1,
        limit: 10,
        minPrice: 100000,
        maxPrice: 500000,
      });

      expect(service.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        minPrice: 100000,
        maxPrice: 500000,
      });
    });

    it('should call service.findAll with city and bedroom filters', async () => {
      const mockResponse = {
        data: [],
        meta: { total: 10, page: 2, limit: 5, totalPages: 2 },
      };
      mockService.findAll.mockResolvedValue(mockResponse);

      await controller.findAll({
        page: 2,
        limit: 5,
        city: 'Houston',
        minBedrooms: 3,
      });

      expect(service.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        city: 'Houston',
        minBedrooms: 3,
      });
    });

    it('should call service.findAll with OR operator', async () => {
      const mockResponse = {
        data: [],
        meta: { total: 20, page: 1, limit: 10, totalPages: 2 },
      };
      mockService.findAll.mockResolvedValue(mockResponse);

      await controller.findAll({
        page: 1,
        limit: 10,
        city: 'Houston',
        minBedrooms: 3,
        operator: 'OR',
      });

      expect(service.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        city: 'Houston',
        minBedrooms: 3,
        operator: 'OR',
      });
    });

    it('should call service.findAll with area and availability filters', async () => {
      const mockResponse = {
        data: [],
        meta: { total: 8, page: 1, limit: 10, totalPages: 1 },
      };
      mockService.findAll.mockResolvedValue(mockResponse);

      await controller.findAll({
        page: 1,
        limit: 10,
        minAreaSqm: 100,
        maxAreaSqm: 300,
        isAvailable: true,
      });

      expect(service.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        minAreaSqm: 100,
        maxAreaSqm: 300,
        isAvailable: true,
      });
    });

    it('should return paginated response with correct meta', async () => {
      const mockResponse = {
        data: [
          {
            id: '019ddfe0-cefe-73e9-b5cb-812fc04f0140',
            title: 'Test Property',
            price: 500000,
            city: 'Houston',
          },
        ],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      mockService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });
  });
});
