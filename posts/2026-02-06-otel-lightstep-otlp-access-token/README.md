# How to Send OpenTelemetry Data to Lightstep (ServiceNow Cloud Observability) via OTLP with Access Token Headers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Lightstep, ServiceNow Cloud Observability, OTLP

Description: Configure OpenTelemetry to send traces and metrics to Lightstep (ServiceNow Cloud Observability) using OTLP with access token authentication.

Lightstep, now part of ServiceNow Cloud Observability, was one of the earliest adopters of OpenTelemetry. It accepts OTLP data directly at its public satellites. All you need is an access token and the correct endpoint. No proprietary SDKs required.

## The Lightstep OTLP Endpoint

Lightstep's public OTLP endpoint is `ingest.lightstep.com:443` for gRPC and `ingest.lightstep.com/traces/otlp/v0.9` for HTTP. Authentication uses the `lightstep-access-token` header.

## Go Configuration

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
    lightstepEndpoint    = "ingest.lightstep.com:443"
    lightstepAccessToken = "your-lightstep-access-token"
)

func initTracing() (*sdktrace.TracerProvider, error) {
    ctx := context.Background()

    exporter, err := otlptracegrpc.New(ctx,
        // Lightstep's OTLP gRPC endpoint
        otlptracegrpc.WithEndpoint(lightstepEndpoint),
        // Access token for authentication
        otlptracegrpc.WithHeaders(map[string]string{
            "lightstep-access-token": lightstepAccessToken,
        }),
        // TLS is required (port 443)
        // No need to set WithTLSCredentials explicitly; it uses system certs
    )
    if err != nil {
        return nil, err
    }

    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName("payment-service"),
            semconv.ServiceVersion("2.1.0"),
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

func initMetrics() (*sdkmetric.MeterProvider, error) {
    ctx := context.Background()

    exporter, err := otlpmetricgrpc.New(ctx,
        otlpmetricgrpc.WithEndpoint(lightstepEndpoint),
        otlpmetricgrpc.WithHeaders(map[string]string{
            "lightstep-access-token": lightstepAccessToken,
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

LIGHTSTEP_TOKEN = "your-lightstep-access-token"
LIGHTSTEP_ENDPOINT = "ingest.lightstep.com:443"

resource = Resource.create({
    "service.name": "order-service",
    "service.version": "1.5.0",
    "deployment.environment": "production",
})

# Trace exporter
trace_exporter = OTLPSpanExporter(
    endpoint=LIGHTSTEP_ENDPOINT,
    headers=(("lightstep-access-token", LIGHTSTEP_TOKEN),),
)

provider = TracerProvider(resource=resource)
provider.add_span_processor(BatchSpanProcessor(trace_exporter))
trace.set_tracer_provider(provider)

# Metric exporter
metric_exporter = OTLPMetricExporter(
    endpoint=LIGHTSTEP_ENDPOINT,
    headers=(("lightstep-access-token", LIGHTSTEP_TOKEN),),
)

metric_reader = PeriodicExportingMetricReader(metric_exporter)
meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
metrics.set_meter_provider(meter_provider)
```

## Node.js Configuration

```javascript
const { NodeTracerProvider } = require("@opentelemetry/sdk-trace-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-grpc");
const { BatchSpanProcessor } = require("@opentelemetry/sdk-trace-base");
const { Resource } = require("@opentelemetry/resources");
const grpc = require("@grpc/grpc-js");

const resource = new Resource({
  "service.name": "frontend-service",
  "service.version": "3.0.0",
});

const metadata = new grpc.Metadata();
metadata.set("lightstep-access-token", process.env.LIGHTSTEP_ACCESS_TOKEN);

const exporter = new OTLPTraceExporter({
  url: "grpc://ingest.lightstep.com:443",
  credentials: grpc.credentials.createSsl(),
  metadata: metadata,
});

const provider = new NodeTracerProvider({ resource });
provider.addSpanProcessor(new BatchSpanProcessor(exporter));
provider.register();
```

## Environment Variables

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT="https://ingest.lightstep.com:443"
export OTEL_EXPORTER_OTLP_HEADERS="lightstep-access-token=your-token"
export OTEL_SERVICE_NAME="my-service"
export OTEL_RESOURCE_ATTRIBUTES="service.version=1.0.0,deployment.environment=production"
```

## Verifying Data in Lightstep

After configuring the exporter, generate some test traces:

```python
tracer = trace.get_tracer("verification")

with tracer.start_as_current_span("test-span") as span:
    span.set_attribute("test.verification", True)
    span.set_attribute("test.timestamp", "2026-02-06")

# Flush to make sure data is sent
trace.get_tracer_provider().force_flush()
print("Test span sent to Lightstep. Check the Explorer view.")
```

In the Lightstep UI, navigate to the Explorer and filter by `service.name` to find your traces. If nothing appears, check that your access token has the correct permissions and that the endpoint is reachable from your network.

Lightstep's full OTLP support means you can switch to it (or away from it) without changing any application code. The only configuration that changes is the endpoint and the authentication header.
