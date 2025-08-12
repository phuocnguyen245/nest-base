import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsService } from './posts.service';
import { PostsController, TagsController } from './posts.controller';
import { Post, Comment, Tag } from './entities/post.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Post, Comment, Tag])],
  controllers: [PostsController, TagsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
