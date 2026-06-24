# How to Use the OpenTelemetry Log Viewer VS Code Extension

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, VS Code, Debugging, Trace, Developer Tool

Description: Learn how to install and use the OpenTelemetry Log Viewer VS Code extension to debug traces and spans locally without leaving your editor.

When you are debugging a distributed system, switching between your editor and a browser-based log viewer breaks your flow. The OpenTelemetry Log Viewer extension for VS Code lets you inspect structured OpenTelemetry logs right inside your editor. This post walks through setting up the extension, writing trace-correlated logs locally, and using the viewer to debug real issues.

## Installing the Extension

Open VS Code and head to the Extensions panel. Search for "OpenTelemetry Log Viewer" and install it. Once installed, the extension can open OpenTelemetry log files from the editor toolbar.

Alternatively, install it from the command line:

```bash
code --install-extension Tobias-Streng.vscode-opentelemetry-viewer
```

After installation, open a `.log` or `.jsonl` file that contains one JSON object per line. You should see an "OpenTelemetry Viewer" button in the editor toolbar.

## Configuring Your Application to Export Logs Locally

The extension reads OpenTelemetry logs from local `.log` or `.jsonl` files. For local debugging, a simple approach is to write JSON lines that include the current trace and span IDs. Here is a Node.js example using the OpenTelemetry SDK:

```javascript
// tracing.js - OpenTelemetry setup for local debugging
const fs = require('fs');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-node');
const { trace } = require('@opentelemetry/api');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'my-local-service',
  }),
  traceExporter: new ConsoleSpanExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

function writeOtelLog(severityText, body, attributes = {}) {
  const span = trace.getActiveSpan();
  const spanContext = span?.spanContext();

  const record = {
    timeUnixNano: (BigInt(Date.now()) * 1000000n).toString(),
    severityText,
    body: { stringValue: body },
    attributes: Object.entries({
      'service.name': 'my-local-service',
      ...attributes,
    }).map(([key, value]) => ({
      key,
      value: { stringValue: String(value) },
    })),
    traceId: spanContext?.traceId,
    spanId: spanContext?.spanId,
  };

  fs.appendFileSync('./otel-local.jsonl', `${JSON.stringify(record)}\n`);
}

module.exports = { writeOtelLog };

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

Once your app is running and producing JSONL logs, open `otel-local.jsonl` in VS Code and click the "OpenTelemetry Viewer" button in the editor toolbar. You should see log records displayed in a filterable grid.

Click on any row to inspect the fields in the log record:

- **Timestamp** from `timeUnixNano`
- **Severity** from `severityText`
- **Body** from the log record body
- **Attributes** like `http.request.method`, `url.full`, `db.query.text`
- **Trace correlation fields** such as `traceId` and `spanId`

This is particularly useful when you want to see the full picture of an HTTP request flowing through your local services.

## Filtering and Searching

The extension supports sorting, filtering, and searching across the columns in the grid. If you are running multiple services locally, include `service.name` or another service identifier in each log record so you can filter to just the service you care about.

```text
my-local-service ERROR
```

This narrows down the visible rows to matching log records, which is exactly what you need when tracking down a bug.

## Correlating Traces with Code

One of the best features of having trace-correlated logs inside your editor is the ability to keep trace IDs, span IDs, errors, and source hints together. When you log an exception, include the stack trace or file and line information in the log attributes so you can move from the log record to the relevant code quickly.

For this to work well, make sure your application is running from the same workspace that is open in VS Code. The file paths in the log data need to match the paths on your local filesystem.

## Setting Up a Lightweight Local Collector

If your application already exports logs over OTLP, you can run a minimal OpenTelemetry Collector alongside it and write those logs to a JSONL file. Create a file called `otel-collector-config.yaml`:

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
    path: /tmp/otel-logs.jsonl

  # Also log to console for quick feedback
  debug:
    verbosity: detailed

service:
  pipelines:
    logs:
      receivers: [otlp]
      exporters: [file, debug]
```

Run the collector with Docker:

```bash
docker run --rm -p 4317:4317 -p 4318:4318 \
  -v $(pwd)/otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml:ro \
  -v /tmp:/tmp \
  otel/opentelemetry-collector-contrib:latest
```

Now your application sends logs to the collector, which writes them to a JSONL file and also logs them to the console. The VS Code extension can read from the file output.

## Tips for Effective Local Debugging

Keep your local instrumentation focused. Auto-instrumentation is great for getting started, but it can produce a lot of noise. When debugging a specific issue, consider adding manual spans around the code you suspect:

```javascript
const { trace, SpanStatusCode } = require('@opentelemetry/api');
const { writeOtelLog } = require('./tracing');

const tracer = trace.getTracer('debug-tracer');

async function processOrder(order) {
  return tracer.startActiveSpan('processOrder', async (span) => {
    span.setAttribute('order.id', order.id);
    span.setAttribute('order.items.count', order.items.length);

    try {
      const result = await validateAndSubmit(order);
      writeOtelLog('INFO', 'order processed', {
        'order.id': order.id,
        'order.items.count': order.items.length,
      });
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      writeOtelLog('ERROR', 'order processing failed', {
        'order.id': order.id,
        'exception.message': err.message,
        'exception.stacktrace': err.stack,
      });
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      span.recordException(err);
      throw err;
    } finally {
      span.end();
    }
  });
}
```

These manual spans provide trace context for the log records you write, giving you targeted visibility into the exact code path you are investigating.

## Wrapping Up

The OpenTelemetry Log Viewer extension turns VS Code into a lightweight log inspection tool for local development. Instead of opening a separate tool for every structured log file, you can inspect trace-correlated logs right next to your code. This tightens the feedback loop and makes it easier to catch issues before they ever reach production.
