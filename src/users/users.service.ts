import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from '../auth/entities/role.entity';
import {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
  ChangePasswordDto,
} from './dto/user.dto';
import { BaseService } from '../common/services/base.service';
import { AppLoggerService } from '../common/services/logger.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResult } from '../common/interfaces/base.interface';
import { plainToClass } from 'class-transformer';

@Injectable()
export class UsersService extends BaseService<User> {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    private readonly logger: AppLoggerService,
  ) {
    super(usersRepository);
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user already exists
    const [existingEmail, existingUsername] = await Promise.all([
      this.findByEmail(createUserDto.email),
      this.findByUsername(createUserDto.username),
    ]);

    if (existingEmail) {
      throw new ConflictException('User with this email already exists');
    }

    if (existingUsername) {
      throw new ConflictException('User with this username already exists');
    }

    const roles = createUserDto.roleIds
      ? await this.rolesRepository.find({
          where: { id: In(createUserDto.roleIds) },
        })
      : [];

    const userData = { ...createUserDto };
    delete userData.roleIds;

    const user = this.usersRepository.create({
      ...userData,
      roles,
    });

    const savedUser = await this.usersRepository.save(user);
    this.logger.log(`User created: ${savedUser.username}`);

    return savedUser;
  }

  async findAllUsers(
    paginationDto: PaginationDto,
  ): Promise<PaginationResult<UserResponseDto>> {
    const result = await this.findAll(paginationDto);

    const transformedData = result.data.map((user) =>
      plainToClass(UserResponseDto, {
        ...user,
        roles: user.roles?.map((role) => role.name) || [],
        fullName: user.fullName,
      }),
    );

    return {
      ...result,
      data: transformedData,
    };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findOneWithRelations(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['roles'],
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { username },
      relations: ['roles'],
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // Check for email conflicts
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // Check for username conflicts
    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUser = await this.findByUsername(updateUserDto.username);
      if (existingUser) {
        throw new ConflictException('User with this username already exists');
      }
    }

    // Update roles if provided
    if (updateUserDto.roleIds) {
      const roles = await this.rolesRepository.find({
        where: { id: In(updateUserDto.roleIds) },
      });
      user.roles = roles;
    }

    // Remove roleIds from update data
    const updateData = { ...updateUserDto };
    delete updateData.roleIds;

    Object.assign(user, updateData);

    const savedUser = await this.usersRepository.save(user);
    this.logger.log(`User updated: ${savedUser.username}`);

    return savedUser;
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.findOne(userId);

    const isCurrentPasswordValid = await user.validatePassword(
      changePasswordDto.currentPassword,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw new BadRequestException(
        'New password and confirm password do not match',
      );
    }

    user.password = changePasswordDto.newPassword;
    await this.usersRepository.save(user);

    this.logger.log(`Password changed for user: ${user.username}`);
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.usersRepository.update(userId, {
      lastLoginAt: new Date(),
    });
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    await this.usersRepository.update(userId, {
      refreshToken,
    });
  }

  async clearRefreshToken(userId: string): Promise<void> {
    await this.usersRepository.update(userId, {
      refreshToken: null,
    });
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.findOne(userId);
    user.password = newPassword;
    await this.usersRepository.save(user);
  }

  async storePasswordResetToken(userId: string, token: string): Promise<void> {
    await this.usersRepository.update(userId, {
      refreshToken: `reset:${token}`,
    });
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    const users = await this.usersRepository.find();

    for (const user of users) {
      if (user.refreshToken?.startsWith('reset:')) {
        const [, storedTokenDB, expiryTimeDb] = user.refreshToken.split(':');
        const [, storedToken, _] = token.split(':');

        if (
          storedTokenDB === storedToken &&
          parseInt(expiryTimeDb) > Date.now()
        ) {
          return user;
        }
      }
    }

    return null;
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    console.log(123123, userId);

    await this.usersRepository.update(userId, {
      refreshToken: null,
    });
  }

  async assignRole(userId: string, roleId: string): Promise<User> {
    const [user, role] = await Promise.all([
      this.findOne(userId),
      this.rolesRepository.findOne({ where: { id: roleId } }),
    ]);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (!user.roles.some((r) => r.id === roleId)) {
      user.roles.push(role);
      await this.usersRepository.save(user);
    }

    return user;
  }

  async removeRole(userId: string, roleId: string): Promise<User> {
    const user = await this.findOne(userId);
    user.roles = user.roles.filter((role) => role.id !== roleId);
    await this.usersRepository.save(user);
    return user;
  }

  // Base service abstract methods implementation
  protected getEntityName(): string {
    return 'User';
  }

  protected getSearchableFields(): string[] {
    return ['username', 'email', 'firstName', 'lastName'];
  }

  protected getValidSortFields(): string[] {
    return [
      'username',
      'email',
      'firstName',
      'lastName',
      'createdAt',
      'updatedAt',
      'lastLoginAt',
    ];
  }
}
