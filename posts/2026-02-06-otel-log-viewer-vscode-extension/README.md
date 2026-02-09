# How to Use the OpenTelemetry Log Viewer VS Code Extension for Local Trace Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, VS Code, Debugging, Traces, Developer Tools

Description: Learn how to install and use the OpenTelemetry Log Viewer VS Code extension to debug traces and spans locally without leaving your editor.

When you are debugging a distributed system, switching between your editor and a browser-based trace viewer breaks your flow. The OpenTelemetry Log Viewer extension for VS Code lets you inspect traces, spans, and logs right inside your editor. This post walks through setting up the extension, configuring your application to export traces locally, and using the viewer to debug real issues.

## Installing the Extension

Open VS Code and head to the Extensions panel. Search for "OpenTelemetry Log Viewer" and install it. Once installed, you will see a new icon in the activity bar on the left side of your editor.

Alternatively, install it from the command line:

```bash
code --install-extension opentelemetry.otel-log-viewer
```

After installation, restart VS Code to make sure the extension loads properly.

## Configuring Your Application to Export Traces Locally

The extension reads trace data that your application exports over OTLP. For local debugging, you want to export to localhost on the default OTLP gRPC port (4317) or HTTP port (4318). Here is a Node.js example using the OpenTelemetry SDK:

```javascript
// tracing.js - OpenTelemetry setup for local debugging
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

// Point the exporter at localhost where the extension listens
const traceExporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces',
});

const sdk = new NodeSDK({
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations()],
  serviceName: 'my-local-service',
});

sdk.start();

// Graceful shutdown on process exit
process.on('SIGTERM', () => {
  sdk.shutdown().then(() => console.log('Tracing shut down'));
});
```

Start your application with this tracing configuration loaded before your main app code:

```bash
node --require ./tracing.js app.js
```

## Using the Viewer

Once your app is running and producing traces, open the OpenTelemetry Log Viewer panel in VS Code. You should see traces appearing in real time. The viewer organizes data in a tree structure: traces at the top level, with spans nested underneath.

Click on any span to see its details:

- **Span name and kind** (server, client, internal)
- **Duration** in milliseconds
- **Attributes** like `http.method`, `http.url`, `db.statement`
- **Events** attached to the span, including exception events
- **Status** indicating whether the span succeeded or errored

This is particularly useful when you want to see the full picture of an HTTP request flowing through your local services.

## Filtering and Searching

The extension supports filtering by service name, span name, and status. If you are running multiple services locally, you can filter to just the service you care about. Use the search bar at the top of the panel:

```
service.name = "my-local-service" AND status = ERROR
```

This narrows down the view to only the error spans from your specific service, which is exactly what you need when tracking down a bug.

## Correlating Traces with Code

One of the best features of having trace data inside your editor is the ability to jump between trace details and source code. When you see a span with an error, the stack trace in the span events often includes file paths and line numbers. In VS Code, these paths are clickable and take you directly to the relevant line of code.

For this to work well, make sure your application is running from the same workspace that is open in VS Code. The file paths in the trace data need to match the paths on your local filesystem.

## Setting Up a Lightweight Local Collector

If the extension does not include a built-in receiver, you can run a minimal OpenTelemetry Collector alongside it. Create a file called `otel-collector-config.yaml`:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

exporters:
  # Export to the file system where the extension can pick it up
  file:
    path: /tmp/otel-traces.json

  # Also log to console for quick feedback
  debug:
    verbosity: detailed

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [file, debug]
```

Run the collector with Docker:

```bash
docker run --rm -p 4317:4317 -p 4318:4318 \
  -v $(pwd)/otel-collector-config.yaml:/etc/otelcol/config.yaml \
  -v /tmp:/tmp \
  otel/opentelemetry-collector-contrib:latest
```

Now your application sends traces to the collector, which writes them to a file and also logs them to the console. The VS Code extension can read from the file output.

## Tips for Effective Local Debugging

Keep your local instrumentation focused. Auto-instrumentation is great for getting started, but it can produce a lot of noise. When debugging a specific issue, consider adding manual spans around the code you suspect:

```javascript
const { trace } = require('@opentelemetry/api');

const tracer = trace.getTracer('debug-tracer');

async function processOrder(order) {
  return tracer.startActiveSpan('processOrder', async (span) => {
    span.setAttribute('order.id', order.id);
    span.setAttribute('order.items.count', order.items.length);

    try {
      const result = await validateAndSubmit(order);
      span.setStatus({ code: 1 }); // OK
      return result;
    } catch (err) {
      span.setStatus({ code: 2, message: err.message }); // ERROR
      span.recordException(err);
      throw err;
    } finally {
      span.end();
    }
  });
}
```

These manual spans show up in the VS Code viewer with all the attributes you set, giving you targeted visibility into the exact code path you are investigating.

## Wrapping Up

The OpenTelemetry Log Viewer extension turns VS Code into a lightweight observability tool for local development. Instead of deploying to a staging environment and opening Jaeger in a browser, you can see your traces right next to your code. This tightens the feedback loop and makes it easier to catch issues before they ever reach production.
