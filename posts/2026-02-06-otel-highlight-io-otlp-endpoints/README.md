# How to Send OpenTelemetry Traces and Logs to Highlight.io via Their OTLP Collector Endpoints at otel.highlight.io

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Highlight.io, OTLP, Full Stack Observability

Description: Send OpenTelemetry traces and logs to Highlight.io using their OTLP-compatible collector endpoints at otel.highlight.io for full stack visibility.

Highlight.io is a full-stack monitoring platform that combines session replay, error tracking, and backend monitoring. It accepts OpenTelemetry data through OTLP endpoints at `otel.highlight.io`, making it straightforward to get backend traces and logs alongside your frontend session replays.

## Highlight.io OTLP Endpoints

Highlight.io provides standard OTLP endpoints:
- gRPC: `otel.highlight.io:4317`
- HTTP: `https://otel.highlight.io:4318`

Authentication is done through resource attributes rather than headers. You set your `highlight.project_id` as a resource attribute on every span and log record.

## Python Setup

```python
from opentelemetry import trace, _logs
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
from opentelemetry.sdk.resources import Resource
import logging

HIGHLIGHT_PROJECT_ID = "your-highlight-project-id"

# The resource must include highlight.project_id
resource = Resource.create({
    "service.name": "api-backend",
    "service.version": "1.0.0",
    "highlight.project_id": HIGHLIGHT_PROJECT_ID,
})

# Configure trace exporter
trace_exporter = OTLPSpanExporter(
    endpoint="otel.highlight.io:4317",
    # No extra headers needed; project_id is in the resource
)

trace_provider = TracerProvider(resource=resource)
trace_provider.add_span_processor(BatchSpanProcessor(trace_exporter))
trace.set_tracer_provider(trace_provider)

# Configure log exporter
log_exporter = OTLPLogExporter(
    endpoint="otel.highlight.io:4317",
)

logger_provider = LoggerProvider(resource=resource)
logger_provider.add_log_record_processor(BatchLogRecordProcessor(log_exporter))
_logs.set_logger_provider(logger_provider)

# Bridge standard Python logging
handler = LoggingHandler(level=logging.INFO, logger_provider=logger_provider)
logging.getLogger().addHandler(handler)
```

## Go Setup

```go
package main

import (
    "context"
    "log"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
    "go.opentelemetry.io/otel/attribute"
)

func initHighlightTracing() (*sdktrace.TracerProvider, error) {
    ctx := context.Background()

    exporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint("otel.highlight.io:4317"),
    )
    if err != nil {
        return nil, err
    }

    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName("api-backend"),
            semconv.ServiceVersion("1.0.0"),
            // Highlight.io uses this resource attribute for project routing
            attribute.String("highlight.project_id", "your-highlight-project-id"),
        ),
    )
    if err != nil {
        return nil, err
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(res),
    )
    otel.SetTracerProvider(tp)
    return tp, nil
}
```

## Node.js Setup

```javascript
const { NodeTracerProvider } = require("@opentelemetry/sdk-trace-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-grpc");
const { BatchSpanProcessor } = require("@opentelemetry/sdk-trace-base");
const { Resource } = require("@opentelemetry/resources");

const HIGHLIGHT_PROJECT_ID = process.env.HIGHLIGHT_PROJECT_ID;

const resource = new Resource({
  "service.name": "express-api",
  "service.version": "2.0.0",
  "highlight.project_id": HIGHLIGHT_PROJECT_ID,
});

const exporter = new OTLPTraceExporter({
  url: "https://otel.highlight.io:4317",
});

const provider = new NodeTracerProvider({ resource });
provider.addSpanProcessor(new BatchSpanProcessor(exporter));
provider.register();
```

## Linking Backend Traces to Frontend Sessions

The magic of Highlight.io is connecting backend errors to the frontend session replay. To do this, the frontend passes a `highlight.session_id` header that you capture on the backend:

```python
from flask import Flask, request

app = Flask(__name__)
tracer = trace.get_tracer("api-backend")

@app.route("/api/orders", methods=["POST"])
def create_order():
    with tracer.start_as_current_span("create_order") as span:
        # Capture the Highlight session ID from the frontend
        session_id = request.headers.get("x-highlight-request")
        if session_id:
            # Parse the session ID and request ID
            parts = session_id.split("/")
            if len(parts) >= 1:
                span.set_attribute("highlight.session_id", parts[0])
            if len(parts) >= 2:
                span.set_attribute("highlight.trace_id", parts[1])

        # Process the order
        order = process_order(request.json)
        span.set_attribute("order.id", order["id"])

        return {"order_id": order["id"]}, 201
```

## Recording Errors

Highlight.io highlights errors (pun intended) prominently. Make sure your errors are properly recorded:

```python
logger = logging.getLogger("api-backend")

def handle_request(request):
    with tracer.start_as_current_span("handle_request") as span:
        try:
            result = dangerous_operation()
            return result
        except ValueError as e:
            # This error will appear in Highlight.io's error tracking
            span.record_exception(e)
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            logger.error(
                f"ValueError in handle_request: {e}",
                exc_info=True,
                extra={"user_id": request.user_id},
            )
            raise
```

## Using the HTTP Endpoint

If gRPC is not available in your environment, use the HTTP endpoint:

```python
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

trace_exporter = OTLPSpanExporter(
    endpoint="https://otel.highlight.io:4318/v1/traces",
)
```

## Environment Variables

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT="https://otel.highlight.io:4317"
export OTEL_SERVICE_NAME="my-service"
export OTEL_RESOURCE_ATTRIBUTES="highlight.project_id=your-project-id"
```

The key differentiator with Highlight.io is the connection between backend observability and frontend session replays. When a user experiences an error, you can see the backend trace, the logs, and a video replay of what the user was doing, all linked together through the `highlight.session_id` and `highlight.project_id` attributes.
