import { JwtModuleOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export const jwtConfig = (configService: ConfigService): JwtModuleOptions => ({
  secret: configService.get<string>(
    'JWT_SECRET',
    'super-secret-key-change-in-production',
  ),
  signOptions: {
    expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1d'),
    issuer: configService.get<string>('JWT_ISSUER', 'nest-app'),
    audience: configService.get<string>('JWT_AUDIENCE', 'nest-app-users'),
  },
});
