import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from './entities/property.entity';
import { PropertyService } from './property.service';
import { PropertyController } from './property.controller';
import { RedisModule } from '../cache/redis.module';

@Module({
  imports: [TypeOrmModule.forFeature([Property]), RedisModule],
  controllers: [PropertyController],
  providers: [PropertyService],
})
export class PropertyModule {}
