import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CommonModule } from '../common/common.module';

@Global()
@Module({
  imports: [CommonModule],
  providers: [CacheService],
  exports: [CacheService],
})
export class RedisModule {}
