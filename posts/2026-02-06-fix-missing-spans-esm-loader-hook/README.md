# How to Fix Missing Spans When Using Node.js ES Modules Without the

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Node.js, ESM, Loader Hook

Description: Resolve the problem of missing spans in Node.js ESM applications by correctly configuring the experimental loader hook.

If you have migrated your Node.js application from CommonJS (`require`) to ES Modules (`import`) and your OpenTelemetry auto-instrumented spans have disappeared, the issue is that the ESM loader does not trigger the CommonJS require hooks that many auto-instrumentations depend on. You need the loader hook to intercept ESM imports.

## The Problem

ES modules in Node.js use a different loading mechanism than CommonJS. Many OpenTelemetry auto-instrumentations patch modules by hooking into `require()`. With ESM, `import` does not go through `require()`, so the CommonJS hooks never fire.

Your tracing setup looks correct:

```javascript
// tracing.mjs
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
```

But auto-instrumented spans may be missing because the libraries imported via `import` are never patched.

## The Fix for Node.js 18.19+ and 20.6+

Use the `--import` flag combined with the OpenTelemetry ESM hook:

```javascript
// register.mjs
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('@opentelemetry/instrumentation/hook.mjs', pathToFileURL('./'));
```

```javascript
// tracing.mjs
import './register.mjs';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
```

```bash
node --import ./tracing.mjs src/app.mjs
```

## The Fix for Older Node.js Versions

If you are pinned to older OpenTelemetry packages that still support Node.js 16 or Node.js 18 before 18.19, use the `--experimental-loader` flag:

```bash
node \
  --experimental-loader @opentelemetry/instrumentation/hook.mjs \
  --require ./tracing.cjs \
  src/app.mjs
```

Note: With this startup pattern, you need a CommonJS tracing setup file (`.cjs`) for the `--require` flag, because `--require` is the CommonJS preload flag.

```javascript
// tracing.cjs
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
```

## Verifying the Hook is Active

Enable diagnostic logging and look for confirmation:

```javascript
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
```

With the hook working, you should see:

```text
@opentelemetry/instrumentation-http Applying ESM instrumentation patch for http
```

Without the hook:

```text
@opentelemetry/instrumentation-http Module http has been loaded before instrumentation
```

## Package.json Configuration

Make sure your package.json has the right settings:

```json
{
  "type": "module",
  "scripts": {
    "start": "node --import ./tracing.mjs src/app.mjs",
    "dev": "node --import ./tracing.mjs --watch src/app.mjs"
  },
  "dependencies": {
    "@opentelemetry/sdk-node": "^0.218.0",
    "@opentelemetry/auto-instrumentations-node": "^0.76.0",
    "@opentelemetry/instrumentation": "^0.218.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.218.0"
  }
}
```

## Docker Configuration

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .

ENV NODE_OPTIONS="--import ./tracing.mjs"
CMD ["node", "src/app.mjs"]
```

## Which Instrumentations Support ESM?

Not all OpenTelemetry instrumentations have ESM support yet. Some commonly used instrumentations with ESM support include:

- `@opentelemetry/instrumentation-http` - Works with ESM
- `@opentelemetry/instrumentation-express` - Works with ESM
- `@opentelemetry/instrumentation-fastify` - Works with ESM
- `@opentelemetry/instrumentation-pg` - Works with ESM
- `@opentelemetry/instrumentation-redis` - Works with ESM

Check the individual instrumentation package's README for ESM compatibility notes.

## Troubleshooting Checklist

If spans are still missing after adding the loader hook:

1. **Check Node.js version**: current OpenTelemetry packages require Node.js 18.19+ or 20.6+
2. **Check the hook is registered**: Look for ESM-specific log messages
3. **Check the instrumentation package version**: Older versions may not support ESM
4. **Check for bundler interference**: Bundlers bypass the Node.js loader
5. **Check for dual-package loading**: A library loaded as both CJS and ESM can cause issues

```bash
# Check if the hook.mjs file exists in your node_modules

ls node_modules/@opentelemetry/instrumentation/hook.mjs
```

If the file does not exist, update `@opentelemetry/instrumentation` to the latest version.

ESM support in OpenTelemetry for Node.js has improved significantly, but it still requires the loader hook. Without it, your auto-instrumentations simply cannot intercept ESM module loading, and you may miss auto-instrumented spans.
