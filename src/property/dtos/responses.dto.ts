import { Property } from '../entities/property.entity';

export class PropertyResponse {
  id: string;
  title: string;
  description: string;
  price: number;
  city: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  areaSqm: number;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CursorPaginationMeta {
  hasMore: boolean;
  nextCursor?: string;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: CursorPaginationMeta;
}

export type PropertiesPaginatedResponse = PaginatedResponse<Property>;
