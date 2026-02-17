# How to Fix 'No Traces Appearing' When Your OpenTelemetry SDK Initialization Order Is Wrong

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Debugging, Traces, SDK

Description: A step-by-step guide to diagnosing and fixing the missing traces problem caused by incorrect OpenTelemetry SDK initialization order.

You have set up OpenTelemetry, configured your exporter, pointed it at the Collector, and deployed your application. You check your tracing backend and see nothing. No errors in the logs, no crash, just silence. This is one of the most common and most frustrating issues teams encounter with OpenTelemetry, and the fix is almost always about initialization order.

## Diagnosing the Problem

Before jumping to fixes, let us confirm the initialization order is actually the issue. Enable diagnostic logging in your SDK:

```javascript
// Add this at the very top of your tracing setup file
const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
```

Now restart your application and look for these specific log messages:

**Good signs:**
```
Applying instrumentation patch for module http on require hook
Applying instrumentation patch for module express on require hook
```

**Bad signs:**
```
Module express has been loaded before @opentelemetry/instrumentation-express
```

If you see the "loaded before" warning, the initialization order is your problem.

## The Root Cause

In Node.js, when you call `require('express')`, Node loads the module, executes it, and caches the result. All subsequent `require('express')` calls return the cached version. OpenTelemetry instrumentation works by intercepting `require()` calls and wrapping the returned module with tracing code.

If `require('express')` is called before the OpenTelemetry SDK registers its hooks, the module loads without any tracing wrappers. When the SDK hooks are registered later, Express is already in the cache and will not be loaded again.

## Fix 1: The --require Flag (Recommended)

The cleanest solution is to separate your tracing setup into its own file and load it before your application code using Node's `--require` flag:

```javascript
// tracing.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { Resource } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'my-service',
  }),
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
console.log('OpenTelemetry tracing initialized');
```

Update your start command:

```json
{
  "scripts": {
    "start": "node --require ./tracing.js src/index.js"
  }
}
```

## Fix 2: Dynamic Import in Application Entry Point

If you cannot use `--require`, you can use dynamic `require()` to control the order:

```javascript
// index.js
// Initialize tracing first - this must complete before anything else loads
require('./tracing');

// Now load the rest of the application
const app = require('./app');
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

```javascript
// app.js - separate file for Express setup
const express = require('express');
const app = express();

app.get('/api/users', (req, res) => {
  res.json([{ id: 1, name: 'Alice' }]);
});

module.exports = app;
```

The key point is that `require('./tracing')` must execute completely before `require('./app')` triggers the loading of Express.

## Fix 3: For Docker and Kubernetes

In containerized environments, set the `NODE_OPTIONS` environment variable:

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .

# This ensures tracing.js loads before the application
ENV NODE_OPTIONS="--require ./tracing.js"
CMD ["node", "src/index.js"]
```

Or in a Kubernetes deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: my-service
          image: my-service:latest
          env:
            - name: NODE_OPTIONS
              value: "--require ./tracing.js"
            - name: OTEL_SERVICE_NAME
              value: "my-service"
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "http://otel-collector:4317"
```

## Verifying the Fix

After applying the fix, you should see traces flowing. A quick way to verify locally is to use the console exporter temporarily:

```javascript
const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');

const sdk = new NodeSDK({
  traceExporter: new ConsoleSpanExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
```

Make a request to your application and you should see span data printed to stdout:

```
{
  traceId: 'abc123...',
  name: 'GET /api/users',
  kind: 1,
  duration: [0, 2345678],
  status: { code: 0 }
}
```

If spans appear in the console but not in your backend, the issue is with the exporter configuration, not the initialization order.

## Common Gotchas

- **Jest and testing frameworks** often load modules before your setup code runs. Use `jest.setup.js` to initialize tracing before tests.
- **Serverless environments** like AWS Lambda need tracing setup in the handler wrapper, not in module scope, because cold starts behave differently.
- **Monorepos with shared packages** sometimes have transitive imports that load libraries before your entry point's tracing setup runs.

The initialization order problem is responsible for more "OpenTelemetry does not work" reports than any other issue. Getting this right solves the majority of missing traces cases.
