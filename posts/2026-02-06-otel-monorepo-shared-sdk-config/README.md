# How to Use OpenTelemetry in a Monorepo with Shared SDK Configuration Across Multiple Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Monorepo, Shared Configuration, SDK, Microservices

Description: Structure your OpenTelemetry SDK configuration in a monorepo so multiple services share a single tracing setup without duplication.

In a monorepo with multiple services, each service needs OpenTelemetry instrumentation. Without a shared configuration, you end up copying the same SDK initialization code into every service, and changes to the tracing setup require updating every copy. A better approach is to create a shared tracing package that all services import. This post shows how to structure that.

## Monorepo Layout

Here is a typical monorepo structure using npm workspaces:

```
monorepo/
  package.json
  packages/
    tracing/           # Shared OpenTelemetry configuration
      package.json
      src/
        index.js
        config.js
    service-api/       # API service
      package.json
      src/
        app.js
    service-worker/    # Background worker service
      package.json
      src/
        worker.js
    service-gateway/   # API gateway
      package.json
      src/
        gateway.js
```

## The Root Package Configuration

Set up npm workspaces in the root `package.json`:

```json
{
  "name": "monorepo",
  "private": true,
  "workspaces": [
    "packages/*"
  ]
}
```

## The Shared Tracing Package

Create `packages/tracing/package.json`:

```json
{
  "name": "@monorepo/tracing",
  "version": "1.0.0",
  "main": "src/index.js",
  "dependencies": {
    "@opentelemetry/api": "^1.8.0",
    "@opentelemetry/sdk-node": "^0.49.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.49.0",
    "@opentelemetry/exporter-metrics-otlp-http": "^0.49.0",
    "@opentelemetry/auto-instrumentations-node": "^0.43.0",
    "@opentelemetry/sdk-trace-base": "^1.22.0",
    "@opentelemetry/resources": "^1.22.0",
    "@opentelemetry/semantic-conventions": "^1.22.0"
  }
}
```

Now create the shared configuration in `packages/tracing/src/config.js`:

```javascript
// packages/tracing/src/config.js
// Default configuration that services can override

const defaults = {
  // Read from environment, fall back to sensible defaults
  serviceName: process.env.OTEL_SERVICE_NAME || 'unknown-service',
  environment: process.env.NODE_ENV || 'development',
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',

  // Instrumentation options
  instrumentations: {
    http: true,
    express: true,
    pg: true,
    redis: true,
    grpc: true,
  },
};

function mergeConfig(overrides = {}) {
  return {
    ...defaults,
    ...overrides,
    instrumentations: {
      ...defaults.instrumentations,
      ...(overrides.instrumentations || {}),
    },
  };
}

module.exports = { defaults, mergeConfig };
```

And the main initialization in `packages/tracing/src/index.js`:

```javascript
// packages/tracing/src/index.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { ConsoleSpanExporter, SimpleSpanProcessor, BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { mergeConfig } = require('./config');

let sdkInstance = null;

function initTracing(overrides = {}) {
  // Prevent double initialization
  if (sdkInstance) {
    console.warn('[tracing] SDK already initialized, skipping');
    return sdkInstance;
  }

  const config = mergeConfig(overrides);

  // Build the resource with service-specific attributes
  const resource = new Resource({
    'service.name': config.serviceName,
    'deployment.environment': config.environment,
    'service.version': config.serviceVersion || 'unknown',
  });

  // Choose exporter based on environment
  let traceExporter;
  let spanProcessor;

  if (config.environment === 'development' && !process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    traceExporter = new ConsoleSpanExporter();
    spanProcessor = new SimpleSpanProcessor(traceExporter);
  } else {
    traceExporter = new OTLPTraceExporter({
      url: `${config.otlpEndpoint}/v1/traces`,
    });
    spanProcessor = config.environment === 'development'
      ? new SimpleSpanProcessor(traceExporter)
      : new BatchSpanProcessor(traceExporter);
  }

  // Configure auto-instrumentations based on config
  const instrumentationConfig = {};
  if (!config.instrumentations.pg) {
    instrumentationConfig['@opentelemetry/instrumentation-pg'] = { enabled: false };
  }
  if (!config.instrumentations.redis) {
    instrumentationConfig['@opentelemetry/instrumentation-redis'] = { enabled: false };
  }

  const sdk = new NodeSDK({
    resource,
    spanProcessors: [spanProcessor],
    instrumentations: [getNodeAutoInstrumentations(instrumentationConfig)],
  });

  sdk.start();
  console.log(`[tracing] Initialized for ${config.serviceName} (${config.environment})`);

  // Register shutdown handlers
  const shutdown = () => {
    sdk.shutdown()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  sdkInstance = sdk;
  return sdk;
}

module.exports = { initTracing };
```

## Using the Shared Package in Services

Each service imports `@monorepo/tracing` and calls `initTracing` with its specific configuration.

`packages/service-api/package.json`:

```json
{
  "name": "@monorepo/service-api",
  "dependencies": {
    "@monorepo/tracing": "*",
    "express": "^4.18.0"
  }
}
```

`packages/service-api/src/app.js`:

```javascript
// Initialize tracing before any other imports
const { initTracing } = require('@monorepo/tracing');
initTracing({
  serviceName: 'service-api',
  serviceVersion: '2.1.0',
  instrumentations: {
    pg: true,     // This service uses PostgreSQL
    redis: false, // This service does not use Redis
  },
});

// Now import the rest of the application
const express = require('express');
const app = express();

app.get('/api/orders', (req, res) => {
  res.json({ orders: [] });
});

app.listen(3001, () => console.log('API service running on 3001'));
```

`packages/service-worker/src/worker.js`:

```javascript
const { initTracing } = require('@monorepo/tracing');
initTracing({
  serviceName: 'service-worker',
  serviceVersion: '1.5.0',
  instrumentations: {
    pg: false,
    redis: true,  // Worker uses Redis for job queues
    express: false, // Worker has no HTTP server
  },
});

// Worker logic here
const { processJobs } = require('./jobs');
processJobs();
```

## Benefits of This Approach

When you need to update the OpenTelemetry SDK version, you change it in one place: `packages/tracing/package.json`. Run `npm install` at the root and every service picks up the update.

When you want to add a new exporter or change the processor configuration, you modify the shared package. All services inherit the change without any updates to their own code.

When a new developer creates a new service, they add `@monorepo/tracing` as a dependency, call `initTracing()` with two lines of code, and they have full instrumentation.

## Testing the Shared Package

Add tests to the tracing package to make sure configuration merging works correctly:

```javascript
// packages/tracing/src/__tests__/config.test.js
const { mergeConfig } = require('../config');

test('uses defaults when no overrides provided', () => {
  const config = mergeConfig();
  expect(config.instrumentations.http).toBe(true);
});

test('overrides specific instrumentations', () => {
  const config = mergeConfig({ instrumentations: { pg: false } });
  expect(config.instrumentations.pg).toBe(false);
  expect(config.instrumentations.http).toBe(true);
});
```

This shared package pattern scales well. We have used it in monorepos with over a dozen services, and the consistency it provides is worth the initial setup effort.
