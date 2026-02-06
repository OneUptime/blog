# How to Trace tRPC API Procedures End-to-End with OpenTelemetry in a TypeScript Monorepo

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, tRPC, TypeScript, Monorepo

Description: Set up end-to-end OpenTelemetry tracing for tRPC procedures in a TypeScript monorepo covering both client and server spans.

tRPC gives you type-safe API calls between your TypeScript client and server without code generation. But type safety does not tell you how fast your procedures run or where errors occur in production. OpenTelemetry fills that gap by tracing tRPC procedure calls end-to-end.

This post covers instrumenting tRPC in a monorepo setup where the client (Next.js) and server share types through a common package.

## Project Structure

A typical tRPC monorepo looks like this:

```
packages/
  api/          # tRPC router definitions
  web/          # Next.js frontend
  shared/       # Shared types and utilities
  tracing/      # OpenTelemetry configuration (shared)
```

## Shared Tracing Configuration

Create a shared tracing package that both client and server can use:

```typescript
// packages/tracing/src/index.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

export function initTracing(serviceName: string) {
  const sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: serviceName,
    }),
    traceExporter: new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();
  return sdk;
}
```

## Server-Side: tRPC Middleware for Tracing

The core of tRPC instrumentation is a middleware that wraps every procedure call in a span:

```typescript
// packages/api/src/tracing-middleware.ts
import { trace, SpanKind, SpanStatusCode, context, propagation } from '@opentelemetry/api';
import { TRPCError } from '@trpc/server';
import { middleware } from './trpc';

const tracer = trace.getTracer('trpc-server');

export const tracingMiddleware = middleware(async ({ path, type, next, ctx, rawInput }) => {
  // Extract propagated context from incoming HTTP headers
  const parentContext = propagation.extract(context.active(), ctx.req?.headers || {});

  return context.with(parentContext, () => {
    return tracer.startActiveSpan(
      `trpc.${type}: ${path}`,
      {
        kind: SpanKind.SERVER,
        attributes: {
          'trpc.procedure.path': path,
          'trpc.procedure.type': type, // query, mutation, or subscription
          'trpc.input.type': typeof rawInput,
        },
      },
      async (span) => {
        try {
          const result = await next();

          if (!result.ok) {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: 'Procedure returned error',
            });
          }

          span.end();
          return result;
        } catch (error) {
          if (error instanceof TRPCError) {
            span.setAttribute('trpc.error.code', error.code);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: error.message,
            });
          }

          span.recordException(error as Error);
          span.end();
          throw error;
        }
      }
    );
  });
});
```

Apply the middleware to your tRPC router:

```typescript
// packages/api/src/trpc.ts
import { initTRPC } from '@trpc/server';
import { tracingMiddleware } from './tracing-middleware';

const t = initTRPC.context<Context>().create();

// Create a traced procedure that all routes will use
export const tracedProcedure = t.procedure.use(tracingMiddleware);

export const router = t.router;
export const middleware = t.middleware;
```

## Defining Traced Procedures

Now every procedure you define with `tracedProcedure` is automatically traced:

```typescript
// packages/api/src/routers/user.ts
import { z } from 'zod';
import { router, tracedProcedure } from '../trpc';
import { trace } from '@opentelemetry/api';

export const userRouter = router({
  getById: tracedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const span = trace.getActiveSpan();

      // Add business-specific attributes
      span?.setAttribute('user.id', input.id);

      const user = await ctx.db.user.findUnique({
        where: { id: input.id },
      });

      span?.setAttribute('user.found', !!user);

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `User ${input.id} not found`,
        });
      }

      return user;
    }),

  list: tracedProcedure
    .input(z.object({
      cursor: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input, ctx }) => {
      const span = trace.getActiveSpan();
      span?.setAttribute('query.limit', input.limit);
      span?.setAttribute('query.has_cursor', !!input.cursor);

      const users = await ctx.db.user.findMany({
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });

      const hasMore = users.length > input.limit;
      const items = hasMore ? users.slice(0, -1) : users;

      span?.setAttribute('result.count', items.length);
      span?.setAttribute('result.has_more', hasMore);

      return {
        items,
        nextCursor: hasMore ? items[items.length - 1].id : undefined,
      };
    }),
});
```

## Client-Side: Tracing tRPC Calls from Next.js

On the client side, create a tRPC link that injects trace context into outgoing requests:

```typescript
// packages/web/src/utils/trpc.ts
import { httpBatchLink } from '@trpc/client';
import { trace, context, propagation } from '@opentelemetry/api';

const tracer = trace.getTracer('trpc-client');

// Custom fetch that adds tracing
function tracedFetch(input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === 'string' ? input : input.toString();

  return tracer.startActiveSpan(
    `trpc.client.fetch`,
    { attributes: { 'http.url': url } },
    async (span) => {
      // Inject trace context into headers
      const headers: Record<string, string> = {};
      propagation.inject(context.active(), headers);

      const mergedInit = {
        ...init,
        headers: {
          ...init?.headers,
          ...headers,
        },
      };

      try {
        const response = await fetch(input, mergedInit);
        span.setAttribute('http.status_code', response.status);
        span.end();
        return response;
      } catch (error) {
        span.recordException(error as Error);
        span.end();
        throw error;
      }
    }
  );
}

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      fetch: tracedFetch,
    }),
  ],
});
```

## Tracing tRPC Subscriptions

For tRPC subscriptions using WebSockets, add per-message tracing:

```typescript
// packages/api/src/routers/notifications.ts
export const notificationRouter = router({
  onNewNotification: tracedProcedure
    .input(z.object({ userId: z.string() }))
    .subscription(async function* ({ input, ctx }) {
      const span = trace.getActiveSpan();
      span?.setAttribute('subscription.user_id', input.userId);
      let eventCount = 0;

      for await (const notification of ctx.notificationStream(input.userId)) {
        eventCount++;
        span?.setAttribute('subscription.event_count', eventCount);
        yield notification;
      }
    }),
});
```

## What to Look For in Your Traces

With this instrumentation, each tRPC call generates a trace that shows:

1. The client-side fetch span (with context propagation)
2. The server-side procedure span (with input validation time)
3. Any database queries or downstream service calls within the procedure

Common issues that become visible:

- Procedures that make multiple sequential database calls instead of batching
- Input validation taking an unexpected amount of time with large payloads
- Error rates by procedure path, so you know which parts of your API are unstable

The type safety of tRPC handles correctness at compile time. OpenTelemetry handles visibility at runtime. Together, they give you a tRPC setup that is both correct and observable.
