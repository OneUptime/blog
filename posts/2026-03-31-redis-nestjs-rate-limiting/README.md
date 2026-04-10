# How to Build NestJS Rate Limiting with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, NestJS, Rate Limiting, Guard, Node.js

Description: Implement Redis-backed rate limiting in NestJS using ThrottlerModule with a Redis storage adapter or a custom Guard for per-user API quotas.

---

NestJS's built-in `ThrottlerModule` defaults to in-memory storage, which breaks in multi-instance deployments. Switching to a Redis-backed storage adapter shares rate limit counters across all instances.

## Option 1: ThrottlerModule with Redis Storage

### Install Dependencies

```bash
npm install @nestjs/throttler @nest-lab/throttler-storage-redis ioredis
```

### Register the Module

```typescript
// app.module.ts
import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";
import Redis from "ioredis";

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 60 }],  // 60 requests per minute
      storage: new ThrottlerStorageRedisService(
        new Redis({ host: "localhost", port: 6379 })
      ),
    }),
  ],
})
export class AppModule {}
```

### Apply the Guard

```typescript
// main.ts or specific controllers
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard } from "@nestjs/throttler";

// In AppModule providers:
{ provide: APP_GUARD, useClass: ThrottlerGuard }
```

Override limits per route:

```typescript
import { Throttle, SkipThrottle } from "@nestjs/throttler";

@Controller("api")
export class ApiController {

  @Get("public")
  @Throttle({ default: { ttl: 60000, limit: 100 } })
  publicEndpoint() { return "open"; }

  @Post("login")
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  login() { return "auth"; }

  @Get("health")
  @SkipThrottle()
  health() { return "ok"; }
}
```

## Option 2: Custom Redis Guard

For fine-grained control with per-user limits:

```typescript
import { CanActivate, ExecutionContext, Injectable, HttpException } from "@nestjs/common";
import { InjectRedis } from "@nestjs-modules/ioredis";
import Redis from "ioredis";

@Injectable()
export class RateLimitGuard implements CanActivate {

  constructor(@InjectRedis() private redis: Redis) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const identifier = req.user?.id ?? req.ip;
    const key = `rl:${identifier}:${Math.floor(Date.now() / 60000)}`;

    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, 60);

    if (count > 60) {
      throw new HttpException("Too Many Requests", 429);
    }
    return true;
  }
}
```

## Test

```bash
for i in $(seq 1 65); do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/public
done
```

## Check Redis Keys

```bash
redis-cli keys "rl:*"
redis-cli ttl "rl:127.0.0.1:28044140"
```

## Summary

NestJS rate limiting with Redis ensures consistent quotas across all application instances. `ThrottlerModule` with `ThrottlerStorageRedisService` provides the simplest path, requiring only module configuration and a guard registration. A custom `CanActivate` guard offers more control for user-aware limits or complex quota logic. Both approaches use Redis atomic increment and TTL expiry to count requests reliably.
