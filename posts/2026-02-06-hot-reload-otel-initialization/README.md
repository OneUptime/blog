# How to Configure Hot-Reload Friendly OpenTelemetry Initialization for Local Development Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Hot Reload, Local Development, Node.js, Python

Description: Configure OpenTelemetry initialization that works correctly with hot-reload tools like nodemon, webpack-dev-server, and Flask debug mode.

Hot reload tools like nodemon, webpack-dev-server, and Flask's debug mode restart your application process whenever you change a file. If your OpenTelemetry initialization is not designed for this, you end up with leaked resources, duplicate span processors, or lost trace context. This post covers patterns that make OpenTelemetry play nicely with hot-reload workflows.

## The Problem

When a hot-reload tool restarts your application, it typically kills the process and starts a new one. If your OpenTelemetry SDK is in the middle of exporting a batch of spans, those spans get lost. Worse, some tools do not fully kill the old process, leading to multiple SDK instances running simultaneously and producing duplicate data.

The fix involves three things: proper shutdown handling, singleton initialization, and configuring exporters for the short-lived process pattern.

## Node.js with Nodemon

Nodemon watches your files and restarts the Node.js process on changes. The challenge is that `SIGTERM` signals need to be handled to flush pending spans.

Create a `tracing.js` file that handles graceful shutdown:

```javascript
// tracing.js - Hot-reload friendly OpenTelemetry setup
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');

const exporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
});

// Use SimpleSpanProcessor in development for immediate export
// This ensures spans are sent before the process exits
// In production, you would use BatchSpanProcessor instead
const sdk = new NodeSDK({
  spanProcessors: [new SimpleSpanProcessor(exporter)],
  instrumentations: [getNodeAutoInstrumentations()],
  serviceName: process.env.OTEL_SERVICE_NAME || 'dev-service',
});

sdk.start();

// Handle all the signals that nodemon might send
const shutdown = () => {
  sdk.shutdown()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error shutting down OTel SDK:', err);
      process.exit(1);
    });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Nodemon sends SIGUSR2 to signal a restart
process.once('SIGUSR2', () => {
  sdk.shutdown().then(() => {
    process.kill(process.pid, 'SIGUSR2');
  });
});
```

The key detail here is `process.once('SIGUSR2', ...)`. Nodemon uses this signal to tell the process to restart. By handling it, you get a chance to flush spans before the restart.

Run your app with nodemon:

```bash
nodemon --require ./tracing.js app.js
```

## Python with Flask Debug Mode

Flask's debug mode uses the Werkzeug reloader, which spawns a child process that gets restarted on file changes. The parent process stays alive. This means you should only initialize OpenTelemetry in the child process.

```python
# app.py
import os
from flask import Flask
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.sdk.resources import Resource
import atexit

def create_app():
    app = Flask(__name__)

    # Only initialize OTel in the reloader child process
    # The WERKZEUG_RUN_MAIN env var is set in the child process
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.debug:
        resource = Resource.create({
            "service.name": os.environ.get("OTEL_SERVICE_NAME", "flask-dev")
        })
        provider = TracerProvider(resource=resource)
        exporter = OTLPSpanExporter()
        # Use SimpleSpanExporter for immediate flushing during development
        from opentelemetry.sdk.trace.export import SimpleSpanProcessor
        provider.add_span_processor(SimpleSpanProcessor(exporter))
        trace.set_tracer_provider(provider)

        FlaskInstrumentor().instrument_app(app)

        # Register shutdown to flush on reload
        atexit.register(lambda: provider.shutdown())

    @app.route("/")
    def hello():
        return "Hello with hot reload!"

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
```

The `WERKZEUG_RUN_MAIN` check prevents the parent process from initializing OpenTelemetry. Only the child process (which handles requests and gets restarted) sets up the SDK.

## Webpack Dev Server and React

For frontend applications using webpack-dev-server, the challenge is different. The browser does not restart; instead, modules are hot-swapped. If your tracing initialization runs again during a hot module replacement (HMR), you get duplicate providers.

```javascript
// src/tracing.ts - Browser-side OpenTelemetry with HMR safety
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';

// Use a global variable to prevent re-initialization during HMR
let isInitialized = false;

export function initTracing() {
  if (isInitialized) {
    return;
  }

  const provider = new WebTracerProvider({
    resource: {
      attributes: { 'service.name': 'frontend-dev' }
    }
  });

  provider.addSpanProcessor(
    new SimpleSpanProcessor(
      new OTLPTraceExporter({
        url: 'http://localhost:4318/v1/traces',
      })
    )
  );

  provider.register({
    contextManager: new ZoneContextManager(),
  });

  registerInstrumentations({
    instrumentations: [getWebAutoInstrumentations()],
  });

  isInitialized = true;
}

// Handle HMR cleanup if using webpack
if (module.hot) {
  module.hot.dispose(() => {
    // Provider cleanup happens here if needed
    isInitialized = false;
  });
}
```

The `isInitialized` flag ensures that even if the module is re-evaluated during HMR, the provider is only created once. The `module.hot.dispose` callback resets the flag if the module is fully replaced.

## General Tips

Regardless of your framework, these principles apply to hot-reload scenarios:

1. **Use SimpleSpanProcessor during development.** It exports each span immediately rather than batching. This costs more network calls but ensures no spans are lost during restarts.

2. **Register shutdown handlers.** Always hook into process exit signals to call `sdk.shutdown()` or `provider.shutdown()`.

3. **Guard against double initialization.** Use a flag, a singleton pattern, or a framework-specific check to prevent creating multiple providers.

4. **Keep the exporter endpoint configurable.** Use environment variables so the same code works for local development and production without changes.

These patterns keep your tracing working smoothly during the rapid edit-save-reload cycle that defines local development.
