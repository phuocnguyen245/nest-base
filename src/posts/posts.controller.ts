import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';

import { PostsService } from './posts.service';
import {
  CreatePostDto,
  UpdatePostDto,
  CreateCommentDto,
  CreateTagDto,
} from './dto/post.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() createPostDto: CreatePostDto,
    @CurrentUser() user: User,
  ) {
    const payload = {
      ...createPostDto,
      authorId: user.id,
    };
    return await this.postsService.create(payload);
  }

  @Get()
  async findAll(@Query() paginationDto: PaginationDto) {
    return await this.postsService.findAllWithRelations(paginationDto);
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return await this.postsService.findBySlug(slug);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.postsService.findOneWithRelations(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
    return await this.postsService.updateWithTags(id, updatePostDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string) {
    return await this.postsService.remove(id);
  }

  // Comment endpoints
  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  async createComment(
    @Param('id') postId: string,
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() user: User,
  ) {
    return await this.postsService.createComment(
      postId,
      createCommentDto,
      user.id,
    );
  }

  @Get(':id/comments')
  async getComments(@Param('id') postId: string) {
    return await this.postsService.getPostComments(postId);
  }
}

@Controller('tags')
export class TagsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createTagDto: CreateTagDto) {
    return await this.postsService.createTag(createTagDto);
  }

  @Get()
  async findAll() {
    return await this.postsService.getAllTags();
  }

  @Get('popular')
  async getPopular(@Query('limit') limit?: number) {
    return await this.postsService.getPopularTags(limit ? Number(limit) : 10);
  }
}
