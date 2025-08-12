import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../entities/permission.entity';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  PermissionResponseDto,
} from '../dto/permission.dto';
import { BaseService } from '../../common/services/base.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginationResult } from '../../common/interfaces/base.interface';
import { plainToClass } from 'class-transformer';

@Injectable()
export class PermissionsService extends BaseService<Permission> {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
  ) {
    super(permissionsRepository);
  }

  async createPermission(
    createPermissionDto: CreatePermissionDto,
  ): Promise<PermissionResponseDto> {
    const existingPermission = await this.permissionsRepository.findOne({
      where: { name: createPermissionDto.name },
    });

    if (existingPermission) {
      throw new ConflictException('Permission with this name already exists');
    }

    const permission = this.permissionsRepository.create(createPermissionDto);
    const savedPermission = await this.permissionsRepository.save(permission);

    this.logger.log(`Permission created: ${savedPermission.name}`);
    return this.transformToResponseDto(savedPermission);
  }

  async findAllPermissions(
    paginationDto: PaginationDto,
  ): Promise<PaginationResult<PermissionResponseDto>> {
    const result = await super.findAll(paginationDto);

    const transformedData = result.data.map((permission) =>
      this.transformToResponseDto(permission),
    );

    return {
      ...result,
      data: transformedData,
    };
  }

  async findOnePermission(id: string): Promise<PermissionResponseDto> {
    const permission = await this.permissionsRepository.findOne({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }

    return this.transformToResponseDto(permission);
  }

  async updatePermission(
    id: string,
    updatePermissionDto: UpdatePermissionDto,
  ): Promise<PermissionResponseDto> {
    const permission = await this.permissionsRepository.findOne({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }

    // Check for name conflicts
    if (
      updatePermissionDto.name &&
      updatePermissionDto.name !== permission.name
    ) {
      const existingPermission = await this.permissionsRepository.findOne({
        where: { name: updatePermissionDto.name },
      });
      if (existingPermission) {
        throw new ConflictException('Permission with this name already exists');
      }
    }

    Object.assign(permission, updatePermissionDto);

    const savedPermission = await this.permissionsRepository.save(permission);
    this.logger.log(`Permission updated: ${savedPermission.name}`);

    return this.transformToResponseDto(savedPermission);
  }

  async getCategories(): Promise<string[]> {
    const result: { category: string }[] = await this.permissionsRepository
      .createQueryBuilder('permission')
      .select('DISTINCT permission.category', 'category')
      .where('permission.category IS NOT NULL')
      .getRawMany();

    return result
      .map((row) => row.category)
      .filter(Boolean)
      .sort();
  }

  private transformToResponseDto(
    permission: Permission,
  ): PermissionResponseDto {
    return plainToClass(PermissionResponseDto, {
      id: permission.id,
      name: permission.name,
      description: permission.description,
      category: permission.category,
      isActive: permission.isActive,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    });
  }

  // Base service abstract methods implementation
  protected getEntityName(): string {
    return 'Permission';
  }

  protected getSearchableFields(): string[] {
    return ['name', 'description', 'category'];
  }

  protected getValidSortFields(): string[] {
    return [
      'name',
      'description',
      'category',
      'isActive',
      'createdAt',
      'updatedAt',
    ];
  }
}
