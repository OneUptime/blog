# How to Avoid the Anti-Pattern of Initializing OpenTelemetry SDK After Importing Instrumented Libraries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Node.js, Python, Anti-Patterns

Description: Understand why initializing the OpenTelemetry SDK after importing instrumented libraries causes silent failures and how to fix it.

One of the most frustrating OpenTelemetry issues is when everything looks correctly configured but no traces show up. The root cause, in a surprising number of cases, is that the SDK was initialized too late. The instrumented libraries were already imported and their modules were already loaded into memory before OpenTelemetry had a chance to patch them.

## Why Import Order Matters

OpenTelemetry auto-instrumentation works by monkey-patching (or wrapping) library functions at load time. When you call `registerInstrumentations()` or `NodeSDK.start()`, the SDK walks through your registered instrumentations and patches the target libraries. But if those libraries are already loaded into the module cache, the patching happens on the cached version, which may not cover all the internal references the library has already resolved.

In Node.js, this means `require('express')` before `sdk.start()` results in an Express instance that the HTTP instrumentation cannot fully hook into.

## The Broken Pattern

Here is what the broken pattern looks like in a typical Node.js application:

```javascript
// app.js - THIS IS WRONG
const express = require('express');  // Express is loaded first
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();  // Too late - Express is already in require cache

const app = express();
app.get('/', (req, res) => res.send('Hello'));
app.listen(3000);
```

This application runs without errors. Express serves requests. But no HTTP spans are generated. There is no error message telling you something went wrong.

## The Correct Pattern for Node.js

Create a separate tracing setup file and load it before anything else:

```javascript
// tracing.js - loaded FIRST via --require flag
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'my-web-service',
  }),
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown().then(() => process.exit(0));
});
```

```javascript
// app.js - no tracing code here at all
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Hello'));
app.listen(3000);
```

Launch with: `node --require ./tracing.js app.js`

The `--require` flag tells Node.js to execute `tracing.js` before `app.js` runs. By the time `app.js` calls `require('express')`, the instrumentation hooks are already in place.

## The Correct Pattern for Python

Python has the same issue. The `opentelemetry-instrument` command handles this for you, but if you are setting up manually, you need to instrument before importing:

```python
# tracing.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry.instrumentation.flask import FlaskInstrumentor

# Set up tracing BEFORE importing Flask
provider = TracerProvider(
    resource=Resource.create({SERVICE_NAME: "my-flask-app"})
)
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(provider)

# Instrument Flask before creating the app
FlaskInstrumentor().instrument()

# NOW import and create the Flask app
from flask import Flask
app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello'
```

## How to Verify It Is Working

Add the `DiagConsoleLogger` to get verbose output during development:

```javascript
const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');

// Enable diagnostic logging
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
```

You should see messages like:
```
@opentelemetry/instrumentation-http Applying instrumentation patch for module on require hook
```

If you see "Module has already been loaded" warnings instead, your initialization order is wrong.

## Common Traps

- **Bundlers like Webpack** can hoist imports and change their order. If you use a bundler, make sure the tracing setup is in a separate entry point.
- **TypeScript with `import` statements** hoists all imports to the top regardless of where you write them in the file. Use the `--require` flag approach instead of trying to order imports manually.
- **Framework bootstrap files** in NestJS, Next.js, and similar frameworks often import libraries internally before your code runs. Check your framework's documentation for the recommended OpenTelemetry integration point.

Getting the initialization order right is the single most impactful thing you can do for reliable OpenTelemetry instrumentation. Once this is correct, everything else falls into place.
