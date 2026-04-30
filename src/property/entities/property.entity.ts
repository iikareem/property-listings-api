import { v7 as uuidv7 } from 'uuid';
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('properties')
export class Property {
  @PrimaryColumn('uuid')
  id: string = uuidv7();

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column()
  city: string;

  @Column()
  address: string;

  @Column({ name: 'bedrooms', type: 'integer' })
  bedrooms: number;

  @Column({ name: 'bathrooms', type: 'integer' })
  bathrooms: number;

  @Column({
    name: 'area_sqm',
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
  })
  areaSqm: number;

  @Column({ type: 'boolean', default: true })
  isAvailable: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
