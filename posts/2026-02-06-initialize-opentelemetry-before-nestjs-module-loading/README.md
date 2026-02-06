# How to Initialize OpenTelemetry Before NestJS Module Loading

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, NestJS, Node.js, Initialization, TypeScript, Bootstrap

Description: Complete guide to initializing OpenTelemetry instrumentation before NestJS loads any modules, ensuring complete tracing coverage from application startup.

NestJS loads modules, providers, and controllers during its bootstrap process. If you initialize OpenTelemetry after this process starts, you'll miss critical traces from module initialization, dependency injection, and early application lifecycle hooks. Proper OpenTelemetry setup requires instrumentation before any application code executes.

The challenge is that NestJS encourages a declarative, decorator-based architecture where you don't explicitly control the import order. You need to inject instrumentation before the framework itself loads, which requires understanding Node.js module loading and execution order.

## The Module Loading Problem

When you start a NestJS application, Node.js executes imports in dependency order. If your main file imports NestJS modules before OpenTelemetry initializes, those modules won't be instrumented:

```typescript
// main.ts - WRONG approach
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// By the time we initialize here, NestJS modules are already loaded
import './tracing'; // Too late!

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}

bootstrap();
```

The problem is that `@nestjs/core` and `AppModule` load before `tracing` initializes, so their HTTP requests, database calls, and other operations aren't traced.

## The Correct Approach: Separate Entry Point

Create a dedicated entry file that initializes OpenTelemetry before importing anything else:

```typescript
// tracing.ts - OpenTelemetry initialization
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

// Create resource that identifies this service
const resource = new Resource({
  [SEMRESATTRS_SERVICE_NAME]: 'nestjs-api',
  [SEMRESATTRS_SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
});

// Configure OTLP exporter
const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  headers: {},
});

// Initialize SDK with automatic instrumentations
const sdk = new NodeSDK({
  resource,
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Customize instrumentation behavior
      '@opentelemetry/instrumentation-http': {
        ignoreIncomingRequestHook: (req) => {
          // Ignore health check endpoints
          return req.url?.includes('/health') || false;
        },
      },
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Disable file system instrumentation
      },
    }),
  ],
});

// Start the SDK
sdk.start();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  try {
    await sdk.shutdown();
    console.log('OpenTelemetry SDK shut down successfully');
  } catch (error) {
    console.error('Error shutting down OpenTelemetry SDK', error);
  } finally {
    process.exit(0);
  }
});

console.log('OpenTelemetry instrumentation initialized');
```

Now create your main entry file that imports tracing first:

```typescript
// main.ts - Correct approach
import './tracing'; // MUST be first import

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}

bootstrap();
```

This ensures OpenTelemetry initializes before NestJS loads any modules.

## Using the -r Flag for Bulletproof Loading

Even more reliable than import order is using Node.js's `--require` flag to preload the tracing module:

```json
// package.json
{
  "scripts": {
    "start": "node -r ./dist/tracing.js dist/main.js",
    "start:dev": "nest start --exec 'node -r ./dist/tracing.js'",
    "start:debug": "nest start --debug --watch --exec 'node -r ./dist/tracing.js'"
  }
}
```

The `-r` flag loads the tracing module before any other code executes, guaranteeing proper initialization order. This approach works even if someone accidentally imports modules before the tracing import in `main.ts`.

## TypeScript Configuration for Separate Entry Points

Configure TypeScript to compile both entry points:

```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Ensure your `tracing.ts` file is in the `src` directory so it compiles to `dist/tracing.js`.

## Tracing NestJS Lifecycle Events

With OpenTelemetry initialized early, you can trace NestJS lifecycle hooks:

```typescript
// src/app.service.ts
import { Injectable, OnModuleInit, OnApplicationBootstrap } from '@nestjs/common';
import { trace } from '@opentelemetry/api';

@Injectable()
export class AppService implements OnModuleInit, OnApplicationBootstrap {
  private readonly tracer = trace.getTracer('app-lifecycle');

  async onModuleInit() {
    // This runs during module initialization
    await this.tracer.startActiveSpan('module.init', async (span) => {
      console.log('Module initializing...');
      // Perform initialization tasks
      await this.loadConfiguration();
      span.end();
    });
  }

  async onApplicationBootstrap() {
    // This runs after all modules initialize
    await this.tracer.startActiveSpan('app.bootstrap', async (span) => {
      console.log('Application bootstrapping...');
      // Final startup tasks
      await this.warmupCaches();
      span.end();
    });
  }

  private async loadConfiguration() {
    // Configuration loading logic
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async warmupCaches() {
    // Cache warming logic
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}
```

These lifecycle spans appear in your traces, showing how long initialization takes.

## Automatic HTTP Request Tracing

With early OpenTelemetry initialization, HTTP requests to your NestJS controllers are automatically traced:

```typescript
// src/users/users.controller.ts
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { trace } from '@opentelemetry/api';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    // The HTTP request span is automatically created
    // Add custom spans for business logic
    const tracer = trace.getTracer('users-controller');

    return await tracer.startActiveSpan('users.findAll', async (span) => {
      const users = await this.usersService.findAll();
      span.setAttribute('users.count', users.length);
      span.end();
      return users;
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const tracer = trace.getTracer('users-controller');

    return await tracer.startActiveSpan('users.findOne', async (span) => {
      span.setAttribute('user.id', id);

      const user = await this.usersService.findOne(id);

      if (!user) {
        span.setAttribute('user.found', false);
        span.end();
        throw new Error('User not found');
      }

      span.setAttribute('user.found', true);
      span.end();
      return user;
    });
  }

  @Post()
  async create(@Body() createUserDto: any) {
    const tracer = trace.getTracer('users-controller');

    return await tracer.startActiveSpan('users.create', async (span) => {
      span.setAttribute('user.email', createUserDto.email);

      const user = await this.usersService.create(createUserDto);

      span.setAttribute('user.id', user.id);
      span.end();
      return user;
    });
  }
}
```

The automatic HTTP instrumentation creates parent spans, while your custom spans nest within them.

## Tracing Database Operations

Database operations benefit from automatic instrumentation when OpenTelemetry loads early:

```typescript
// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { trace } from '@opentelemetry/api';

@Injectable()
export class UsersService {
  private readonly tracer = trace.getTracer('users-service');

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    // TypeORM queries are automatically instrumented
    // Add custom spans for additional context
    return await this.tracer.startActiveSpan('service.findAll', async (span) => {
      const users = await this.usersRepository.find({
        relations: ['profile', 'posts'],
      });

      span.setAttribute('db.query.type', 'findAll');
      span.setAttribute('db.results.count', users.length);
      span.end();

      return users;
    });
  }

  async findOne(id: string): Promise<User | null> {
    return await this.tracer.startActiveSpan('service.findOne', async (span) => {
      span.setAttribute('user.id', id);

      const user = await this.usersRepository.findOne({
        where: { id },
        relations: ['profile'],
      });

      span.setAttribute('user.found', !!user);
      span.end();

      return user;
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    return await this.tracer.startActiveSpan('service.create', async (span) => {
      span.setAttribute('user.email', userData.email || '');

      const user = this.usersRepository.create(userData);
      const savedUser = await this.usersRepository.save(user);

      span.setAttribute('user.id', savedUser.id);
      span.end();

      return savedUser;
    });
  }
}
```

The TypeORM instrumentation creates database spans that nest within your service spans.

## Tracing Middleware and Interceptors

NestJS middleware and interceptors run on every request. Trace them to understand their performance impact:

```typescript
// src/common/logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { trace } from '@opentelemetry/api';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const tracer = trace.getTracer('interceptors');
    const request = context.switchToHttp().getRequest();

    const span = tracer.startSpan('interceptor.logging');
    span.setAttribute('http.method', request.method);
    span.setAttribute('http.url', request.url);

    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        span.setAttribute('duration.ms', duration);
        span.end();
      }),
    );
  }
}
```

Apply the interceptor globally:

```typescript
// src/main.ts
import './tracing';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalInterceptors(new LoggingInterceptor());

  await app.listen(3000);
}

bootstrap();
```

## Handling Guards for Authentication

Guards that check authentication run before route handlers. Trace them to measure authentication overhead:

```typescript
// src/auth/auth.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { trace } from '@opentelemetry/api';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const tracer = trace.getTracer('guards');

    return await tracer.startActiveSpan('guard.auth', async (span) => {
      const request = context.switchToHttp().getRequest();
      const token = request.headers.authorization;

      span.setAttribute('auth.token.present', !!token);

      if (!token) {
        span.setAttribute('auth.result', 'unauthorized');
        span.end();
        return false;
      }

      // Validate token
      const isValid = await this.validateToken(token);

      span.setAttribute('auth.result', isValid ? 'authorized' : 'unauthorized');
      span.end();

      return isValid;
    });
  }

  private async validateToken(token: string): Promise<boolean> {
    // Token validation logic
    await new Promise(resolve => setTimeout(resolve, 10));
    return token.startsWith('Bearer ');
  }
}
```

## Tracing GraphQL Resolvers

If using NestJS with GraphQL, trace resolver execution:

```typescript
// src/users/users.resolver.ts
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { trace } from '@opentelemetry/api';

@Resolver(() => User)
export class UsersResolver {
  private readonly tracer = trace.getTracer('graphql-resolvers');

  constructor(private readonly usersService: UsersService) {}

  @Query(() => [User])
  async users() {
    return await this.tracer.startActiveSpan('resolver.users', async (span) => {
      span.setAttribute('graphql.operation', 'query');
      span.setAttribute('graphql.field', 'users');

      const users = await this.usersService.findAll();

      span.setAttribute('result.count', users.length);
      span.end();

      return users;
    });
  }

  @Query(() => User)
  async user(@Args('id') id: string) {
    return await this.tracer.startActiveSpan('resolver.user', async (span) => {
      span.setAttribute('graphql.operation', 'query');
      span.setAttribute('graphql.field', 'user');
      span.setAttribute('user.id', id);

      const user = await this.usersService.findOne(id);

      span.setAttribute('user.found', !!user);
      span.end();

      return user;
    });
  }

  @Mutation(() => User)
  async createUser(@Args('input') input: any) {
    return await this.tracer.startActiveSpan('resolver.createUser', async (span) => {
      span.setAttribute('graphql.operation', 'mutation');
      span.setAttribute('graphql.field', 'createUser');

      const user = await this.usersService.create(input);

      span.setAttribute('user.id', user.id);
      span.end();

      return user;
    });
  }
}
```

## Environment-Based Configuration

Configure OpenTelemetry differently for development, staging, and production:

```typescript
// tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_DEPLOYMENT_ENVIRONMENT } from '@opentelemetry/semantic-conventions';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

// Enable debug logging in development
if (process.env.NODE_ENV === 'development') {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
}

const resource = new Resource({
  [SEMRESATTRS_SERVICE_NAME]: 'nestjs-api',
  [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
});

// Use different exporters based on environment
const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    (process.env.NODE_ENV === 'production'
      ? 'https://otel-collector.prod.com/v1/traces'
      : 'http://localhost:4318/v1/traces'),
  headers: process.env.OTEL_EXPORTER_OTLP_HEADERS
    ? JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS)
    : {},
});

const sdk = new NodeSDK({
  resource,
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        // Disable in production to reduce overhead
        enabled: process.env.NODE_ENV !== 'production',
      },
    }),
  ],
});

sdk.start();
```

## Distributed Tracing Across Microservices

When calling other services, propagate trace context:

```typescript
// src/external/external.service.ts
import { Injectable, HttpService } from '@nestjs/common';
import { trace, context, propagation } from '@opentelemetry/api';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class ExternalService {
  private readonly tracer = trace.getTracer('external-service');

  constructor(private readonly httpService: HttpService) {}

  async callExternalApi(endpoint: string): Promise<any> {
    return await this.tracer.startActiveSpan('external.api.call', async (span) => {
      span.setAttribute('external.endpoint', endpoint);

      // Extract headers for trace propagation
      const headers: Record<string, string> = {};
      propagation.inject(context.active(), headers);

      try {
        const response = await lastValueFrom(
          this.httpService.get(endpoint, { headers })
        );

        span.setAttribute('http.status_code', response.status);
        span.end();

        return response.data;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        span.end();
        throw error;
      }
    });
  }
}
```

This ensures traces connect across service boundaries, providing end-to-end visibility.

## Testing with OpenTelemetry

Create test utilities that verify instrumentation:

```typescript
// test/tracing.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { UsersService } from '../src/users/users.service';

describe('OpenTelemetry Instrumentation', () => {
  let exporter: InMemorySpanExporter;
  let provider: NodeTracerProvider;

  beforeEach(() => {
    exporter = new InMemorySpanExporter();
    provider = new NodeTracerProvider();
    provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
    provider.register();
  });

  afterEach(() => {
    exporter.reset();
  });

  it('should create spans for service methods', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService],
    }).compile();

    const service = module.get<UsersService>(UsersService);
    await service.findAll();

    const spans = exporter.getFinishedSpans();
    expect(spans.length).toBeGreaterThan(0);
    expect(spans[0].name).toContain('findAll');
  });
});
```

## Common Pitfalls and Solutions

**Issue: Spans not appearing for early requests**
Solution: Verify tracing initializes before NestJS imports. Use the `-r` flag for guaranteed ordering.

**Issue: Missing database query spans**
Solution: Ensure your ORM's OpenTelemetry instrumentation is installed and enabled in the auto-instrumentations config.

**Issue: High memory usage from tracing**
Solution: Implement sampling in production and disable low-value instrumentations like file system operations.

## Production Deployment Checklist

1. Verify tracing.ts compiles to dist/tracing.js
2. Update package.json scripts to use `-r ./dist/tracing.js`
3. Set OTEL_EXPORTER_OTLP_ENDPOINT environment variable
4. Configure authentication headers if required
5. Enable sampling for high-traffic services
6. Test trace export in staging environment
7. Set up alerts for trace export failures
8. Document standard span naming conventions

## Conclusion

Initializing OpenTelemetry before NestJS module loading is critical for complete observability. By creating a separate tracing entry point and loading it first using either import order or the `-r` flag, you ensure every part of your application is instrumented from the moment it starts.

The pattern of early initialization combined with strategic custom spans in controllers, services, guards, and interceptors provides comprehensive visibility into your NestJS application. You can trace requests from the moment they enter your API through authentication, business logic, database operations, and external service calls, giving you the insights needed to optimize performance and debug issues in production.
