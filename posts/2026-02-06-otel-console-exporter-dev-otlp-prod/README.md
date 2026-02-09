# How to Configure OpenTelemetry to Export to a Local Console During Development and OTLP in Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Console Exporter, OTLP, Environment Configuration, Best Practices

Description: Set up OpenTelemetry to print traces to the console in development and send them over OTLP in production using environment detection.

During development, you want to see traces immediately in your terminal. In production, you want to send them to a collector over OTLP. Maintaining two separate configurations is error-prone. A better approach is a single initialization that switches exporters based on the environment. This post shows how to do this in Node.js, Python, and Go.

## The Pattern

The core idea is simple: check an environment variable (like `NODE_ENV`, `FLASK_ENV`, or a custom `APP_ENV`) and choose the appropriate exporter. The rest of the OpenTelemetry configuration stays the same.

## Node.js Implementation

```javascript
// tracing.js - Environment-aware OpenTelemetry configuration
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME, ATTR_DEPLOYMENT_ENVIRONMENT } = require('@opentelemetry/semantic-conventions');

const env = process.env.NODE_ENV || 'development';
const serviceName = process.env.OTEL_SERVICE_NAME || 'my-service';

// Pick the exporter based on environment
function getExporter() {
  if (env === 'production' || env === 'staging') {
    // In production, export over OTLP to the collector
    return new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318/v1/traces',
    });
  }

  // In development, print spans to the console
  console.log('[tracing] Using console exporter for local development');
  return new ConsoleSpanExporter();
}

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_DEPLOYMENT_ENVIRONMENT]: env,
  }),
  traceExporter: getExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().then(() => process.exit(0));
});
```

When you run the app locally without setting `NODE_ENV`, you see spans printed to stdout in a readable JSON format:

```bash
node --require ./tracing.js app.js
```

Each span prints with its name, duration, attributes, and status. This is often enough to verify your instrumentation is working without running a collector.

## Python Implementation

```python
# tracing.py
import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import (
    BatchSpanProcessor,
    SimpleSpanProcessor,
    ConsoleSpanExporter,
)
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

env = os.environ.get("APP_ENV", "development")
service_name = os.environ.get("OTEL_SERVICE_NAME", "my-service")

resource = Resource.create({
    "service.name": service_name,
    "deployment.environment": env,
})

provider = TracerProvider(resource=resource)

if env in ("production", "staging"):
    # Production: batch export over OTLP
    exporter = OTLPSpanExporter()
    provider.add_span_processor(BatchSpanProcessor(exporter))
else:
    # Development: print to console with immediate export
    exporter = ConsoleSpanExporter()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    print(f"[tracing] Console exporter active for {env} environment")

trace.set_tracer_provider(provider)
```

Notice the use of `SimpleSpanProcessor` for development. It exports each span immediately rather than batching, so you see output as soon as a span completes. In production, `BatchSpanProcessor` groups spans together for efficiency.

## Go Implementation

```go
// tracing.go
package main

import (
    "context"
    "log"
    "os"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
    "go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

func initTracing(ctx context.Context) (*sdktrace.TracerProvider, error) {
    env := os.Getenv("APP_ENV")
    if env == "" {
        env = "development"
    }

    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName(os.Getenv("OTEL_SERVICE_NAME")),
            semconv.DeploymentEnvironment(env),
        ),
    )
    if err != nil {
        return nil, err
    }

    var exporter sdktrace.SpanExporter

    if env == "production" || env == "staging" {
        // OTLP exporter for production
        exporter, err = otlptracehttp.New(ctx)
        if err != nil {
            return nil, err
        }
    } else {
        // Console exporter for development
        exporter, err = stdouttrace.New(stdouttrace.WithPrettyPrint())
        if err != nil {
            return nil, err
        }
        log.Println("[tracing] Using stdout exporter for local development")
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithResource(res),
        sdktrace.WithBatcher(exporter),
    )
    otel.SetTracerProvider(tp)

    return tp, nil
}
```

The Go implementation uses `stdouttrace` with `WithPrettyPrint()` for development. This formats the span output with indentation, making it easy to read in your terminal.

## Using Both Exporters Simultaneously

Sometimes you want console output during development AND export to a local collector (so you can use Jaeger). OpenTelemetry supports multiple span processors:

```javascript
// tracing.js - Dual exporter setup
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { ConsoleSpanExporter, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const env = process.env.NODE_ENV || 'development';

const spanProcessors = [];

if (env === 'development') {
  // Console for quick feedback
  spanProcessors.push(new SimpleSpanProcessor(new ConsoleSpanExporter()));

  // Also send to local collector if it is running
  if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    spanProcessors.push(
      new SimpleSpanProcessor(
        new OTLPTraceExporter({
          url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT + '/v1/traces',
        })
      )
    );
  }
} else {
  // Production: only OTLP
  spanProcessors.push(
    new SimpleSpanProcessor(new OTLPTraceExporter())
  );
}

const sdk = new NodeSDK({
  spanProcessors,
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

This way, in development you always see spans in the terminal. If you also have a local collector running, spans go there too. In production, only the OTLP exporter is active.

## What the Console Output Looks Like

When using the console exporter, each completed span prints a JSON object:

```json
{
  "traceId": "abc123...",
  "name": "GET /api/users",
  "kind": "SERVER",
  "duration": "45ms",
  "attributes": {
    "http.method": "GET",
    "http.status_code": 200
  }
}
```

This is enough to verify that your instrumentation is capturing the right data without needing any external tools. When something looks wrong, you switch to the collector and Jaeger for the waterfall view.

This pattern gives you zero-friction observability during development. No collector to start, no browser tab to open. Just run your app and read the output.
