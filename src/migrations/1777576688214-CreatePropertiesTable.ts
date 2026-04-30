import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePropertiesTable1777576688214 implements MigrationInterface {
    name = 'CreatePropertiesTable1777576688214'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "properties" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" text, "price" numeric(10,2) NOT NULL, "city" character varying NOT NULL, "address" character varying NOT NULL, "bedrooms" integer NOT NULL, "bathrooms" integer NOT NULL, "area_sqm" numeric(8,2), "isAvailable" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2d83bfa0b9fcd45dee1785af44d" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "properties"`);
    }

}
