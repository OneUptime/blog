# How to Instrument Hono Framework with OpenTelemetry for Edge Workers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Hono, Edge Workers, Cloudflare, JavaScript, Tracing

Description: Learn how to instrument Hono framework applications with OpenTelemetry for edge computing environments like Cloudflare Workers.

Hono is a lightweight web framework designed for edge computing environments. It runs on Cloudflare Workers, Deno Deploy, Bun, and other edge platforms where traditional Node.js OpenTelemetry auto-instrumentation often doesn't work without runtime-specific compatibility settings. Edge environments have unique constraints: restricted Node.js APIs, limited CPU time, cold starts, and platform-specific background task APIs.

This guide shows how to instrument Hono applications with OpenTelemetry while respecting these constraints, focusing on Cloudflare Workers as the primary deployment target but with patterns applicable to other edge platforms.

## Understanding Edge Environment Constraints

Edge workers operate differently from traditional servers:

1. **Restricted Node.js APIs**: Many OpenTelemetry packages depend on Node.js APIs that are unavailable by default in edge environments
2. **Cold Starts**: Workers may spin up for each request, making initialization critical
3. **Limited CPU Time**: Cloudflare Workers Free plan requests have 10ms CPU time by default, while paid Workers can be configured up to 5 minutes
4. **Limited Background Tasks**: Can't use background threads or processes for span export; use platform APIs like `waitUntil()` where available
5. **Different Fetch API**: Edge environments use Web Standards fetch, not Node's http module

These constraints require a specialized approach to instrumentation.

## Setting Up Hono with OpenTelemetry Core

Start with the minimal OpenTelemetry packages that work in edge environments:

```bash
# Initialize project

npm init -y

# Install Hono
npm install hono

# Install edge-compatible OpenTelemetry packages
npm install @opentelemetry/api
npm install @opentelemetry/core
npm install @opentelemetry/context-async-hooks
npm install @opentelemetry/exporter-trace-otlp-http
npm install @opentelemetry/sdk-trace-base
npm install @opentelemetry/resources
npm install @opentelemetry/semantic-conventions
npm install --save-dev @cloudflare/workers-types
```

Avoid packages with broader Node.js dependencies like `@opentelemetry/sdk-node` or auto-instrumentation packages. The `@opentelemetry/context-async-hooks` package uses `AsyncLocalStorage`; enable Cloudflare Workers' `nodejs_als` compatibility flag in `wrangler.toml` as shown later in this guide.

## Configuring an OTLP Trace Exporter

Use the official OTLP HTTP trace exporter, which has a browser/fetch implementation suitable for edge runtimes:

```typescript
// src/telemetry/exporter.ts
// OTLP HTTP trace exporter configuration for edge environments

import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

export function createTraceExporter(config: {
  endpoint: string;
  headers?: Record<string, string>;
}) {
  return new OTLPTraceExporter({
    url: config.endpoint,
    headers: config.headers,
  });
}
```

## Initializing OpenTelemetry for Edge

Create a lightweight tracer provider and register the Cloudflare-compatible async context manager:

```typescript
// src/telemetry/provider.ts
// Initialize OpenTelemetry for edge environment

import { context, propagation, trace } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from "@opentelemetry/core";
import { BasicTracerProvider, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { createTraceExporter } from "./exporter";

let provider: BasicTracerProvider | null = null;

export function initTracing(config: {
  serviceName: string;
  serviceVersion: string;
  otlpEndpoint: string;
}) {
  // Prevent multiple initializations
  if (provider) {
    return provider;
  }

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: config.serviceName,
    [ATTR_SERVICE_VERSION]: config.serviceVersion,
    "deployment.environment": "edge",
    "cloud.platform": "cloudflare-workers",
  });

  const exporter = createTraceExporter({
    endpoint: config.otlpEndpoint,
  });

  provider = new BasicTracerProvider({
    resource,
    spanProcessors: [new SimpleSpanProcessor(exporter)],
  });

  trace.setGlobalTracerProvider(provider);
  context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
  propagation.setGlobalPropagator(
    new CompositePropagator({
      propagators: [
        new W3CTraceContextPropagator(),
        new W3CBaggagePropagator(),
      ],
    })
  );

  return provider;
}

export function getTracer(name: string, version: string = "1.0.0") {
  if (!provider) {
    throw new Error("Tracing not initialized");
  }
  return provider.getTracer(name, version);
}

export function flushTracing(): Promise<void> {
  return provider?.forceFlush() ?? Promise.resolve();
}
```

## Creating Hono Tracing Middleware

Implement middleware to automatically trace HTTP requests:

```typescript
// src/middleware/tracing.ts
// Hono middleware for automatic request tracing

import { Context, MiddlewareHandler } from "hono";
import { trace, context, SpanKind, SpanStatusCode } from "@opentelemetry/api";
import {
  ATTR_HTTP_REQUEST_METHOD,
  ATTR_HTTP_RESPONSE_STATUS_CODE,
  ATTR_URL_FULL,
  ATTR_URL_PATH,
  ATTR_USER_AGENT_ORIGINAL,
} from "@opentelemetry/semantic-conventions";
import { flushTracing } from "../telemetry/provider";

const tracer = trace.getTracer("hono-http", "1.0.0");

export const tracingMiddleware = (): MiddlewareHandler => {
  return async (c: Context, next) => {
    const url = new URL(c.req.url);
    const span = tracer.startSpan(`HTTP ${c.req.method}`, {
      kind: SpanKind.SERVER,
      attributes: {
        [ATTR_HTTP_REQUEST_METHOD]: c.req.method,
        [ATTR_URL_FULL]: c.req.url,
        [ATTR_URL_PATH]: url.pathname,
        [ATTR_USER_AGENT_ORIGINAL]: c.req.header("user-agent") || "unknown",
      },
    });

    // Store span in context
    const spanContext = trace.setSpan(context.active(), span);

    try {
      // Execute request handler within span context
      await context.with(spanContext, async () => {
        await next();
      });

      // Add response attributes
      span.setAttribute(ATTR_HTTP_RESPONSE_STATUS_CODE, c.res.status);

      if (c.res.status >= 400) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${c.res.status}`,
        });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      throw error;
    } finally {
      span.end();
      c.executionCtx.waitUntil(flushTracing());
    }
  };
};
```

## Building the Application

Create a Hono application with tracing enabled:

```typescript
// src/index.ts
// Main Hono application for Cloudflare Workers

import { Hono } from "hono";
import { initTracing } from "./telemetry/provider";
import { tracingMiddleware } from "./middleware/tracing";

// Environment interface for type safety
interface Env {
  OTEL_ENDPOINT: string;
  SERVICE_NAME: string;
}

const app = new Hono<{ Bindings: Env }>();

// Initialize tracing with environment configuration
app.use("*", async (c, next) => {
  initTracing({
    serviceName: c.env.SERVICE_NAME || "hono-edge-app",
    serviceVersion: "1.0.0",
    otlpEndpoint: c.env.OTEL_ENDPOINT || "http://localhost:4318/v1/traces",
  });
  await next();
});

// Apply tracing middleware
app.use("*", tracingMiddleware());

// Define routes
app.get("/", (c) => {
  return c.json({
    message: "Hono on Edge with OpenTelemetry",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/hello/:name", (c) => {
  const name = c.req.param("name");
  return c.json({
    greeting: `Hello, ${name}!`,
  });
});

export default app;
```

## Adding Custom Spans

Create custom spans for business logic within edge workers:

```typescript
// src/services/data-processor.ts
// Service with custom span instrumentation

import { trace, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("data-processor", "1.0.0");

export class DataProcessor {
  async processData(data: unknown): Promise<unknown> {
    return await tracer.startActiveSpan(
      "process.data",
      {
        attributes: {
          "data.type": typeof data,
        },
      },
      async (span) => {
        try {
          // Validation step
          await this.validate(data);

          // Transformation step
          const transformed = await this.transform(data);

          span.setAttribute("process.success", true);
          span.setStatus({ code: SpanStatusCode.OK });

          return transformed;
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

  private async validate(data: unknown): Promise<void> {
    return await tracer.startActiveSpan("process.validate", async (span) => {
      try {
        if (!data) {
          throw new Error("Invalid data");
        }
        span.setStatus({ code: SpanStatusCode.OK });
      } finally {
        span.end();
      }
    });
  }

  private async transform(data: unknown): Promise<unknown> {
    return await tracer.startActiveSpan("process.transform", async (span) => {
      try {
        // Simulate transformation
        const result = { processed: data, timestamp: Date.now() };
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } finally {
        span.end();
      }
    });
  }
}
```

Use the processor in your routes:

```typescript
// src/routes/data.ts
// Routes with custom business logic tracing

import { Hono } from "hono";
import { DataProcessor } from "../services/data-processor";

const dataRoutes = new Hono();
const processor = new DataProcessor();

dataRoutes.post("/process", async (c) => {
  try {
    const body = await c.req.json();
    const result = await processor.processData(body);

    return c.json(result);
  } catch (error) {
    return c.json(
      { error: "Processing failed", message: (error as Error).message },
      500
    );
  }
});

export default dataRoutes;
```

## Tracing External API Calls

Instrument fetch calls to external services:

```typescript
// src/services/http-client.ts
// Instrumented HTTP client for edge workers

import { trace, SpanKind, SpanStatusCode } from "@opentelemetry/api";
import {
  ATTR_HTTP_REQUEST_METHOD,
  ATTR_HTTP_RESPONSE_STATUS_CODE,
  ATTR_URL_FULL,
} from "@opentelemetry/semantic-conventions";

const tracer = trace.getTracer("http-client", "1.0.0");

export class InstrumentedHTTPClient {
  async get<T>(url: string): Promise<T> {
    return await tracer.startActiveSpan(
      "http.client.get",
      {
        attributes: {
          [ATTR_HTTP_REQUEST_METHOD]: "GET",
          [ATTR_URL_FULL]: url,
        },
        kind: SpanKind.CLIENT,
      },
      async (span) => {
        try {
          const response = await fetch(url);

          span.setAttribute(ATTR_HTTP_RESPONSE_STATUS_CODE, response.status);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
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

  async post<T>(url: string, body: unknown): Promise<T> {
    return await tracer.startActiveSpan(
      "http.client.post",
      {
        attributes: {
          [ATTR_HTTP_REQUEST_METHOD]: "POST",
          [ATTR_URL_FULL]: url,
        },
        kind: SpanKind.CLIENT,
      },
      async (span) => {
        try {
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          span.setAttribute(ATTR_HTTP_RESPONSE_STATUS_CODE, response.status);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
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

## Handling KV Storage Operations

Cloudflare Workers KV needs custom instrumentation:

```typescript
// src/services/kv-storage.ts
// Instrumented KV storage wrapper

import { trace, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("kv-storage", "1.0.0");

export class InstrumentedKVStorage {
  private kv: KVNamespace;

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  async get<T>(key: string): Promise<T | null> {
    return await tracer.startActiveSpan(
      "kv.get",
      {
        attributes: {
          "kv.key": key,
        },
      },
      async (span) => {
        try {
          const value = await this.kv.get(key, { type: "json" });

          span.setAttribute("kv.hit", value !== null);
          span.setStatus({ code: SpanStatusCode.OK });

          return value as T | null;
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

  async put(key: string, value: unknown, expirationTtl?: number): Promise<void> {
    return await tracer.startActiveSpan(
      "kv.put",
      {
        attributes: {
          "kv.key": key,
          "kv.ttl": expirationTtl || 0,
        },
      },
      async (span) => {
        try {
          await this.kv.put(key, JSON.stringify(value), {
            expirationTtl,
          });

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
  }

  async delete(key: string): Promise<void> {
    return await tracer.startActiveSpan(
      "kv.delete",
      {
        attributes: {
          "kv.key": key,
        },
      },
      async (span) => {
        try {
          await this.kv.delete(key);
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
  }
}
```

## Complete Edge Application

Here's a complete application with all instrumentation:

```typescript
// src/worker.ts
// Complete Cloudflare Worker with comprehensive tracing

import { Hono } from "hono";
import { initTracing } from "./telemetry/provider";
import { tracingMiddleware } from "./middleware/tracing";
import { DataProcessor } from "./services/data-processor";
import { InstrumentedHTTPClient } from "./services/http-client";
import { InstrumentedKVStorage } from "./services/kv-storage";

interface Env {
  OTEL_ENDPOINT: string;
  SERVICE_NAME: string;
  DATA_KV: KVNamespace;
}

const app = new Hono<{ Bindings: Env }>();

// Initialize tracing
app.use("*", async (c, next) => {
  initTracing({
    serviceName: c.env.SERVICE_NAME || "hono-edge-app",
    serviceVersion: "1.0.0",
    otlpEndpoint: c.env.OTEL_ENDPOINT,
  });
  await next();
});

// Apply tracing middleware
app.use("*", tracingMiddleware());

// Health check endpoint
app.get("/health", (c) => c.json({ status: "healthy" }));

// Data processing endpoint
app.post("/api/process", async (c) => {
  const processor = new DataProcessor();
  const body = await c.req.json();
  const result = await processor.processData(body);
  return c.json(result);
});

// External API endpoint
app.get("/api/external/:id", async (c) => {
  const client = new InstrumentedHTTPClient();
  const id = c.req.param("id");
  const data = await client.get(`https://jsonplaceholder.typicode.com/posts/${id}`);
  return c.json(data);
});

// KV storage endpoint
app.get("/api/cache/:key", async (c) => {
  const kv = new InstrumentedKVStorage(c.env.DATA_KV);
  const key = c.req.param("key");
  const value = await kv.get(key);

  if (value) {
    return c.json({ cached: true, value });
  }

  // Cache miss - fetch and store
  const client = new InstrumentedHTTPClient();
  const data = await client.get("https://api.example.com/data");
  await kv.put(key, data, 3600);

  return c.json({ cached: false, value: data });
});

export default app;
```

## Deployment Configuration

Configure your Cloudflare Worker with required environment variables:

```toml
# wrangler.toml
name = "hono-edge-app"
main = "src/worker.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_als"]

[vars]
OTEL_ENDPOINT = "https://your-collector.example.com/v1/traces"
SERVICE_NAME = "hono-edge-app"

[[kv_namespaces]]
binding = "DATA_KV"
id = "your-kv-namespace-id"
```

Deploy the worker:

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy the worker
wrangler deploy
```

Edge environments require careful consideration of performance and resource constraints. By using lightweight instrumentation and fetch-compatible exporters, you can achieve comprehensive observability in Hono applications running on Cloudflare Workers and other edge platforms without sacrificing the performance benefits that make edge computing attractive.

The patterns shown here work across different edge platforms with minor adjustments for platform-specific APIs like KV storage or Durable Objects.
