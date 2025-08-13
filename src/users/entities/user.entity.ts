import {
  Entity,
  Column,
  ManyToMany,
  OneToMany,
  OneToOne,
  ManyToOne,
  JoinTable,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Role } from '../../auth/entities/role.entity';
import { Agent } from '../../agents/entities/agent.entity';
import { Post, Comment } from '../../posts/entities/post.entity';
import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcryptjs';

export enum UserType {
  AGENT = 'agent',
  USER = 'user',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ length: 255 })
  @Exclude() // Hide password in responses
  password: string;

  @Column({ nullable: true, length: 100 })
  firstName?: string;

  @Column({ nullable: true, length: 100 })
  lastName?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true, type: 'timestamp' })
  lastLoginAt?: Date;

  @Column({ nullable: true, type: 'text' })
  refreshToken?: string | null;

  @Column({
    type: 'enum',
    enum: UserType,
    default: UserType.USER,
  })
  userType: UserType;

  @Column({ nullable: true })
  managingAgentId?: string;

  @ManyToMany(() => Role, (role) => role.users, {
    cascade: true,
    eager: false,
  })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  // Agent relationship - if this user is an agent
  @OneToOne(() => Agent, (agent) => agent.user, { nullable: true })
  agent?: Agent;

  // Managing agent - which agent manages this user
  @ManyToOne(() => Agent, (agent) => agent.managedUsers, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'managingAgentId' })
  managingAgent?: Agent;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2')) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  get fullName(): string {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim();
  }

  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];

  @JoinTable({
    name: 'user_posts',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'post_id', referencedColumnName: 'id' },
  })
  @OneToMany(() => Comment, (comment) => comment.author)
  comments: Comment[];
}
