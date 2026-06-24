# How to Send OpenTelemetry Trace Data to Sentry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Sentry, OTLP, Distributed Tracing

Description: Learn how to configure the Sentry SDK OTLPIntegration to forward OpenTelemetry trace data directly to Sentry for unified observability.

Sentry has been expanding its OpenTelemetry support over the past couple of years, and one of the most useful additions is built-in OpenTelemetry support in the Sentry SDK. This lets you send OpenTelemetry trace data directly to Sentry without needing a separate collector or exporter pipeline. If you are already using Sentry for error tracking and want to bring in distributed tracing from OpenTelemetry, this is the shortest path to get there.

## Why Use the Sentry SDK Instead of a Separate Exporter?

You might wonder why not just use the OpenTelemetry Collector with an OTLP exporter. That approach works, but it adds another moving part to your infrastructure. The OpenTelemetry support built into the Sentry SDK lets you skip the collector entirely for trace forwarding. Your application sends spans to Sentry as part of its normal SDK initialization. This is especially handy in smaller deployments or when you want a quick proof of concept.

## Setting Up the Sentry SDK with OpenTelemetry

First, install the required packages. We will use a Node.js example here, but the pattern is similar in other supported languages.

```bash
npm install @sentry/node @opentelemetry/api express
```

Now configure the Sentry SDK with tracing enabled:

```javascript
// sentry.js - Initialize Sentry with OpenTelemetry support
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
  tracesSampleRate: 1.0, // Capture 100% of traces in dev; lower in production
});
```

## Instrumenting Your Application with OpenTelemetry

With Sentry initialized, you can now use standard OpenTelemetry APIs to create spans. Sentry will pick them up through the SDK's OpenTelemetry support.

```javascript
// app.js - Example Express app with OpenTelemetry instrumentation
require("./sentry");

const { SpanStatusCode, trace } = require("@opentelemetry/api");
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
    span.setStatus({ code: SpanStatusCode.OK });
    res.json(user);
  } catch (error) {
    // Record the exception on the span so Sentry can see it
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
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

Here is what happens under the hood when you use the Sentry SDK's OpenTelemetry support:

1. Your code creates spans using the OpenTelemetry tracing API.
2. The Sentry SDK configures OpenTelemetry and registers the pieces it needs to process spans.
3. When spans are completed, the SDK converts OpenTelemetry spans into Sentry trace data.
4. The trace data is sent to Sentry through the normal Sentry SDK transport.
5. Sentry correlates these spans with any error events captured by the same SDK instance.

This means you get both error tracking and distributed tracing in Sentry without running two separate data pipelines.

## Configuring Sampling for Production

Sending every single trace to Sentry in production will burn through your quota fast. Use a sampling strategy to keep costs in check.

```javascript
Sentry.init({
  dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
  tracesSampler: (samplingContext) => {
    const { name, inheritOrSampleWith } = samplingContext;

    // Always trace requests that hit the payment endpoint
    if (name.includes("/api/payments")) {
      return 1.0;
    }
    // Sample health checks at a very low rate
    if (name.includes("/health")) {
      return 0.01;
    }
    // Default sampling rate for everything else
    return inheritOrSampleWith(0.1);
  },
});
```

## Verifying the Integration

After deploying your instrumented application, send a few requests and then check the Sentry dashboard. Navigate to the Performance section and you should see traces flowing in. Each trace will contain the spans you created with the OpenTelemetry API, complete with attributes and status codes.

If traces are not showing up, double check that your DSN is correct and that your sampling configuration is not dropping every trace. You can also enable debug logging in the Sentry SDK to see what is happening:

```javascript
Sentry.init({
  dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
  debug: true, // Enable verbose logging to console
  tracesSampleRate: 1.0,
});
```

## Wrapping Up

The Sentry SDK's OpenTelemetry support is a practical way to unify error tracking and distributed tracing in a single tool. You get the benefit of OpenTelemetry's vendor-neutral instrumentation while leveraging Sentry's error grouping and alerting features. For teams already invested in Sentry, this integration reduces the operational burden of running a separate OpenTelemetry Collector just for trace export.
