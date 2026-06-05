# How to Instrument Bun and ElysiaJS Applications with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Bun, ElysiaJS, JavaScript, Tracing, Web Framework

Description: Learn how to instrument ElysiaJS applications running on Bun with OpenTelemetry for comprehensive distributed tracing and observability.

ElysiaJS is a fast, ergonomic web framework designed specifically for Bun. It leverages Bun's performance optimizations and provides a developer-friendly API similar to Express but with better type safety and performance. Manually instrumenting ElysiaJS with generic Node.js HTTP instrumentation can require a different approach than traditional Node.js frameworks since ElysiaJS uses Bun's native HTTP server rather than Node's http module.

This guide covers how to add comprehensive tracing to ElysiaJS applications, including automatic request tracing, database instrumentation, and custom spans for business logic.

## Setting Up the Project

Start by creating a new ElysiaJS project with OpenTelemetry dependencies:

```bash
# Initialize project

mkdir elysia-otel-demo
cd elysia-otel-demo
bun init -y

# Install ElysiaJS and OpenTelemetry packages
bun add elysia
bun add @opentelemetry/api \
        @opentelemetry/sdk-node \
        @opentelemetry/sdk-trace-node \
        @opentelemetry/context-async-hooks \
        @opentelemetry/resources \
        @opentelemetry/semantic-conventions \
        @opentelemetry/exporter-trace-otlp-http \
        @opentelemetry/exporter-metrics-otlp-http \
        @opentelemetry/sdk-metrics
```

## Creating OpenTelemetry Initialization Module

Create a dedicated module for OpenTelemetry setup:

```typescript
// src/telemetry/init.ts
// Initialize OpenTelemetry SDK for ElysiaJS application

import { NodeSDK } from "@opentelemetry/sdk-node";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";

export function initTelemetry() {
  const otlpEndpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.SERVICE_NAME || "elysia-app",
    [ATTR_SERVICE_VERSION]: process.env.VERSION || "1.0.0",
    "deployment.environment.name": process.env.ENVIRONMENT || "development",
    "service.runtime.name": "bun",
    "service.framework.name": "elysia",
  });

  const traceExporter = new OTLPTraceExporter({
    url:
      process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
      `${otlpEndpoint}/v1/traces`,
  });

  const metricExporter = new OTLPMetricExporter({
    url:
      process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ||
      `${otlpEndpoint}/v1/metrics`,
  });

  const sdk = new NodeSDK({
    resource,
    contextManager: new AsyncLocalStorageContextManager(),
    spanProcessors: [new BatchSpanProcessor(traceExporter)],
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 60000,
    }),
  });

  sdk.start();
  console.log("OpenTelemetry initialized");

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    await sdk.shutdown();
    console.log("OpenTelemetry shut down");
  });

  return sdk;
}
```

## Creating an ElysiaJS Tracing Plugin

ElysiaJS supports plugins, which is the perfect place to add tracing middleware:

```typescript
// src/plugins/tracing.ts
// ElysiaJS plugin for automatic request tracing

import { Elysia } from "elysia";
import { trace, context, SpanKind, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("elysia-http", "1.0.0");

export const tracing = new Elysia({
  name: "tracing",
})
  .derive(async ({ request, path }) => {
    // Create a span for this request
    const url = new URL(request.url);
    const span = tracer.startSpan(`${request.method} ${path}`, {
      kind: SpanKind.SERVER,
      attributes: {
        "http.request.method": request.method,
        "url.path": url.pathname,
        "url.scheme": url.protocol.replace(":", ""),
        "http.route": path,
        "user_agent.original": request.headers.get("user-agent") || "unknown",
      },
    });

    const startTime = Date.now();

    // Store span in context for use by downstream middleware
    const spanContext = trace.setSpan(context.active(), span);

    return {
      span,
      spanContext,
      startTime,
    };
  })
  .onAfterHandle(({ span, startTime, set, path }) => {
    if (!span) return;

    const duration = Date.now() - startTime;
    const statusCode = typeof set.status === "number" ? set.status : 200;

    span.setAttributes({
      "http.response.status_code": statusCode,
      "http.route": path,
      "http.server.request.duration_ms": duration,
    });

    // Set span status based on HTTP status code
    if (statusCode >= 500) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: `HTTP ${statusCode}`,
      });
    }
  })
  .onError(({ error, span }) => {
    if (!span) return;

    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  })
  .onAfterResponse(({ span }) => {
    // End span after the response is sent
    if (span) {
      span.end();
    }
  });
```

## Building the Application

Now create the main application with the tracing plugin:

```typescript
// src/index.ts
// Main application entry point

// Initialize telemetry FIRST, before any other imports
import { initTelemetry } from "./telemetry/init";
initTelemetry();

import { Elysia } from "elysia";
import { tracing } from "./plugins/tracing";
import { context, SpanStatusCode, trace } from "@opentelemetry/api";

const tracer = trace.getTracer("app-handlers", "1.0.0");

const app = new Elysia()
  .use(tracing)
  .get("/", () => ({
    message: "Hello from Elysia with OpenTelemetry!",
  }))
  .get("/api/users", async ({ spanContext }) => {
    // Create a custom span within the request context
    return await context.with(spanContext, async () => {
      return await tracer.startActiveSpan("fetch.users", async (span) => {
        try {
          // Simulate database query
          await Bun.sleep(50);

          const users = [
            { id: 1, name: "Alice" },
            { id: 2, name: "Bob" },
          ];

          span.setAttribute("user.count", users.length);
          span.setStatus({ code: SpanStatusCode.OK });

          return { users };
        } finally {
          span.end();
        }
      });
    });
  })
  .get("/api/posts/:id", async ({ params, spanContext }) => {
    return await context.with(spanContext, async () => {
      return await tracer.startActiveSpan(
        "fetch.post",
        {
          attributes: {
            "post.id": params.id,
          },
        },
        async (span) => {
          try {
            await Bun.sleep(30);

            const post = {
              id: params.id,
              title: `Post ${params.id}`,
              content: "Sample content",
            };

            span.setStatus({ code: SpanStatusCode.OK });
            return post;
          } finally {
            span.end();
          }
        }
      );
    });
  })
  .listen(3000);

console.log(`Server running at http://${app.server?.hostname}:${app.server?.port}`);
```

## Advanced Request Instrumentation

For more complex scenarios, create specialized middleware for different route groups:

```typescript
// src/plugins/database-tracing.ts
// Plugin for database operation tracing

import { Elysia } from "elysia";
import { SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";

const tracer = trace.getTracer("database", "1.0.0");

export interface DatabaseClient {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<void>;
}

export function createInstrumentedDB(): DatabaseClient {
  return {
    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      return await tracer.startActiveSpan(
        "db.query",
        {
          kind: SpanKind.CLIENT,
          attributes: {
            "db.system.name": "sqlite",
            "db.query.text": sql,
            "db.operation.name": extractOperation(sql),
          },
        },
        async (span) => {
          try {
            // Simulate query execution
            await Bun.sleep(Math.random() * 100);

            const results: T[] = [];
            span.setAttribute("db.response.returned_rows", results.length);
            span.setStatus({ code: SpanStatusCode.OK });

            return results;
          } catch (error) {
            span.recordException(error as Error);
            span.setStatus({ code: SpanStatusCode.ERROR });
            throw error;
          } finally {
            span.end();
          }
        }
      );
    },

    async execute(sql: string, params?: unknown[]): Promise<void> {
      return await tracer.startActiveSpan(
        "db.execute",
        {
          kind: SpanKind.CLIENT,
          attributes: {
            "db.system.name": "sqlite",
            "db.query.text": sql,
            "db.operation.name": extractOperation(sql),
          },
        },
        async (span) => {
          try {
            await Bun.sleep(Math.random() * 50);
            span.setStatus({ code: SpanStatusCode.OK });
          } catch (error) {
            span.recordException(error as Error);
            span.setStatus({ code: SpanStatusCode.ERROR });
            throw error;
          } finally {
            span.end();
          }
        }
      );
    },
  };
}

function extractOperation(sql: string): string {
  const match = sql.trim().match(/^(\w+)/i);
  return match ? match[1].toUpperCase() : "UNKNOWN";
}

// Export as plugin
export const database = new Elysia({
  name: "database",
}).decorate("db", createInstrumentedDB());
```

Use the database plugin in your routes:

```typescript
// src/routes/users.ts
// User routes with database tracing

import { Elysia } from "elysia";
import { tracing } from "../plugins/tracing";
import { database } from "../plugins/database-tracing";

export const userRoutes = new Elysia({ prefix: "/users" })
  .use(tracing)
  .use(database)
  .get("/", async ({ db }) => {
    const users = await db.query("SELECT * FROM users");
    return { users };
  })
  .get("/:id", async ({ params, db }) => {
    const users = await db.query("SELECT * FROM users WHERE id = ?", [params.id]);
    return users[0] || { error: "User not found" };
  })
  .post("/", async ({ body, db }) => {
    await db.execute("INSERT INTO users (name, email) VALUES (?, ?)", [
      (body as any).name,
      (body as any).email,
    ]);
    return { success: true };
  });
```

## Implementing Custom Metrics

Add metrics tracking for key performance indicators:

```typescript
// src/telemetry/metrics.ts
// Custom metrics for ElysiaJS application

import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("elysia-metrics", "1.0.0");

// Counter for total requests
const requestCounter = meter.createCounter("app.http.server.requests.total", {
  description: "Total number of HTTP requests",
  unit: "1",
});

// Histogram for request duration
const requestDuration = meter.createHistogram("app.http.server.request.duration", {
  description: "HTTP request duration",
  unit: "ms",
});

// UpDownCounter for active requests
const activeRequests = meter.createUpDownCounter("app.http.server.requests.active", {
  description: "Number of active HTTP requests",
  unit: "1",
});

// Observable gauge for memory usage
const memoryUsage = meter.createObservableGauge("process.runtime.memory.usage", {
  description: "Process memory usage",
  unit: "bytes",
});

memoryUsage.addCallback((result) => {
  const usage = process.memoryUsage();
  result.observe(usage.heapUsed, { type: "heap_used" });
  result.observe(usage.heapTotal, { type: "heap_total" });
  result.observe(usage.rss, { type: "rss" });
});

export const appMetrics = {
  recordRequest(method: string, route: string, status: number, duration: number) {
    const attributes = {
      "http.request.method": method,
      "http.route": route,
      "http.response.status_code": status,
    };

    requestCounter.add(1, attributes);
    requestDuration.record(duration, attributes);
  },

  requestStarted() {
    activeRequests.add(1);
  },

  requestCompleted() {
    activeRequests.add(-1);
  },
};
```

Integrate metrics into the tracing plugin:

```typescript
// src/plugins/tracing-with-metrics.ts
// Enhanced tracing plugin with metrics collection

import { Elysia } from "elysia";
import { trace, context, SpanKind, SpanStatusCode } from "@opentelemetry/api";
import { appMetrics } from "../telemetry/metrics";

const tracer = trace.getTracer("elysia-http", "1.0.0");

export const tracingWithMetrics = new Elysia({
  name: "tracing-with-metrics",
})
  .derive(async ({ request, path }) => {
    const url = new URL(request.url);
    const span = tracer.startSpan(`${request.method} ${path}`, {
      kind: SpanKind.SERVER,
      attributes: {
        "http.request.method": request.method,
        "url.path": url.pathname,
        "http.route": path,
      },
    });

    const startTime = Date.now();
    const spanContext = trace.setSpan(context.active(), span);

    // Track active requests
    appMetrics.requestStarted();

    return {
      span,
      spanContext,
      startTime,
    };
  })
  .onAfterHandle(({ span, startTime, set, path, request }) => {
    if (!span) return;

    const duration = Date.now() - startTime;
    const statusCode = typeof set.status === "number" ? set.status : 200;

    span.setAttributes({
      "http.response.status_code": statusCode,
      "http.server.request.duration_ms": duration,
    });

    // Record metrics
    appMetrics.recordRequest(
      request.method,
      path,
      statusCode,
      duration
    );

    if (statusCode >= 500) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: `HTTP ${statusCode}`,
      });
    }
  })
  .onError(({ error, span }) => {
    if (span) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
    }
  })
  .onAfterResponse(({ span }) => {
    if (span) {
      span.end();
      appMetrics.requestCompleted();
    }
  });
```

## Tracing External API Calls

Instrument outgoing HTTP requests to external services:

```typescript
// src/services/external-api.ts
// Instrumented external API client

import { SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";

const tracer = trace.getTracer("external-api", "1.0.0");

export class ExternalAPIClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async get<T>(path: string): Promise<T> {
    return await tracer.startActiveSpan(
      "http.client.request",
      {
        kind: SpanKind.CLIENT,
        attributes: {
          "http.request.method": "GET",
          "url.full": `${this.baseUrl}${path}`,
          "url.path": path,
        },
      },
      async (span) => {
        try {
          const response = await fetch(`${this.baseUrl}${path}`);

          span.setAttributes({
            "http.response.status_code": response.status,
            "http.response.body.size": Number(response.headers.get("content-length") || 0),
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          span.setStatus({ code: SpanStatusCode.OK });

          return data as T;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message,
          });
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return await tracer.startActiveSpan(
      "http.client.request",
      {
        kind: SpanKind.CLIENT,
        attributes: {
          "http.request.method": "POST",
          "url.full": `${this.baseUrl}${path}`,
          "url.path": path,
        },
      },
      async (span) => {
        try {
          const response = await fetch(`${this.baseUrl}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          span.setAttribute("http.response.status_code", response.status);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          span.setStatus({ code: SpanStatusCode.OK });

          return data as T;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: SpanStatusCode.ERROR });
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }
}
```

## Complete Application Example

Here's a complete application that puts everything together:

```typescript
// src/app.ts
// Complete ElysiaJS application with full instrumentation

import { initTelemetry } from "./telemetry/init";
initTelemetry();

import { Elysia } from "elysia";
import { tracingWithMetrics } from "./plugins/tracing-with-metrics";
import { database } from "./plugins/database-tracing";
import { userRoutes } from "./routes/users";
import { ExternalAPIClient } from "./services/external-api";

const externalAPI = new ExternalAPIClient("https://jsonplaceholder.typicode.com");

const app = new Elysia()
  .use(tracingWithMetrics)
  .use(database)
  .get("/", () => ({
    message: "ElysiaJS with OpenTelemetry",
    version: "1.0.0",
  }))
  .get("/health", () => ({ status: "healthy" }))
  .use(userRoutes)
  .get("/api/external", async () => {
    const data = await externalAPI.get("/posts/1");
    return data;
  })
  .onError(({ error, set }) => {
    console.error("Unhandled error:", error);
    set.status = 500;
    return {
      error: "Internal Server Error",
      message: error.message,
    };
  })
  .listen(3000);

console.log(`Server running at http://${app.server?.hostname}:${app.server?.port}`);
```

By following this approach, you get comprehensive observability for ElysiaJS applications running on Bun. The combination of automatic request tracing, custom spans for business logic, and detailed metrics provides the visibility needed to monitor and debug production services effectively.

The plugin architecture of ElysiaJS makes it natural to encapsulate tracing logic in reusable modules, and the integration with OpenTelemetry ensures compatibility with existing observability infrastructure.
