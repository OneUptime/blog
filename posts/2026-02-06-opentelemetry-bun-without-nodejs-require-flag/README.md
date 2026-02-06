# How to Configure OpenTelemetry in Bun Without the Node.js --require Flag

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Bun, JavaScript, Configuration, Runtime, Node.js

Description: Learn how to configure OpenTelemetry in Bun runtime without relying on Node.js --require flag for automatic instrumentation.

Bun is a fast JavaScript runtime that aims for Node.js compatibility while introducing performance optimizations. However, many Node.js OpenTelemetry auto-instrumentation libraries rely on the `--require` flag to load instrumentation before application code executes. Bun supports this flag, but there's a more idiomatic approach that works better with Bun's architecture.

This guide shows how to configure OpenTelemetry in Bun applications using programmatic initialization instead of command-line flags, giving you more control over the instrumentation lifecycle and better compatibility with Bun's module system.

## Understanding the --require Flag Limitation

In Node.js, auto-instrumentation typically uses the `--require` flag to preload instrumentation code:

```bash
# Node.js approach
node --require ./instrumentation.js app.js
```

This works by executing the instrumentation file before the main application loads, allowing it to monkey-patch core modules. While Bun supports this flag, it has some drawbacks:

1. Less explicit control over initialization order
2. Harder to debug when instrumentation fails
3. Doesn't work well with Bun's faster module resolution
4. Makes it harder to conditionally enable instrumentation

The programmatic approach gives you explicit control and works more reliably across different deployment scenarios.

## Setting Up OpenTelemetry Dependencies

First, install the required OpenTelemetry packages. Bun has excellent npm compatibility, so you can use the standard packages:

```bash
# Install core OpenTelemetry packages
bun add @opentelemetry/api \
        @opentelemetry/sdk-node \
        @opentelemetry/auto-instrumentations-node \
        @opentelemetry/exporter-trace-otlp-http \
        @opentelemetry/exporter-metrics-otlp-http
```

Create a telemetry initialization module that will be imported at the start of your application:

```typescript
// telemetry/config.ts
// OpenTelemetry configuration for Bun runtime

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { Resource } from "@opentelemetry/resources";
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

export interface TelemetryConfig {
  serviceName: string;
  serviceVersion: string;
  otlpEndpoint: string;
  environment: string;
}

export function createTelemetrySDK(config: TelemetryConfig): NodeSDK {
  // Define resource attributes
  const resource = new Resource({
    [SEMRESATTRS_SERVICE_NAME]: config.serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: config.serviceVersion,
    "deployment.environment": config.environment,
    "telemetry.sdk.language": "javascript",
    "telemetry.sdk.runtime": "bun",
  });

  // Configure trace exporter
  const traceExporter = new OTLPTraceExporter({
    url: `${config.otlpEndpoint}/v1/traces`,
    headers: {},
  });

  // Configure metrics exporter
  const metricExporter = new OTLPMetricExporter({
    url: `${config.otlpEndpoint}/v1/metrics`,
    headers: {},
  });

  // Create the SDK with auto-instrumentation
  const sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 60000,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Configure auto-instrumentation
        "@opentelemetry/instrumentation-fs": {
          enabled: false, // Disable file system instrumentation for performance
        },
        "@opentelemetry/instrumentation-http": {
          enabled: true,
        },
        "@opentelemetry/instrumentation-express": {
          enabled: true,
        },
        "@opentelemetry/instrumentation-fetch": {
          enabled: true,
        },
      }),
    ],
  });

  return sdk;
}
```

## Programmatic Initialization

The key is to initialize OpenTelemetry at the very top of your entry point file, before any other imports:

```typescript
// index.ts
// Application entry point with programmatic OpenTelemetry initialization

// IMPORTANT: Initialize telemetry FIRST, before any other imports
import { createTelemetrySDK, type TelemetryConfig } from "./telemetry/config";

// Load configuration from environment variables
const telemetryConfig: TelemetryConfig = {
  serviceName: process.env.OTEL_SERVICE_NAME || "bun-app",
  serviceVersion: process.env.APP_VERSION || "1.0.0",
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318",
  environment: process.env.ENVIRONMENT || "development",
};

// Initialize and start the SDK
const sdk = createTelemetrySDK(telemetryConfig);

sdk.start();
console.log("OpenTelemetry initialized");

// Graceful shutdown
process.on("SIGTERM", async () => {
  await sdk.shutdown();
  console.log("OpenTelemetry shut down successfully");
  process.exit(0);
});

// Now import and start your application
import { startServer } from "./server";

startServer();
```

This approach ensures telemetry initialization happens before your application code loads, achieving the same effect as `--require` but with explicit control.

## Building a Complete Application

Here's a complete HTTP server example using Bun's native HTTP server with OpenTelemetry:

```typescript
// server.ts
// HTTP server implementation using Bun.serve

import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer("http-server", "1.0.0");

export function startServer() {
  const server = Bun.serve({
    port: 3000,

    async fetch(req) {
      const url = new URL(req.url);

      // Create a custom span for this request
      return await tracer.startActiveSpan(
        "http.request",
        {
          attributes: {
            "http.method": req.method,
            "http.url": url.pathname,
            "http.scheme": url.protocol,
          },
        },
        async (span) => {
          try {
            let response: Response;

            if (url.pathname === "/api/hello") {
              response = await handleHello(req);
            } else if (url.pathname === "/api/data") {
              response = await handleData(req);
            } else if (url.pathname === "/api/external") {
              response = await handleExternal(req);
            } else {
              response = new Response("Not Found", { status: 404 });
            }

            span.setAttribute("http.status_code", response.status);
            return response;
          } catch (error) {
            span.recordException(error as Error);
            console.error("Request error:", error);
            return new Response("Internal Server Error", { status: 500 });
          } finally {
            span.end();
          }
        }
      );
    },
  });

  console.log(`Server running on http://localhost:${server.port}`);
}

async function handleHello(_req: Request): Promise<Response> {
  return new Response(JSON.stringify({ message: "Hello from Bun!" }), {
    headers: { "Content-Type": "application/json" },
  });
}

async function handleData(_req: Request): Promise<Response> {
  // Simulate some async work
  await Bun.sleep(50);

  const data = {
    timestamp: new Date().toISOString(),
    runtime: "bun",
    version: Bun.version,
  };

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}

async function handleExternal(_req: Request): Promise<Response> {
  // Make an outgoing request - auto-instrumentation will create a span
  const response = await fetch("https://api.github.com/users/github");
  const data = await response.json();

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}
```

## Working with Bun's Built-in APIs

Bun provides optimized APIs that may not be automatically instrumented. Here's how to manually instrument them:

```typescript
// database.ts
// Manual instrumentation for Bun's SQLite database

import { Database } from "bun:sqlite";
import { trace, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("database", "1.0.0");

export class InstrumentedDatabase {
  private db: Database;

  constructor(filename: string) {
    this.db = new Database(filename);
  }

  // Wrap query execution with tracing
  query<T = unknown>(sql: string, ...params: unknown[]): T[] {
    return tracer.startActiveSpan(
      "db.query",
      {
        attributes: {
          "db.system": "sqlite",
          "db.statement": sql,
        },
      },
      (span) => {
        try {
          const stmt = this.db.query(sql);
          const results = stmt.all(...params) as T[];

          span.setAttribute("db.row_count", results.length);
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
  }

  // Wrap prepared statements
  prepare(sql: string) {
    const stmt = this.db.query(sql);

    return {
      all: (...params: unknown[]) => {
        return tracer.startActiveSpan(
          "db.query.prepared",
          {
            attributes: {
              "db.system": "sqlite",
              "db.operation": "SELECT",
            },
          },
          (span) => {
            try {
              const results = stmt.all(...params);
              span.setAttribute("db.row_count", (results as unknown[]).length);
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
    };
  }

  close() {
    this.db.close();
  }
}
```

## Environment-Based Configuration

Create a robust configuration system that works across different environments:

```typescript
// telemetry/environment.ts
// Environment-based telemetry configuration

export interface Environment {
  production: EnvironmentConfig;
  staging: EnvironmentConfig;
  development: EnvironmentConfig;
}

export interface EnvironmentConfig {
  enabled: boolean;
  otlpEndpoint: string;
  sampleRate: number;
  exportInterval: number;
  debugMode: boolean;
}

const environments: Environment = {
  production: {
    enabled: true,
    otlpEndpoint: process.env.OTLP_ENDPOINT || "https://otel-collector.prod.example.com",
    sampleRate: 0.1, // Sample 10% of traces
    exportInterval: 60000,
    debugMode: false,
  },
  staging: {
    enabled: true,
    otlpEndpoint: process.env.OTLP_ENDPOINT || "https://otel-collector.staging.example.com",
    sampleRate: 0.5, // Sample 50% of traces
    exportInterval: 30000,
    debugMode: true,
  },
  development: {
    enabled: true,
    otlpEndpoint: process.env.OTLP_ENDPOINT || "http://localhost:4318",
    sampleRate: 1.0, // Sample all traces
    exportInterval: 10000,
    debugMode: true,
  },
};

export function getEnvironmentConfig(): EnvironmentConfig {
  const env = process.env.ENVIRONMENT || "development";
  const config = environments[env as keyof Environment];

  if (!config) {
    console.warn(`Unknown environment: ${env}, using development config`);
    return environments.development;
  }

  return config;
}

// Helper to check if telemetry should be enabled
export function shouldEnableTelemetry(): boolean {
  const config = getEnvironmentConfig();
  return config.enabled && Boolean(process.env.OTEL_ENABLED !== "false");
}
```

Update the initialization to use environment-based config:

```typescript
// index-with-env.ts
// Application entry point with environment-based configuration

import { createTelemetrySDK, type TelemetryConfig } from "./telemetry/config";
import { getEnvironmentConfig, shouldEnableTelemetry } from "./telemetry/environment";

let sdk: ReturnType<typeof createTelemetrySDK> | null = null;

if (shouldEnableTelemetry()) {
  const envConfig = getEnvironmentConfig();

  const telemetryConfig: TelemetryConfig = {
    serviceName: process.env.OTEL_SERVICE_NAME || "bun-app",
    serviceVersion: process.env.APP_VERSION || "1.0.0",
    otlpEndpoint: envConfig.otlpEndpoint,
    environment: process.env.ENVIRONMENT || "development",
  };

  sdk = createTelemetrySDK(telemetryConfig);
  sdk.start();
  console.log(`OpenTelemetry initialized for ${telemetryConfig.environment}`);
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  if (sdk) {
    await sdk.shutdown();
    console.log("OpenTelemetry shut down successfully");
  }
  process.exit(0);
});

import { startServer } from "./server";
startServer();
```

## Custom Metrics in Bun

Implement custom metrics to track Bun-specific performance characteristics:

```typescript
// telemetry/metrics.ts
// Custom metrics for Bun runtime

import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("bun-metrics", "1.0.0");

// Track memory usage specific to Bun
const memoryUsage = meter.createObservableGauge("bun.memory.usage", {
  description: "Bun process memory usage",
  unit: "bytes",
});

memoryUsage.addCallback((observableResult) => {
  const usage = process.memoryUsage();
  observableResult.observe(usage.heapUsed, { type: "heap_used" });
  observableResult.observe(usage.heapTotal, { type: "heap_total" });
  observableResult.observe(usage.rss, { type: "rss" });
  observableResult.observe(usage.external, { type: "external" });
});

// Track request rate
const requestCounter = meter.createCounter("http.server.requests", {
  description: "Total HTTP requests",
  unit: "1",
});

// Track request duration
const requestDuration = meter.createHistogram("http.server.duration", {
  description: "HTTP request duration",
  unit: "ms",
});

export const bunMetrics = {
  recordRequest(method: string, path: string, status: number, duration: number) {
    const attributes = {
      "http.method": method,
      "http.route": path,
      "http.status_code": status,
    };

    requestCounter.add(1, attributes);
    requestDuration.record(duration, attributes);
  },
};
```

## Debugging and Troubleshooting

When telemetry isn't working as expected, enable debug logging:

```typescript
// telemetry/debug.ts
// Debug utilities for OpenTelemetry in Bun

import { DiagConsoleLogger, DiagLogLevel, diag } from "@opentelemetry/api";

export function enableDebugLogging() {
  // Enable OpenTelemetry diagnostic logging
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  console.log("OpenTelemetry debug logging enabled");
}

// Add to your initialization
if (process.env.OTEL_DEBUG === "true") {
  enableDebugLogging();
}
```

Run your application with debug mode:

```bash
# Enable debug logging
OTEL_DEBUG=true bun run index.ts

# Verify traces are being exported
curl http://localhost:3000/api/hello

# Check the console for debug output
```

## Performance Optimization

Bun is fast, but instrumentation adds overhead. Here are optimization strategies:

```typescript
// telemetry/optimization.ts
// Performance optimization for OpenTelemetry in Bun

import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

export function createOptimizedSDK() {
  const traceExporter = new OTLPTraceExporter({
    url: "http://localhost:4318/v1/traces",
  });

  // Use batch processor with optimized settings
  const spanProcessor = new BatchSpanProcessor(traceExporter, {
    maxQueueSize: 2048,
    maxExportBatchSize: 512,
    scheduledDelayMillis: 5000,
    exportTimeoutMillis: 30000,
  });

  // Optimize for high-throughput scenarios
  return new NodeSDK({
    spanProcessor,
    // Disable auto-instrumentation for low-value modules
    instrumentations: [],
  });
}
```

By using programmatic initialization instead of the `--require` flag, you gain explicit control over when and how OpenTelemetry starts in your Bun applications. This approach is more maintainable, easier to debug, and works better with modern deployment practices like containerization and serverless platforms.

The key is to initialize telemetry at the very top of your entry point, before any application code imports, ensuring that instrumentation hooks are in place when your application modules load.
