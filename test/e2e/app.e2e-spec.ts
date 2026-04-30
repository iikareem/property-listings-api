import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { Property } from '../../src/property/entities/property.entity';

describe('PropertyController (e2e)', () => {
  let app: INestApplication;

  const mockRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockQb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getRepositoryToken(Property))
      .useValue(mockRepo)
      .compile();

    app = moduleFixture.createNestApplication();
    mockRepo.createQueryBuilder.mockReturnValue(mockQb);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('GET /properties', () => {
    it('should return paginated response with 200', () => {
      mockQb.getManyAndCount.mockResolvedValueOnce([
        [
          {
            id: 'test-id',
            title: 'Test Property',
            price: 100000,
            city: 'Houston',
          },
        ],
        1,
      ]);

      return request(app.getHttpServer())
        .get('/properties')
        .expect(200)
        .then((response) => {
          expect(response.body.data).toHaveLength(1);
          expect(response.body.meta.total).toBe(1);
        });
    });

    it('should return empty data when no properties found', () => {
      mockQb.getManyAndCount.mockResolvedValueOnce([[], 0]);

      return request(app.getHttpServer())
        .get('/properties')
        .expect(200)
        .then((response) => {
          expect(response.body.data).toEqual([]);
          expect(response.body.meta.total).toBe(0);
        });
    });
  });
});
