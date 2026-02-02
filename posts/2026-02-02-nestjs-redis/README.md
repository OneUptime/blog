# How to Use Redis with NestJS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: TypeScript, NestJS, Redis, Caching, Performance

Description: Learn how to integrate Redis with NestJS for caching, session storage, pub/sub messaging, and job queues with practical examples.

---

Redis is the go-to choice for caching in Node.js applications, and NestJS makes integrating it surprisingly straightforward. Whether you need to cache API responses, implement pub/sub messaging, or run background jobs with queues, NestJS has first-class packages that handle the heavy lifting. This guide covers practical patterns you can use in production.

## Setting Up the Cache Module

NestJS provides `@nestjs/cache-manager` which abstracts caching operations. By default it uses an in-memory store, but switching to Redis takes just a few lines.

```bash
npm install @nestjs/cache-manager cache-manager cache-manager-redis-yet redis
```

Configure Redis as your cache store in the app module:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true, // Makes cache available throughout the app
      useFactory: async () => ({
        store: await redisStore({
          socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT) || 6379,
          },
          password: process.env.REDIS_PASSWORD,
          ttl: 60000, // Default TTL in milliseconds
        }),
      }),
    }),
  ],
})
export class AppModule {}
```

## Cache Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `socket.host` | Redis server hostname | localhost |
| `socket.port` | Redis server port | 6379 |
| `password` | Redis authentication password | undefined |
| `ttl` | Default time-to-live in milliseconds | 0 (no expiry) |
| `max` | Maximum number of items in cache | unlimited |
| `database` | Redis database index (0-15) | 0 |

## Using the Cache Interceptor

The simplest way to cache responses is with the built-in interceptor. It automatically caches GET requests and returns cached responses for subsequent calls.

```typescript
// products.controller.ts
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL, CacheKey } from '@nestjs/cache-manager';
import { ProductsService } from './products.service';

@Controller('products')
@UseInterceptors(CacheInterceptor) // Cache all GET endpoints in this controller
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @CacheTTL(30000) // Cache for 30 seconds (overrides default)
  findAll() {
    // This query only runs if cache is empty or expired
    return this.productsService.findAll();
  }

  @Get('featured')
  @CacheKey('featured-products') // Custom cache key instead of URL
  @CacheTTL(60000) // Featured products cached for 1 minute
  getFeatured() {
    return this.productsService.getFeatured();
  }
}
```

## Manual Cache Operations

For more control, inject the cache manager directly and handle caching manually.

```typescript
// users.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    @InjectRepository(User) private usersRepo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const cacheKey = `user:${id}`;

    // Check cache first
    const cached = await this.cache.get<User>(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from database
    const user = await this.usersRepo.findOne({ where: { id } });

    if (user) {
      // Store in cache for 5 minutes
      await this.cache.set(cacheKey, user, 300000);
    }

    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    await this.usersRepo.update(id, data);

    // Invalidate cache after update
    await this.cache.del(`user:${id}`);

    return this.findById(id);
  }

  async clearAllUserCache(): Promise<void> {
    // Reset the entire cache store
    await this.cache.reset();
  }
}
```

## Pub/Sub with Redis

Redis pub/sub is useful for real-time features where you need to broadcast events across multiple server instances. NestJS doesn't have a built-in pub/sub module, but it's easy to set up with the Redis client.

```typescript
// redis-pubsub.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisPubSubService implements OnModuleInit, OnModuleDestroy {
  private publisher: RedisClientType;
  private subscriber: RedisClientType;

  async onModuleInit() {
    // Create separate clients for pub and sub
    // Redis requires different connections for subscribing
    this.publisher = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    this.subscriber = this.publisher.duplicate();

    await Promise.all([
      this.publisher.connect(),
      this.subscriber.connect(),
    ]);
  }

  async onModuleDestroy() {
    await this.publisher.quit();
    await this.subscriber.quit();
  }

  async publish(channel: string, message: object): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(message));
  }

  async subscribe(
    channel: string,
    callback: (message: object) => void,
  ): Promise<void> {
    await this.subscriber.subscribe(channel, (data) => {
      callback(JSON.parse(data));
    });
  }

  async unsubscribe(channel: string): Promise<void> {
    await this.subscriber.unsubscribe(channel);
  }
}
```

Using the pub/sub service for real-time notifications:

```typescript
// notifications.service.ts
import { Injectable } from '@nestjs/common';
import { RedisPubSubService } from './redis-pubsub.service';

@Injectable()
export class NotificationsService {
  constructor(private pubsub: RedisPubSubService) {
    // Subscribe to order events on startup
    this.pubsub.subscribe('orders', (message) => {
      console.log('Order event received:', message);
      // Push to connected WebSocket clients, send emails, etc.
    });
  }

  async notifyOrderCreated(orderId: string, userId: string) {
    await this.pubsub.publish('orders', {
      event: 'created',
      orderId,
      userId,
      timestamp: new Date().toISOString(),
    });
  }
}
```

## Background Jobs with Bull Queues

For CPU-intensive or time-consuming tasks, Bull queues let you process jobs in the background with Redis as the broker.

```bash
npm install @nestjs/bull bull
```

Register the Bull module with your Redis connection:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
      },
    }),
    // Register specific queues
    BullModule.registerQueue({
      name: 'email', // Queue name for email jobs
    }),
  ],
})
export class AppModule {}
```

Create a processor to handle queued jobs:

```typescript
// email.processor.ts
import { Processor, Process, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { MailerService } from './mailer.service';

interface EmailJob {
  to: string;
  subject: string;
  body: string;
}

@Processor('email') // Matches the queue name from registration
export class EmailProcessor {
  constructor(private mailer: MailerService) {}

  @Process() // Handles jobs without a specific name
  async sendEmail(job: Job<EmailJob>) {
    const { to, subject, body } = job.data;

    // Report progress for long-running jobs
    await job.progress(10);

    await this.mailer.send(to, subject, body);

    await job.progress(100);

    return { sent: true, to };
  }

  @Process('bulk') // Handles jobs named 'bulk'
  async sendBulkEmail(job: Job<{ emails: EmailJob[] }>) {
    for (let i = 0; i < job.data.emails.length; i++) {
      const email = job.data.emails[i];
      await this.mailer.send(email.to, email.subject, email.body);
      await job.progress(((i + 1) / job.data.emails.length) * 100);
    }
    return { sent: job.data.emails.length };
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    console.log(`Job ${job.id} completed with result:`, result);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    console.error(`Job ${job.id} failed:`, error.message);
  }
}
```

Add jobs to the queue from your services:

```typescript
// users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class UsersService {
  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  async createUser(email: string, name: string) {
    // Create user in database...

    // Queue welcome email - processed asynchronously
    await this.emailQueue.add({
      to: email,
      subject: 'Welcome!',
      body: `Hi ${name}, thanks for signing up.`,
    });
  }

  async sendNewsletter(subscribers: string[]) {
    // Add named job with options
    await this.emailQueue.add(
      'bulk', // Job name - routed to @Process('bulk')
      {
        emails: subscribers.map((email) => ({
          to: email,
          subject: 'Weekly Newsletter',
          body: 'Here is your weekly update...',
        })),
      },
      {
        attempts: 3, // Retry failed jobs 3 times
        backoff: 5000, // Wait 5 seconds between retries
        removeOnComplete: true, // Clean up completed jobs
      },
    );
  }
}
```

## Bull Queue Options

| Option | Description |
|--------|-------------|
| `attempts` | Number of times to retry failed jobs |
| `backoff` | Delay between retries in milliseconds |
| `delay` | Wait before processing (for scheduled jobs) |
| `removeOnComplete` | Delete job data after completion |
| `removeOnFail` | Delete job data after final failure |
| `priority` | Lower numbers process first |

## Summary

Redis integration with NestJS covers three main use cases:

| Use Case | Package | When to Use |
|----------|---------|-------------|
| Caching | `@nestjs/cache-manager` | API response caching, reducing database load |
| Pub/Sub | `redis` client | Real-time events across server instances |
| Job Queues | `@nestjs/bull` | Background processing, scheduled tasks |

Start with caching for the biggest performance wins - a well-placed cache decorator can cut response times dramatically. Add pub/sub when you need real-time features that work across multiple servers. Use Bull queues for anything that shouldn't block your API responses, like sending emails or processing uploads.

All three patterns share the same Redis instance, so you get a lot of functionality from a single infrastructure component.
