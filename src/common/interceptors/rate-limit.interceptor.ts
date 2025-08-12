import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { CacheService } from '../../redis/cache.service';

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  constructor(private readonly cacheService: CacheService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const ip = 'default-ip';
    const endpoint = 'default-endpoint';

    const rateLimit = await this.cacheService.checkRateLimit(ip, endpoint, 100);

    if (!rateLimit.allowed) {
      throw new HttpException(
        {
          message: 'Too Many Requests',
          error: 'Rate limit exceeded',
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return next.handle();
  }
}
