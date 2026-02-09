# How to Export OpenTelemetry Data to Sumo Logic Using the Sumo Logic Exporter with HTTP Source URL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Sumo Logic, Exporter, HTTP Source

Description: Configure the OpenTelemetry Collector to export traces, metrics, and logs to Sumo Logic via the dedicated Sumo Logic exporter.

Sumo Logic provides a dedicated exporter in the OpenTelemetry Collector contrib distribution. It uses HTTP Source URLs for authentication and data routing, which is the standard Sumo Logic ingestion pattern. Each signal type (traces, metrics, logs) gets its own HTTP Source URL, giving you fine-grained control over data routing and retention in Sumo Logic.

## Setting Up HTTP Source URLs in Sumo Logic

Before configuring the Collector, create HTTP Sources in Sumo Logic:

1. Go to Manage Data > Collection > Add Source
2. Select HTTP Logs & Metrics or HTTP Traces
3. Create three sources: one for logs, one for metrics, one for traces
4. Copy each source URL

Each URL contains an embedded authentication token, so no separate API key is needed.

## Collector Configuration

```yaml
# otel-collector-config.yaml

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Add source category and other Sumo Logic metadata
  resource:
    attributes:
      - key: _sourceCategory
        value: "prod/otel/myapp"
        action: upsert
      - key: _sourceHost
        value: "${HOSTNAME}"
        action: upsert

  # Source processor adds Sumo-specific attributes
  sumologic:
    # Translate OpenTelemetry attributes to Sumo Logic fields
    translate_attributes: true
    translate_telegraf_attributes: false

  batch:
    send_batch_size: 1024
    timeout: 5s

  memory_limiter:
    check_interval: 5s
    limit_mib: 512
    spike_limit_mib: 128

exporters:
  sumologic:
    # Base endpoint for your Sumo Logic deployment
    endpoint: https://endpoint1.collection.us2.sumologic.com

    # Separate source URLs per signal type
    log_format: otlp
    metric_format: otlp
    traces_endpoint: "${SUMO_TRACES_URL}"

    # Compression reduces bandwidth
    compress_encoding: gzip

    # Client configuration
    max_request_body_size: 1048576  # 1MB

    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000

    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resource, sumologic, batch]
      exporters: [sumologic]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, resource, sumologic, batch]
      exporters: [sumologic]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, resource, sumologic, batch]
      exporters: [sumologic]
```

## The Sumo Logic Processor

The `sumologic` processor translates standard OpenTelemetry attributes into Sumo Logic field conventions:

```yaml
processors:
  sumologic:
    translate_attributes: true
```

When enabled, it performs mappings like:

- `cloud.account.id` becomes `AccountId`
- `cloud.availability_zone` becomes `AvailabilityZone`
- `cloud.region` becomes `Region`
- `host.name` becomes `Host`

This makes your data queryable using Sumo Logic's built-in field names without manual field extraction rules.

## Using Source Categories for Data Routing

Sumo Logic uses source categories for organizing and searching data. Set them using resource attributes:

```yaml
processors:
  resource/prod:
    attributes:
      - key: _sourceCategory
        value: "production/api/traces"
        action: upsert
      - key: _sourceName
        value: "otel-collector"
        action: upsert
```

In Sumo Logic, you can then search with:

```
_sourceCategory=production/api/traces
| where service.name = "checkout-service"
```

## SDK Configuration for Direct-to-Sumo Export

If you want to send directly from your application without a Collector:

```go
// main.go
package main

import (
    "context"
    "os"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

func initTracer() (*sdktrace.TracerProvider, error) {
    ctx := context.Background()

    // Create OTLP HTTP exporter pointed at Sumo Logic
    exporter, err := otlptracehttp.New(ctx,
        otlptracehttp.WithEndpoint("endpoint1.collection.us2.sumologic.com"),
        otlptracehttp.WithHeaders(map[string]string{
            "X-Sumo-Fields": "_sourceCategory=prod/myapp/traces",
        }),
    )
    if err != nil {
        return nil, err
    }

    // Build resource with service metadata
    res, err := resource.Merge(
        resource.Default(),
        resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceName("my-service"),
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

func main() {
    tp, err := initTracer()
    if err != nil {
        panic(err)
    }
    defer tp.Shutdown(context.Background())

    tracer := otel.Tracer("my-service")
    ctx, span := tracer.Start(context.Background(), "main-operation")
    defer span.End()

    doWork(ctx)
}
```

## Handling Multiple Environments

For organizations with staging and production environments sending to the same Sumo Logic account, use source categories to separate them:

```yaml
# Production Collector
processors:
  resource:
    attributes:
      - key: _sourceCategory
        value: "prod/${service.name}/otel"
        action: upsert

# Staging Collector
processors:
  resource:
    attributes:
      - key: _sourceCategory
        value: "staging/${service.name}/otel"
        action: upsert
```

## Verifying Data in Sumo Logic

After starting the Collector, open the Sumo Logic log search and query:

```
_sourceCategory=prod/otel/*
```

For traces, navigate to the Tracing tab and search for your service name. Traces should appear within a minute or two of being sent.

If data is not showing up, check the Collector logs for HTTP 4xx or 5xx responses from Sumo Logic. A 401 usually means the source URL is invalid, while a 429 means you are hitting rate limits and should reduce the batch size or add backoff in the retry configuration.
