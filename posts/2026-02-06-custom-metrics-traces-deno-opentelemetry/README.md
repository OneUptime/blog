# How to Create Custom Metrics and Traces in Deno Using OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Deno, Custom Metric, Trace, JavaScript, TypeScript

Description: Learn how to implement custom metrics and traces in Deno applications using the OpenTelemetry SDK for deeper observability insights.

While Deno's automatic tracing handles HTTP requests and fetch calls, production applications need custom instrumentation to track business-specific operations. This includes monitoring database queries, cache hits, background job processing, and domain-specific metrics that automatic tracing cannot capture.

Deno's built-in OpenTelemetry integration works with the OpenTelemetry JavaScript API, though there are some runtime-specific considerations. This guide covers how to create custom spans, record metrics, and properly manage context propagation in Deno applications.

## Installing OpenTelemetry Dependencies

Deno uses URL imports instead of npm packages, but you can import npm modules using the `npm:` specifier. Deno configures OpenTelemetry providers automatically when you run with `OTEL_DENO=true`, so custom instrumentation only needs the OpenTelemetry API package:

```typescript
// deps.ts
// Centralized dependency management for OpenTelemetry modules

export {
  context,
  metrics,
  SpanStatusCode,
  trace,
  type MeterProvider,
  type Span,
} from "npm:@opentelemetry/api@1";
```

Create a configuration module to access Deno's OpenTelemetry providers:

```typescript
// telemetry.ts
// Accesses Deno's OpenTelemetry providers

let initialized = false;

export function initTelemetry(serviceName: string, serviceVersion: string) {
  if (initialized) {
    console.warn("Telemetry already initialized");
    return {
      tracerProvider: Deno.telemetry.tracerProvider,
      meterProvider: Deno.telemetry.meterProvider,
    };
  }

  initialized = true;
  console.log(`Telemetry ready for ${serviceName}@${serviceVersion}`);

  return {
    tracerProvider: Deno.telemetry.tracerProvider,
    meterProvider: Deno.telemetry.meterProvider,
  };
}
```

## Creating Custom Spans

Custom spans track specific operations in your application. Here's how to create spans for database operations:

```typescript
// database.ts
// Database abstraction with OpenTelemetry instrumentation

import { trace, SpanStatusCode, type Span } from "./deps.ts";

const tracer = trace.getTracer("database-client", "1.0.0");

export interface QueryResult {
  rows: unknown[];
  rowCount: number;
  duration: number;
}

export class Database {
  private connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  // Execute a query with automatic span creation and error tracking
  async query(sql: string, params: unknown[] = []): Promise<QueryResult> {
    // Create a span for this database operation
    return await tracer.startActiveSpan(
      "db.query",
      {
        attributes: {
          "db.system.name": "postgresql",
          "db.query.text": sql,
          "db.operation.name": this.extractOperation(sql),
        },
      },
      async (span: Span) => {
        const startTime = Date.now();

        try {
          // Simulate database query execution
          // In real code, this would be actual database client calls
          await this.executeQuery(sql, params);

          const rows = await this.fetchResults();
          const duration = Date.now() - startTime;

          // Add result metadata to span
          span.setAttributes({
            "db.response.returned_rows": rows.length,
            "db.duration_ms": duration,
          });

          span.setStatus({ code: SpanStatusCode.OK });

          return {
            rows,
            rowCount: rows.length,
            duration,
          };
        } catch (error) {
          // Record the error in the span
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message,
          });

          throw error;
        } finally {
          // Always end the span
          span.end();
        }
      }
    );
  }

  // Create nested spans for complex operations
  async transaction(callback: () => Promise<void>): Promise<void> {
    return await tracer.startActiveSpan(
      "db.transaction",
      {
        attributes: {
          "db.system.name": "postgresql",
          "db.operation.name": "transaction",
        },
      },
      async (span: Span) => {
        try {
          await this.executeQuery("BEGIN");
          await callback();
          await this.executeQuery("COMMIT");

          span.setStatus({ code: SpanStatusCode.OK });
        } catch (error) {
          await this.executeQuery("ROLLBACK");

          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: "Transaction rolled back",
          });

          throw error;
        } finally {
          span.end();
        }
      }
    );
  }

  private extractOperation(sql: string): string {
    const match = sql.trim().match(/^(\w+)/i);
    return match ? match[1].toUpperCase() : "UNKNOWN";
  }

  private async executeQuery(_sql: string, _params?: unknown[]): Promise<void> {
    // Simulate query execution time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
  }

  private async fetchResults(): Promise<unknown[]> {
    // Simulate fetching results
    return Array.from({ length: Math.floor(Math.random() * 100) }, (_, i) => ({
      id: i + 1,
      data: `result_${i}`,
    }));
  }
}
```

Use the instrumented database client in your application:

```typescript
// app.ts
// Application code using instrumented database client

import { initTelemetry } from "./telemetry.ts";
import { Database } from "./database.ts";

// Run with OTEL_DENO=true so Deno exports telemetry before creating any spans
initTelemetry("deno-api-service", "1.0.0");

const db = new Database("postgresql://localhost:5432/mydb");

Deno.serve({
  port: 8000,
  handler: async (req: Request) => {
    const url = new URL(req.url);

    if (url.pathname === "/api/users") {
      try {
        // This query will create a nested span under the HTTP request span
        const result = await db.query("SELECT * FROM users WHERE active = $1", [true]);

        return new Response(JSON.stringify(result.rows), {
          headers: { "content-type": "application/json" },
        });
      } catch (error) {
        console.error("Query failed:", error);
        return new Response("Database error", { status: 500 });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});
```

## Recording Custom Metrics

Metrics provide aggregate statistics over time. Here's how to implement counters, histograms, and gauges:

```typescript
// metrics.ts
// Custom metrics for application monitoring

import { type MeterProvider } from "./deps.ts";

export class ApplicationMetrics {
  private meter;
  private requestCounter;
  private requestDuration;
  private activeConnections;
  private cacheHitRatio;

  constructor(meterProvider: MeterProvider) {
    this.meter = meterProvider.getMeter("application-metrics", "1.0.0");

    // Counter: tracks total number of requests
    this.requestCounter = this.meter.createCounter("http.server.requests", {
      description: "Total number of HTTP requests",
      unit: "1",
    });

    // Histogram: tracks request duration distribution
    this.requestDuration = this.meter.createHistogram("http.server.duration", {
      description: "HTTP request duration",
      unit: "ms",
    });

    // UpDownCounter: tracks current active connections
    this.activeConnections = this.meter.createUpDownCounter("http.server.active_connections", {
      description: "Number of active HTTP connections",
      unit: "1",
    });

    // Observable Gauge: reports cache hit ratio
    this.cacheHitRatio = this.meter.createObservableGauge("cache.hit_ratio", {
      description: "Cache hit ratio",
      unit: "1",
    });

    // Register callback for observable metrics
    this.cacheHitRatio.addCallback(async (observableResult) => {
      const ratio = await this.calculateCacheHitRatio();
      observableResult.observe(ratio, { cache_type: "redis" });
    });
  }

  // Record an HTTP request with metadata
  recordRequest(method: string, path: string, status: number, duration: number) {
    const attributes = {
      "http.request.method": method,
      "http.route": path,
      "http.response.status_code": status,
    };

    this.requestCounter.add(1, attributes);
    this.requestDuration.record(duration, attributes);
  }

  // Track active connection changes
  connectionOpened() {
    this.activeConnections.add(1);
  }

  connectionClosed() {
    this.activeConnections.add(-1);
  }

  private async calculateCacheHitRatio(): Promise<number> {
    // In a real application, this would query your cache statistics
    return Math.random();
  }
}
```

Integrate metrics into your HTTP server:

```typescript
// server-with-metrics.ts
// HTTP server with comprehensive metrics collection

import { initTelemetry } from "./telemetry.ts";
import { ApplicationMetrics } from "./metrics.ts";

const telemetry = initTelemetry("deno-api-service", "1.0.0");
const metrics = new ApplicationMetrics(telemetry!.meterProvider);

Deno.serve({
  port: 8000,
  handler: async (req: Request) => {
    const startTime = Date.now();
    metrics.connectionOpened();

    try {
      const url = new URL(req.url);
      let response: Response;

      if (url.pathname === "/api/data") {
        response = new Response(JSON.stringify({ data: "example" }), {
          headers: { "content-type": "application/json" },
        });
      } else {
        response = new Response("Not Found", { status: 404 });
      }

      const duration = Date.now() - startTime;
      metrics.recordRequest(req.method, url.pathname, response.status, duration);

      return response;
    } finally {
      metrics.connectionClosed();
    }
  },
});
```

## Context Propagation

OpenTelemetry uses context to maintain parent-child relationships between spans. Here's how to manually propagate context:

```typescript
// context-propagation.ts
// Manual context propagation for background tasks

import { trace, context, SpanStatusCode } from "./deps.ts";

const tracer = trace.getTracer("background-jobs", "1.0.0");

export class JobProcessor {
  // Process a job while maintaining trace context
  async processJob(jobId: string, jobData: unknown): Promise<void> {
    await tracer.startActiveSpan(
      "job.process",
      {
        attributes: {
          "job.id": jobId,
          "job.type": "data-processing",
        },
      },
      async (span) => {
        try {
          // Perform multiple steps within the job
          await this.validateData(jobData);
          await this.transformData(jobData);
          await this.saveResults(jobId, jobData);

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

  // Each step creates a child span
  private async validateData(data: unknown): Promise<void> {
    await tracer.startActiveSpan("job.validate", async (span) => {
      try {
        // Validation logic
        if (!data) {
          throw new Error("Invalid data");
        }

        span.setAttribute("validation.passed", true);
        span.setStatus({ code: SpanStatusCode.OK });
      } finally {
        span.end();
      }
    });
  }

  private async transformData(_data: unknown): Promise<void> {
    await tracer.startActiveSpan("job.transform", async (span) => {
      try {
        // Transformation logic
        await new Promise(resolve => setTimeout(resolve, 100));

        span.setAttribute("transform.operations", 5);
        span.setStatus({ code: SpanStatusCode.OK });
      } finally {
        span.end();
      }
    });
  }

  private async saveResults(jobId: string, _data: unknown): Promise<void> {
    await tracer.startActiveSpan("job.save", async (span) => {
      try {
        // Save logic
        span.setAttribute("job.id", jobId);
        span.setStatus({ code: SpanStatusCode.OK });
      } finally {
        span.end();
      }
    });
  }

  // Queue a job and propagate context to background worker
  async queueJob(jobId: string, jobData: unknown): Promise<void> {
    await tracer.startActiveSpan("job.queue", async (span) => {
      try {
        // Get the current context
        const ctx = context.active();

        // In a real application, you'd serialize the context and send it with the job
        // For this example, we'll process immediately with context
        await context.with(ctx, async () => {
          await this.processJob(jobId, jobData);
        });

        span.setStatus({ code: SpanStatusCode.OK });
      } finally {
        span.end();
      }
    });
  }
}
```

## Advanced Span Management

For complex operations, you may need finer control over span lifecycle:

```typescript
// advanced-spans.ts
// Advanced span management patterns

import { trace, context, SpanStatusCode } from "./deps.ts";

const tracer = trace.getTracer("advanced-operations", "1.0.0");

export class DataPipeline {
  // Create multiple parallel spans
  async processBatch(items: string[]): Promise<void> {
    const rootSpan = tracer.startSpan("pipeline.batch");
    const rootContext = trace.setSpan(context.active(), rootSpan);

    try {
      // Process items in parallel while maintaining trace hierarchy
      await Promise.all(
        items.map((item, index) =>
          context.with(rootContext, async () => {
            const itemSpan = tracer.startSpan("pipeline.process_item", {
              attributes: {
                "item.index": index,
                "item.id": item,
              },
            });

            try {
              await this.processItem(item);
              itemSpan.setStatus({ code: SpanStatusCode.OK });
            } catch (error) {
              itemSpan.recordException(error as Error);
              itemSpan.setStatus({ code: SpanStatusCode.ERROR });
            } finally {
              itemSpan.end();
            }
          })
        )
      );

      rootSpan.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      rootSpan.recordException(error as Error);
      rootSpan.setStatus({ code: SpanStatusCode.ERROR });
    } finally {
      rootSpan.end();
    }
  }

  private async processItem(_item: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
  }

  // Add events to spans for debugging
  async processWithEvents(data: unknown): Promise<void> {
    await tracer.startActiveSpan("pipeline.process", async (span) => {
      try {
        span.addEvent("validation.started");
        await this.validate(data);
        span.addEvent("validation.completed");

        span.addEvent("processing.started");
        await this.process(data);
        span.addEvent("processing.completed");

        span.setStatus({ code: SpanStatusCode.OK });
      } finally {
        span.end();
      }
    });
  }

  private async validate(_data: unknown): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  private async process(_data: unknown): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
```

## Complete Application Example

Here's a complete example that combines custom spans and metrics:

```typescript
// complete-example.ts
// Full-featured application with custom telemetry

import { initTelemetry } from "./telemetry.ts";
import { ApplicationMetrics } from "./metrics.ts";
import { Database } from "./database.ts";
import { JobProcessor } from "./context-propagation.ts";
import { trace, SpanStatusCode } from "./deps.ts";

const telemetry = initTelemetry("deno-complete-app", "1.0.0");
const metrics = new ApplicationMetrics(telemetry!.meterProvider);
const tracer = trace.getTracer("http-handlers", "1.0.0");
const db = new Database("postgresql://localhost:5432/mydb");
const jobProcessor = new JobProcessor();

Deno.serve({
  port: 8000,
  handler: async (req: Request) => {
    const startTime = Date.now();
    const url = new URL(req.url);

    // Create a custom span for the entire request
    return await tracer.startActiveSpan(
      "http.request",
      {
        attributes: {
          "http.request.method": req.method,
          "url.path": url.pathname,
          "user_agent.original": req.headers.get("user-agent") || "unknown",
        },
      },
      async (span) => {
        try {
          let response: Response;

          if (url.pathname === "/api/users") {
            const result = await db.query("SELECT * FROM users LIMIT 100");
            response = new Response(JSON.stringify(result.rows), {
              headers: { "content-type": "application/json" },
            });
          } else if (url.pathname === "/api/jobs") {
            const jobId = crypto.randomUUID();
            await jobProcessor.queueJob(jobId, { type: "data-sync" });
            response = new Response(JSON.stringify({ jobId }), {
              headers: { "content-type": "application/json" },
            });
          } else {
            response = new Response("Not Found", { status: 404 });
          }

          span.setAttribute("http.response.status_code", response.status);
          span.setStatus({ code: SpanStatusCode.OK });

          const duration = Date.now() - startTime;
          metrics.recordRequest(req.method, url.pathname, response.status, duration);

          return response;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: SpanStatusCode.ERROR });

          const duration = Date.now() - startTime;
          metrics.recordRequest(req.method, url.pathname, 500, duration);

          return new Response("Internal Server Error", { status: 500 });
        } finally {
          span.end();
        }
      }
    );
  },
});
```

Custom instrumentation gives you complete visibility into application behavior beyond what automatic tracing provides. By combining custom spans with metrics, you can track both individual operations and aggregate statistics, making it easier to identify performance bottlenecks and debug complex distributed systems.

Remember to balance instrumentation detail with performance overhead. High-cardinality attributes and excessive span creation can impact application performance and increase storage costs in your observability backend.
