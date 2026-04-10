# How to Use Bull/BullMQ with Redis in NestJS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, NestJS, BullMQ, Queue, Node.js

Description: Add persistent background job processing to NestJS using BullMQ and Redis with the @nestjs/bullmq package for queues, workers, and scheduling.

---

NestJS provides first-class BullMQ integration through `@nestjs/bullmq`, making it easy to define queues, producers, and consumers as injectable services while Redis handles job persistence and delivery guarantees.

## Install Dependencies

```bash
npm install @nestjs/bullmq bullmq ioredis
```

## Register BullMQ Module

```typescript
// app.module.ts
import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: "localhost",
        port: 6379,
      },
    }),
    BullModule.registerQueue({ name: "email" }),
    BullModule.registerQueue({ name: "report" }),
  ],
})
export class AppModule {}
```

## Create a Producer

```typescript
// email/email.producer.ts
import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

@Injectable()
export class EmailProducer {

  constructor(@InjectQueue("email") private emailQueue: Queue) {}

  async sendWelcomeEmail(userId: string, email: string) {
    return this.emailQueue.add(
      "welcome",
      { userId, email },
      { attempts: 3, backoff: { type: "exponential", delay: 2000 } }
    );
  }

  async scheduleReminder(userId: string, delay: number) {
    return this.emailQueue.add(
      "reminder",
      { userId },
      { delay }  // milliseconds
    );
  }
}
```

## Create a Consumer (Processor)

```typescript
// email/email.processor.ts
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";

@Processor("email")
export class EmailProcessor extends WorkerHost {

  async process(job: Job) {
    switch (job.name) {
      case "welcome":
        await this.sendWelcome(job.data);
        break;
      case "reminder":
        await this.sendReminder(job.data);
        break;
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }

  private async sendWelcome(data: { userId: string; email: string }) {
    console.log(`Sending welcome email to ${data.email}`);
  }

  private async sendReminder(data: { userId: string }) {
    console.log(`Sending reminder to user ${data.userId}`);
  }
}
```

## Wire into Feature Module

```typescript
// email/email.module.ts
import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";

@Module({
  imports: [BullModule.registerQueue({ name: "email" })],
  providers: [EmailProducer, EmailProcessor],
  exports: [EmailProducer],
})
export class EmailModule {}
```

## Enqueue from a Controller

```typescript
@Post("register")
async register(@Body() dto: RegisterDto) {
  const user = await this.authService.create(dto);
  await this.emailProducer.sendWelcomeEmail(user.id, user.email);
  return { userId: user.id };
}
```

## Monitor Queue Health

```bash
redis-cli llen "bull:email:wait"
redis-cli llen "bull:email:active"
redis-cli zcard "bull:email:failed"
```

## Summary

`@nestjs/bullmq` integrates BullMQ queues into NestJS's module and dependency injection system, replacing raw queue client management with typed producers and processor classes. Redis persists jobs across restarts, and built-in retry with exponential backoff handles transient failures. Each queue, producer, and processor is independently testable and injectable throughout the application.
