# How to Troubleshoot the 'Module Has Been Loaded Before Instrumentation' Error in Node.js OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Node.js, Debugging, Module Loading

Description: Diagnose and resolve the warning about modules being loaded before OpenTelemetry instrumentation can patch them in Node.js apps.

The warning "Module X has been loaded before @opentelemetry/instrumentation-X" tells you that a library was imported into the Node.js module cache before OpenTelemetry had a chance to wrap it with tracing hooks. This means auto-instrumentation will not work for that library, and you will get no spans from it.

## Understanding the Warning

When you enable diagnostic logging:

```javascript
const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
```

You might see:

```
@opentelemetry/instrumentation-express Module express has been loaded before
@opentelemetry/instrumentation-express can patch it. Instrumentation may not work.
```

This is not just a warning. It means instrumentation WILL NOT work for that module.

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
// But http was already loaded by the SDK itself!

const express = require('express');
```

**Fix:** Check what the SDK itself loads. The OpenTelemetry SDK packages import `http` and `https` internally. This is usually fine because the instrumentation is registered before those internal imports happen, but custom setups can break this order.

## Cause 3: TypeScript Import Hoisting

TypeScript (and modern JavaScript) hoists `import` statements to the top of the file:

```typescript
// app.ts - BROKEN even though tracing setup appears first
import './tracing';  // This import is hoisted...
import express from 'express';  // ...but so is this one!
// TypeScript resolves all imports before executing any code
```

Both imports are resolved at parse time. The execution order of the imported modules depends on their dependency graph, not the order you wrote them.

**Fix:** Use `--require` or `--import` flags instead of relying on import order:

```bash
ts-node --require ./tracing.ts app.ts
# or
node --require ./tracing.js -r ts-node/register app.ts
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

**Fix:** Use `globalSetup` or configure Jest's `--require` equivalent:

```javascript
// jest.config.js
module.exports = {
  globalSetup: './jest.globalSetup.js',
};
```

```javascript
// jest.globalSetup.js
module.exports = async function() {
  require('./tracing');
};
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

```
@opentelemetry/instrumentation-http Applying instrumentation patch for module http on require hook
@opentelemetry/instrumentation-express Applying instrumentation patch for module express on require hook
```

If you see "Applying instrumentation patch" instead of "Module has been loaded before", the fix is working.

## Summary

The "loaded before instrumentation" warning means your module loading order is wrong. The fix is almost always to use `--require ./tracing.js` to ensure the SDK initializes before any application code runs. For TypeScript and ESM, use the appropriate loader flags. When in doubt, add debug logging to trace the exact module loading sequence.
