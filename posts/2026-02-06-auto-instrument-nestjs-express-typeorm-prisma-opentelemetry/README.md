# How to Auto-Instrument NestJS with Express, TypeORM,

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, NestJS, Express, TypeORM, Prisma, Auto-Instrumentation

Description: Complete guide to automatically instrumenting NestJS applications with OpenTelemetry, covering Express HTTP server, TypeORM database queries, and Prisma ORM with zero code changes.

Auto-instrumentation is OpenTelemetry's killer feature. You get distributed tracing for your HTTP requests, database queries, and external API calls without modifying application code. For NestJS applications using Express, TypeORM, or Prisma, auto-instrumentation provides immediate visibility into your entire stack.

## Understanding Auto-Instrumentation

Auto-instrumentation works by monkey-patching Node.js modules at runtime. When you require or import a module like Express or TypeORM, OpenTelemetry intercepts the calls and wraps them with tracing logic. This happens transparently without changing your business logic.

The architecture looks like this:

```mermaid
graph LR
    A[Your Code] --> B[Express Handler]
    A --> C[TypeORM Query]
    A --> D[Prisma Query]

    B --> E[HTTP Instrumentation]
    C --> F[TypeORM Instrumentation]
    D --> G[Prisma Instrumentation]

    E --> H[Span Creation]
    F --> H
    G --> H

    H --> I[Trace Export]
```

## Installing Required Packages

Install the core OpenTelemetry SDK and auto-instrumentation packages:

```bash
npm install @opentelemetry/sdk-node \
            @opentelemetry/api \
            @opentelemetry/auto-instrumentations-node \
            @opentelemetry/resources \
            @opentelemetry/semantic-conventions \
            @opentelemetry/instrumentation-express \
            @opentelemetry/instrumentation-http \
            @opentelemetry/instrumentation-nestjs-core \
            @opentelemetry/exporter-trace-otlp-http
```

For TypeORM auto-instrumentation:

```bash
npm install @opentelemetry/instrumentation-typeorm
```

For Prisma auto-instrumentation:

```bash
npm install @prisma/instrumentation @opentelemetry/api
```

## Setting Up the Base Auto-Instrumentation

Create a centralized tracing setup that enables all auto-instrumentations:

```typescript
// src/instrumentation.ts

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

// This file must be preloaded before any other application code
export function setupInstrumentation() {
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'nestjs-auto-instrumented',
    [ATTR_SERVICE_VERSION]: '1.0.0',
  });

  const traceExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  });

  const sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Enable all auto-instrumentations by default
        '@opentelemetry/instrumentation-fs': {
          enabled: false, // Disable filesystem tracing (too verbose)
        },
      }),
    ],
  });

  sdk.start();
  console.log('Auto-instrumentation initialized');

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.error('Error terminating tracing', error))
      .finally(() => process.exit(0));
  });
}

setupInstrumentation();
```

## Configuring Express Auto-Instrumentation

NestJS uses Express (or Fastify) under the hood. Configure Express instrumentation with custom options:

```typescript
// src/instrumentation.ts (updated)

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';

export function setupInstrumentation() {
  // ... resource and exporter setup ...

  const sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
      // HTTP instrumentation (captures incoming and outgoing HTTP requests)
      new HttpInstrumentation({
        enabled: true,
        ignoreIncomingRequestHook: (request) => {
          const path = request.url?.split('?')[0];
          return path === '/health' || path === '/metrics' || path === '/favicon.ico';
        },
        requestHook: (span, request) => {
          // Add custom attributes to HTTP spans
          const requestId = 'headers' in request ? request.headers['x-request-id'] : undefined;
          if (typeof requestId === 'string') {
            span.setAttribute('http.request.id', requestId);
          } else if (Array.isArray(requestId) && requestId[0]) {
            span.setAttribute('http.request.id', requestId[0]);
          }
        },
        responseHook: (span, response) => {
          // Add response-specific attributes
          const contentLength = 'getHeader' in response
            ? response.getHeader('content-length')
            : response.headers['content-length'];
          if (contentLength) {
            span.setAttribute('http.response.content_length', String(contentLength));
          }
        },
      }),

      // Express instrumentation (captures Express middleware and routes)
      new ExpressInstrumentation({
        enabled: true,
        requestHook: (span, requestInfo) => {
          // Capture additional request context
          span.setAttribute('express.type', requestInfo.layerType);
        },
      }),

      // Auto-instrument other Node.js libraries
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
        '@opentelemetry/instrumentation-http': {
          enabled: false, // We configured it manually above
        },
        '@opentelemetry/instrumentation-express': {
          enabled: false, // We configured it manually above
        },
      }),
    ],
  });

  sdk.start();
}
```

## Adding TypeORM Auto-Instrumentation

TypeORM instrumentation captures all database queries automatically:

```typescript
// src/instrumentation.ts (updated for TypeORM)

import { TypeormInstrumentation } from '@opentelemetry/instrumentation-typeorm';

export function setupInstrumentation() {
  // ... previous setup ...

  const sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
      // ... previous instrumentations ...

      // TypeORM instrumentation
      new TypeormInstrumentation({
        enabled: true,
        // Capture query parameters (be careful with sensitive data)
        enhancedDatabaseReporting: process.env.NODE_ENV !== 'production',
        responseHook: (span, info) => {
          // Add query execution metadata
          if (Array.isArray(info.response)) {
            span.setAttribute('db.result.count', info.response.length);
          }
        },
      }),
    ],
  });

  sdk.start();
}
```

Configure your TypeORM connection in NestJS:

```typescript
// src/app.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'myapp',
      entities: [User],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),
  ],
})
export class AppModule {}
```

Example entity and repository that will be auto-instrumented:

```typescript
// src/users/user.entity.ts

import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column()
  name: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
```

```typescript
// src/users/users.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  // This query will be automatically traced
  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  // Complex queries are also traced automatically
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  // Even raw queries get instrumentation
  async getUserCount(): Promise<number> {
    const result = await this.usersRepository.query(
      'SELECT COUNT(*) as count FROM "user"'
    );
    return parseInt(result[0].count);
  }
}
```

## Adding Prisma Auto-Instrumentation

Prisma provides its own instrumentation package:

```typescript
// src/instrumentation.ts (updated for Prisma)

import { PrismaInstrumentation } from '@prisma/instrumentation';

export function setupInstrumentation() {
  // ... previous setup ...

  const sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
      // ... previous instrumentations ...

      // Prisma instrumentation
      new PrismaInstrumentation(),
    ],
  });

  sdk.start();
}
```

Set up your Prisma client as a NestJS service:

```typescript
// src/prisma/prisma.service.ts

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    console.log('Prisma connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('Prisma disconnected');
  }
}
```

Example Prisma schema:

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
}

model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  name  String
  posts Post[]
}
```

Service using Prisma with automatic tracing:

```typescript
// src/posts/posts.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  // All Prisma queries are automatically traced
  async findAll() {
    return this.prisma.post.findMany({
      include: { author: true },
    });
  }

  // Complex queries with relations are fully traced
  async findPublishedByAuthor(authorId: number) {
    return this.prisma.post.findMany({
      where: {
        authorId,
        published: true,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Interactive transactions are included in the trace with their child query spans
  async createPostWithUser(email: string, postTitle: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, name: 'New User' },
      });

      const post = await tx.post.create({
        data: {
          title: postTitle,
          authorId: user.id,
        },
      });

      return { user, post };
    });
  }
}
```

## Initializing Instrumentation Before Application

The instrumentation must be loaded before any application code. The most reliable approach is to preload the instrumentation file when starting Node.js:

```typescript
// src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  await app.listen(3000);
  console.log('Application is running on http://localhost:3000');
}

bootstrap();
```

Start the compiled application with instrumentation preloaded:

```bash
node --require ./dist/instrumentation.js dist/main.js
```

If you run TypeScript directly with Node.js 20 or later, you can use `--import`:

```bash
npx tsx --import ./src/instrumentation.ts src/main.ts
```

## Viewing Auto-Instrumented Traces

When you make a request to your NestJS application, you'll see traces like this:

```text
HTTP GET /api/users
├── express.middleware (Express)
├── nestjs.controller (NestJS Controller)
├── nestjs.service (NestJS Service)
│   └── typeorm.query (TypeORM)
│       └── SELECT * FROM "user"
└── express.response (Express)
```

For Prisma:

```text
HTTP GET /api/posts
├── express.middleware
├── nestjs.controller
├── nestjs.service
│   └── prisma.query (Prisma)
│       └── findMany on Post
│           └── findMany on User (relation)
└── express.response
```

## Combining TypeORM and Prisma

You can use both ORMs in the same application with auto-instrumentation:

```typescript
// src/data/data.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DataService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private prisma: PrismaService,
  ) {}

  // Both queries will appear as separate spans in the trace
  async getUserStats() {
    // TypeORM query (automatically traced)
    const typeormUsers = await this.usersRepository.count();

    // Prisma query (automatically traced)
    const prismaUsers = await this.prisma.user.count();

    return {
      typeormCount: typeormUsers,
      prismaCount: prismaUsers,
    };
  }
}
```

## Fine-Tuning Auto-Instrumentation

Control which queries and operations get traced:

```typescript
// src/instrumentation.ts (advanced configuration)

import { TypeormInstrumentation } from '@opentelemetry/instrumentation-typeorm';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';

export function setupInstrumentation() {
  const sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
      new TypeormInstrumentation({
        enabled: true,
        // Avoid capturing query parameters in production
        enhancedDatabaseReporting: false,
        // Suppress spans created by the underlying database driver instrumentation
        suppressInternalInstrumentation: true,
      }),

      new PrismaInstrumentation({
        ignoreSpanTypes: ['prisma:client:serialize'],
      }),

      new HttpInstrumentation({
        enabled: true,
        // Ignore specific endpoints
        ignoreIncomingRequestHook: (request) => {
          const path = request.url?.split('?')[0] ?? '';
          return path === '/health' || path === '/metrics' || path.startsWith('/api/internal/');
        },
        // Don't trace outgoing requests to specific hosts
        ignoreOutgoingRequestHook: (request) => {
          const hostname = String(request.hostname ?? request.host ?? '');
          return hostname === 'localhost' || hostname === 'internal-service.local';
        },
      }),
    ],
  });

  sdk.start();
}
```

## Testing Auto-Instrumentation

Smoke-test that instrumentation is initialized before your application handles requests:

```typescript
// test/tracing.e2e.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import '../src/instrumentation';
import { AppModule } from '../src/app.module';

describe('Auto-Instrumentation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should handle HTTP requests while instrumentation is active', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/users')
      .set('traceparent', '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01')
      .expect(200);

    expect(response.body).toBeDefined();
    // Verify spans in your configured exporter or collector.
  });
});
```

## Common Auto-Instrumentation Issues

**Missing Spans**: Ensure instrumentation is loaded before application code. Preload the instrumentation file with Node.js `--require` or `--import` so instrumented modules are patched before NestJS, Express, TypeORM, or Prisma are loaded.

**Duplicate Spans**: Happens when you manually instrument code that's already auto-instrumented. Disable manual instrumentation or the auto-instrumentation for that library.

**Performance Impact**: Auto-instrumentation has minimal overhead, but in extreme high-throughput scenarios, consider sampling or disabling verbose instrumentations.

**TypeORM Spans Missing**: TypeORM instrumentation requires TypeORM 0.3.0 or higher. Check your version and update if needed.

**Prisma Spans Missing**: Use Prisma ORM 6.1.0 or higher with a matching @prisma/instrumentation version. For Prisma ORM versions from 4.2.0 up to 6.1.0, enable the `tracing` preview feature in your Prisma schema.

Auto-instrumentation gives you comprehensive observability without touching your business logic. For NestJS applications using Express, TypeORM, and Prisma, this approach provides immediate value and scales from development through production.
