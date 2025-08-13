import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from '../entities/agent.entity';
import { User, UserType } from '../../users/entities/user.entity';
import { BaseService } from '../../common/services/base.service';
import { AppLoggerService } from '../../common/services/logger.service';

@Injectable()
export class AgentsService extends BaseService<Agent> {
  constructor(
    @InjectRepository(Agent)
    private readonly agentsRepository: Repository<Agent>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly logger: AppLoggerService,
  ) {
    super(agentsRepository);
  }

  async createAgent(
    code: string,
    name: string,
    userId: string,
    parentAgentId?: string,
    description?: string,
  ): Promise<Agent> {
    // Check if agent code already exists
    const existingAgent = await this.agentsRepository.findOne({
      where: { code },
    });

    if (existingAgent) {
      throw new ConflictException('Agent with this code already exists');
    }

    // Check if user exists and is not already an agent
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['agent'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.agent) {
      throw new ConflictException('User is already an agent');
    }

    let parentAgent: Agent | null = null;
    let level = 0;
    let path = '/';

    // If parent agent is specified, validate hierarchy
    if (parentAgentId) {
      parentAgent = await this.agentsRepository.findOne({
        where: { id: parentAgentId },
      });

      if (!parentAgent) {
        throw new NotFoundException('Parent agent not found');
      }

      level = parentAgent.level + 1;
      path = parentAgent.getFullPath();
    }

    // Create agent
    const agent = this.agentsRepository.create({
      code,
      name,
      description,
      userId,
      parentAgentId,
      level,
      path,
    });

    const savedAgent = await this.agentsRepository.save(agent);

    // Update user type to agent
    await this.usersRepository.update(userId, {
      userType: UserType.AGENT,
    });

    this.logger.log(
      `Agent created: ${savedAgent.code} for user ${user.username}`,
    );
    return savedAgent;
  }

  async findAgentWithHierarchy(id: string): Promise<Agent> {
    const agent = await this.agentsRepository.findOne({
      where: { id },
      relations: ['user', 'parentAgent', 'childAgents', 'managedUsers'],
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }

    return agent;
  }

  async getAgentHierarchy(agentId: string): Promise<Agent[]> {
    const agent = await this.findAgentWithHierarchy(agentId);

    // Get all descendant agents
    const descendants = await this.agentsRepository
      .createQueryBuilder('agent')
      .where('agent.path LIKE :path', { path: `${agent.getFullPath()}%` })
      .orderBy('agent.level', 'ASC')
      .addOrderBy('agent.name', 'ASC')
      .getMany();

    return [agent, ...descendants];
  }

  async getManagedUsers(
    agentId: string,
    currentUserId: string,
  ): Promise<User[]> {
    // Verify that current user can access this agent's data
    await this.verifyAgentAccess(agentId, currentUserId);

    // Get all users managed by this agent and its descendants
    const agentHierarchy = await this.getAgentHierarchy(agentId);
    const agentIds = agentHierarchy.map((a) => a.id);

    const managedUsers = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.managingAgent', 'managingAgent')
      .where('user.managingAgentId IN (:...agentIds)', { agentIds })
      .orderBy('user.username', 'ASC')
      .getMany();

    return managedUsers;
  }

  async assignUserToAgent(
    agentId: string,
    userId: string,
    currentUserId: string,
  ): Promise<void> {
    // Verify that current user can manage this agent
    await this.verifyAgentAccess(agentId, currentUserId);

    const [agent, user] = await Promise.all([
      this.findAgentWithHierarchy(agentId),
      this.usersRepository.findOne({ where: { id: userId } }),
    ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.userType === UserType.AGENT) {
      throw new BadRequestException('Cannot assign an agent as a managed user');
    }

    await this.usersRepository.update(userId, {
      managingAgentId: agentId,
    });

    this.logger.log(`User ${user.username} assigned to agent ${agent.code}`);
  }

  async removeUserFromAgent(
    userId: string,
    currentUserId: string,
  ): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['managingAgent'],
    });

    if (!user || !user.managingAgent) {
      throw new NotFoundException('User or managing agent not found');
    }

    // Verify that current user can manage this agent
    await this.verifyAgentAccess(user.managingAgent.id, currentUserId);

    await this.usersRepository.update(userId, {
      managingAgentId: undefined,
    });

    this.logger.log(
      `User ${user.username} removed from agent ${user.managingAgent.code}`,
    );
  }

  async verifyAgentAccess(
    agentId: string,
    currentUserId: string,
  ): Promise<void> {
    const currentUser = await this.usersRepository.findOne({
      where: { id: currentUserId },
      relations: ['agent'],
    });

    if (!currentUser || !currentUser.agent) {
      throw new ForbiddenException('Only agents can access this resource');
    }

    const targetAgent = await this.agentsRepository.findOne({
      where: { id: agentId },
    });

    if (!targetAgent) {
      throw new NotFoundException('Target agent not found');
    }

    // Allow access if:
    // 1. Current user is the same agent
    // 2. Current user is an ancestor of the target agent
    if (
      currentUser.agent.id === agentId ||
      targetAgent.isDescendantOf(currentUser.agent)
    ) {
      return;
    }

    throw new ForbiddenException('Access denied to this agent');
  }

  async updateAgentHierarchy(
    agentId: string,
    newParentAgentId?: string,
  ): Promise<Agent> {
    const agent = await this.findAgentWithHierarchy(agentId);

    let newLevel = 0;
    let newPath = '/';

    if (newParentAgentId) {
      const newParentAgent = await this.agentsRepository.findOne({
        where: { id: newParentAgentId },
      });

      if (!newParentAgent) {
        throw new NotFoundException('New parent agent not found');
      }

      // Prevent circular reference
      if (newParentAgent.isDescendantOf(agent)) {
        throw new BadRequestException(
          'Cannot move agent to its own descendant',
        );
      }

      newLevel = newParentAgent.level + 1;
      newPath = newParentAgent.getFullPath();
    }

    // Update the agent
    agent.parentAgentId = newParentAgentId || undefined;
    agent.level = newLevel;
    agent.path = newPath;

    const updatedAgent = await this.agentsRepository.save(agent);

    // Update all descendant agents' paths and levels
    await this.updateDescendantPaths(agent);

    this.logger.log(`Agent hierarchy updated for ${agent.code}`);
    return updatedAgent;
  }

  private async updateDescendantPaths(parentAgent: Agent): Promise<void> {
    const descendants = await this.agentsRepository
      .createQueryBuilder('agent')
      .where('agent.path LIKE :path', {
        path: `${parentAgent.getFullPath()}%`,
      })
      .getMany();

    for (const descendant of descendants) {
      const pathParts = descendant.path?.split('/').filter(Boolean) || [];
      const parentIndex = pathParts.indexOf(parentAgent.id);

      if (parentIndex !== -1) {
        descendant.level =
          parentAgent.level + 1 + (pathParts.length - parentIndex - 1);
        descendant.path =
          parentAgent.getFullPath() +
          pathParts.slice(parentIndex + 1).join('/') +
          '/';
        await this.agentsRepository.save(descendant);
      }
    }
  }

  // Base service abstract methods implementation
  protected getEntityName(): string {
    return 'Agent';
  }

  protected getSearchableFields(): string[] {
    return ['code', 'name', 'description'];
  }

  protected getValidSortFields(): string[] {
    return ['code', 'name', 'level', 'createdAt', 'updatedAt'];
  }
}
