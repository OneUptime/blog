# How to Fix OpenTelemetry Auto-Instrumentation Not Working in Node.js ESM (import) Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Node.js, ESM, Auto-Instrumentation

Description: Fix OpenTelemetry auto-instrumentation failures in Node.js applications that use ES modules instead of CommonJS require.

OpenTelemetry auto-instrumentation for Node.js was designed around the CommonJS module system. It works by intercepting `require()` calls to patch libraries like Express, HTTP, and gRPC. When your application uses ES modules (`import` statements), the `require()` hook never fires, and auto-instrumentation silently does nothing.

## Why ESM Breaks Auto-Instrumentation

In CommonJS, OpenTelemetry registers a hook on `Module._load` (the internal function behind `require()`). Every time a module is loaded, the hook checks if there is an instrumentation registered for it and wraps the module if so.

ES modules use a completely different loading mechanism. The `import` keyword goes through Node's ESM loader, which does not call `Module._load`. The OpenTelemetry hooks are never triggered.

## The Solution: Use the --experimental-loader Hook

Node.js provides an experimental loader hook API that lets you intercept ESM imports. The `@opentelemetry/instrumentation` package includes a loader hook for this purpose.

### Step 1: Create Your Tracing Setup

```javascript
// tracing.mjs
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'my-esm-service',
  }),
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().then(() => process.exit(0));
});
```

### Step 2: Run with the Loader Hook

For Node.js 18.19+ and Node.js 20+, use `--import`:

```bash
node --import ./tracing.mjs app.mjs
```

For older Node.js versions, use the experimental loader:

```bash
node --experimental-loader @opentelemetry/instrumentation/hook.mjs --require ./tracing.cjs app.mjs
```

Note that with the loader approach, you may need a CommonJS version of your tracing setup for the `--require` flag, while the loader hook handles ESM interception.

### Step 3: Update package.json

```json
{
  "type": "module",
  "scripts": {
    "start": "node --import ./tracing.mjs src/app.mjs"
  }
}
```

## For Node.js 20+ with the Registration API

Starting with Node.js 20.6+ and `@opentelemetry/instrumentation` 0.46+, there is a cleaner approach using the `register` method:

```javascript
// instrumentation.mjs
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// Register the OpenTelemetry ESM loader hook
register('@opentelemetry/instrumentation/hook.mjs', pathToFileURL('./'));
```

```javascript
// tracing.mjs
import './instrumentation.mjs';  // Must come first
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
```

```bash
node --import ./tracing.mjs app.mjs
```

## Common Pitfalls

### Pitfall 1: Missing the Loader Hook

Just using `--import` without the ESM loader hook is not enough:

```bash
# This loads tracing.mjs first, but ESM hooks are not registered
node --import ./tracing.mjs app.mjs
# Auto-instrumentation for ESM imports will NOT work
```

You need both the tracing setup AND the ESM loader hook.

### Pitfall 2: Using --require with ESM

The `--require` flag only works with CommonJS files:

```bash
# This fails if tracing.mjs uses import syntax
node --require ./tracing.mjs app.mjs
# Error: Cannot use import statement outside a module
```

### Pitfall 3: Bundlers Inlining Imports

If you use a bundler (Webpack, esbuild, Rollup), it may inline your imports, making the loader hook ineffective. The instrumentation hooks need to intercept the actual Node.js module loading, which bundlers bypass.

For bundled applications, consider using the OTLP auto-instrumentation approach without bundling the tracing setup:

```javascript
// Mark tracing dependencies as external in your bundler config
// esbuild example
import { build } from 'esbuild';

build({
  entryPoints: ['src/app.mjs'],
  external: [
    '@opentelemetry/*',
  ],
  // ... other options
});
```

## Verifying It Works

Add diagnostic logging to confirm instrumentation is applied:

```javascript
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
```

Look for messages like:

```
@opentelemetry/instrumentation-http Applying instrumentation patch for module http
```

If you see "Module has been loaded before instrumentation" warnings, the loader hook is not working correctly.

## Docker/Production Setup

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .

# Use --import for ESM applications
ENV NODE_OPTIONS="--import ./tracing.mjs"
CMD ["node", "src/app.mjs"]
```

ESM support in OpenTelemetry for Node.js is still evolving. Check the `@opentelemetry/instrumentation` changelog for the latest recommendations, as the API stabilizes across Node.js versions.
