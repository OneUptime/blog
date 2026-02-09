# How to Send OpenTelemetry Logs and Metrics to Better Stack via Their OTLP-Native Endpoint with Source Token

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Better Stack, OTLP, Log Management

Description: Send OpenTelemetry logs and metrics to Better Stack using their OTLP-native endpoint with source token authentication for unified monitoring.

Better Stack (formerly Logtail) provides a modern log management and uptime monitoring platform. It supports OTLP natively, which means you can send OpenTelemetry logs and metrics directly without any custom exporters. Authentication uses a source token that you create in the Better Stack dashboard.

## Better Stack OTLP Endpoint

Better Stack's OTLP endpoint: `https://in-otel.logs.betterstack.com`. Authentication uses an `Authorization: Bearer <source-token>` header.

## Creating a Source Token

In the Better Stack dashboard:
1. Go to Sources
2. Click "Connect source"
3. Select "OpenTelemetry"
4. Copy the source token

## Python Setup

```python
from opentelemetry import trace, _logs, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource
import logging

BETTER_STACK_SOURCE_TOKEN = "your-source-token"
BETTER_STACK_ENDPOINT = "https://in-otel.logs.betterstack.com"

resource = Resource.create({
    "service.name": "web-api",
    "service.version": "1.5.0",
    "deployment.environment": "production",
    "host.name": "web-server-01",
})

# Configure trace exporter
trace_exporter = OTLPSpanExporter(
    endpoint=f"{BETTER_STACK_ENDPOINT}/v1/traces",
    headers={
        "Authorization": f"Bearer {BETTER_STACK_SOURCE_TOKEN}",
    },
)

trace_provider = TracerProvider(resource=resource)
trace_provider.add_span_processor(BatchSpanProcessor(trace_exporter))
trace.set_tracer_provider(trace_provider)

# Configure log exporter
log_exporter = OTLPLogExporter(
    endpoint=f"{BETTER_STACK_ENDPOINT}/v1/logs",
    headers={
        "Authorization": f"Bearer {BETTER_STACK_SOURCE_TOKEN}",
    },
)

logger_provider = LoggerProvider(resource=resource)
logger_provider.add_log_record_processor(BatchLogRecordProcessor(log_exporter))
_logs.set_logger_provider(logger_provider)

# Bridge Python logging to OpenTelemetry
handler = LoggingHandler(level=logging.INFO, logger_provider=logger_provider)
logging.getLogger().addHandler(handler)

# Configure metric exporter
metric_exporter = OTLPMetricExporter(
    endpoint=f"{BETTER_STACK_ENDPOINT}/v1/metrics",
    headers={
        "Authorization": f"Bearer {BETTER_STACK_SOURCE_TOKEN}",
    },
)

metric_reader = PeriodicExportingMetricReader(metric_exporter)
meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
metrics.set_meter_provider(meter_provider)
```

## Go Setup

```go
package main

import (
    "context"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    sdkmetric "go.opentelemetry.io/otel/sdk/metric"
    semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

const (
    betterStackEndpoint = "in-otel.logs.betterstack.com"
    betterStackToken    = "your-source-token"
)

func initBetterStack() (*sdktrace.TracerProvider, *sdkmetric.MeterProvider, error) {
    ctx := context.Background()

    res, _ := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName("web-api"),
            semconv.ServiceVersion("1.5.0"),
            semconv.DeploymentEnvironment("production"),
        ),
    )

    // Trace exporter
    traceExporter, err := otlptracehttp.New(ctx,
        otlptracehttp.WithEndpoint(betterStackEndpoint),
        otlptracehttp.WithURLPath("/v1/traces"),
        otlptracehttp.WithHeaders(map[string]string{
            "Authorization": "Bearer " + betterStackToken,
        }),
    )
    if err != nil {
        return nil, nil, err
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(traceExporter),
        sdktrace.WithResource(res),
    )
    otel.SetTracerProvider(tp)

    // Metric exporter
    metricExporter, err := otlpmetrichttp.New(ctx,
        otlpmetrichttp.WithEndpoint(betterStackEndpoint),
        otlpmetrichttp.WithURLPath("/v1/metrics"),
        otlpmetrichttp.WithHeaders(map[string]string{
            "Authorization": "Bearer " + betterStackToken,
        }),
    )
    if err != nil {
        return nil, nil, err
    }

    mp := sdkmetric.NewMeterProvider(
        sdkmetric.WithReader(sdkmetric.NewPeriodicReader(metricExporter)),
        sdkmetric.WithResource(res),
    )
    otel.SetMeterProvider(mp)

    return tp, mp, nil
}
```

## Node.js Setup

```javascript
const { NodeTracerProvider } = require("@opentelemetry/sdk-trace-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { OTLPLogExporter } = require("@opentelemetry/exporter-logs-otlp-http");
const { BatchSpanProcessor } = require("@opentelemetry/sdk-trace-base");
const { Resource } = require("@opentelemetry/resources");

const BETTER_STACK_TOKEN = process.env.BETTER_STACK_SOURCE_TOKEN;

const resource = new Resource({
  "service.name": "express-api",
  "service.version": "3.0.0",
  "deployment.environment": "production",
});

const traceExporter = new OTLPTraceExporter({
  url: "https://in-otel.logs.betterstack.com/v1/traces",
  headers: {
    Authorization: `Bearer ${BETTER_STACK_TOKEN}`,
  },
});

const provider = new NodeTracerProvider({ resource });
provider.addSpanProcessor(new BatchSpanProcessor(traceExporter));
provider.register();
```

## Collector Configuration

Send data through the OpenTelemetry Collector to Better Stack:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s
    send_batch_size: 512

  resource:
    attributes:
      - key: deployment.environment
        value: "production"
        action: upsert

exporters:
  otlphttp/betterstack:
    endpoint: "https://in-otel.logs.betterstack.com"
    headers:
      Authorization: "Bearer ${BETTER_STACK_SOURCE_TOKEN}"
    retry_on_failure:
      enabled: true
      initial_interval: 1s
      max_interval: 30s
    sending_queue:
      enabled: true
      queue_size: 5000

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlphttp/betterstack]

    logs:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlphttp/betterstack]

    metrics:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlphttp/betterstack]
```

## Sending Correlated Logs and Traces

When logs and traces share context, Better Stack can link them:

```python
tracer = trace.get_tracer("web-api")
logger = logging.getLogger("web-api")

def handle_api_request(request):
    with tracer.start_as_current_span("handle_request") as span:
        span.set_attribute("http.method", request.method)
        span.set_attribute("http.url", request.path)

        # This log automatically includes trace_id and span_id
        logger.info(
            f"Processing {request.method} {request.path}",
            extra={
                "user_id": request.user.id,
                "request_id": request.id,
            }
        )

        try:
            result = process(request)
            logger.info(f"Request completed: {result.status}")
            return result
        except Exception as e:
            logger.error(f"Request failed: {e}", exc_info=True)
            span.record_exception(e)
            raise
```

## Environment Variables

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT="https://in-otel.logs.betterstack.com"
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer your-source-token"
export OTEL_SERVICE_NAME="my-service"
export OTEL_RESOURCE_ATTRIBUTES="deployment.environment=production"
```

Better Stack's OTLP-native support means you can use the standard OpenTelemetry SDK and exporters without any proprietary libraries. The source token provides simple, secure authentication, and correlated logs and traces give you the context you need when investigating production issues.
