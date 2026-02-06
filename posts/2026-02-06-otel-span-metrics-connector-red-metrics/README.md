# How to Use the Span Metrics Connector to Generate RED Metrics (Rate, Error, Duration) from Trace Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Span Metrics, RED Metrics, Collector, Traces

Description: Generate RED metrics (Rate, Error, Duration) automatically from your OpenTelemetry trace data using the Span Metrics Connector.

Instrumenting your application for both traces and metrics means maintaining two separate instrumentation paths. But what if you could derive your most important metrics directly from your trace data? The OpenTelemetry Collector's Span Metrics Connector does exactly this. It watches your trace pipeline and generates Rate, Error, and Duration (RED) metrics automatically from every span that flows through the collector.

## What Are RED Metrics?

RED metrics are the three golden signals for request-driven services:

- **Rate**: How many requests per second is the service handling?
- **Error**: What percentage of those requests are failing?
- **Duration**: How long do requests take? (Usually expressed as a histogram for percentile calculations)

These three metrics tell you the health of any service at a glance. If rate drops, something is blocking requests. If errors spike, something is broken. If duration increases, something is slow.

## Setting Up the Span Metrics Connector

The Span Metrics Connector sits between your trace pipeline and your metric pipeline in the collector. It reads spans, extracts RED metrics, and feeds them into the metric export pipeline.

Here is the collector configuration:

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
      http:
        endpoint: "0.0.0.0:4318"

connectors:
  # The spanmetrics connector reads from the trace pipeline
  # and produces metrics for the metric pipeline
  spanmetrics:
    # Histogram configuration for duration metrics
    histogram:
      explicit:
        buckets: [2ms, 5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s]

    # Dimensions to include as metric labels
    dimensions:
      - name: http.request.method
      - name: http.response.status_code
      - name: http.route
      - name: rpc.method
      - name: rpc.service

    # Exclude high-cardinality dimensions that would explode metric series
    exclude_dimensions:
      - "url.full"
      - "http.url"
      - "db.statement"

    # Metric names
    metrics_flush_interval: 15s

    # Namespace prefix for generated metrics
    namespace: "traces.spanmetrics"

processors:
  batch:
    send_batch_size: 1024
    timeout: 5s

  # Optional: add resource attributes as metric labels
  resource/metrics:
    attributes:
      - key: service.name
        action: upsert
      - key: deployment.environment
        action: upsert

exporters:
  # Traces go to Tempo (or your trace backend)
  otlp/traces:
    endpoint: "http://tempo:4317"
    tls:
      insecure: true

  # Metrics (including generated RED metrics) go to Prometheus/Mimir
  prometheusremotewrite:
    endpoint: "http://mimir:9009/api/v1/push"

service:
  pipelines:
    # Trace pipeline: receives spans and sends to both the exporter AND the connector
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/traces, spanmetrics]

    # Metric pipeline: receives from both OTLP (app metrics) and spanmetrics connector
    metrics:
      receivers: [otlp, spanmetrics]
      processors: [resource/metrics, batch]
      exporters: [prometheusremotewrite]
```

Notice the key wiring: in the traces pipeline, `spanmetrics` appears as an exporter. In the metrics pipeline, `spanmetrics` appears as a receiver. The connector bridges the two.

## Generated Metrics

The Span Metrics Connector generates three metrics by default:

```
# Request rate (counter) - incremented for each span
traces.spanmetrics.calls_total{
  service.name="checkout-service",
  span.name="POST /api/checkout",
  span.kind="SPAN_KIND_SERVER",
  http.request.method="POST",
  http.response.status_code="200",
  status.code="STATUS_CODE_OK"
}

# Error rate (counter) - incremented for spans with error status
traces.spanmetrics.calls_total{
  ...
  status.code="STATUS_CODE_ERROR"
}

# Duration histogram
traces.spanmetrics.duration_seconds_bucket{
  service.name="checkout-service",
  span.name="POST /api/checkout",
  ...
  le="0.1"
}
```

## Querying RED Metrics in PromQL

Once the metrics are in Prometheus or Mimir, query them like any other metrics:

```promql
# Request rate per service
sum(rate(traces_spanmetrics_calls_total[5m])) by (service_name, span_name)

# Error rate as a percentage
sum(rate(traces_spanmetrics_calls_total{status_code="STATUS_CODE_ERROR"}[5m])) by (service_name)
/
sum(rate(traces_spanmetrics_calls_total[5m])) by (service_name)
* 100

# p99 latency
histogram_quantile(0.99,
  sum(rate(traces_spanmetrics_duration_seconds_bucket[5m])) by (le, service_name, span_name)
)

# p50 latency
histogram_quantile(0.50,
  sum(rate(traces_spanmetrics_duration_seconds_bucket[5m])) by (le, service_name, span_name)
)
```

## Controlling Cardinality

The biggest risk with span-derived metrics is cardinality explosion. If span names include variable path segments (like `/users/12345` instead of `/users/{id}`), you will create a unique metric series for every user ID.

Control this in the connector config:

```yaml
connectors:
  spanmetrics:
    # Only include specific dimensions
    dimensions:
      - name: http.request.method
      - name: http.response.status_code
      - name: http.route         # use route template, not raw path

    # Explicitly exclude high-cardinality fields
    dimensions_cache_size: 1000  # limit number of unique dimension combinations

    # Aggregate spans with similar attributes
    aggregation_temporality: "AGGREGATION_TEMPORALITY_CUMULATIVE"
```

Also make sure your application uses parameterized route names:

```python
# Good: uses route template
# span.name = "GET /users/{id}"
# attribute: http.route = "/users/{id}"

# Bad: uses actual path
# span.name = "GET /users/12345"
# attribute: http.route = "/users/12345"
```

## Combining with Application Metrics

The Span Metrics Connector does not replace application-level metrics. It supplements them. Your application should still emit business metrics (order count, revenue, inventory levels) directly. The span-derived RED metrics cover the operational view of request handling.

```yaml
# Both sources feed into the same metric pipeline
service:
  pipelines:
    metrics:
      receivers:
        - otlp          # application-emitted metrics
        - spanmetrics    # trace-derived RED metrics
      processors: [batch]
      exporters: [prometheusremotewrite]
```

## Wrapping Up

The Span Metrics Connector gives you RED metrics for free from your existing trace data. You stop maintaining separate metric instrumentation for request rate, error rate, and duration histograms. Configure the connector in your collector, control cardinality with explicit dimension lists, and query the generated metrics in PromQL. It is one of the most practical examples of multi-signal correlation in OpenTelemetry, using one signal type (traces) to automatically derive another (metrics).
