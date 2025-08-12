import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('posts')
export class Post extends BaseEntity {
  @Column({ length: 255 })
  title: string;

  @Column({ length: 500, nullable: true })
  excerpt?: string;

  @Column('text')
  content: string;

  @Column({ length: 255, unique: true })
  slug: string;

  @Column({ default: 'draft' })
  status: 'draft' | 'published' | 'archived';

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date;

  // Many-to-One: Nhiều posts thuộc về 1 user (author)
  @ManyToOne(() => User, (user) => user.posts, {
    onDelete: 'CASCADE', // Xóa user thì xóa tất cả posts
  })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column()
  author_id: string; // Foreign key

  // One-to-Many: 1 post có nhiều comments
  @OneToMany(() => Comment, (comment) => comment.post, {
    cascade: true,
  })
  comments: Comment[];

  // Many-to-Many: Posts có nhiều tags, tags có nhiều posts
  @ManyToMany(() => Tag, (tag) => tag.posts, {
    cascade: true,
  })
  @JoinTable({
    name: 'post_tags',
    joinColumn: { name: 'post_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags: Tag[];
}

@Entity('comments')
export class Comment extends BaseEntity {
  @Column('text')
  content: string;

  @Column({ default: 'approved' })
  status: 'pending' | 'approved' | 'rejected';

  // Many-to-One: Nhiều comments thuộc về 1 post
  @ManyToOne(() => Post, (post) => post.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @Column()
  post_id: string;

  // Many-to-One: Nhiều comments thuộc về 1 user
  @ManyToOne(() => User, (user) => user.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column()
  author_id: string;

  // Self-referencing: Comment có thể reply comment khác
  @ManyToOne(() => Comment, (comment) => comment.replies, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parent_id' })
  parent?: Comment;

  @Column({ nullable: true })
  parent_id?: string;

  @OneToMany(() => Comment, (comment) => comment.parent)
  replies: Comment[];
}

@Entity('tags')
export class Tag extends BaseEntity {
  @Column({ unique: true, length: 50 })
  name: string;

  @Column({ unique: true, length: 50 })
  slug: string;

  @Column({ nullable: true, length: 255 })
  description?: string;

  @Column({ nullable: true, length: 7 })
  color?: string; // Hex color code

  // Many-to-Many: Tags có nhiều posts
  @ManyToMany(() => Post, (post) => post.tags)
  posts: Post[];
}
