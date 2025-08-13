import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('agents')
export class Agent extends BaseEntity {
  @Column({ unique: true, length: 50 })
  code: string; // Agent code for easy identification

  @Column({ length: 255 })
  name: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ nullable: true })
  parentAgentId?: string;

  @Column()
  userId: string; // Reference to the user who is this agent

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  level: number; // Hierarchy level (0 = root, 1 = level 1, etc.)

  @Column({ nullable: true, type: 'text' })
  path?: string; // Materialized path for efficient hierarchy queries (e.g., "/1/2/3/")

  // Self-referencing relationship for hierarchy
  @ManyToOne(() => Agent, (agent) => agent.childAgents, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parentAgentId' })
  parentAgent?: Agent;

  @OneToMany(() => Agent, (agent) => agent.parentAgent)
  childAgents: Agent[];

  // One-to-one relationship with User
  @OneToOne(() => User, (user) => user.agent)
  @JoinColumn({ name: 'userId' })
  user: User;

  // Users managed by this agent
  @OneToMany(() => User, (user) => user.managingAgent)
  managedUsers: User[];

  // Helper methods for hierarchy management
  getFullPath(): string {
    if (this.path) {
      return this.path + this.id + '/';
    }
    return '/' + this.id + '/';
  }

  isDescendantOf(agent: Agent): boolean {
    if (!this.path || !agent.id) return false;
    return this.path.includes('/' + agent.id + '/');
  }

  isAncestorOf(agent: Agent): boolean {
    if (!agent.path || !this.id) return false;
    return agent.path.includes('/' + this.id + '/');
  }

  // Get all ancestor agent IDs
  getAncestorIds(): string[] {
    if (!this.path) return [];
    return this.path.split('/').filter((id) => id && id !== this.id);
  }
}
