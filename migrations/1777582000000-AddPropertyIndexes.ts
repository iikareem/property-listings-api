import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPropertyIndexes1777582000000 implements MigrationInterface {
  name = 'AddPropertyIndexes1777582000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    await queryRunner.query(`
            CREATE INDEX idx_properties_active 
            ON properties (is_deleted) 
            WHERE is_deleted = false
        `);

    await queryRunner.query(`
            CREATE INDEX idx_properties_availability_price 
            ON properties (is_available, price DESC) 
            WHERE is_deleted = false
        `);

    await queryRunner.query(`
            CREATE INDEX idx_properties_price 
            ON properties (price) 
            WHERE is_deleted = false
        `);

    await queryRunner.query(`
            CREATE INDEX idx_properties_bedrooms 
            ON properties (bedrooms) 
            WHERE is_deleted = false
        `);

    await queryRunner.query(`
            CREATE INDEX idx_properties_area_sqm 
            ON properties (area_sqm) 
            WHERE is_deleted = false
        `);

    await queryRunner.query(`
            CREATE INDEX idx_properties_city_trgm 
            ON properties 
            USING gin (city gin_trgm_ops) 
            WHERE is_deleted = false
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_properties_active`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_properties_availability_price`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_properties_price`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_properties_bedrooms`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_properties_area_sqm`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_properties_city`);
  }
}
