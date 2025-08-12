import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { JwtPayload } from '../common/interfaces/base.interface';
import { AppLoggerService } from '../common/services/logger.service';
import { CacheService } from '../redis/cache.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import {
  AuthResponseDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
    private readonly cacheService: CacheService,
  ) {}

  async validateUser(
    usernameOrEmail: string,
    password: string,
  ): Promise<User | null> {
    // Try to find user by username or email
    let user = await this.usersService.findByUsername(usernameOrEmail);
    if (!user) {
      user = await this.usersService.findByEmail(usernameOrEmail);
    }

    if (user && user.isActive && (await user.validatePassword(password))) {
      this.logger.log(`User ${user.username} validated successfully`);
      return user;
    }

    return null;
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(
      loginDto.usernameOrEmail,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    return this.generateTokens(user);
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const user = await this.usersService.create({
      ...registerDto,
      roleIds: ['default-user-role-id'],
    });

    this.logger.log(`New user registered: ${user.username}`);
    return this.generateTokens(user);
  }

  async refreshTokens(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthResponseDto> {
    const payload: JwtPayload = this.jwtService.verify(
      refreshTokenDto.refreshToken,
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      },
    );

    const user = await this.usersService.findOneWithRelations(payload.sub);

    if (
      !user ||
      !user.isActive ||
      user.refreshToken !== refreshTokenDto.refreshToken
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.generateTokens(user);
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.clearRefreshToken(userId);
    this.logger.log(`User ${userId} logged out successfully`);
  }

  async logoutAll(userId: string): Promise<void> {
    // Clear all refresh tokens for the user
    await this.usersService.clearRefreshToken(userId);
    this.logger.log(`All sessions cleared for user ${userId}`);
  }

  private async generateTokens(user: User): Promise<AuthResponseDto> {
    // Load user with roles and permissions
    const userWithRelations = await this.usersService.findOneWithRelations(
      user.id,
    );

    const roles = userWithRelations.roles.map((role) => role.name);
    const permissions = [
      ...userWithRelations.permissions.map((p) => p.name),
      ...userWithRelations.roles.flatMap((role) =>
        role.permissions.map((p) => p.name),
      ),
    ];

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      roles,
      permissions: [...new Set(permissions)], // Remove duplicates
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
          '7d',
        ),
      },
    );

    // Store refresh token
    await this.usersService.updateRefreshToken(user.id, refreshToken);

    const userResponse = {
      ...userWithRelations,
      roles,
      permissions: payload.permissions,
      fullName: userWithRelations.fullName,
    };

    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '15m');
    const expiresAt = new Date();
    expiresAt.setSeconds(
      expiresAt.getSeconds() + this.parseExpiration(expiresIn),
    );

    return {
      user: userResponse,
      accessToken,
      refreshToken,
      expiresAt: expiresAt.toISOString(),
    };
  }

  private parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        return 900;
    }
  }

  async generatePasswordResetToken(email: string): Promise<string> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    // Store reset token with expiration (implement in UsersService)
    await this.usersService.storePasswordResetToken(user.id, resetToken);

    return resetToken;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.usersService.findByPasswordResetToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    await this.usersService.updatePassword(user.id, newPassword);
    await this.usersService.clearPasswordResetToken(user.id);

    this.logger.log(`Password reset successful for user ${user.username}`);
  }
}
