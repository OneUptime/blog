# How to Troubleshoot OpenTelemetry Not Producing Traces in TypeScript Projects Using ts-node with ESM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, TypeScript, ts-node, ESM

Description: Fix the tracing gap in TypeScript projects where ts-node's ESM mode prevents OpenTelemetry from patching imported modules.

TypeScript projects that use `ts-node` with ESM mode have a particularly tricky interaction with OpenTelemetry. The combination of TypeScript compilation, ESM module loading, and OpenTelemetry's require hooks creates a situation where all three systems interfere with each other, resulting in zero traces despite correct configuration.

## The Problem Setup

A typical TypeScript project with ESM:

```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "target": "ES2022"
  }
}
```

```json
// package.json
{
  "type": "module",
  "scripts": {
    "start": "ts-node --esm src/app.ts"
  }
}
```

```typescript
// src/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
```

```typescript
// src/app.ts
import './tracing';
import express from 'express';

const app = express();
app.get('/', (req, res) => res.send('Hello'));
app.listen(3000);
```

This produces zero traces. Here is why.

## Why It Fails

`ts-node --esm` registers its own ESM loader hook to handle TypeScript compilation on the fly. This loader hook competes with OpenTelemetry's ESM loader hook. The result:

1. `ts-node` intercepts the `import` call
2. It compiles the TypeScript to JavaScript
3. It loads the compiled module through the ESM loader
4. OpenTelemetry's require hook never sees the import

Additionally, TypeScript's `import` statements are hoisted, so `import './tracing'` and `import express from 'express'` are resolved in parallel, not sequentially.

## Fix 1: Pre-compile and Run with Node Directly

The most reliable approach is to compile TypeScript separately and run the output with Node:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node --import ./dist/tracing.mjs dist/app.mjs"
  }
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "node",
    "outDir": "./dist",
    "target": "ES2022"
  }
}
```

This removes `ts-node` from the equation entirely and lets you use the standard Node.js loader hooks.

## Fix 2: Use tsx Instead of ts-node

`tsx` is an alternative TypeScript runner that has better ESM compatibility:

```bash
npm install --save-dev tsx
```

```json
{
  "scripts": {
    "start": "node --import ./tracing.ts --loader tsx src/app.ts"
  }
}
```

Or with the registration approach:

```typescript
// register.ts
import { register } from 'node:module';
register('@opentelemetry/instrumentation/hook.mjs', import.meta.url);
```

```bash
tsx --import ./register.ts --import ./tracing.ts src/app.ts
```

## Fix 3: Use CommonJS Mode with ts-node

If you do not strictly need ESM, switch to CommonJS mode:

```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

```json
// package.json - remove "type": "module"
{
  "scripts": {
    "start": "ts-node --require ./src/tracing.ts src/app.ts"
  }
}
```

This is the simplest fix. CommonJS mode works perfectly with OpenTelemetry's require hooks.

## Fix 4: Separate Tracing Setup as CJS

Keep your app in ESM mode but use a CommonJS tracing setup:

```javascript
// tracing.cjs - note the .cjs extension
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
```

```bash
ts-node --esm --require ./tracing.cjs src/app.ts
```

The `--require` flag loads the CJS file before ts-node's ESM loader kicks in, giving OpenTelemetry a chance to register its hooks first.

## Debugging the Issue

Add verbose logging to understand what is happening:

```typescript
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

// Set this before anything else
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ALL);
```

Check the output for:
- "Applying instrumentation patch" = working
- "Module has been loaded before" = broken load order
- No instrumentation messages at all = hooks not registered

## Recommended Setup for Production

For production TypeScript applications, always pre-compile:

```bash
# Build step
tsc --outDir dist

# Start with proper OpenTelemetry hooks
node --import ./dist/tracing.js dist/app.js
```

This approach:
- Removes any runtime TypeScript compilation overhead
- Uses standard Node.js module loading
- Works reliably with OpenTelemetry's ESM hooks
- Is predictable and debuggable

The combination of ts-node, ESM, and OpenTelemetry is one of the trickiest configurations to get right. When in doubt, pre-compile and use plain Node.js to run your application.
