import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  DeepPartial,
  FindOptionsWhere,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { PaginationDto } from '../dto/pagination.dto';
import { BaseEntity } from '../entities/base.entity';
import { PaginationResult } from '../interfaces/base.interface';

export abstract class BaseService<T extends BaseEntity> {
  constructor(protected readonly repository: Repository<T>) {}

  async findAll(paginationDto: PaginationDto): Promise<PaginationResult<T>> {
    const { page = 1, limit = 10, search, sort } = paginationDto;

    const queryBuilder = this.repository.createQueryBuilder('entity');

    if (search && this.getSearchableFields().length > 0) {
      this.applySearch(queryBuilder, search);
    }

    this.applySorting(queryBuilder, sort);

    queryBuilder.skip((page - 1) * limit).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: string): Promise<T> {
    const entity = await this.repository.findOne({
      where: { id } as FindOptionsWhere<T>,
    });

    if (!entity) {
      throw new NotFoundException(
        `${this.getEntityName()} with ID ${id} not found`,
      );
    }

    return entity;
  }

  async create(createDto: DeepPartial<T>): Promise<T> {
    try {
      const entity = this.repository.create(createDto);
      return await this.repository.save(entity);
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to create ${this.getEntityName()}: ${error instanceof Error && error.message ? error.message : error}`,
      );
    }
  }

  async update(id: string, updateDto): Promise<T> {
    await this.findOne(id);
    try {
      await this.repository.update(id, updateDto);
      return await this.findOne(id);
    } catch (error) {
      throw new BadRequestException(
        `Failed to update ${this.getEntityName()}: ${error instanceof Error && error.message ? error.message : error}`,
      );
    }
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findOne(id);
    await this.repository.softRemove(entity);
  }

  async restore(id: string): Promise<T> {
    const entity = await this.repository.findOne({
      where: { id } as FindOptionsWhere<T>,
      withDeleted: true,
    });

    if (!entity) {
      throw new NotFoundException(
        `${this.getEntityName()} with ID ${id} not found`,
      );
    }

    await this.repository.restore(id);
    return await this.findOne(id);
  }

  protected applySearch(
    queryBuilder: SelectQueryBuilder<T>,
    search: string,
  ): void {
    const searchableFields = this.getSearchableFields();
    if (searchableFields.length === 0) return;

    const searchConditions = searchableFields
      .map((field) => `entity.${field} ILIKE :search`)
      .join(' OR ');

    queryBuilder.andWhere(`(${searchConditions})`, { search: `%${search}%` });
  }

  protected applySorting(
    queryBuilder: SelectQueryBuilder<T>,
    sort?: string,
  ): void {
    if (!sort) {
      // Default sorting if no sort parameter provided
      queryBuilder.orderBy('entity.createdAt', 'DESC');
      return;
    }

    const validSortFields = this.getValidSortFields();
    const sortClauses = sort.split(',');
    let isFirstSort = true;

    for (const sortClause of sortClauses) {
      const [field, order] = sortClause.trim().split(':');

      if (!field) continue;

      // Validate field
      const validField = validSortFields.includes(field) ? field : null;
      if (!validField) continue;

      const validOrder = order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      if (isFirstSort) {
        queryBuilder.orderBy(`entity.${validField}`, validOrder);
        isFirstSort = false;
      } else {
        queryBuilder.addOrderBy(`entity.${validField}`, validOrder);
      }
    }

    if (isFirstSort) {
      queryBuilder.orderBy('entity.createdAt', 'DESC');
    }
  }

  // Abstract methods to be implemented by child classes
  protected abstract getEntityName(): string;
  protected abstract getSearchableFields(): string[];
  protected abstract getValidSortFields(): string[];
}
