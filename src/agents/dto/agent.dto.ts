import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreateAgentDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  code: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  userId: string;

  @IsOptional()
  @IsUUID()
  parentAgentId?: string;
}

export class UpdateAgentDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  code?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAgentHierarchyDto {
  @IsOptional()
  @IsUUID()
  parentAgentId?: string;
}

export class AssignUserToAgentDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  agentId: string;
}

export class AgentResponseDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  parentAgentId?: string;
  level: number;
  path?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Related data
  user?: {
    id: string;
    username: string;
    email: string;
    fullName: string;
  };

  parentAgent?: {
    id: string;
    code: string;
    name: string;
  };

  childAgents?: {
    id: string;
    code: string;
    name: string;
    level: number;
  }[];

  managedUsersCount?: number;
}

export class AgentHierarchyDto {
  id: string;
  code: string;
  name: string;
  level: number;
  parentAgentId?: string;
  childAgents: AgentHierarchyDto[];
  managedUsersCount: number;
}

export class ManagedUserDto {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  isActive: boolean;
  createdAt: Date;
  managingAgent: {
    id: string;
    code: string;
    name: string;
  };
}
