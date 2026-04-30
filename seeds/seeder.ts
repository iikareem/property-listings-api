import { v7 as uuidv7 } from 'uuid';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from '../src/property/entities/property.entity';
import { faker } from '@faker-js/faker';

const BATCH_SIZE = 1000;
const TOTAL_RECORDS = 10000;

const CITIES = [
  'New York',
  'Los Angeles',
  'Chicago',
  'Houston',
  'Phoenix',
  'Philadelphia',
  'San Antonio',
  'San Diego',
  'Dallas',
  'Austin',
];

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const propertyRepo = app.get<Repository<Property>>(getRepositoryToken(Property));

  console.log(`Seeding ${TOTAL_RECORDS} properties...`);

  for (let i = 0; i < TOTAL_RECORDS; i += BATCH_SIZE) {
    const properties: any[] = [];

    for (let j = 0; j < BATCH_SIZE; j++) {
      properties.push({
        id: uuidv7(),
        title: faker.lorem.sentence({ min: 3, max: 8 }),
        description: faker.lorem.paragraph(),
        price: faker.commerce.price({ min: 50000, max: 5000000 }),
        city: faker.helpers.arrayElement(CITIES),
        address: faker.location.streetAddress({ useFullAddress: true }),
        bedrooms: faker.number.int({ min: 1, max: 8 }),
        bathrooms: faker.number.int({ min: 1, max: 6 }),
        areaSqm: faker.number.float({ min: 30, max: 500, fractionDigits: 2 }),
        isAvailable: faker.datatype.boolean(),
      });
    }

    await propertyRepo.save(properties);
    console.log(`Inserted ${Math.min(i + BATCH_SIZE, TOTAL_RECORDS)} / ${TOTAL_RECORDS} records`);
  }

  console.log('Seeding completed!');
  await app.close();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
