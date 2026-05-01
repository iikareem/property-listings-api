import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { Property } from '../../src/property/entities/property.entity';

describe('PropertyController (e2e)', () => {
  let app: INestApplication;

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
    get: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getRepositoryToken(Property))
      .useValue(mockRepo)
      .overrideProvider(CACHE_MANAGER)
      .useValue(mockCache)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('GET /properties', () => {
    it('should return paginated response with 200', async () => {
      mockQb.getMany.mockResolvedValueOnce([
        {
          id: 'test-id',
          title: 'Test Property',
          price: 100000,
          city: 'Houston',
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/properties')
        .expect(200);

      const body = response.body as {
        data: unknown[];
        meta: { hasMore: boolean };
      };
      expect(body.data).toHaveLength(1);
      expect(body.meta.hasMore).toBe(false);
    });

    it('should return hasMore=true with nextCursor', async () => {
      const items = Array.from({ length: 11 }, (_, i) => ({
        id: `item-${i}`,
        title: `Property ${i}`,
        price: 100000 + i * 1000,
        city: 'Houston',
      }));
      mockQb.getMany.mockResolvedValueOnce(items);

      const response = await request(app.getHttpServer())
        .get('/properties?limit=10')
        .expect(200);

      const body = response.body as {
        data: unknown[];
        meta: { hasMore: boolean; nextCursor: string };
      };
      expect(body.data).toHaveLength(10);
      expect(body.meta.hasMore).toBe(true);
      expect(body.meta.nextCursor).toBe('item-9');
    });

    it('should accept cursor parameter for next page', async () => {
      mockQb.getMany.mockResolvedValueOnce([
        {
          id: 'item-11',
          title: 'Next Property',
          price: 110000,
          city: 'Dallas',
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/properties?cursor=item-10&limit=10')
        .expect(200);

      const body = response.body as {
        data: unknown[];
        meta: { hasMore: boolean };
      };
      expect(body.data).toHaveLength(1);
      expect(body.meta.hasMore).toBe(false);
    });
  });
});
