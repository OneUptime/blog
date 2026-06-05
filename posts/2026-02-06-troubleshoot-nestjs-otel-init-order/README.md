# Troubleshoot NestJS Failing to Initialize OpenTelemetry Before Module Loading

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, NestJS, Node.js, Module Loading

Description: Solve the NestJS initialization order problem where framework modules load before OpenTelemetry can register its hooks.

NestJS uses decorators and dependency injection that trigger module loading during the framework bootstrap process. By the time your `bootstrap()` function runs, your application module and many of its dependencies have already been imported, and the default HTTP adapter is loaded when `NestFactory.create()` runs. This means OpenTelemetry hooks registered in your application code are often too late.

## Why NestJS Is Different

In a plain Express app, you control when `require('express')` happens. In NestJS, the framework itself imports Express during its internal bootstrap:

```typescript
// main.ts - by the time bootstrap() runs, AppModule and its imports are already loaded
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // Too late to initialize OpenTelemetry here
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
```

The static `import` statements in `main.ts` are evaluated before your module body runs. Nest's default Express adapter is loaded when `NestFactory.create()` creates the application, and your `AppModule` imports are already evaluated by then.

## The Fix: Use --require Flag

The simplest reliable way to initialize OpenTelemetry before NestJS loads is to preload the instrumentation file. For a CommonJS tracing file, use the `--require` flag:

```javascript
// tracing.js (CommonJS)
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'nestjs-api',
  }),
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
console.log('OpenTelemetry initialized before NestJS bootstrap');
```

```json
{
  "scripts": {
    "start": "node --require ./tracing.js dist/main.js",
    "start:dev": "nest start --exec 'node --require ./tracing.js'"
  }
}
```

## Handling TypeScript Compilation

NestJS projects are TypeScript. The tracing file must be either:

1. A CommonJS JavaScript file (`.js`, or `.cjs` if your package uses `"type": "module"`) that does not need compilation
2. A pre-compiled TypeScript file

Option 1 is simpler:

```javascript
// tracing.js - plain JavaScript, no TypeScript needed
const { NodeSDK } = require('@opentelemetry/sdk-node');
// ... rest of setup
```

For `nest start` in development:

```json
{
  "scripts": {
    "start:dev": "ts-node --require ./tracing.js src/main.ts"
  }
}
```

## NestJS Specific Integration

If you want to integrate OpenTelemetry deeper into NestJS, create an OpenTelemetry module:

```typescript
// src/otel/otel.module.ts
import { Module, Global } from '@nestjs/common';
import { trace } from '@opentelemetry/api';

@Global()
@Module({
  providers: [
    {
      provide: 'TRACER',
      useFactory: () => {
        // The SDK is already initialized via --require
        // This just provides the tracer for dependency injection
        return trace.getTracer('nestjs-api');
      },
    },
  ],
  exports: ['TRACER'],
})
export class OtelModule {}
```

```typescript
// src/users/users.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { Tracer } from '@opentelemetry/api';

@Injectable()
export class UsersService {
  constructor(
    @Inject('TRACER') private readonly tracer: Tracer,
    @Inject('USERS_REPOSITORY')
    private readonly usersRepository: { find(): Promise<any[]> },
  ) {}

  async findAll() {
    return this.tracer.startActiveSpan('UsersService.findAll', async (span) => {
      try {
        const users = await this.usersRepository.find();
        span.setAttribute('users.count', users.length);
        return users;
      } finally {
        span.end();
      }
    });
  }
}
```

## Using NestJS Interceptors for Automatic Spans

Create an interceptor that automatically wraps every controller method in a span:

```typescript
// src/otel/tracing.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, finalize, tap } from 'rxjs';
import { context as otelContext, trace, SpanStatusCode } from '@opentelemetry/api';

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  private tracer = trace.getTracer('nestjs-api');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const className = context.getClass().name;
    const methodName = context.getHandler().name;
    const spanName = `${className}.${methodName}`;

    const span = this.tracer.startSpan(spanName);
    const activeContext = trace.setSpan(otelContext.active(), span);

    return new Observable((subscriber) =>
      otelContext.with(activeContext, () =>
        next
          .handle()
          .pipe(
            tap({
              error: (error) => {
                span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
                span.recordException(error);
              },
            }),
            finalize(() => span.end()),
          )
          .subscribe(subscriber),
      ),
    );
  }
}
```

Register it globally:

```typescript
// src/main.ts
import { TracingInterceptor } from './otel/tracing.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new TracingInterceptor());
  await app.listen(3000);
}
```

## Docker Setup for NestJS

```dockerfile
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/tracing.js ./tracing.js

ENV NODE_OPTIONS="--require ./tracing.js"
CMD ["node", "dist/main.js"]
```

The critical point with NestJS is that OpenTelemetry must be initialized before any NestJS module is imported. Preloading the instrumentation file with `--require` for CommonJS, or the equivalent ESM preload path for ESM applications, gives the instrumentation a chance to register before NestJS starts loading application and framework modules. Everything else builds on top of that foundation.
