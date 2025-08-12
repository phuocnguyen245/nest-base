import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { Transform } from 'class-transformer';

export class CreatePermissionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }: { value: string }) => value?.trim())
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  category?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdatePermissionDto {
  name?: string;
  description?: string;
  category?: string;
  isActive?: boolean;
}

export class PermissionResponseDto {
  @IsUUID()
  id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsBoolean()
  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}
