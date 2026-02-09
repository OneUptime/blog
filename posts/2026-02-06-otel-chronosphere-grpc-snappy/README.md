# How to Send OpenTelemetry Metrics to Chronosphere via the gRPC OTLP Exporter with API Token and Snappy Compression

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Chronosphere, gRPC OTLP, Snappy Compression

Description: Configure the OpenTelemetry OTLP gRPC exporter to send metrics to Chronosphere with API token authentication and Snappy compression.

Chronosphere is a cloud-native observability platform focused on metrics management at scale. It accepts OpenTelemetry data through OTLP endpoints and supports Snappy compression for efficient data transfer. This post covers how to configure your application to send metrics directly to Chronosphere.

## Chronosphere OTLP Configuration

Chronosphere provides a tenant-specific endpoint for OTLP ingestion. The format is typically `<company>.chronosphere.io`. Authentication uses an API token in the request headers.

## Go Setup with Snappy Compression

```go
package main

import (
    "context"
    "log"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/sdk/resource"
    sdkmetric "go.opentelemetry.io/otel/sdk/metric"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

const (
    chronosphereEndpoint = "your-company.chronosphere.io:443"
    chronosphereAPIToken = "your-chronosphere-api-token"
)

func initChronosphereMetrics() (*sdkmetric.MeterProvider, error) {
    ctx := context.Background()

    exporter, err := otlpmetricgrpc.New(ctx,
        otlpmetricgrpc.WithEndpoint(chronosphereEndpoint),
        // API token authentication
        otlpmetricgrpc.WithHeaders(map[string]string{
            "API-Token": chronosphereAPIToken,
        }),
        // Use Snappy compression for efficient transfer
        // Snappy is faster than gzip with slightly lower compression ratio
        otlpmetricgrpc.WithCompressor("snappy"),
        // Timeout for each export
        otlpmetricgrpc.WithTimeout(30*time.Second),
        // Retry configuration
        otlpmetricgrpc.WithRetry(otlpmetricgrpc.RetryConfig{
            Enabled:         true,
            InitialInterval: 1 * time.Second,
            MaxInterval:     10 * time.Second,
            MaxElapsedTime:  60 * time.Second,
        }),
    )
    if err != nil {
        return nil, err
    }

    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName("payment-processor"),
            semconv.ServiceVersion("3.0.0"),
            semconv.DeploymentEnvironment("production"),
        ),
    )
    if err != nil {
        return nil, err
    }

    mp := sdkmetric.NewMeterProvider(
        sdkmetric.WithReader(
            sdkmetric.NewPeriodicReader(exporter,
                // Export every 15 seconds
                sdkmetric.WithInterval(15*time.Second),
            ),
        ),
        sdkmetric.WithResource(res),
    )

    otel.SetMeterProvider(mp)
    return mp, nil
}

func initChronosphereTracing() (*sdktrace.TracerProvider, error) {
    ctx := context.Background()

    exporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint(chronosphereEndpoint),
        otlptracegrpc.WithHeaders(map[string]string{
            "API-Token": chronosphereAPIToken,
        }),
        otlptracegrpc.WithCompressor("snappy"),
    )
    if err != nil {
        return nil, err
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
    )
    otel.SetTracerProvider(tp)
    return tp, nil
}
```

## Creating Metrics for Chronosphere

Chronosphere works best with well-structured metrics that follow naming conventions:

```go
func createApplicationMetrics() {
    meter := otel.Meter("payment-processor")

    // Request counter with useful labels
    requestCounter, _ := meter.Int64Counter(
        "payment.requests.total",
        metric.WithDescription("Total payment requests processed"),
    )

    // Request duration histogram
    requestDuration, _ := meter.Float64Histogram(
        "payment.request.duration",
        metric.WithDescription("Payment request processing duration"),
        metric.WithUnit("ms"),
    )

    // Active payments gauge
    activePayments, _ := meter.Int64UpDownCounter(
        "payment.active.count",
        metric.WithDescription("Number of payments currently being processed"),
    )

    // Use the metrics in your application
    ctx := context.Background()
    attrs := metric.WithAttributes(
        attribute.String("payment.method", "credit_card"),
        attribute.String("payment.currency", "USD"),
    )

    requestCounter.Add(ctx, 1, attrs)
    requestDuration.Record(ctx, 45.2, attrs)
    activePayments.Add(ctx, 1, attrs)
}
```

## Python Configuration

```python
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource

CHRONOSPHERE_ENDPOINT = "your-company.chronosphere.io:443"
CHRONOSPHERE_TOKEN = "your-chronosphere-api-token"

resource = Resource.create({
    "service.name": "order-service",
    "service.version": "2.0.0",
    "deployment.environment": "production",
})

# Configure with Snappy compression
exporter = OTLPMetricExporter(
    endpoint=CHRONOSPHERE_ENDPOINT,
    headers=(("api-token", CHRONOSPHERE_TOKEN),),
    compression=Compression.Gzip,  # Use gzip if Snappy not available in Python
    timeout=30,
)

reader = PeriodicExportingMetricReader(
    exporter,
    export_interval_millis=15000,  # 15 seconds
)

meter_provider = MeterProvider(resource=resource, metric_readers=[reader])
metrics.set_meter_provider(meter_provider)

# Create metrics
meter = metrics.get_meter("order-service")

order_counter = meter.create_counter(
    "orders.total",
    description="Total orders processed",
)

order_value = meter.create_histogram(
    "orders.value",
    description="Order value in cents",
    unit="cents",
)

# Record some data
order_counter.add(1, {"order.type": "standard", "region": "us-east"})
order_value.record(4999, {"order.type": "standard", "region": "us-east"})
```

## Environment Variables

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT="https://your-company.chronosphere.io:443"
export OTEL_EXPORTER_OTLP_HEADERS="API-Token=your-chronosphere-api-token"
export OTEL_EXPORTER_OTLP_COMPRESSION="snappy"
export OTEL_SERVICE_NAME="my-service"
export OTEL_METRIC_EXPORT_INTERVAL=15000
```

## Snappy vs Gzip Performance

Snappy compression is designed for speed rather than maximum compression:

| Property | Snappy | Gzip |
|---|---|---|
| Compression ratio | Moderate (50-60%) | High (70-80%) |
| Compression speed | Very fast | Moderate |
| Decompression speed | Very fast | Moderate |
| CPU usage | Low | Higher |

For metrics data that is exported every 15 seconds, Snappy's speed advantage usually outweighs the lower compression ratio. You send slightly more bytes but use less CPU time.

## Chronosphere Best Practices

When sending metrics to Chronosphere, follow these guidelines:
- Keep label cardinality low (avoid putting user IDs or request IDs in metric labels)
- Use consistent naming across services (`service.request.duration` not `req_dur`)
- Set appropriate export intervals (15-30 seconds for most metrics)
- Use histograms instead of computing percentiles client-side

Chronosphere's strength is high-cardinality metrics management. By sending well-structured OpenTelemetry metrics with Snappy compression, you get efficient ingestion and the ability to slice and dice your metrics data across any dimension.
