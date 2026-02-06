# How to Use OpenTelemetry Span Metrics to Derive Availability and Latency SLIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Span Metrics, SLI, Traces

Description: Derive availability and latency SLIs from OpenTelemetry span data using the span metrics connector in the collector.

Most SLI implementations start with manually instrumented counters and histograms. But if your services already produce OpenTelemetry traces, you have a rich data source that can generate SLI metrics automatically. The OpenTelemetry Collector's span metrics connector extracts request counts, error counts, and duration distributions from trace spans - giving you SLI metrics without adding a single line of instrumentation code to your application.

## Why Derive SLIs from Spans

There are several practical reasons to derive SLIs from span data rather than (or in addition to) direct metric instrumentation:

- **Automatic coverage**: Every traced operation gets SLI metrics without explicit counter/histogram code
- **Consistency**: The same data source feeds both your tracing and SLI pipelines, eliminating discrepancies
- **Rich dimensions**: Spans carry attributes like HTTP method, route, status code, and custom business dimensions that become metric labels automatically
- **Retroactive SLIs**: You can add new SLI dimensions by updating the collector config, without redeploying application code

## The Span Metrics Connector

The span metrics connector sits inside the OpenTelemetry Collector and processes trace data to produce metrics. It generates three metric types from spans:

1. `calls` - a counter of span completions (total requests and errors)
2. `duration` - a histogram of span durations
3. `events` - a counter of span events (optional)

Here is a complete collector configuration that derives SLI metrics from spans.

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
      http:
        endpoint: "0.0.0.0:4318"

connectors:
  spanmetrics:
    # Configure histogram buckets aligned to SLO thresholds
    histogram:
      explicit:
        buckets: [5ms, 10ms, 25ms, 50ms, 100ms, 200ms, 500ms, 1s, 2.5s, 5s, 10s]
    # Dimensions become Prometheus labels on the derived metrics
    dimensions:
      - name: service.name
      - name: http.method
      - name: http.route
      - name: http.status_code
    # Only derive metrics from server spans (entry points)
    # This avoids double-counting in service meshes
    dimensions_cache_size: 1000
    aggregation_temporality: "AGGREGATION_TEMPORALITY_CUMULATIVE"
    metrics_flush_interval: 15s

exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
    resource_to_telemetry_conversion:
      enabled: true

  # Also export traces to your tracing backend
  otlp/traces:
    endpoint: "jaeger:4317"
    tls:
      insecure: true

service:
  pipelines:
    # Traces flow in through OTLP and out to both spanmetrics and Jaeger
    traces:
      receivers: [otlp]
      exporters: [spanmetrics, otlp/traces]
    # Span-derived metrics flow from the connector to Prometheus
    metrics:
      receivers: [spanmetrics]
      exporters: [prometheus]
```

## Querying Span-Derived Availability SLIs

The span metrics connector produces `calls_total` with a `status_code` label. OpenTelemetry span status codes are `STATUS_CODE_UNSET`, `STATUS_CODE_OK`, and `STATUS_CODE_ERROR`. You can derive availability from this.

```promql
# Availability SLI from span metrics
# Calculated as: 1 - (error calls / total calls)
1 - (
  sum(rate(calls_total{service_name="checkout-service", status_code="STATUS_CODE_ERROR"}[5m]))
  /
  sum(rate(calls_total{service_name="checkout-service"}[5m]))
)
```

For a more granular view by HTTP route:

```promql
# Per-route availability - helps identify which endpoints drag down overall SLI
1 - (
  sum by (http_route) (
    rate(calls_total{service_name="checkout-service", status_code="STATUS_CODE_ERROR"}[5m])
  )
  /
  sum by (http_route) (
    rate(calls_total{service_name="checkout-service"}[5m])
  )
)
```

## Querying Span-Derived Latency SLIs

The `duration_milliseconds` histogram gives you latency distribution data identical to what you would get from manual histogram instrumentation.

```promql
# Latency SLI: fraction of requests under 200ms
sum(rate(duration_milliseconds_bucket{service_name="checkout-service", le="200"}[5m]))
/
sum(rate(duration_milliseconds_count{service_name="checkout-service"}[5m]))

# p99 latency from span-derived histograms
histogram_quantile(0.99,
  sum by (le) (
    rate(duration_milliseconds_bucket{service_name="checkout-service"}[5m])
  )
)
```

## Filtering Spans for Accurate SLIs

Not all spans should contribute to SLIs. Internal retries, health checks, and middleware spans can skew your numbers. Use the collector's filter processor to exclude irrelevant spans before they reach the span metrics connector.

```yaml
processors:
  filter/sli:
    error_mode: ignore
    traces:
      span:
        # Exclude health check endpoints
        - 'attributes["http.route"] == "/health"'
        - 'attributes["http.route"] == "/ready"'
        # Exclude internal retry spans
        - 'attributes["retry.attempt"] != nil'

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [filter/sli]
      exporters: [spanmetrics, otlp/traces]
```

## Combining Span Metrics with Direct Metrics

In many architectures, you will have both direct OpenTelemetry metrics and span-derived metrics. They complement each other well.

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

connectors:
  spanmetrics:
    histogram:
      explicit:
        buckets: [5ms, 10ms, 25ms, 50ms, 100ms, 200ms, 500ms, 1s]

exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [spanmetrics]
    # Direct application metrics AND span-derived metrics both flow to Prometheus
    metrics:
      receivers: [otlp, spanmetrics]
      exporters: [prometheus]
```

## Recording Rules for Span-Derived SLIs

Pre-compute your span-derived SLIs with recording rules, just as you would with direct metrics.

```yaml
# prometheus-rules/span-sli-recording.yaml
groups:
  - name: span_derived_sli
    interval: 30s
    rules:
      # Span-derived availability SLI
      - record: sli:span:availability:5m
        expr: |
          1 - (
            sum by (service_name) (rate(calls_total{status_code="STATUS_CODE_ERROR"}[5m]))
            /
            sum by (service_name) (rate(calls_total[5m]))
          )

      # Span-derived latency SLI (200ms threshold)
      - record: sli:span:latency_200ms:5m
        expr: |
          sum by (service_name) (rate(duration_milliseconds_bucket{le="200"}[5m]))
          /
          sum by (service_name) (rate(duration_milliseconds_count[5m]))
```

## When to Use Span Metrics vs Direct Metrics

Direct metric instrumentation gives you precise control over what is measured and when. Span metrics give you broad, automatic coverage. Use direct metrics when you need custom business-level SLIs (like "fraction of payments successfully processed") that require application logic to determine success. Use span metrics when you need standard HTTP availability and latency SLIs across many services without instrumenting each one individually.

The span metrics approach scales well for organizations with dozens or hundreds of microservices. Rather than ensuring every team instruments SLI counters correctly, you get consistent metrics from traces that are already being collected. For more on defining SLIs with direct metrics, see the post at https://oneuptime.com/blog/post/2026-02-06-sli-opentelemetry-metrics/view.
