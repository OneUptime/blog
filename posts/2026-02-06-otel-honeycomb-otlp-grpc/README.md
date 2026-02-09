# How to Send OpenTelemetry Traces and Metrics to Honeycomb via OTLP gRPC with API Key Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Honeycomb, OTLP, API Key Authentication

Description: Send OpenTelemetry traces and metrics to Honeycomb using the OTLP gRPC exporter with API key authentication and team configuration.

Honeycomb natively supports OTLP, which means you can send traces and metrics directly from your application without any special Honeycomb SDK. The OTLP gRPC endpoint at `api.honeycomb.io:443` accepts standard OpenTelemetry data with an API key header for authentication.

## Prerequisites

You need a Honeycomb API key and a dataset name. The API key goes in the `x-honeycomb-team` header, and the dataset goes in the `x-honeycomb-dataset` header.

## Go Setup

```go
package main

import (
    "context"
    "log"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    sdkmetric "go.opentelemetry.io/otel/sdk/metric"
    semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

const (
    honeycombEndpoint = "api.honeycomb.io:443"
    honeycombAPIKey   = "your-honeycomb-api-key"
    honeycombDataset  = "my-service-traces"
)

func initTracing() (*sdktrace.TracerProvider, error) {
    ctx := context.Background()

    // Create the OTLP gRPC trace exporter for Honeycomb
    traceExporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint(honeycombEndpoint),
        // Honeycomb requires TLS (default for port 443)
        otlptracegrpc.WithHeaders(map[string]string{
            "x-honeycomb-team":    honeycombAPIKey,
            "x-honeycomb-dataset": honeycombDataset,
        }),
    )
    if err != nil {
        return nil, err
    }

    // Create a resource describing this service
    res, err := resource.Merge(
        resource.Default(),
        resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceName("my-api-service"),
            semconv.ServiceVersion("1.0.0"),
            semconv.DeploymentEnvironment("production"),
        ),
    )
    if err != nil {
        return nil, err
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(traceExporter),
        sdktrace.WithResource(res),
        // Sample 100% in production if your volume allows it
        sdktrace.WithSampler(sdktrace.AlwaysSample()),
    )

    otel.SetTracerProvider(tp)
    return tp, nil
}

func initMetrics() (*sdkmetric.MeterProvider, error) {
    ctx := context.Background()

    // Create the OTLP gRPC metric exporter for Honeycomb
    metricExporter, err := otlpmetricgrpc.New(ctx,
        otlpmetricgrpc.WithEndpoint(honeycombEndpoint),
        otlpmetricgrpc.WithHeaders(map[string]string{
            "x-honeycomb-team":    honeycombAPIKey,
            "x-honeycomb-dataset": honeycombDataset + "-metrics",
        }),
    )
    if err != nil {
        return nil, err
    }

    mp := sdkmetric.NewMeterProvider(
        sdkmetric.WithReader(
            sdkmetric.NewPeriodicReader(metricExporter),
        ),
    )

    otel.SetMeterProvider(mp)
    return mp, nil
}

func main() {
    tp, err := initTracing()
    if err != nil {
        log.Fatal(err)
    }
    defer tp.Shutdown(context.Background())

    mp, err := initMetrics()
    if err != nil {
        log.Fatal(err)
    }
    defer mp.Shutdown(context.Background())

    // Your application code here
    tracer := otel.Tracer("my-api")
    _, span := tracer.Start(context.Background(), "hello-honeycomb")
    span.End()
}
```

## Python Setup

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource

HONEYCOMB_API_KEY = "your-honeycomb-api-key"
HONEYCOMB_DATASET = "my-service"
HONEYCOMB_ENDPOINT = "https://api.honeycomb.io:443"

resource = Resource.create({
    "service.name": "my-python-service",
    "service.version": "1.0.0",
    "deployment.environment": "production",
})

# Set up traces
trace_exporter = OTLPSpanExporter(
    endpoint=HONEYCOMB_ENDPOINT,
    headers=(
        ("x-honeycomb-team", HONEYCOMB_API_KEY),
        ("x-honeycomb-dataset", HONEYCOMB_DATASET),
    ),
)

trace_provider = TracerProvider(resource=resource)
trace_provider.add_span_processor(BatchSpanProcessor(trace_exporter))
trace.set_tracer_provider(trace_provider)

# Set up metrics
metric_exporter = OTLPMetricExporter(
    endpoint=HONEYCOMB_ENDPOINT,
    headers=(
        ("x-honeycomb-team", HONEYCOMB_API_KEY),
        ("x-honeycomb-dataset", f"{HONEYCOMB_DATASET}-metrics"),
    ),
)

metric_reader = PeriodicExportingMetricReader(metric_exporter)
meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
metrics.set_meter_provider(meter_provider)
```

## Environment Variable Configuration

For containerized deployments, use environment variables:

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT="https://api.honeycomb.io:443"
export OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=your-api-key,x-honeycomb-dataset=my-service"
export OTEL_SERVICE_NAME="my-service"
export OTEL_RESOURCE_ATTRIBUTES="deployment.environment=production,service.version=1.0.0"
```

## Honeycomb Classic vs Honeycomb Environments

Honeycomb has two modes. In Classic mode, you use the `x-honeycomb-dataset` header to route data to specific datasets. In the newer Environments mode, the dataset is derived from the `service.name` resource attribute, and you do not need the `x-honeycomb-dataset` header at all:

```python
# For Honeycomb Environments (no dataset header needed)
trace_exporter = OTLPSpanExporter(
    endpoint="https://api.honeycomb.io:443",
    headers=(
        ("x-honeycomb-team", HONEYCOMB_API_KEY),
        # No x-honeycomb-dataset needed; service.name in resource is used
    ),
)
```

## Verifying the Connection

After starting your application, check the Honeycomb UI for incoming data. If data is not appearing, verify your API key is correct and check for TLS errors. You can also enable debug logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

Honeycomb's native OTLP support makes it one of the simplest backends to configure. Point the standard OTLP exporter at their endpoint, add the API key header, and your traces and metrics start flowing.
