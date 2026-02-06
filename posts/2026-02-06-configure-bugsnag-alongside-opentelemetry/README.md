# How to Configure Bugsnag Alongside OpenTelemetry for Dual Error Tracking and Trace Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Bugsnag, Error Tracking, Instrumentation

Description: A practical guide to running Bugsnag error tracking alongside OpenTelemetry trace collection in the same application.

Running Bugsnag for error tracking and OpenTelemetry for distributed tracing is a common setup in teams that adopted Bugsnag before OpenTelemetry became mainstream. Rather than ripping out Bugsnag and replacing it, you can run both side by side. This post covers how to configure both systems in a Node.js application so that errors go to Bugsnag while traces flow through OpenTelemetry, and both share enough context to be useful together.

## Why Run Both?

Bugsnag excels at error grouping, release tracking, and stability scores. OpenTelemetry gives you distributed traces across services. Each tool does its job well, and forcing one to do the other's job usually leads to a worse experience. The goal here is to let each system handle what it is best at while sharing trace context between them.

## Installing Dependencies

```bash
npm install @bugsnag/js @bugsnag/plugin-express \
  @opentelemetry/sdk-node @opentelemetry/api \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-grpc
```

## Initializing OpenTelemetry

OpenTelemetry should be initialized before any other application code runs. Create a separate tracing setup file and require it first.

```javascript
// tracing.js - Must be loaded before any other application code
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-grpc");

const sdk = new NodeSDK({
  serviceName: "my-api-service",
  traceExporter: new OTLPTraceExporter({
    url: "http://localhost:4317", // OpenTelemetry Collector endpoint
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable fs instrumentation to reduce noise
      "@opentelemetry/instrumentation-fs": { enabled: false },
    }),
  ],
});

sdk.start();

// Graceful shutdown
process.on("SIGTERM", () => {
  sdk.shutdown().then(() => process.exit(0));
});
```

## Initializing Bugsnag with Trace Context

Now set up Bugsnag and configure it to include OpenTelemetry trace IDs in error reports. This is the bridge between the two systems.

```javascript
// app.js - Load tracing first, then set up Bugsnag and Express
require("./tracing");

const Bugsnag = require("@bugsnag/js");
const BugsnagPluginExpress = require("@bugsnag/plugin-express");
const { trace, context } = require("@opentelemetry/api");
const express = require("express");

// Initialize Bugsnag
Bugsnag.start({
  apiKey: "your-bugsnag-api-key",
  plugins: [BugsnagPluginExpress],
  // Add OpenTelemetry trace context to every Bugsnag error report
  onError: function (event) {
    const activeSpan = trace.getSpan(context.active());
    if (activeSpan) {
      const spanContext = activeSpan.spanContext();
      event.addMetadata("opentelemetry", {
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
        traceFlags: spanContext.traceFlags,
      });
      // Also set as a searchable tab in Bugsnag
      event.addMetadata("trace", {
        id: spanContext.traceId,
      });
    }
  },
});

const app = express();
const bugsnagMiddleware = Bugsnag.getPlugin("express");

// Bugsnag request handler must be the first middleware
app.use(bugsnagMiddleware.requestHandler);
```

## Creating a Unified Error Handler

Build a middleware that records errors in both systems with shared context.

```javascript
// error-handler.js - Record errors in both Bugsnag and OpenTelemetry
const Bugsnag = require("@bugsnag/js");
const { trace } = require("@opentelemetry/api");

function unifiedErrorHandler(err, req, res, next) {
  const activeSpan = trace.getSpan(require("@opentelemetry/api").context.active());

  if (activeSpan) {
    // Record the exception as an OpenTelemetry span event
    activeSpan.recordException(err);
    activeSpan.setStatus({
      code: 2, // ERROR
      message: err.message,
    });

    // Add Bugsnag metadata to the span for cross-referencing
    activeSpan.setAttribute("error.type", err.name);
    activeSpan.setAttribute("error.message", err.message);
    activeSpan.setAttribute("bugsnag.notified", true);
  }

  // Bugsnag will capture this through its error handler middleware
  // but we can add extra context here
  Bugsnag.notify(err, function (event) {
    event.addMetadata("request", {
      method: req.method,
      url: req.originalUrl,
      params: req.params,
    });
  });

  res.status(500).json({ error: "Something went wrong" });
}

module.exports = unifiedErrorHandler;
```

## Wiring It All Together

```javascript
// Complete app.js with routes and error handling
const unifiedErrorHandler = require("./error-handler");

app.get("/api/orders/:id", async (req, res, next) => {
  const tracer = trace.getTracer("order-service");

  try {
    const order = await tracer.startActiveSpan("fetch-order", async (span) => {
      span.setAttribute("order.id", req.params.id);
      const result = await database.getOrder(req.params.id);
      span.end();
      return result;
    });

    res.json(order);
  } catch (err) {
    next(err); // Pass to unified error handler
  }
});

// Bugsnag error handler must be the last middleware
app.use(unifiedErrorHandler);
app.use(bugsnagMiddleware.errorHandler);

app.listen(3000);
```

## Searching Across Both Systems

With trace IDs attached to Bugsnag events, your debugging workflow looks like this:

1. Get alerted to an error in Bugsnag.
2. Open the error detail and find the OpenTelemetry trace ID in the metadata tab.
3. Paste that trace ID into your trace viewer (Jaeger, Zipkin, Grafana Tempo).
4. See the full distributed trace showing every service call that led to the error.

This gives you Bugsnag's excellent error grouping and stability tracking combined with OpenTelemetry's cross-service trace visibility.

## Performance Considerations

Running two observability SDKs does add some overhead. In practice, the impact is minimal because both systems use asynchronous batched exports. However, keep these tips in mind:

- Set reasonable sampling rates on both systems. You probably do not need 100% trace sampling in production.
- Use the OpenTelemetry Collector as a buffer between your application and your trace backend.
- Monitor the memory usage of your application after adding both SDKs, especially under high load.

## Wrapping Up

Bugsnag and OpenTelemetry complement each other well. Bugsnag handles error grouping, alerting, and release tracking. OpenTelemetry handles distributed tracing and service dependency mapping. By sharing trace context between the two, you get a complete picture without having to replace either tool.
