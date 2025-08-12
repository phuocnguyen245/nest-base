import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AppLoggerService } from '../common/services/logger.service';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;
  private isRedisAvailable = false;
  private fallbackCache = new Map<string, { value: string; expiry?: number }>();

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: redisPassword || undefined,
      db: this.configService.get<number>('REDIS_DB', 0),
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
      connectTimeout: 5000,
      commandTimeout: 3000,
    });

    this.redis.on('connect', () => {
      this.logger.debug('Redis socket connected', 'CacheService');
    });

    this.redis.on('ready', () => {
      this.isRedisAvailable = true;
      this.logger.log(
        'Redis connected and ready for operations',
        'CacheService',
      );
    });

    this.redis.on('error', (error) => {
      this.isRedisAvailable = false;
      this.logger.warn(
        `Redis error, switching to fallback cache: ${error.message}`,
        'CacheService',
      );
    });

    this.redis.on('close', () => {
      this.isRedisAvailable = false;
      this.logger.warn(
        'Redis connection closed, using fallback cache',
        'CacheService',
      );
    });
  }

  async onModuleInit() {
    try {
      await this.redis.connect().catch(() => {
        this.logger.warn(
          'Redis connection failed, using fallback cache',
          'CacheService',
        );
      });
      this.logger.log(
        'Redis service initialized (with Redis/fallback mode)',
        'CacheService',
      );
    } catch {
      this.logger.warn(
        'Redis connection failed, using fallback cache',
        'CacheService',
      );
    }
  }

  onModuleDestroy() {
    try {
      this.redis.disconnect();
      this.fallbackCache.clear();
      this.logger.log('Cache service destroyed', 'CacheService');
    } catch (error) {
      this.logger.logError(
        error as Error,
        'Error disconnecting Redis',
        'CacheService',
      );
    }
  }

  private fallbackGet(key: string): string | null {
    const item = this.fallbackCache.get(key);
    if (!item) return null;

    if (item.expiry && Date.now() > item.expiry) {
      this.fallbackCache.delete(key);
      return null;
    }

    return item.value;
  }

  private fallbackSet(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): boolean {
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.fallbackCache.set(key, { value, expiry });
    return true;
  }

  private fallbackDel(key: string): boolean {
    return this.fallbackCache.delete(key);
  }

  async isHealthy(): Promise<boolean> {
    if (!this.isRedisAvailable) {
      return true;
    }

    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch {
      return true;
    }
  }

  async ping(): Promise<string> {
    if (!this.isRedisAvailable) {
      return 'FALLBACK_MODE';
    }

    try {
      return await this.redis.ping();
    } catch (error) {
      this.logger.logError(error as Error, 'Redis ping failed', 'CacheService');
      return 'FALLBACK_MODE';
    }
  }

  async getConnectionInfo(): Promise<{
    connected: boolean;
    memoryUsage?: string;
    keyCount?: number;
    uptime?: string;
    mode?: string;
  }> {
    if (!this.isRedisAvailable) {
      return {
        connected: true,
        memoryUsage: `${this.fallbackCache.size}KB (fallback)`,
        keyCount: this.fallbackCache.size,
        uptime: 'N/A',
        mode: 'fallback',
      };
    }

    try {
      const info = await this.redis.info('memory');
      const keyCount = await this.redis.dbsize();
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const uptimeMatch = info.match(/uptime_in_seconds:(\d+)/);

      return {
        connected: true,
        memoryUsage: memoryMatch ? memoryMatch[1].trim() : 'unknown',
        keyCount,
        uptime: uptimeMatch
          ? `${Math.floor(parseInt(uptimeMatch[1]) / 3600)}h`
          : 'unknown',
        mode: 'redis',
      };
    } catch (error) {
      this.logger.logError(error as Error, 'CacheService.getConnectionInfo');
      return {
        connected: true,
        memoryUsage: `${this.fallbackCache.size}KB (fallback)`,
        keyCount: this.fallbackCache.size,
        uptime: 'N/A',
        mode: 'fallback',
      };
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isRedisAvailable) {
      return this.fallbackGet(key);
    }

    try {
      return await this.redis.get(key);
    } catch (error) {
      this.logger.logError(error as Error, 'CacheService.get', { key });
      return this.fallbackGet(key);
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (!this.isRedisAvailable) {
      return this.fallbackSet(key, value, ttlSeconds);
    }

    try {
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, value);
      } else {
        await this.redis.set(key, value);
      }
      return true;
    } catch (error) {
      this.logger.logError(error as Error, 'CacheService.set', {
        key,
        ttlSeconds,
      });
      return this.fallbackSet(key, value, ttlSeconds);
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.isRedisAvailable) {
      return this.fallbackDel(key);
    }

    try {
      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      this.logger.logError(error as Error, 'CacheService.del', { key });
      return this.fallbackDel(key);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.logError(error as Error, 'CacheService.exists', { key });
      return false;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const result = await this.redis.expire(key, ttlSeconds);
      return result === 1;
    } catch (error) {
      this.logger.logError(error as Error, 'CacheService.expire', {
        key,
        ttlSeconds,
      });
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      this.logger.logError(error as Error, 'CacheService.ttl', { key });
      return -1;
    }
  }

  async incr(key: string): Promise<number> {
    try {
      return await this.redis.incr(key);
    } catch (error) {
      this.logger.logError(error as Error, 'CacheService.incr', { key });
      return 1;
    }
  }

  async getObject<T>(key: string): Promise<T | null> {
    try {
      const value = await this.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      this.logger.logError(error as Error, 'CacheService.getObject', { key });
      return null;
    }
  }

  async setObject(
    key: string,
    value: unknown,
    ttlSeconds?: number,
  ): Promise<boolean> {
    try {
      const jsonValue = JSON.stringify(value);
      return await this.set(key, jsonValue, ttlSeconds);
    } catch (error) {
      this.logger.logError(error as Error, 'CacheService.setObject', {
        key,
        ttlSeconds,
      });
      return false;
    }
  }

  async hget(hash: string, field: string): Promise<string | null> {
    try {
      return await this.redis.hget(hash, field);
    } catch (error) {
      this.logger.logError(error as Error, 'CacheService.hget', {
        hash,
        field,
      });
      return null;
    }
  }

  async hset(hash: string, field: string, value: string): Promise<boolean> {
    try {
      await this.redis.hset(hash, field, value);
      return true;
    } catch (error) {
      this.logger.logError(error as Error, 'CacheService.hset', {
        hash,
        field,
      });
      return false;
    }
  }

  async hgetall(hash: string): Promise<Record<string, string> | null> {
    try {
      const result = await this.redis.hgetall(hash);
      return Object.keys(result).length > 0 ? result : null;
    } catch (error) {
      this.logger.logError(error as Error, 'CacheService.hgetall', { hash });
      return null;
    }
  }

  async lpush(key: string, ...values: string[]): Promise<number | null> {
    try {
      return await this.redis.lpush(key, ...values);
    } catch (error) {
      this.logger.logError(error as Error, 'CacheService.lpush', {
        key,
        valuesCount: values.length,
      });
      return null;
    }
  }

  async rpop(key: string): Promise<string | null> {
    try {
      return await this.redis.rpop(key);
    } catch (error) {
      this.logger.logError(error as Error, 'CacheService.rpop', { key });
      return null;
    }
  }

  private static readonly CACHE_KEYS = {
    USER_SESSION: (userId: string) => `user:session:${userId}`,
    USER_PROFILE: (userId: string) => `user:profile:${userId}`,
    POST_VIEW_COUNT: (postId: string) => `post:views:${postId}`,
    API_RATE_LIMIT: (ip: string, endpoint: string) =>
      `rate_limit:${ip}:${endpoint}`,
    AUTH_REFRESH_TOKEN: (userId: string) => `auth:refresh:${userId}`,
  };

  private static readonly TTL = {
    USER_SESSION: 7 * 24 * 60 * 60,
    USER_PROFILE: 60 * 60,
    POST_VIEW_COUNT: 24 * 60 * 60,
    API_RATE_LIMIT: 60 * 60,
    AUTH_REFRESH_TOKEN: 7 * 24 * 60 * 60,
  };

  async setUserSession(userId: string, sessionData: unknown): Promise<boolean> {
    const key = CacheService.CACHE_KEYS.USER_SESSION(userId);
    return await this.setObject(
      key,
      sessionData,
      CacheService.TTL.USER_SESSION,
    );
  }

  async getUserSession(
    userId: string,
  ): Promise<Record<string, unknown> | null> {
    const key = CacheService.CACHE_KEYS.USER_SESSION(userId);
    return await this.getObject(key);
  }

  async deleteUserSession(userId: string): Promise<boolean> {
    const key = CacheService.CACHE_KEYS.USER_SESSION(userId);
    return await this.del(key);
  }

  // User profile cache
  async setUserProfile(userId: string, profile: unknown): Promise<boolean> {
    const key = CacheService.CACHE_KEYS.USER_PROFILE(userId);
    return await this.setObject(key, profile, CacheService.TTL.USER_PROFILE);
  }

  async getUserProfile(
    userId: string,
  ): Promise<Record<string, unknown> | null> {
    const key = CacheService.CACHE_KEYS.USER_PROFILE(userId);
    return await this.getObject(key);
  }

  async deleteUserProfile(userId: string): Promise<boolean> {
    const key = CacheService.CACHE_KEYS.USER_PROFILE(userId);
    return await this.del(key);
  }

  async incrementPostViewCount(postId: string): Promise<number | null> {
    const key = CacheService.CACHE_KEYS.POST_VIEW_COUNT(postId);
    try {
      const count = await this.incr(key);
      await this.expire(key, CacheService.TTL.POST_VIEW_COUNT);
      return count;
    } catch {
      return null;
    }
  }

  async getPostViewCount(postId: string): Promise<number | null> {
    const key = CacheService.CACHE_KEYS.POST_VIEW_COUNT(postId);
    const count = await this.get(key);
    return count ? parseInt(count, 10) : null;
  }

  async checkRateLimit(
    ip: string,
    endpoint: string,
    maxRequests: number = 100,
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = CacheService.CACHE_KEYS.API_RATE_LIMIT(ip, endpoint);

    try {
      const count = await this.incr(key);
      if (count === 1) {
        await this.expire(key, CacheService.TTL.API_RATE_LIMIT);
      }

      const ttl = await this.ttl(key);
      const remaining = Math.max(0, maxRequests - count);
      const resetTime = Date.now() + ttl * 1000;

      return {
        allowed: count <= maxRequests,
        remaining,
        resetTime,
      };
    } catch {
      return {
        allowed: true,
        remaining: maxRequests,
        resetTime: Date.now() + CacheService.TTL.API_RATE_LIMIT * 1000,
      };
    }
  }

  async setRefreshToken(userId: string, token: string): Promise<boolean> {
    const key = CacheService.CACHE_KEYS.AUTH_REFRESH_TOKEN(userId);
    return await this.set(key, token, CacheService.TTL.AUTH_REFRESH_TOKEN);
  }

  async getRefreshToken(userId: string): Promise<string | null> {
    const key = CacheService.CACHE_KEYS.AUTH_REFRESH_TOKEN(userId);
    return await this.get(key);
  }

  async deleteRefreshToken(userId: string): Promise<boolean> {
    const key = CacheService.CACHE_KEYS.AUTH_REFRESH_TOKEN(userId);
    return await this.del(key);
  }

  async cacheData<T>(
    key: string,
    value: T,
    ttlSeconds: number = 3600,
  ): Promise<boolean> {
    return await this.setObject(key, value, ttlSeconds);
  }

  async getCache<T>(key: string): Promise<T | null> {
    return await this.getObject<T>(key);
  }

  async deleteCache(key: string): Promise<boolean> {
    return await this.del(key);
  }

  async clearUserCache(userId: string): Promise<void> {
    await Promise.all([
      this.deleteUserSession(userId),
      this.deleteUserProfile(userId),
      this.deleteRefreshToken(userId),
    ]);
  }

  async flushall(): Promise<boolean> {
    try {
      await this.redis.flushall();
      return true;
    } catch (error) {
      this.logger.logError(error as Error, 'CacheService.flushall');
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      this.logger.logError(error as Error, 'CacheService.keys', { pattern });
      return [];
    }
  }

  getRedisClient(): Redis {
    return this.redis;
  }
}
