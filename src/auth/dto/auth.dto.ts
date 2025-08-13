import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

import { Transform } from 'class-transformer';
import { VALIDATION_MESSAGES } from '../../common/constants/validation-messages';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  usernameOrEmail: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RegisterDto {
  @IsEmail({}, { message: VALIDATION_MESSAGES.EMAIL.NOT_VALID })
  @IsNotEmpty({ message: VALIDATION_MESSAGES.EMAIL.IS_REQUIRED })
  @MaxLength(255, { message: VALIDATION_MESSAGES.EMAIL.TOO_LONG })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email: string;

  @IsNotEmpty({ message: VALIDATION_MESSAGES.USERNAME.IS_REQUIRED })
  @IsString({ message: VALIDATION_MESSAGES.USERNAME.MUST_BE_STRING })
  @MinLength(3, { message: VALIDATION_MESSAGES.USERNAME.TOO_SHORT })
  @MaxLength(50, { message: VALIDATION_MESSAGES.USERNAME.TOO_LONG })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: VALIDATION_MESSAGES.USERNAME.INVALID_FORMAT,
  })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  username: string;

  @IsNotEmpty({ message: VALIDATION_MESSAGES.PASSWORD.IS_REQUIRED })
  @IsString({ message: VALIDATION_MESSAGES.PASSWORD.MUST_BE_STRING })
  @MinLength(8, { message: VALIDATION_MESSAGES.PASSWORD.TOO_SHORT })
  @MaxLength(100, { message: VALIDATION_MESSAGES.PASSWORD.TOO_LONG })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: VALIDATION_MESSAGES.PASSWORD.INVALID_FORMAT,
  })
  password: string;

  @IsOptional()
  @IsString({ message: VALIDATION_MESSAGES.FIRST_NAME.MUST_BE_STRING })
  @MaxLength(100, { message: VALIDATION_MESSAGES.FIRST_NAME.TOO_LONG })
  @Transform(({ value }: { value: string }) => value?.trim())
  firstName?: string;

  @IsOptional()
  @IsString({ message: VALIDATION_MESSAGES.LAST_NAME.MUST_BE_STRING })
  @MaxLength(100, { message: VALIDATION_MESSAGES.LAST_NAME.TOO_LONG })
  @Transform(({ value }: { value: string }) => value?.trim())
  lastName?: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: VALIDATION_MESSAGES.EMAIL.NOT_VALID })
  @IsNotEmpty({ message: VALIDATION_MESSAGES.EMAIL.IS_REQUIRED })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsNotEmpty({ message: VALIDATION_MESSAGES.PASSWORD.IS_REQUIRED })
  @IsString({ message: VALIDATION_MESSAGES.PASSWORD.MUST_BE_STRING })
  @MinLength(8, { message: VALIDATION_MESSAGES.PASSWORD.TOO_SHORT })
  @MaxLength(100, { message: VALIDATION_MESSAGES.PASSWORD.TOO_LONG })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: VALIDATION_MESSAGES.PASSWORD.INVALID_FORMAT,
  })
  newPassword: string;
}

export class AuthResponseDto {
  user: {
    id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    roles: string[];
    permissions: string[];
  };
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}
