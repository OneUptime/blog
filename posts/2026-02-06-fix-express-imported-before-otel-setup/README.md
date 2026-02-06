# How to Fix Express.js Instrumentation Failing Because the App Was Imported Before OpenTelemetry Setup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Express.js, Node.js, Instrumentation

Description: Resolve Express.js instrumentation failures by ensuring OpenTelemetry hooks are registered before Express is imported.

Express.js is one of the most popular Node.js frameworks, and OpenTelemetry provides instrumentation for it. But the instrumentation only works if the Express module is loaded after OpenTelemetry sets up its hooks. If Express is imported first, you get zero HTTP spans from your Express routes, and there is no error message to tell you why.

## The Failure Pattern

```javascript
// server.js - BROKEN
const express = require('express');    // Express loads into module cache
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();  // Too late - Express is already loaded

const app = express();
app.get('/api/users', (req, res) => {
  res.json([{ id: 1, name: 'Alice' }]);
});
app.listen(3000);
// No HTTP or Express spans will be generated
```

## Why Express Instrumentation Needs to Load First

The `@opentelemetry/instrumentation-express` package works by wrapping Express's internal `Router.route()`, `Router.use()`, and the layer handling functions. These wrappings add spans for each middleware and route handler in your Express app.

The wrapping happens when Express is first loaded via `require('express')`. If Express is already in the module cache, the wrapping code runs but does not patch the already-cached module instance that your application is using.

## The Fix: Separate Tracing File with --require

```javascript
// tracing.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'express-api',
  }),
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
console.log('Tracing initialized');
```

```javascript
// server.js - Express loads AFTER tracing hooks are in place
const express = require('express');

const app = express();

app.get('/api/users', (req, res) => {
  res.json([{ id: 1, name: 'Alice' }]);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

```json
{
  "scripts": {
    "start": "node --require ./tracing.js server.js"
  }
}
```

## What Spans Express Instrumentation Creates

When working correctly, you should see these spans for a request to `GET /api/users`:

```
GET /api/users                    [================] 15ms    (HTTP span)
  middleware - query               [=]                1ms    (Express middleware)
  middleware - expressInit         [=]                0.5ms  (Express middleware)
  request handler - /api/users    [============]     12ms   (Express route handler)
```

If you only see the top-level HTTP span but no Express middleware or route handler spans, the Express instrumentation is not active.

## Testing That Instrumentation Is Active

Use the console exporter to quickly verify:

```javascript
// tracing.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');

const sdk = new NodeSDK({
  traceExporter: new ConsoleSpanExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
```

Make a request and check stdout. You should see multiple span objects for a single request (HTTP span + Express middleware spans + route handler span).

## Handling Multiple Entry Points

If your application has multiple entry points (API server, worker, CLI), create a shared tracing setup:

```javascript
// tracing.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
```

```json
{
  "scripts": {
    "start:api": "node --require ./tracing.js src/api.js",
    "start:worker": "node --require ./tracing.js src/worker.js",
    "start:cli": "node --require ./tracing.js src/cli.js"
  }
}
```

## Selective Express Instrumentation

If you want only specific Express spans, configure the instrumentation:

```javascript
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');

const sdk = new NodeSDK({
  instrumentations: [
    new ExpressInstrumentation({
      // Ignore health check routes
      ignoreLayersType: [],
      ignoreLayers: [
        (name) => name === 'middleware - healthCheck',
      ],
    }),
  ],
});
```

## Common Related Issues

- If you use `app.use(express.static(...))`, the static file middleware generates a span for every asset request. Consider filtering these in production.
- Error handling middleware (`app.use((err, req, res, next) => {...})`) generates spans too. Make sure errors in this middleware are properly recorded on the span.
- If you use Express sub-apps (`app.use('/api', apiRouter)`), each sub-app's middleware generates its own spans.

The fix is always the same: make sure `require('express')` happens after `sdk.start()`. The `--require` flag is the most reliable way to guarantee this order.
