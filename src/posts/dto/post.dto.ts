import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  MinLength,
  MaxLength,
  IsDateString,
} from 'class-validator';

export class CreatePostDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @IsString()
  @MinLength(10)
  content: string;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  slug: string;

  @IsOptional()
  @IsEnum(['draft', 'published', 'archived'])
  status?: 'draft' | 'published' | 'archived';

  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  tagIds?: string[];
}

export class UpdatePostDto extends CreatePostDto {}

export class CreateCommentDto {
  @IsString()
  @MinLength(3)
  content: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export class CreateTagDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateTagDto extends CreateTagDto {}
