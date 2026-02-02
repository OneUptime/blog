# How to Add Logging to NestJS Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: TypeScript, NestJS, Logging, Winston, Observability

Description: Learn how to implement logging in NestJS using the built-in logger, custom loggers, Winston integration, and request logging interceptors.

---

Logging is one of those things you don't think about until something breaks in production at 2 AM. NestJS ships with a decent built-in logger, but most production applications need more - structured logs, log levels, correlation IDs, and integration with external services. This guide covers everything from basic logging to production-ready patterns.

## The Built-in Logger

NestJS provides a `Logger` class out of the box. It works well for development and simple use cases.

```typescript
// user.service.ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class UserService {
  // Create a logger instance with context (shows in log output)
  private readonly logger = new Logger(UserService.name);

  async findUser(id: string) {
    this.logger.log(`Finding user with ID: ${id}`);

    try {
      const user = await this.userRepository.findOne(id);
      this.logger.debug(`User found: ${user.email}`);
      return user;
    } catch (error) {
      this.logger.error(`Failed to find user: ${id}`, error.stack);
      throw error;
    }
  }
}
```

The built-in logger outputs colored logs in development:

```
[Nest] 12345  - 02/02/2026, 10:30:15 AM     LOG [UserService] Finding user with ID: abc123
[Nest] 12345  - 02/02/2026, 10:30:15 AM   DEBUG [UserService] User found: john@example.com
```

## Log Levels

NestJS supports standard log levels. You can configure which levels are enabled when bootstrapping your app.

| Level | Method | Use Case |
|-------|--------|----------|
| `log` | `logger.log()` | General application events |
| `error` | `logger.error()` | Errors and exceptions |
| `warn` | `logger.warn()` | Warnings that aren't errors |
| `debug` | `logger.debug()` | Detailed debugging info |
| `verbose` | `logger.verbose()` | Most detailed tracing |

Configure log levels in `main.ts`:

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Only show log and error in production
    logger: process.env.NODE_ENV === 'production'
      ? ['log', 'error', 'warn']
      : ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  await app.listen(3000);
}
bootstrap();
```

## Creating a Custom Logger Service

For more control, create a custom logger that implements the `LoggerService` interface.

```typescript
// custom-logger.service.ts
import { Injectable, LoggerService, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class CustomLoggerService implements LoggerService {
  private context?: string;

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, context?: string) {
    const ctx = context || this.context;
    console.log(JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      context: ctx,
      message,
    }));
  }

  error(message: string, trace?: string, context?: string) {
    const ctx = context || this.context;
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      context: ctx,
      message,
      trace,
    }));
  }

  warn(message: string, context?: string) {
    const ctx = context || this.context;
    console.warn(JSON.stringify({
      level: 'warn',
      timestamp: new Date().toISOString(),
      context: ctx,
      message,
    }));
  }

  debug(message: string, context?: string) {
    const ctx = context || this.context;
    console.debug(JSON.stringify({
      level: 'debug',
      timestamp: new Date().toISOString(),
      context: ctx,
      message,
    }));
  }

  verbose(message: string, context?: string) {
    const ctx = context || this.context;
    console.log(JSON.stringify({
      level: 'verbose',
      timestamp: new Date().toISOString(),
      context: ctx,
      message,
    }));
  }
}
```

Register it globally in `main.ts`:

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CustomLoggerService } from './custom-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use custom logger for all NestJS internal logging
  app.useLogger(app.get(CustomLoggerService));

  await app.listen(3000);
}
bootstrap();
```

## Winston Integration

For production applications, Winston provides more features - file rotation, multiple transports, and better performance.

```bash
npm install winston nest-winston
```

Create a Winston module:

```typescript
// logger.module.ts
import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
              return `${timestamp} [${context || 'Application'}] ${level}: ${message} ${
                Object.keys(meta).length ? JSON.stringify(meta) : ''
              }`;
            }),
          ),
        }),
        // File transport for production
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
```

Inject and use the Winston logger:

```typescript
// order.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class OrderService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async createOrder(orderData: CreateOrderDto) {
    // Log with additional metadata
    this.logger.info('Creating new order', {
      context: 'OrderService',
      userId: orderData.userId,
      items: orderData.items.length,
    });

    const order = await this.orderRepository.save(orderData);

    this.logger.info('Order created successfully', {
      context: 'OrderService',
      orderId: order.id,
      total: order.total,
    });

    return order;
  }
}
```

## Request Logging Interceptor

Log every HTTP request with timing information using an interceptor.

```typescript
// logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, url, body } = request;
    const startTime = Date.now();

    // Log the incoming request
    this.logger.log(`Incoming ${method} ${url}`);

    return next.handle().pipe(
      tap({
        next: () => {
          // Log successful response
          const duration = Date.now() - startTime;
          this.logger.log(
            `${method} ${url} ${response.statusCode} - ${duration}ms`,
          );
        },
        error: (error) => {
          // Log error response
          const duration = Date.now() - startTime;
          this.logger.error(
            `${method} ${url} ${error.status || 500} - ${duration}ms - ${error.message}`,
          );
        },
      }),
    );
  }
}
```

Register globally in `app.module.ts`:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './logging.interceptor';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
```

## Adding Correlation IDs

Correlation IDs help you trace requests across services. They're essential for debugging in distributed systems.

```typescript
// correlation-id.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request to include correlationId
declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Use existing correlation ID from header or generate new one
    const correlationId = req.headers['x-correlation-id'] as string || uuidv4();

    req.correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);

    next();
  }
}
```

Update your logging interceptor to include correlation IDs:

```typescript
// logging.interceptor.ts (updated)
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, url, correlationId } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          // Include correlation ID in all log entries
          this.logger.log(
            `[${correlationId}] ${method} ${url} ${response.statusCode} - ${duration}ms`,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `[${correlationId}] ${method} ${url} ${error.status || 500} - ${duration}ms`,
            error.stack,
          );
        },
      }),
    );
  }
}
```

Apply the middleware in your module:

```typescript
// app.module.ts
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { CorrelationIdMiddleware } from './correlation-id.middleware';

@Module({})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
```

## Log Format Comparison

| Format | Best For | Example Output |
|--------|----------|----------------|
| Plain text | Local development | `[UserService] Finding user: abc123` |
| JSON | Production/log aggregation | `{"level":"info","message":"Finding user","userId":"abc123"}` |
| Colored | Terminal debugging | Colored output with timestamps |

## Summary

| Need | Solution |
|------|----------|
| Basic logging | Built-in `Logger` class |
| Structured logs | Custom `LoggerService` implementation |
| File rotation and transports | Winston integration |
| Request tracing | Logging interceptor |
| Distributed tracing | Correlation ID middleware |
| Log aggregation | JSON format with Winston |

Start with the built-in logger for simple projects. As your application grows, add Winston for structured logging and file management. Always include correlation IDs if you're running multiple services - you'll thank yourself when debugging production issues.
