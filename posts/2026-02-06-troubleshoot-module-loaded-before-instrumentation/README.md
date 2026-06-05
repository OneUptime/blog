# How to Troubleshoot the 'Module Has Been Loaded Before Instrumentation' Error

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Node.js, Debugging, Module Loading

Description: Diagnose and resolve the warning about modules being loaded before OpenTelemetry instrumentation can patch them in Node.js apps.

The warning "Module X has been loaded before @opentelemetry/instrumentation-X" tells you that a library was imported into the Node.js module cache before OpenTelemetry had a chance to wrap it with tracing hooks. This means auto-instrumentation may not work for that library, and you may get no spans from it.

## Understanding the Warning

When you enable diagnostic logging:

```javascript
const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
```

You might see:

```text
@opentelemetry/instrumentation-express Module express has been loaded before
@opentelemetry/instrumentation-express can patch it. Instrumentation may not work.
```

This is not just noise. It means instrumentation may not work, or may only work for code paths that load the module after the hooks are registered.

## Cause 1: SDK Initialized in the Wrong File

The most common cause is initializing the SDK in the same file that imports the library:

```javascript
// app.js - BROKEN
const express = require('express');  // express loads first
const { NodeSDK } = require('@opentelemetry/sdk-node');

// By the time SDK.start() runs, express is already cached
const sdk = new NodeSDK({ /* ... */ });
sdk.start();

const app = express();
```

**Fix:** Move tracing to a separate file and load it with `--require`:

```javascript
// tracing.js
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

## Cause 2: Transitive Dependencies Loading the Module

Sometimes you do not import the library directly, but one of your dependencies does:

```javascript
// tracing.js runs first
const { NodeSDK } = require('@opentelemetry/sdk-node');
const sdk = new NodeSDK({ /* ... */ });
sdk.start();

// app.js
const myMiddleware = require('my-custom-middleware');
// my-custom-middleware internally does: const http = require('http');
// But http may already have been loaded by tracing/exporter setup!

const express = require('express');
```

**Fix:** Check what your tracing setup loads. Some SDK, exporter, or custom setup code can import `http` or `https`. This is usually fine when the instrumentation is registered before application code uses those modules, but custom setups can break this order.

## Cause 3: TypeScript and ESM Preloading

Static `import` statements run before the body of the module that contains them. This means you cannot initialize tracing at the top of a file and then rely on later static imports in the same file to be patched:

```typescript
// app.ts - BROKEN
import express from 'express';
import { NodeSDK } from '@opentelemetry/sdk-node';

// This runs after static imports have already been loaded
const sdk = new NodeSDK({ /* ... */ });
sdk.start();
```

If your TypeScript compiles to ESM, OpenTelemetry also needs its ESM loader hook so `import` statements can be patched.

**Fix:** Use `--require` or `--import` flags instead of relying on import order:

```bash
npx tsx --import ./tracing.ts app.ts
# or

node --require ts-node/register --require ./tracing.ts app.ts
# or, for compiled ESM

node --experimental-loader=@opentelemetry/instrumentation/hook.mjs --import ./tracing.mjs app.mjs
```

## Cause 4: Jest or Test Frameworks

Test frameworks often load modules before your setup code runs:

```javascript
// jest.config.js
module.exports = {
  setupFiles: ['./tracing.js'],  // Runs before test files
  // But Jest may have already loaded modules for its own setup
};
```

**Fix:** Keep the tracing preload in `setupFiles` for modules loaded by test files, or start Jest with Node's preload flags so every Jest worker process gets the tracing setup before application modules load:

```javascript
// jest.config.js
module.exports = {
  setupFiles: ['./tracing.js'],
};
```

```bash
NODE_OPTIONS="--require ./tracing.js" npx jest
```

## Debugging the Load Order

To see exactly when modules are loaded, add this before anything else:

```javascript
// debug-require.js - load with: node --require ./debug-require.js
const Module = require('module');
const originalLoad = Module._load;

Module._load = function(request, parent, isMain) {
  if (['express', 'http', '@grpc/grpc-js'].includes(request)) {
    console.log(`Loading ${request} from ${parent?.filename || 'main'}`);
    console.trace();  // Print stack trace to see who triggered the load
  }
  return originalLoad.apply(this, arguments);
};
```

```bash
node --require ./debug-require.js --require ./tracing.js app.js
```

This prints a stack trace every time a key module is loaded, showing you exactly which file triggered the import.

## Verifying the Fix

After fixing the load order, you should see in the debug output:

```text
@opentelemetry/instrumentation-http Applying instrumentation patch for nodejs core module on require hook
@opentelemetry/instrumentation-express Applying instrumentation patch for module on require hook
```

If you see "Applying instrumentation patch" instead of "Module has been loaded before", the fix is working.

## Summary

The "loaded before instrumentation" warning means your module loading order is wrong. The fix is almost always to use `--require ./tracing.js` to ensure the SDK initializes before any application code runs. For TypeScript and ESM, use the appropriate loader flags. When in doubt, add debug logging to trace the exact module loading sequence.
