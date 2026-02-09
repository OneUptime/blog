# How to Send OpenTelemetry Traces and Logs to Axiom via the OTLP HTTP Exporter with Dataset and API Token Headers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Axiom, OTLP HTTP Exporter, Log Ingestion

Description: Send OpenTelemetry traces and logs to Axiom using the OTLP HTTP exporter with dataset routing and API token authentication headers.

Axiom is a log analytics and observability platform that natively supports OTLP. It accepts traces, logs, and metrics through standard OTLP endpoints with API token authentication. Each signal can be routed to a different Axiom dataset using the `X-Axiom-Dataset` header or the URL path.

## Axiom OTLP Endpoints

Axiom's OTLP HTTP endpoints:
- Traces: `https://api.axiom.co/v1/traces`
- Logs: `https://api.axiom.co/v1/logs`
- General: `https://api.axiom.co/v1/traces` (accepts all signal types)

Authentication uses the `Authorization: Bearer <token>` header with an API token.

## Python Setup

```python
from opentelemetry import trace, _logs
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
from opentelemetry.sdk.resources import Resource

AXIOM_API_TOKEN = "xaat-your-axiom-api-token"
AXIOM_DATASET = "my-traces"
AXIOM_LOGS_DATASET = "my-logs"

resource = Resource.create({
    "service.name": "api-gateway",
    "service.version": "1.2.0",
    "deployment.environment": "production",
})

# Configure trace exporter
trace_exporter = OTLPSpanExporter(
    endpoint="https://api.axiom.co/v1/traces",
    headers={
        "Authorization": f"Bearer {AXIOM_API_TOKEN}",
        "X-Axiom-Dataset": AXIOM_DATASET,
    },
)

trace_provider = TracerProvider(resource=resource)
trace_provider.add_span_processor(BatchSpanProcessor(trace_exporter))
trace.set_tracer_provider(trace_provider)

# Configure log exporter
log_exporter = OTLPLogExporter(
    endpoint="https://api.axiom.co/v1/logs",
    headers={
        "Authorization": f"Bearer {AXIOM_API_TOKEN}",
        "X-Axiom-Dataset": AXIOM_LOGS_DATASET,
    },
)

logger_provider = LoggerProvider(resource=resource)
logger_provider.add_log_record_processor(BatchLogRecordProcessor(log_exporter))
_logs.set_logger_provider(logger_provider)

# Bridge Python logging to OpenTelemetry logs
import logging
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
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

func initAxiomTracing() (*sdktrace.TracerProvider, error) {
    ctx := context.Background()

    exporter, err := otlptracehttp.New(ctx,
        otlptracehttp.WithEndpoint("api.axiom.co"),
        otlptracehttp.WithURLPath("/v1/traces"),
        otlptracehttp.WithHeaders(map[string]string{
            "Authorization":  "Bearer xaat-your-axiom-api-token",
            "X-Axiom-Dataset": "my-traces",
        }),
    )
    if err != nil {
        return nil, err
    }

    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName("api-gateway"),
            semconv.ServiceVersion("1.2.0"),
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
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { BatchSpanProcessor } = require("@opentelemetry/sdk-trace-base");
const { Resource } = require("@opentelemetry/resources");

const resource = new Resource({
  "service.name": "web-frontend",
  "service.version": "3.0.0",
});

const exporter = new OTLPTraceExporter({
  url: "https://api.axiom.co/v1/traces",
  headers: {
    Authorization: `Bearer ${process.env.AXIOM_API_TOKEN}`,
    "X-Axiom-Dataset": "my-traces",
  },
});

const provider = new NodeTracerProvider({ resource });
provider.addSpanProcessor(new BatchSpanProcessor(exporter));
provider.register();
```

## Sending Correlated Logs and Traces

The real power comes when your logs and traces share the same trace context:

```python
import logging

tracer = trace.get_tracer("api-gateway")
logger = logging.getLogger("api-gateway")

def handle_request(request):
    with tracer.start_as_current_span("handle_request") as span:
        span.set_attribute("http.method", request.method)
        span.set_attribute("http.url", request.url)

        # This log will automatically include the trace_id and span_id
        # because of the LoggingHandler we configured
        logger.info(f"Processing request to {request.url}")

        try:
            result = process_request(request)
            logger.info(f"Request processed successfully: {result.status}")
            return result
        except Exception as e:
            logger.error(f"Request failed: {str(e)}")
            span.record_exception(e)
            raise
```

## Environment Variable Configuration

```bash
# Traces
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="https://api.axiom.co/v1/traces"
export OTEL_EXPORTER_OTLP_TRACES_HEADERS="Authorization=Bearer xaat-your-token,X-Axiom-Dataset=my-traces"

# Logs
export OTEL_EXPORTER_OTLP_LOGS_ENDPOINT="https://api.axiom.co/v1/logs"
export OTEL_EXPORTER_OTLP_LOGS_HEADERS="Authorization=Bearer xaat-your-token,X-Axiom-Dataset=my-logs"

export OTEL_SERVICE_NAME="my-service"
```

## Querying in Axiom

Once data flows in, query it using Axiom Processing Language (APL):

```
// Find slow traces
['my-traces']
| where duration > 1000ms
| where ['service.name'] == "api-gateway"
| project _time, trace_id, duration, ['http.url']

// Correlate logs with traces
['my-logs']
| where trace_id == "abc123"
| sort by _time asc
```

Axiom's native OTLP support combined with its powerful query language makes it a strong choice for teams that want both log analytics and distributed tracing in one platform.
