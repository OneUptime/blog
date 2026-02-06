# How to Set Up OpenTelemetry for Local Development with Hot Reloading

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Local Development, Hot Reload, Developer Experience, Debugging

Description: Practical patterns for configuring OpenTelemetry in local development environments with fast feedback loops and minimal friction.

OpenTelemetry provides powerful production observability, but it can slow down local development if configured incorrectly. Developers need fast feedback loops with instant code reloading and minimal overhead. Setting up OpenTelemetry for local development requires different trade-offs than production: you want maximum verbosity for debugging, minimal latency, and seamless integration with hot reloading tools.

## The Local Development Challenge

The same OpenTelemetry configuration that works well in production often creates friction locally. Production configurations sample traces to reduce data volume and use batching to minimize network overhead. These optimizations hurt the development experience where you want to see every trace immediately without sampling.

Hot reloading complicates things further. Tools like nodemon, webpack dev server, and Next.js dev mode restart your application or reload modules when code changes. Each restart can create orphaned spans, break trace continuity, or cause memory leaks if the OpenTelemetry SDK isn't properly shut down.

The goal is to configure OpenTelemetry differently for local development while keeping the production configuration unchanged. This means environment-specific initialization logic that detects whether you're running locally and adjusts behavior accordingly.

## Environment Detection Strategy

Start by establishing a reliable way to detect local development. Environment variables are the standard approach, but you need conventions that work across your entire codebase.

```javascript
// common/telemetry.js - Centralized telemetry initialization
const isDevelopment = process.env.NODE_ENV === 'development';
const isLocal = process.env.ENVIRONMENT === 'local' ||
                process.env.OTEL_ENV === 'local';

function shouldEnableTelemetry() {
  // Always enable in production and staging
  if (!isLocal) return true;

  // In local development, enable only if explicitly requested
  return process.env.ENABLE_OTEL === 'true';
}

module.exports = {
  isDevelopment,
  isLocal,
  shouldEnableTelemetry,
};
```

This pattern gives developers control. By default, OpenTelemetry is disabled locally to maximize performance. When debugging distributed systems locally, set `ENABLE_OTEL=true` to get full instrumentation.

## Lightweight Local Collector Setup

Running the full OpenTelemetry Collector locally can be overkill. For development, you need something lightweight that starts quickly and provides immediate feedback.

Use Docker Compose to run a minimal observability stack. Include Jaeger for trace visualization and optionally Prometheus for metrics. Keep the configuration simple to minimize startup time.

```yaml
# docker-compose.dev.yaml
version: '3.8'

services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # UI
      - "4317:4317"    # OTLP gRPC
      - "4318:4318"    # OTLP HTTP
    environment:
      - COLLECTOR_OTLP_ENABLED=true
      - LOG_LEVEL=info
    command:
      - "--memory.max-traces=1000"  # Limit memory usage
```

Start the stack with `docker-compose -f docker-compose.dev.yaml up -d`. The collector runs in the background, ready to receive telemetry whenever you enable instrumentation.

For even faster startup, skip the collector entirely and export traces directly to the console during development:

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const { isLocal } = require('./common/telemetry');

function initializeTelemetry() {
  const exporter = isLocal
    ? new ConsoleSpanExporter()
    : new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_URL });

  const sdk = new NodeSDK({
    traceExporter: exporter,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();

  return sdk;
}
```

Console output provides immediate feedback without requiring any external services. You see spans in your terminal as they're created, making it easy to verify instrumentation is working correctly.

## Hot Reload Compatibility

Hot reloading tools restart the Node.js process or reload modules dynamically. Both scenarios can cause problems with OpenTelemetry if not handled correctly.

The key is properly shutting down the SDK when the process exits or when modules reload. This ensures spans are flushed and resources are cleaned up.

```javascript
// Initialize telemetry and handle cleanup
const sdk = initializeTelemetry();

// Handle graceful shutdown
async function shutdown() {
  try {
    await sdk.shutdown();
    console.log('OpenTelemetry SDK shut down successfully');
  } catch (error) {
    console.error('Error shutting down OpenTelemetry SDK:', error);
  }
}

// Register shutdown handlers
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('exit', shutdown);

// For nodemon and other dev tools that reload modules
if (module.hot) {
  module.hot.dispose(shutdown);
}
```

This pattern ensures clean shutdown whether the process exits normally, receives a signal, or is restarted by a development tool.

## Optimizing for Fast Feedback

In local development, you want traces exported immediately without batching delays. Production configurations batch spans to reduce network overhead, but locally you want instant visibility.

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { BatchSpanProcessor, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const { isLocal } = require('./common/telemetry');

function createSpanProcessor(exporter) {
  if (isLocal) {
    // Use SimpleSpanProcessor for immediate export
    return new SimpleSpanProcessor(exporter);
  } else {
    // Use BatchSpanProcessor in production
    return new BatchSpanProcessor(exporter, {
      maxQueueSize: 2048,
      maxExportBatchSize: 512,
      scheduledDelayMillis: 5000,
    });
  }
}

const exporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces'
});

const sdk = new NodeSDK({
  spanProcessor: createSpanProcessor(exporter),
  instrumentations: [getNodeAutoInstrumentations()],
});
```

SimpleSpanProcessor exports each span immediately when it ends. This eliminates the batching delay, giving you instant feedback in Jaeger or your console.

## Selective Instrumentation

Automatic instrumentation is convenient but can be overwhelming in development. You might not care about every HTTP request to localhost or every Redis call while debugging a specific feature.

Create development-specific instrumentation configurations that disable noisy instrumentations:

```javascript
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');

const { isLocal } = require('./common/telemetry');

function getInstrumentations() {
  if (isLocal) {
    // Minimal instrumentation for development
    return [
      new HttpInstrumentation({
        ignoreIncomingPaths: ['/health', '/metrics'],
      }),
      new ExpressInstrumentation(),
      // Add only the instrumentations you need for debugging
    ];
  } else {
    // Full automatic instrumentation in production
    return [getNodeAutoInstrumentations()];
  }
}

const sdk = new NodeSDK({
  instrumentations: getInstrumentations(),
  // ... rest of configuration
});
```

This keeps trace output focused on what matters for your current task. You can enable additional instrumentations by adjusting the development configuration when needed.

## Managing Trace Volume

Even with selective instrumentation, local development can generate many traces if you're making repeated requests while testing. Trace volume can overwhelm Jaeger UI and make it hard to find the specific trace you're debugging.

Implement request-based trace initiation. Instead of creating traces for every request, only trace requests that include a specific header:

```javascript
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { context, trace, SpanStatusCode } = require('@opentelemetry/api');

const { isLocal } = require('./common/telemetry');

function shouldSampleRequest(req) {
  if (!isLocal) return true; // Always sample in production

  // In local dev, only trace requests with debug header
  return req.headers['x-enable-trace'] === 'true';
}

new HttpInstrumentation({
  requestHook: (span, request) => {
    if (!shouldSampleRequest(request)) {
      // Set sampling decision to drop this trace
      const spanContext = span.spanContext();
      spanContext.traceFlags = 0; // TraceFlags.NONE
    }
  },
})
```

Now you can selectively enable tracing for specific requests:

```bash
# This request creates a trace
curl -H "x-enable-trace: true" http://localhost:3000/api/users

# This request does not create a trace
curl http://localhost:3000/api/users
```

This gives you fine-grained control over when traces are created, reducing noise in the Jaeger UI.

## Debugging with Verbose Logging

When instrumentation isn't working as expected, enable verbose logging to see what OpenTelemetry is doing internally:

```javascript
const { DiagConsoleLogger, DiagLogLevel, diag } = require('@opentelemetry/api');
const { isLocal } = require('./common/telemetry');

if (isLocal && process.env.OTEL_DEBUG === 'true') {
  // Enable debug logging
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
}
```

Run your application with `OTEL_DEBUG=true npm run dev` to see detailed logs about SDK initialization, span creation, and export. This is invaluable when debugging why spans aren't appearing or why context propagation is broken.

## Framework-Specific Patterns

Different frameworks require different approaches to hot reloading with OpenTelemetry. Here are patterns for common frameworks:

### Next.js Development

Next.js dev mode uses webpack HMR for fast refresh. Initialize OpenTelemetry in a way that survives module reloads:

```javascript
// instrumentation.ts (Next.js 13+ instrumentation hook)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerOTel } = await import('./telemetry');
    registerOTel();
  }
}

// telemetry.ts
let sdk: NodeSDK | undefined;

export function registerOTel() {
  // Only initialize once
  if (sdk) return;

  sdk = new NodeSDK({
    // ... configuration
  });

  sdk.start();
}
```

Next.js calls the `register` function on startup and reinitializes cleanly on hot reload.

### Express with Nodemon

For Express applications using nodemon, the process restarts completely on file changes. The shutdown handlers we defined earlier ensure clean restarts:

```json
{
  "scripts": {
    "dev": "nodemon --exec 'node -r ./telemetry.js' src/server.js"
  }
}
```

The `-r` flag loads telemetry initialization before your application code, ensuring instrumentation is ready when the server starts.

### Webpack Dev Server

Webpack dev server requires special handling because it runs your code in a webpack compilation context:

```javascript
// webpack.config.js
module.exports = {
  entry: ['./src/telemetry.js', './src/index.js'],
  // ... rest of config
};

// src/telemetry.js
if (module.hot) {
  // Don't initialize in HMR mode
  console.log('Skipping OpenTelemetry initialization in HMR mode');
} else {
  // Normal initialization
  initializeTelemetry();
}
```

This prevents OpenTelemetry from initializing during HMR, avoiding conflicts with webpack's module replacement.

## Testing Integration

Unit tests shouldn't create traces. Instrument your initialization code to detect test environments and disable OpenTelemetry:

```javascript
const isTest = process.env.NODE_ENV === 'test' ||
               process.env.JEST_WORKER_ID !== undefined;

function initializeTelemetry() {
  if (isTest) {
    console.log('Skipping OpenTelemetry initialization in test environment');
    return null;
  }

  // Normal initialization
  const sdk = new NodeSDK({
    // ... configuration
  });

  sdk.start();
  return sdk;
}
```

For integration tests where you want to verify instrumentation, use the in-memory span exporter:

```javascript
// test/setup.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { InMemorySpanExporter } = require('@opentelemetry/sdk-trace-base');

const spanExporter = new InMemorySpanExporter();

const sdk = new NodeSDK({
  traceExporter: spanExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

// Make exporter available to tests
global.spanExporter = spanExporter;

afterEach(() => {
  // Clear spans between tests
  spanExporter.reset();
});
```

Now your tests can inspect captured spans:

```javascript
// test/api.test.js
test('creates span for user creation', async () => {
  await request(app)
    .post('/users')
    .send({ name: 'Test User' });

  const spans = global.spanExporter.getFinishedSpans();
  const userSpan = spans.find(s => s.name === 'POST /users');

  expect(userSpan).toBeDefined();
  expect(userSpan.attributes['http.status_code']).toBe(201);
});
```

## Visual Studio Code Integration

Enhance the development experience with VS Code launch configurations that enable OpenTelemetry debugging:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug with OpenTelemetry",
      "program": "${workspaceFolder}/src/server.js",
      "env": {
        "NODE_ENV": "development",
        "ENABLE_OTEL": "true",
        "OTEL_DEBUG": "true"
      },
      "console": "integratedTerminal"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug without OpenTelemetry",
      "program": "${workspaceFolder}/src/server.js",
      "env": {
        "NODE_ENV": "development",
        "ENABLE_OTEL": "false"
      },
      "console": "integratedTerminal"
    }
  ]
}
```

This gives you one-click access to both modes: debugging with full instrumentation and maximum performance without instrumentation.

## Performance Monitoring in Development

Even in development, monitor the overhead of OpenTelemetry instrumentation. Create a simple benchmark that compares request latency with and without instrumentation:

```javascript
// scripts/benchmark-instrumentation.js
const autocannon = require('autocannon');

async function benchmark(enableOtel) {
  process.env.ENABLE_OTEL = enableOtel.toString();

  // Start server
  const { server } = await import('../src/server');

  // Run benchmark
  const result = await autocannon({
    url: 'http://localhost:3000/api/health',
    connections: 10,
    duration: 10,
  });

  await server.close();

  return result;
}

async function main() {
  console.log('Benchmarking without instrumentation...');
  const withoutOtel = await benchmark(false);

  console.log('Benchmarking with instrumentation...');
  const withOtel = await benchmark(true);

  console.log('\nResults:');
  console.log(`Without OTel: ${withoutOtel.requests.average} req/s`);
  console.log(`With OTel: ${withOtel.requests.average} req/s`);
  console.log(`Overhead: ${((withoutOtel.requests.average - withOtel.requests.average) / withoutOtel.requests.average * 100).toFixed(2)}%`);
}

main();
```

Run this periodically to ensure instrumentation overhead remains acceptable. If overhead increases significantly, investigate whether specific instrumentations are causing problems.

## Docker Compose for Complete Local Stack

For complex systems with multiple services, use Docker Compose to run everything locally with consistent OpenTelemetry configuration:

```yaml
# docker-compose.full-stack.yaml
version: '3.8'

services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
      - "4317:4317"

  api-gateway:
    build: ./api-gateway
    environment:
      - NODE_ENV=development
      - ENABLE_OTEL=true
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317
    ports:
      - "3000:3000"
    volumes:
      - ./api-gateway/src:/app/src
    command: npm run dev

  user-service:
    build: ./user-service
    environment:
      - NODE_ENV=development
      - ENABLE_OTEL=true
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317
    volumes:
      - ./user-service/src:/app/src
    command: npm run dev

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=password
    ports:
      - "5432:5432"
```

This stack includes all services with hot reloading enabled. Changes to source code are immediately reflected without rebuilding containers.

## Practical Development Workflow

With everything configured, your typical development workflow looks like this:

1. Start the local observability stack: `docker-compose up jaeger`
2. Start your services with hot reloading: `npm run dev`
3. Make code changes and watch your services restart automatically
4. Send test requests with tracing enabled: `curl -H "x-enable-trace: true" http://localhost:3000/api/endpoint`
5. View traces in Jaeger at http://localhost:16686
6. Iterate quickly with instant feedback

When you don't need tracing, skip the `x-enable-trace` header and enjoy maximum performance. When debugging complex flows, enable tracing and get complete visibility into your distributed system.

For more details on the foundational concepts, see our guide on [the three pillars of observability](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view).

Setting up OpenTelemetry for local development requires balancing observability with developer experience. Environment-specific configuration, proper hot reload handling, and selective instrumentation create a workflow where OpenTelemetry enhances debugging without slowing down development. The patterns described here work across different frameworks and scale from single services to complex distributed systems running entirely on your local machine.
