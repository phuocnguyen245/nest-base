import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AgentsService } from '../services/agents.service';
import {
  CreateAgentDto,
  UpdateAgentDto,
  UpdateAgentHierarchyDto,
  AssignUserToAgentDto,
  AgentResponseDto,
  AgentHierarchyDto,
  ManagedUserDto,
} from '../dto/agent.dto';

import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginationResult } from '../../common/interfaces/base.interface';
import { User } from '../../users/entities/user.entity';
import { plainToClass } from 'class-transformer';
import { Agent } from '../entities/agent.entity';

@Controller('agents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  @Permissions('agents.create')
  @HttpCode(HttpStatus.CREATED)
  async createAgent(
    @Body() createAgentDto: CreateAgentDto,
    @CurrentUser() currentUser: User,
  ): Promise<AgentResponseDto> {
    const agent = await this.agentsService.createAgent(
      createAgentDto.code,
      createAgentDto.name,
      createAgentDto.userId,
      createAgentDto.parentAgentId,
      createAgentDto.description,
    );

    const agentWithRelations = await this.agentsService.findAgentWithHierarchy(
      agent.id,
    );
    return this.transformToResponseDto(agentWithRelations);
  }

  @Get()
  @Permissions('agents.read')
  async findAllAgents(
    @Query() paginationDto: PaginationDto,
    @CurrentUser() currentUser: User,
  ): Promise<PaginationResult<AgentResponseDto>> {
    const result = await this.agentsService.findAll(paginationDto);

    const transformedData = result.data.map((agent) =>
      this.transformToResponseDto(agent),
    );

    return {
      ...result,
      data: transformedData,
    };
  }

  @Get(':id')
  @Permissions('agents.read')
  async findOneAgent(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<AgentResponseDto> {
    // Verify access permission
    await this.agentsService.verifyAgentAccess(id, currentUser.id);

    const agent = await this.agentsService.findAgentWithHierarchy(id);
    return this.transformToResponseDto(agent);
  }

  @Get(':id/hierarchy')
  @Permissions('agents.read')
  async getAgentHierarchy(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<AgentHierarchyDto[]> {
    // Verify access permission
    await this.agentsService.verifyAgentAccess(id, currentUser.id);

    const hierarchy = await this.agentsService.getAgentHierarchy(id);
    return hierarchy.map((agent) => this.transformToHierarchyDto(agent));
  }

  @Get(':id/managed-users')
  @Permissions('agents.read', 'users.read')
  async getManagedUsers(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<ManagedUserDto[]> {
    const managedUsers = await this.agentsService.getManagedUsers(
      id,
      currentUser.id,
    );
    return managedUsers.map((user) => this.transformToManagedUserDto(user));
  }

  @Put(':id')
  @Permissions('agents.update')
  async updateAgent(
    @Param('id') id: string,
    @Body() updateAgentDto: UpdateAgentDto,
    @CurrentUser() currentUser: User,
  ): Promise<AgentResponseDto> {
    // Verify access permission
    await this.agentsService.verifyAgentAccess(id, currentUser.id);

    const agent = await this.agentsService.findOne(id);
    Object.assign(agent, updateAgentDto);

    const updatedAgent = await this.agentsService.update(id, updateAgentDto);
    const agentWithRelations = await this.agentsService.findAgentWithHierarchy(
      updatedAgent.id,
    );

    return this.transformToResponseDto(agentWithRelations);
  }

  @Put(':id/hierarchy')
  @Permissions('agents.update')
  async updateAgentHierarchy(
    @Param('id') id: string,
    @Body() updateHierarchyDto: UpdateAgentHierarchyDto,
    @CurrentUser() currentUser: User,
  ): Promise<AgentResponseDto> {
    // Verify access permission
    await this.agentsService.verifyAgentAccess(id, currentUser.id);

    const updatedAgent = await this.agentsService.updateAgentHierarchy(
      id,
      updateHierarchyDto.parentAgentId,
    );

    const agentWithRelations = await this.agentsService.findAgentWithHierarchy(
      updatedAgent.id,
    );
    return this.transformToResponseDto(agentWithRelations);
  }

  @Post('assign-user')
  @Permissions('agents.manage-users')
  @HttpCode(HttpStatus.OK)
  async assignUserToAgent(
    @Body() assignUserDto: AssignUserToAgentDto,
    @CurrentUser() currentUser: User,
  ): Promise<{ message: string }> {
    await this.agentsService.assignUserToAgent(
      assignUserDto.agentId,
      assignUserDto.userId,
      currentUser.id,
    );

    return { message: 'User assigned to agent successfully' };
  }

  @Delete('remove-user/:userId')
  @Permissions('agents.manage-users')
  @HttpCode(HttpStatus.OK)
  async removeUserFromAgent(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: User,
  ): Promise<{ message: string }> {
    await this.agentsService.removeUserFromAgent(userId, currentUser.id);
    return { message: 'User removed from agent successfully' };
  }

  @Delete(':id')
  @Permissions('agents.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAgent(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<void> {
    // Verify access permission
    await this.agentsService.verifyAgentAccess(id, currentUser.id);

    await this.agentsService.remove(id);
  }

  private transformToResponseDto(agent: Agent): AgentResponseDto {
    return plainToClass(AgentResponseDto, {
      id: agent.id,
      code: agent.code,
      name: agent.name,
      description: agent.description,
      parentAgentId: agent.parentAgentId,
      level: agent.level,
      path: agent.path,
      isActive: agent.isActive,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      user: agent.user
        ? {
            id: agent.user.id,
            username: agent.user.username,
            email: agent.user.email,
            fullName: agent.user.fullName,
          }
        : undefined,
      parentAgent: agent.parentAgent
        ? {
            id: agent.parentAgent.id,
            code: agent.parentAgent.code,
            name: agent.parentAgent.name,
          }
        : undefined,
      childAgents: agent.childAgents?.map((child) => ({
        id: child.id,
        code: child.code,
        name: child.name,
        level: child.level,
      })),
      managedUsersCount: agent.managedUsers?.length || 0,
    });
  }

  private transformToHierarchyDto(agent: Agent): AgentHierarchyDto {
    return {
      id: agent.id,
      code: agent.code,
      name: agent.name,
      level: agent.level,
      parentAgentId: agent.parentAgentId,
      childAgents:
        agent.childAgents?.map((child) =>
          this.transformToHierarchyDto(child),
        ) || [],
      managedUsersCount: agent.managedUsers?.length || 0,
    };
  }

  private transformToManagedUserDto(user: User): ManagedUserDto {
    return plainToClass(ManagedUserDto, {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      isActive: user.isActive,
      createdAt: user.createdAt,
      managingAgent: user.managingAgent
        ? {
            id: user.managingAgent.id,
            code: user.managingAgent.code,
            name: user.managingAgent.name,
          }
        : undefined,
    });
  }
}
