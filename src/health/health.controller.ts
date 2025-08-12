import { Controller, Get } from '@nestjs/common';
import { CacheService } from '../redis/cache.service';

@Controller('health')
export class HealthController {
  constructor(private readonly cacheService: CacheService) {}

  @Get()
  async check() {
    const redisInfo = await this.cacheService.getConnectionInfo();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used:
          Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) /
          100,
        total:
          Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) /
          100,
      },
      environment: process.env.NODE_ENV || 'development',
      redis: {
        connected: redisInfo.connected,
        memoryUsage: redisInfo.memoryUsage,
        keyCount: redisInfo.keyCount,
        uptime: redisInfo.uptime,
        mode: redisInfo.mode,
      },
    };
  }
}
