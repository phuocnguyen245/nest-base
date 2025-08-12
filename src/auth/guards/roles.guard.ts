import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

interface AuthenticatedUser {
  userId: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userRoles = user.roles || [];

    // Check if user has any of the required roles
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      this.logger.warn(
        `User ${user.username} denied access. Required roles: [${requiredRoles.join(', ')}], Has: [${userRoles.join(', ')}]`,
      );

      throw new ForbiddenException(
        `Insufficient roles. Required: ${requiredRoles.join(' or ')}`,
      );
    }

    this.logger.debug(
      `User ${user.username} granted access with roles: [${userRoles.join(', ')}]`,
    );

    return true;
  }
}
