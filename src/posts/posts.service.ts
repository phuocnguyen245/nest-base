import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../common/services/base.service';
import { Post, Comment, Tag } from './entities/post.entity';
import {
  CreatePostDto,
  UpdatePostDto,
  CreateCommentDto,
  CreateTagDto,
} from './dto/post.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResult } from '../common/interfaces/base.interface';

@Injectable()
export class PostsService extends BaseService<Post> {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
  ) {
    super(postRepository);
  }

  protected getEntityName(): string {
    return 'Post';
  }

  protected getSearchableFields(): string[] {
    return ['title', 'excerpt', 'content'];
  }

  protected getValidSortFields(): string[] {
    return [
      'title',
      'status',
      'publishedAt',
      'viewCount',
      'createdAt',
      'updatedAt',
    ];
  }

  // Custom methods cho Posts
  async createPosts(
    createPostDto: CreatePostDto,
    authorId: string,
  ): Promise<Post> {
    const { tagIds, ...postData } = createPostDto;

    const post = this.postRepository.create({
      ...postData,
      author_id: authorId,
    });

    if (tagIds && tagIds.length > 0) {
      const tags = await this.tagRepository.findByIds(tagIds);
      post.tags = tags;
    }

    return await this.postRepository.save(post);
  }

  async findAllWithRelations(
    paginationDto: PaginationDto,
  ): Promise<PaginationResult<Post>> {
    const { page = 1, limit = 10, search, sort } = paginationDto;

    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.tags', 'tags')
      .leftJoinAndSelect('post.comments', 'comments');

    // Apply search
    if (search && this.getSearchableFields().length > 0) {
      this.applySearch(queryBuilder, search);
    }

    // Apply sorting
    this.applySorting(queryBuilder, sort);

    queryBuilder.skip((page - 1) * limit).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOneWithRelations(id: string): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id },
      relations: ['author', 'tags', 'comments', 'comments.author'],
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    await this.postRepository.update(id, {
      viewCount: () => 'viewCount + 1',
    });

    return post;
  }

  async findBySlug(slug: string): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { slug },
      relations: ['author', 'tags', 'comments', 'comments.author'],
    });

    if (!post) {
      throw new NotFoundException(`Post with slug "${slug}" not found`);
    }

    return post;
  }

  async updateWithTags(
    id: string,
    updatePostDto: UpdatePostDto,
  ): Promise<Post> {
    const post = await this.findOne(id);
    const { tagIds, ...updateData } = updatePostDto;

    // Update basic fields
    Object.assign(post, updateData);

    // Update tags if provided
    if (tagIds !== undefined) {
      if (tagIds.length > 0) {
        const tags = await this.tagRepository.findByIds(tagIds);
        post.tags = tags;
      } else {
        post.tags = [];
      }
    }

    return await this.postRepository.save(post);
  }

  // Comment methods
  async createComment(
    postId: string,
    createCommentDto: CreateCommentDto,
    authorId: string,
  ): Promise<Comment> {
    const post = await this.findOne(postId);

    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }

    const comment = this.commentRepository.create({
      ...createCommentDto,
      post_id: postId,
      author_id: authorId,
      parent_id: createCommentDto.parentId,
    });

    return await this.commentRepository.save(comment);
  }

  async getPostComments(postId: string): Promise<Comment[]> {
    return await this.commentRepository.find({
      where: { post_id: postId },
      relations: ['author', 'replies', 'replies.author'],
      order: { createdAt: 'DESC' },
    });
  }

  // Tag methods
  async createTag(createTagDto: CreateTagDto): Promise<Tag> {
    const existingTag = await this.tagRepository.findOne({
      where: [{ name: createTagDto.name }, { slug: createTagDto.slug }],
    });

    if (existingTag) {
      throw new BadRequestException(
        'Tag with this name or slug already exists',
      );
    }

    const tag = this.tagRepository.create(createTagDto);
    return await this.tagRepository.save(tag);
  }

  async getAllTags(): Promise<Tag[]> {
    return await this.tagRepository.find({
      relations: ['posts'],
      order: { name: 'ASC' },
    });
  }

  async getPopularTags(limit: number = 10): Promise<Tag[]> {
    return await this.tagRepository
      .createQueryBuilder('tag')
      .leftJoin('tag.posts', 'post')
      .addSelect('COUNT(post.id)', 'postCount')
      .groupBy('tag.id')
      .orderBy('postCount', 'DESC')
      .limit(limit)
      .getMany();
  }
}
