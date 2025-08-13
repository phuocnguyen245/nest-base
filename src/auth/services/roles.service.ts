import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { CreateRoleDto, UpdateRoleDto, RoleResponseDto } from '../dto/role.dto';
import { BaseService } from '../../common/services/base.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginationResult } from '../../common/interfaces/base.interface';
import { plainToClass } from 'class-transformer';

@Injectable()
export class RolesService extends BaseService<Role> {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
  ) {
    super(rolesRepository);
  }

  async createRole(createRoleDto: CreateRoleDto): Promise<RoleResponseDto> {
    // Check if role already exists
    const existingRole = await this.rolesRepository.findOne({
      where: { name: createRoleDto.name },
    });

    if (existingRole) {
      throw new ConflictException('Role with this name already exists');
    }

    // Find permissions if provided
    const permissions = createRoleDto.permissionIds
      ? await this.permissionsRepository.find({
          where: { id: In(createRoleDto.permissionIds) },
        })
      : [];

    // Create role
    const roleData = { ...createRoleDto };
    delete roleData.permissionIds;

    const role = this.rolesRepository.create({
      ...roleData,
      permissions,
    });

    const savedRole = await this.rolesRepository.save(role);
    this.logger.log(`Role created: ${savedRole.name}`);

    return this.transformToResponseDto(savedRole);
  }

  async findAllRoles(
    paginationDto: PaginationDto,
  ): Promise<PaginationResult<RoleResponseDto>> {
    const result = await super.findAll(paginationDto);

    const transformedData = result.data.map((role) =>
      this.transformToResponseDto(role),
    );

    return {
      ...result,
      data: transformedData,
    };
  }

  async findOneRole(id: string): Promise<RoleResponseDto> {
    const role = await this.rolesRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return this.transformToResponseDto(role);
  }

  async updateRole(
    id: string,
    updateRoleDto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    const role = await this.rolesRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    // Check for name conflicts
    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existingRole = await this.rolesRepository.findOne({
        where: { name: updateRoleDto.name },
      });
      if (existingRole) {
        throw new ConflictException('Role with this name already exists');
      }
    }

    // Update permissions if provided
    if (updateRoleDto.permissionIds) {
      const permissions = await this.permissionsRepository.find({
        where: { id: In(updateRoleDto.permissionIds) },
      });
      role.permissions = permissions;
    }

    // Remove permissionIds from update data
    const updateData = { ...updateRoleDto };
    delete updateData.permissionIds;

    Object.assign(role, updateData);

    const savedRole = await this.rolesRepository.save(role);
    this.logger.log(`Role updated: ${savedRole.name}`);

    return this.transformToResponseDto(savedRole);
  }

  async assignPermission(roleId: string, permissionId: string): Promise<Role> {
    const [role, permission] = await Promise.all([
      this.rolesRepository.findOne({
        where: { id: roleId },
        relations: ['permissions'],
      }),
      this.permissionsRepository.findOne({ where: { id: permissionId } }),
    ]);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    if (!role.permissions.some((p) => p.id === permissionId)) {
      role.permissions.push(permission);
      await this.rolesRepository.save(role);
      this.logger.log(
        `Permission ${permission.name} assigned to role ${role.name}`,
      );
    }

    return role;
  }

  async removePermission(roleId: string, permissionId: string): Promise<Role> {
    const role = await this.rolesRepository.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    role.permissions = role.permissions.filter(
      (permission) => permission.id !== permissionId,
    );
    const savedRole = await this.rolesRepository.save(role);

    this.logger.log(`Permission removed from role ${role.name}`);
    return savedRole;
  }

  async findByName(name: string): Promise<Role | null> {
    return this.rolesRepository.findOne({
      where: { name },
      relations: ['permissions'],
    });
  }

  private transformToResponseDto(role: Role): RoleResponseDto {
    return plainToClass(RoleResponseDto, {
      id: role.id,
      name: role.name,
      description: role.description,
      isActive: role.isActive,
      permissions: role.permissions?.map((permission) => permission.name) || [],
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    });
  }

  protected getEntityName(): string {
    return 'Role';
  }

  protected getSearchableFields(): string[] {
    return ['name', 'description'];
  }

  protected getValidSortFields(): string[] {
    return ['name', 'description', 'isActive', 'createdAt', 'updatedAt'];
  }
}
