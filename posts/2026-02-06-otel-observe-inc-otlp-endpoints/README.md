# How to Send OpenTelemetry Data to Observe Inc via the Observe Agent OTLP gRPC and HTTP Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Observe Inc, OTLP, Data Ingestion

Description: Send OpenTelemetry traces, metrics, and logs to Observe Inc using their OTLP-compatible gRPC and HTTP ingestion endpoints.

Observe Inc provides a cloud-native observability platform built on a data lake architecture. It accepts OpenTelemetry data through standard OTLP endpoints, making integration straightforward. You can send data directly from your applications or through the OpenTelemetry Collector.

## Observe OTLP Endpoints

Observe provides both gRPC and HTTP endpoints:
- gRPC: `collect.observeinc.com:4317`
- HTTP: `collect.observeinc.com:443/v1/otel`

Authentication uses a Bearer token derived from your Observe customer ID and datastream token.

## Go Configuration

```go
package main

import (
    "context"
    "fmt"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    sdkmetric "go.opentelemetry.io/otel/sdk/metric"
    semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

const (
    observeEndpoint  = "collect.observeinc.com:4317"
    observeCustomerID = "123456789"
    observeToken      = "your-observe-datastream-token"
)

func observeAuthToken() string {
    // Observe uses a Bearer token format: customerID:datastreamToken
    return fmt.Sprintf("%s:%s", observeCustomerID, observeToken)
}

func initObserveTracing() (*sdktrace.TracerProvider, error) {
    ctx := context.Background()

    exporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint(observeEndpoint),
        otlptracegrpc.WithHeaders(map[string]string{
            "Authorization": "Bearer " + observeAuthToken(),
        }),
        // TLS is required
    )
    if err != nil {
        return nil, err
    }

    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName("checkout-service"),
            semconv.ServiceVersion("1.0.0"),
            semconv.DeploymentEnvironment("production"),
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

func initObserveMetrics() (*sdkmetric.MeterProvider, error) {
    ctx := context.Background()

    exporter, err := otlpmetricgrpc.New(ctx,
        otlpmetricgrpc.WithEndpoint(observeEndpoint),
        otlpmetricgrpc.WithHeaders(map[string]string{
            "Authorization": "Bearer " + observeAuthToken(),
        }),
    )
    if err != nil {
        return nil, err
    }

    mp := sdkmetric.NewMeterProvider(
        sdkmetric.WithReader(sdkmetric.NewPeriodicReader(exporter)),
    )
    otel.SetMeterProvider(mp)
    return mp, nil
}
```

## Python Configuration

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource

OBSERVE_CUSTOMER_ID = "123456789"
OBSERVE_TOKEN = "your-observe-datastream-token"
OBSERVE_ENDPOINT = "collect.observeinc.com:4317"

auth_token = f"{OBSERVE_CUSTOMER_ID}:{OBSERVE_TOKEN}"

resource = Resource.create({
    "service.name": "order-processor",
    "service.version": "2.0.0",
    "deployment.environment": "production",
})

# Traces
trace_exporter = OTLPSpanExporter(
    endpoint=OBSERVE_ENDPOINT,
    headers=(("authorization", f"Bearer {auth_token}"),),
)

trace_provider = TracerProvider(resource=resource)
trace_provider.add_span_processor(BatchSpanProcessor(trace_exporter))
trace.set_tracer_provider(trace_provider)

# Metrics
metric_exporter = OTLPMetricExporter(
    endpoint=OBSERVE_ENDPOINT,
    headers=(("authorization", f"Bearer {auth_token}"),),
)

metric_reader = PeriodicExportingMetricReader(metric_exporter)
meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
metrics.set_meter_provider(meter_provider)
```

## Using the HTTP Endpoint

If gRPC is not available (behind a proxy that does not support HTTP/2), use the HTTP endpoint:

```python
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

trace_exporter = OTLPSpanExporter(
    endpoint="https://collect.observeinc.com/v1/otel",
    headers={
        "Authorization": f"Bearer {auth_token}",
    },
)
```

## Environment Variables

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT="https://collect.observeinc.com:4317"
export OTEL_EXPORTER_OTLP_HEADERS="authorization=Bearer 123456789:your-token"
export OTEL_SERVICE_NAME="my-service"
export OTEL_RESOURCE_ATTRIBUTES="deployment.environment=production"
```

## Generating Test Data

```python
tracer = trace.get_tracer("observe-test")

with tracer.start_as_current_span("test-operation") as span:
    span.set_attribute("test.purpose", "verify-observe-integration")
    span.set_attribute("test.timestamp", "2026-02-06T12:00:00Z")

    with tracer.start_as_current_span("child-operation") as child:
        child.set_attribute("db.system", "postgresql")
        child.set_attribute("db.operation", "SELECT")

trace.get_tracer_provider().force_flush()
print("Test data sent to Observe Inc")
```

## Verifying in Observe

In the Observe UI, navigate to the OTEL integration and look for your service name. Observe automatically creates datasets for traces, metrics, and logs from OTLP data. You can then build worksheets and dashboards from these datasets.

Observe Inc's data lake approach means your OpenTelemetry data gets stored in its raw form and can be joined with other data sources later. This is particularly useful for organizations that want to correlate infrastructure metrics, application traces, and business data in a single platform.
