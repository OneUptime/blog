# How to Troubleshoot Fastify Instrumentation Not Being Applied by getNodeAutoInstrumentations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Fastify, Node.js, Auto-Instrumentation

Description: Debug and fix Fastify instrumentation issues when getNodeAutoInstrumentations does not automatically instrument your Fastify app.

Fastify is a popular alternative to Express for building Node.js APIs. While `getNodeAutoInstrumentations()` includes Fastify instrumentation, there are several reasons it may silently fail. This post walks through the common causes and their fixes.

## Confirming the Problem

First, verify that Fastify instrumentation is not working. Enable diagnostic logging:

```javascript
const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
```

Look for these messages:

```
# Good - instrumentation is being applied
@opentelemetry/instrumentation-fastify Applying instrumentation patch for module fastify

# Bad - module loaded too early
@opentelemetry/instrumentation-fastify Module fastify has been loaded before instrumentation
```

If you see neither message, the Fastify instrumentation package is not installed.

## Cause 1: Missing the Fastify Instrumentation Package

`getNodeAutoInstrumentations()` includes Fastify, but only if the package is installed:

```bash
npm ls @opentelemetry/instrumentation-fastify
```

If it is not listed, install it:

```bash
npm install @opentelemetry/instrumentation-fastify
```

The `@opentelemetry/auto-instrumentations-node` package lists Fastify instrumentation as an optional peer dependency. If installation skips optional dependencies, you need to install it explicitly.

## Cause 2: Fastify Version Mismatch

The Fastify instrumentation supports specific Fastify versions. Check compatibility:

```bash
# Check your Fastify version
npm ls fastify

# Check the supported range in the instrumentation package
npm info @opentelemetry/instrumentation-fastify peerDependencies
```

If your Fastify version is outside the supported range, the instrumentation quietly skips patching.

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

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
```

```bash
node --require ./tracing.js app.js
```

## Cause 4: Disabled in Auto-Instrumentation Config

`getNodeAutoInstrumentations` accepts a configuration object where specific instrumentations can be disabled:

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
node --import ./tracing.mjs --import ./register.mjs app.mjs
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
        span.setAttribute('fastify.route', info.request.routerPath);
      },
    }),
  ],
});
sdk.start();
```

Note that `FastifyInstrumentation` depends on `HttpInstrumentation`. If HTTP instrumentation is not active, Fastify instrumentation produces no spans because the parent HTTP span is missing.

## Expected Spans from Fastify Instrumentation

When working correctly, a request to your Fastify app produces:

```
GET /api/users                     [================] 12ms  (HTTP span)
  request handler - /api/users     [==============]   10ms  (Fastify handler span)
```

Fastify middleware (hooks) also generate spans:

```
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

const exporter = new InMemorySpanExporter();

const sdk = new NodeSDK({
  spanProcessor: new SimpleSpanProcessor(exporter),
  instrumentations: [getNodeAutoInstrumentations()],
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
