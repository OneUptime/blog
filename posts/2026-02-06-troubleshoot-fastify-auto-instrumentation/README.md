# How to Troubleshoot Fastify Instrumentation Not Being Applied by

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Fastify, Node.js, Auto-Instrumentation

Description: Debug and fix Fastify instrumentation issues when getNodeAutoInstrumentations does not automatically instrument your Fastify app.

Fastify is a popular alternative to Express for building Node.js APIs. Older versions of `getNodeAutoInstrumentations()` included Fastify instrumentation, but current versions of `@opentelemetry/auto-instrumentations-node` removed it after deprecating it in favor of the official `@fastify/otel` package. If you still use `@opentelemetry/instrumentation-fastify`, there are several reasons it may silently fail. This post walks through the common causes and their fixes.

## Confirming the Problem

First, verify that Fastify instrumentation is not working. Enable diagnostic logging:

```javascript
const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
```

Look for these messages:

```text
# Good - instrumentation is being applied

@opentelemetry/instrumentation-fastify Applying instrumentation patch for module fastify

# Bad - module loaded too early
@opentelemetry/instrumentation-fastify Module fastify has been loaded before instrumentation
```

If you see neither message, the Fastify instrumentation package may not be installed, registered, or enabled.

## Cause 1: Missing or Removed Fastify Instrumentation

Current versions of `@opentelemetry/auto-instrumentations-node` no longer include Fastify instrumentation. Check whether you have the Fastify instrumentation package installed:

```bash
npm ls @opentelemetry/instrumentation-fastify
```

If it is not listed, install it:

```bash
npm install @opentelemetry/instrumentation-fastify
```

If it is missing, install it explicitly and register it yourself, or migrate to the official `@fastify/otel` package maintained by the Fastify authors.

## Cause 2: Fastify Version Mismatch

The Fastify instrumentation supports specific Fastify versions. Check compatibility:

```bash
# Check your Fastify version
npm ls fastify

# Check the supported range in the instrumentation package README
npm info @opentelemetry/instrumentation-fastify readme
```

At the time of writing, `@opentelemetry/instrumentation-fastify` supports Fastify versions `>=3.0.0 <6`. If your Fastify version is outside the supported range, the instrumentation quietly skips patching.

## Cause 3: Fastify Loaded Before SDK Initialization

The same require-order issue that affects Express applies to Fastify:

```javascript
// BROKEN - Fastify loaded before tracing
const fastify = require('fastify');
require('./tracing');  // Too late

const app = fastify();
```

**Fix:**

```javascript
// tracing.js - loaded first via --require
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { FastifyInstrumentation } = require('@opentelemetry/instrumentation-fastify');

const sdk = new NodeSDK({
  instrumentations: [
    getNodeAutoInstrumentations(),
    new FastifyInstrumentation(),
  ],
});
sdk.start();
```

```bash
node --require ./tracing.js app.js
```

## Cause 4: Disabled in Auto-Instrumentation Config

In versions of `@opentelemetry/auto-instrumentations-node` that still include Fastify, `getNodeAutoInstrumentations` accepts a configuration object where specific instrumentations can be disabled:

```javascript
const instrumentations = getNodeAutoInstrumentations({
  '@opentelemetry/instrumentation-fastify': {
    enabled: false,  // Accidentally disabled!
  },
});
```

Check your configuration to make sure Fastify is not disabled.

## Cause 5: Using Fastify with ESM

If your project uses ES modules, the standard require hooks do not work:

```javascript
// app.mjs - ESM import
import Fastify from 'fastify';
```

You need the ESM loader hook. See the ESM-specific fix:

```bash
node --experimental-loader=@opentelemetry/instrumentation/hook.mjs --import ./tracing.mjs app.mjs
```

## Manual Fastify Instrumentation

If auto-instrumentation does not work for your setup, you can instrument Fastify manually:

```javascript
const { FastifyInstrumentation } = require('@opentelemetry/instrumentation-fastify');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { NodeSDK } = require('@opentelemetry/sdk-node');

const sdk = new NodeSDK({
  instrumentations: [
    new HttpInstrumentation(),
    new FastifyInstrumentation({
      requestHook: (span, info) => {
        span.setAttribute('fastify.route', info.request.routeOptions?.url || info.request.routerPath);
      },
    }),
  ],
});
sdk.start();
```

Note that `FastifyInstrumentation` expects `HttpInstrumentation` to be active. If HTTP instrumentation is not active, Fastify spans may be disconnected from the inbound HTTP request span.

## Expected Spans from Fastify Instrumentation

When working correctly, a request to your Fastify app produces:

```text
GET /api/users                     [================] 12ms  (HTTP span)
  request handler - /api/users     [==============]   10ms  (Fastify handler span)
```

Fastify middleware (hooks) also generate spans:

```text
GET /api/users                     [================] 15ms
  middleware - onRequest           [=]                 1ms
  middleware - preValidation       [=]                 0.5ms
  request handler - /api/users    [============]      12ms
```

## Testing Your Setup

Create a minimal test to verify spans are generated:

```javascript
// test-tracing.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { InMemorySpanExporter, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { FastifyInstrumentation } = require('@opentelemetry/instrumentation-fastify');

const exporter = new InMemorySpanExporter();

const sdk = new NodeSDK({
  spanProcessors: [new SimpleSpanProcessor(exporter)],
  instrumentations: [
    getNodeAutoInstrumentations(),
    new FastifyInstrumentation(),
  ],
});
sdk.start();

// Now load and test Fastify
const fastify = require('fastify')();
fastify.get('/test', async () => ({ status: 'ok' }));

fastify.listen({ port: 0 }).then(async () => {
  const port = fastify.server.address().port;
  await fetch(`http://localhost:${port}/test`);

  // Give the span processor a moment
  await new Promise(r => setTimeout(r, 100));

  const spans = exporter.getFinishedSpans();
  console.log('Spans generated:', spans.length);
  spans.forEach(s => console.log(`  ${s.name}`));

  await fastify.close();
  await sdk.shutdown();
});
```

Run it with `node test-tracing.js` and check that spans appear.

Fastify instrumentation issues almost always come down to package installation, version compatibility, or module load order. Verify each of these and you will have working Fastify traces.
