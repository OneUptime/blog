# How to Send OpenTelemetry Trace Data to Sentry Using the Sentry SDK OTLPIntegration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Sentry, OTLP, Distributed Tracing

Description: Learn how to configure the Sentry SDK OTLPIntegration to forward OpenTelemetry trace data directly to Sentry for unified observability.

Sentry has been expanding its OpenTelemetry support over the past couple of years, and one of the most useful additions is the `OTLPIntegration` in the Sentry SDK. This integration lets you send OpenTelemetry trace data directly to Sentry without needing a separate collector or exporter pipeline. If you are already using Sentry for error tracking and want to bring in distributed tracing from OpenTelemetry, this is the shortest path to get there.

## Why Use OTLPIntegration Instead of a Separate Exporter?

You might wonder why not just use the OpenTelemetry Collector with a Sentry exporter. That approach works, but it adds another moving part to your infrastructure. The `OTLPIntegration` baked into the Sentry SDK lets you skip the collector entirely for trace forwarding. Your application sends spans to Sentry as part of its normal SDK initialization. This is especially handy in smaller deployments or when you want a quick proof of concept.

## Setting Up the Sentry SDK with OTLPIntegration

First, install the required packages. We will use a Node.js example here, but the pattern is similar in Python and other supported languages.

```bash
npm install @sentry/node @sentry/opentelemetry
```

Now configure the Sentry SDK with the OTLP integration enabled:

```javascript
// sentry.js - Initialize Sentry with OpenTelemetry OTLP support
const Sentry = require("@sentry/node");
const { OTLPIntegration } = require("@sentry/opentelemetry");

Sentry.init({
  dsn: "https://your-sentry-dsn@sentry.io/project-id",
  tracesSampleRate: 1.0, // Capture 100% of traces in dev; lower in production
  integrations: [
    new OTLPIntegration({
      // Accept spans from any OpenTelemetry instrumentation
      // that sends data via OTLP protocol
      endpoint: "https://sentry.io/api/otlp/v1/traces",
    }),
  ],
});
```

## Instrumenting Your Application with OpenTelemetry

With Sentry initialized, you can now use standard OpenTelemetry APIs to create spans. Sentry will pick them up through the OTLP integration.

```javascript
// app.js - Example Express app with OpenTelemetry instrumentation
const { trace } = require("@opentelemetry/api");
const express = require("express");

const app = express();
const tracer = trace.getTracer("my-service", "1.0.0");

app.get("/api/users/:id", async (req, res) => {
  // Create a custom span using the OpenTelemetry API
  const span = tracer.startSpan("fetch-user-from-db", {
    attributes: {
      "user.id": req.params.id,
      "db.system": "postgresql",
    },
  });

  try {
    const user = await fetchUserFromDatabase(req.params.id);
    span.setStatus({ code: 1 }); // Status OK
    res.json(user);
  } catch (error) {
    // Record the exception on the span so Sentry can see it
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message }); // Status ERROR
    res.status(500).json({ error: "Internal server error" });
  } finally {
    span.end();
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
```

## How Data Flows from OpenTelemetry to Sentry

Here is what happens under the hood when you use `OTLPIntegration`:

1. Your code creates spans using the OpenTelemetry tracing API.
2. The Sentry SDK registers itself as a span processor in the OpenTelemetry pipeline.
3. When spans are completed, the SDK serializes them into the OTLP format.
4. The serialized span data is sent to Sentry alongside the normal Sentry event data.
5. Sentry correlates these spans with any error events captured by the same SDK instance.

This means you get both error tracking and distributed tracing in Sentry without running two separate data pipelines.

## Configuring Sampling for Production

Sending every single trace to Sentry in production will burn through your quota fast. Use a sampling strategy to keep costs in check.

```javascript
Sentry.init({
  dsn: "https://your-sentry-dsn@sentry.io/project-id",
  tracesSampleRate: 0.1, // Sample 10% of traces
  tracesSampler: (samplingContext) => {
    // Always trace requests that hit the payment endpoint
    if (samplingContext.transactionContext.name.includes("/api/payments")) {
      return 1.0;
    }
    // Sample health checks at a very low rate
    if (samplingContext.transactionContext.name.includes("/health")) {
      return 0.01;
    }
    // Default sampling rate for everything else
    return 0.1;
  },
  integrations: [new OTLPIntegration()],
});
```

## Verifying the Integration

After deploying your instrumented application, send a few requests and then check the Sentry dashboard. Navigate to the Performance section and you should see traces flowing in. Each trace will contain the spans you created with the OpenTelemetry API, complete with attributes and status codes.

If traces are not showing up, double check that your DSN is correct and that the `tracesSampleRate` is not set to zero. You can also enable debug logging in the Sentry SDK to see what is happening:

```javascript
Sentry.init({
  dsn: "https://your-sentry-dsn@sentry.io/project-id",
  debug: true, // Enable verbose logging to console
  integrations: [new OTLPIntegration()],
});
```

## Wrapping Up

The Sentry SDK `OTLPIntegration` is a practical way to unify error tracking and distributed tracing in a single tool. You get the benefit of OpenTelemetry's vendor-neutral instrumentation while leveraging Sentry's error grouping and alerting features. For teams already invested in Sentry, this integration reduces the operational burden of running a separate OpenTelemetry Collector just for trace export.
