import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsBoolean,
  Matches,
  IsUUID,
  IsArray,
} from 'class-validator';

import { Transform, Exclude } from 'class-transformer';
import { VALIDATION_MESSAGES } from '../../common/constants/validation-messages';

export class UserResponseDto {
  @IsUUID()
  id: string;

  @IsEmail({}, { message: VALIDATION_MESSAGES.EMAIL.NOT_VALID })
  email: string;

  @IsString({ message: VALIDATION_MESSAGES.USERNAME.MUST_BE_STRING })
  username: string;

  @IsOptional()
  @IsString({ message: VALIDATION_MESSAGES.FIRST_NAME.MUST_BE_STRING })
  firstName?: string;

  @IsOptional()
  @IsString({ message: VALIDATION_MESSAGES.LAST_NAME.MUST_BE_STRING })
  lastName?: string;

  @IsBoolean({ message: VALIDATION_MESSAGES.IS_ACTIVE.MUST_BE_BOOLEAN })
  isActive: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];
  createdAt: Date;

  updatedAt: Date;

  @IsOptional()
  lastLoginAt?: Date;

  @IsOptional()
  @IsString()
  fullName?: string;
}

export class CreateUserDto {
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

  @IsOptional()
  @IsBoolean({ message: VALIDATION_MESSAGES.IS_ACTIVE.MUST_BE_BOOLEAN })
  isActive?: boolean = true;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds?: string[];
}

export class UpdateUserDto {
  email?: string;
  username?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  roleIds?: string[];

  @IsOptional()
  @IsString({ message: VALIDATION_MESSAGES.PASSWORD.MUST_BE_STRING })
  @MinLength(8, { message: VALIDATION_MESSAGES.PASSWORD.TOO_SHORT })
  @MaxLength(100, { message: VALIDATION_MESSAGES.PASSWORD.TOO_LONG })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: VALIDATION_MESSAGES.PASSWORD.INVALID_FORMAT,
  })
  currentPassword?: string;
}

export class ChangePasswordDto {
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @IsNotEmpty({ message: VALIDATION_MESSAGES.PASSWORD.IS_REQUIRED })
  @IsString({ message: VALIDATION_MESSAGES.PASSWORD.MUST_BE_STRING })
  @MinLength(8, { message: VALIDATION_MESSAGES.PASSWORD.TOO_SHORT })
  @MaxLength(100, { message: VALIDATION_MESSAGES.PASSWORD.TOO_LONG })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: VALIDATION_MESSAGES.PASSWORD.INVALID_FORMAT,
  })
  newPassword: string;

  @IsNotEmpty()
  @IsString()
  confirmPassword: string;
}
