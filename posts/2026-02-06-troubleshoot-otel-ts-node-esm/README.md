# How to Troubleshoot OpenTelemetry Not Producing Traces in TypeScript Projects

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, TypeScript, Ts-node, ESM

Description: Fix the tracing gap in TypeScript projects where ts-node's ESM mode prevents OpenTelemetry from patching imported modules.

TypeScript projects that use `ts-node` with ESM mode have a particularly tricky interaction with OpenTelemetry. The combination of TypeScript compilation, ESM module loading, and OpenTelemetry's instrumentation hooks creates a situation where all three systems can interfere with each other, resulting in zero traces despite correct configuration.

## The Problem Setup

A typical TypeScript project with ESM:

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "target": "ES2022"
  }
}
```

```jsonc
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
import './tracing.js';
import express from 'express';

const app = express();
app.get('/', (req, res) => res.send('Hello'));
app.listen(3000);
```

This produces zero traces. Here is why.

## Why It Fails

`ts-node --esm` registers its own ESM loader hook to handle TypeScript compilation on the fly. That loader must be chained with OpenTelemetry's ESM loader hook. The result when it is not:

1. `ts-node` intercepts the `import` call
2. It compiles the TypeScript to JavaScript
3. It loads the compiled module through the ESM loader
4. OpenTelemetry's CommonJS require hook never sees the ESM import unless the OpenTelemetry ESM loader hook is also registered

Additionally, static ESM `import` statements are linked before the module body runs, so `import './tracing.js'` in the same entry point does not guarantee that the tracing setup runs before `import express from 'express'` is loaded.

## Fix 1: Pre-compile and Run with Node Directly

The most reliable approach is to compile TypeScript separately and run the output with Node:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node --experimental-loader=@opentelemetry/instrumentation/hook.mjs --import ./dist/tracing.js dist/app.js"
  }
}
```

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "target": "ES2022"
  }
}
```

This removes `ts-node` from the equation entirely and lets you use the standard Node.js loader hooks. In a package with `"type": "module"`, TypeScript emits `.js` files that Node treats as ESM.

## Fix 2: Use tsx Instead of ts-node

`tsx` is an alternative TypeScript runner that has better ESM compatibility:

```bash
npm install --save-dev tsx
```

```json
{
  "scripts": {
    "start": "tsx --import ./register.ts --import ./src/tracing.ts src/app.ts"
  }
}
```

With the registration approach:

```typescript
// register.ts
import { register } from 'node:module';
register('@opentelemetry/instrumentation/hook.mjs', import.meta.url);
```

```bash
tsx --import ./register.ts --import ./src/tracing.ts src/app.ts
```

## Fix 3: Use CommonJS Mode with ts-node

If you do not strictly need ESM, switch to CommonJS mode:

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

```jsonc
// package.json - remove "type": "module"
{
  "scripts": {
    "start": "ts-node --require ./src/tracing.ts src/app.ts"
  }
}
```

This is the simplest fix. CommonJS mode works with OpenTelemetry's require hooks as long as the tracing setup is required before the app loads instrumented modules.

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
node --require ./tracing.cjs --experimental-loader=@opentelemetry/instrumentation/hook.mjs --loader ts-node/esm src/app.ts
```

The `--require` flag loads the CJS file before the application entry point, while the OpenTelemetry loader hook handles ESM imports made by the app.

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
node --experimental-loader=@opentelemetry/instrumentation/hook.mjs --import ./dist/tracing.js dist/app.js
```

This approach:
- Removes any runtime TypeScript compilation overhead
- Uses standard Node.js module loading
- Works reliably with OpenTelemetry's ESM hooks
- Is predictable and debuggable

The combination of ts-node, ESM, and OpenTelemetry is one of the trickiest configurations to get right. When in doubt, pre-compile and use plain Node.js to run your application.
