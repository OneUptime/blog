# How to Convert Spans to Metrics Using the Span Metrics Connector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Span Metrics, Trace, Metric, RED Metrics, Observability

Description: Master the Span Metrics connector in OpenTelemetry Collector to automatically generate RED metrics and custom measurements from distributed traces for comprehensive service monitoring.

The Span Metrics connector is one of the most valuable components in the OpenTelemetry Collector, automatically generating metrics from trace spans. This connector eliminates the need for duplicate instrumentation, allowing you to derive RED (Rate, Error, Duration) metrics directly from your traces. The result is consistent metrics that perfectly align with your trace data, reducing instrumentation overhead and ensuring your metrics and traces tell the same story.

## Understanding the Span Metrics Connector

The Span Metrics connector processes each span in your traces and generates corresponding metric data points. For every span that passes through the connector, it extracts key information such as duration, status, and attributes, then aggregates this data into time-series metrics.

Unlike traditional metric instrumentation where you manually track counters and histograms in your application code, the Span Metrics connector derives these metrics automatically from the detailed trace data you're already collecting. This approach provides several advantages: reduced instrumentation effort, guaranteed consistency between traces and metrics, and the ability to add new dimensions without code changes.

## Core Capabilities

The Span Metrics connector provides these fundamental capabilities:

**Duration Histograms**: Automatically creates latency histograms from span durations, allowing you to calculate percentiles and understand latency distribution.

**Request Counting**: Generates counters tracking the total number of requests (spans) processed.

**Error Tracking**: Includes span status as a metric dimension, enabling error rate calculations from the generated calls metric.

**Custom Dimensions**: Extracts span attributes as metric dimensions, allowing detailed slicing and filtering.

**Flexible Aggregation**: Configures aggregation windows, histogram buckets, and dimension sets to match your monitoring needs.

## Basic Span Metrics Configuration

Here's a foundational configuration to start generating metrics from spans:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

connectors:
  span_metrics:
    # Configure histogram buckets for duration metrics
    histogram:
      explicit:
        buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s]

    # Define which span attributes become metric dimensions
    dimensions:
      - name: http.request.method
      - name: http.response.status_code

exporters:
  otlp/traces:
    endpoint: jaeger:4317

  prometheus_remote_write:
    endpoint: http://prometheus:9090/api/v1/write

service:
  pipelines:
    # Traces pipeline feeds the connector
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [span_metrics, otlp/traces]

    # Metrics pipeline receives generated metrics
    metrics:
      receivers: [span_metrics]
      processors: [batch]
      exporters: [prometheus_remote_write]
```

This configuration generates duration histograms and request counts for all spans, tagged with service name, span kind, HTTP method, and status code.

## Generated Metrics Explained

The Span Metrics connector generates these key metrics:

**Duration Histogram**: `traces.span.metrics.duration` tracks the distribution of span durations. When exported to Prometheus, this histogram is normalized to names such as `traces_span_metrics_duration_bucket`. This histogram allows you to calculate percentiles like p50, p95, and p99 latency.

**Call Count**: `traces.span.metrics.calls` counts the total number of spans processed. When exported to Prometheus, this sum is typically exposed as `traces_span_metrics_calls_total`, enabling request rate calculations.

**Error Count**: Error counts are calculated from the calls metric by filtering for spans where the `status.code` dimension is `Error`.

The exact Prometheus names depend on your namespace and the exporter normalization rules, but the underlying data provides consistent request, error, and duration tracking.

## Configuration Flow Architecture

Understanding the data flow helps clarify the transformation:

```mermaid
graph TB
    A[Incoming Span] --> B[Span Metrics Connector]
    B --> C[Duration Extraction]
    B --> D[Attribute Extraction]
    B --> E[Status Analysis]
    C --> F[Histogram Generation]
    D --> G[Dimension Mapping]
    E --> H[Error Classification]
    F --> I[Metrics Aggregator]
    G --> I
    H --> I
    I --> J[Metrics Pipeline]
```

Each span is analyzed, its properties extracted, and aggregated into metrics that flow into downstream pipelines.

## Configuring Dimensions

Dimensions (labels) are critical for making your metrics useful. The Span Metrics connector allows you to extract any span attribute as a metric dimension:

```yaml
connectors:
  span_metrics/detailed:
    histogram:
      explicit:
        buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s]

    dimensions:
      # Resource attributes
      - name: service.namespace
      - name: service.version
      - name: deployment.environment

      # Span attributes
      - name: http.request.method
      - name: http.route
      - name: http.response.status_code
        default: "unknown"
      - name: url.scheme

      # Database spans
      - name: db.system
        default: "none"
      - name: db.operation
      - name: db.name

      # RPC spans
      - name: rpc.system
      - name: rpc.service
      - name: rpc.method
```

Choose dimensions carefully. Too many high-cardinality dimensions (like user IDs or trace IDs) can create millions of unique metric series, overwhelming your storage backend.

## Histogram Bucket Configuration

Histogram buckets determine the resolution of your latency metrics. Configure them based on your service characteristics:

```yaml
connectors:
  # Fast APIs and microservices
  span_metrics/fast-api:
    histogram:
      explicit:
        buckets: [1ms, 5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s]

  # Standard web services
  span_metrics/web-services:
    histogram:
      explicit:
        buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s]

  # Batch processing or slow external APIs
  span_metrics/batch-processing:
    histogram:
      explicit:
        buckets: [100ms, 500ms, 1s, 5s, 10s, 30s, 60s, 120s, 300s, 600s]

  # Mixed workload with exponential buckets
  span_metrics/exponential:
    histogram:
      exponential:
        max_size: 160
```

The explicit bucket configuration is most common, but exponential histograms provide dynamic bucket sizing that adapts to your data distribution.

## Filtering Spans for Metric Generation

You can selectively generate metrics from specific spans using processors:

```yaml
processors:
  # Drop non-server spans
  filter/server-spans:
    error_mode: ignore
    trace_conditions:
      - 'span.kind != SPAN_KIND_SERVER'

  # Exclude health checks
  filter/no-health:
    error_mode: ignore
    trace_conditions:
      - 'span.attributes["http.route"] == "/health"'
      - 'span.attributes["http.route"] == "/readiness"'

  # Drop non-production traffic
  filter/production:
    error_mode: ignore
    trace_conditions:
      - 'resource.attributes["deployment.environment"] != "production"'

  # Exclude fast database queries
  filter/slow-db:
    error_mode: ignore
    trace_conditions:
      - 'span.attributes["db.system"] != nil and (span.end_time - span.start_time) < Duration("100ms")'

connectors:
  span_metrics:
    histogram:
      explicit:
        buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s]
    dimensions:
      - name: http.request.method

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [filter/server-spans, filter/no-health, batch]
      exporters: [span_metrics, otlp/traces]

    metrics:
      receivers: [span_metrics]
      exporters: [prometheus_remote_write]
```

Filtering drops spans before they reach the connector, reducing the volume of metrics generated and focusing on relevant spans while controlling cardinality and storage costs.

## Configuring Metrics Namespace

Control the naming of generated metrics with namespace configuration:

```yaml
connectors:
  span_metrics:
    histogram:
      explicit:
        buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s]

    dimensions:
      - name: http.request.method

    # Prefix all generated metrics
    namespace: traces.span.metrics

```

This generates metrics like `traces_span_metrics_duration_bucket` and `traces_span_metrics_calls_total` after Prometheus normalization, making it clear these metrics originated from span data.

## Aggregation Temporal Configuration

Control how spans are aggregated over time:

```yaml
connectors:
  span_metrics/temporal:
    histogram:
      explicit:
        buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s]

    dimensions:
      - name: http.request.method

    # Configure aggregation behavior
    aggregation_temporality: AGGREGATION_TEMPORALITY_CUMULATIVE

    # How long to wait before emitting metrics
    metrics_flush_interval: 60s

    # How long to keep metric state for inactive dimensions
    metrics_expiration: 5m
```

Cumulative temporality is standard for Prometheus, while delta temporality suits some other backends. The flush interval determines how often metrics are emitted, and expiration controls when metrics for inactive dimension combinations are removed.

## Calculating Error Rates

Use the `status.code` dimension on the generated calls metric for easier alerting:

```yaml
connectors:
  span_metrics/with-errors:
    histogram:
      explicit:
        buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s]

    dimensions:
      - name: http.request.method
      - name: http.response.status_code

```

This keeps error counts in the calls metric, making it easy to calculate error rates and create alerts by filtering for `status.code="Error"` or HTTP status-code dimensions.

## Multi-Environment Configuration

Generate separate metrics for different environments or service tiers:

```yaml
processors:
  # Add environment tags
  resource/production:
    attributes:
      - key: deployment.environment
        value: "production"
        action: insert

  resource/staging:
    attributes:
      - key: deployment.environment
        value: "staging"
        action: insert

connectors:
  # Production metrics with detailed buckets
  span_metrics/production:
    histogram:
      explicit:
        buckets: [5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s]
    dimensions:
      - name: deployment.environment
      - name: http.request.method
      - name: http.response.status_code
    namespace: prod.spans

  # Staging metrics with coarser buckets
  span_metrics/staging:
    histogram:
      explicit:
        buckets: [100ms, 500ms, 1s, 5s, 10s]
    dimensions:
      - name: deployment.environment
      - name: http.request.method
    namespace: staging.spans

exporters:
  prometheus_remote_write/production:
    endpoint: http://prometheus-prod:9090/api/v1/write

  prometheus_remote_write/staging:
    endpoint: http://prometheus-staging:9090/api/v1/write

service:
  pipelines:
    traces/production:
      receivers: [otlp]
      processors: [resource/production, batch]
      exporters: [span_metrics/production]

    traces/staging:
      receivers: [otlp]
      processors: [resource/staging, batch]
      exporters: [span_metrics/staging]

    metrics/production:
      receivers: [span_metrics/production]
      exporters: [prometheus_remote_write/production]

    metrics/staging:
      receivers: [span_metrics/staging]
      exporters: [prometheus_remote_write/staging]
```

This separates production and staging metrics, allowing different retention policies, aggregation levels, and alerting thresholds.

## Adding Business Dimensions

Beyond standard RED metrics, add business-specific dimensions from spans:

```yaml
connectors:
  span_metrics/business:
    histogram:
      explicit:
        buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s]

    dimensions:
      # Standard dimensions
      - name: http.request.method

      # Business dimensions from span attributes
      - name: customer.tier
      - name: product.category
      - name: payment.method
      - name: region
      - name: promotion.code

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [span_metrics/business]

    metrics/business:
      receivers: [span_metrics/business]
      exporters: [prometheus_remote_write]
```

This lets you slice span-derived request and duration metrics by business dimensions like customer tier, product category, and payment method. Numeric business metrics such as transaction amount still require normal metric instrumentation or another telemetry transformation designed for that purpose.

## Combining with Other Connectors

Use multiple connectors for comprehensive observability:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

connectors:
  # Generate detailed span metrics
  span_metrics:
    histogram:
      explicit:
        buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s]
    dimensions:
      - name: http.request.method
      - name: http.route
      - name: http.response.status_code

  # Generate service dependency graph
  service_graph:
    store:
      max_items: 10000
      ttl: 5s
    latency_histogram_buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s]
    dimensions:
      - service.name

exporters:
  otlp/traces:
    endpoint: jaeger:4317

  prometheus_remote_write:
    endpoint: http://prometheus:9090/api/v1/write

service:
  pipelines:
    # Traces feed both connectors
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [span_metrics, service_graph, otlp/traces]

    # Span metrics
    metrics/spans:
      receivers: [span_metrics]
      exporters: [prometheus_remote_write]

    # Service graph metrics
    metrics/graph:
      receivers: [service_graph]
      exporters: [prometheus_remote_write]
```

This combination provides both detailed per-endpoint metrics (from span_metrics) and service-to-service communication metrics (from service_graph).

## Real-World Example: Microservices Platform

Here's a comprehensive configuration for a production microservices platform:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Resource detection
  resourcedetection:
    detectors: [env, system, docker, kubernetes]
    timeout: 5s

  # Memory limiter
  memory_limiter:
    check_interval: 1s
    limit_mib: 1024

  # Batch processing
  batch:
    timeout: 10s
    send_batch_size: 1024

  # Filter out noise
  filter/meaningful:
    error_mode: ignore
    trace_conditions:
      - 'span.attributes["http.route"] == "/health"'
      - 'span.attributes["http.route"] == "/metrics"'
      - 'span.attributes["http.route"] == "/readiness"'
      - 'span.attributes["http.route"] == "/liveness"'

  # Normalize attributes
  transform/normalize:
    trace_statements:
      - context: span
        statements:
          # Normalize HTTP status codes to classes
          - set(attributes["http.response.status_class"], "2xx") where attributes["http.response.status_code"] >= 200 and attributes["http.response.status_code"] < 300
          - set(attributes["http.response.status_class"], "3xx") where attributes["http.response.status_code"] >= 300 and attributes["http.response.status_code"] < 400
          - set(attributes["http.response.status_class"], "4xx") where attributes["http.response.status_code"] >= 400 and attributes["http.response.status_code"] < 500
          - set(attributes["http.response.status_class"], "5xx") where attributes["http.response.status_code"] >= 500

connectors:
  # Detailed span metrics
  span_metrics/detailed:
    histogram:
      explicit:
        buckets: [5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s, 30s]

    dimensions:
      # Service identification
      - name: service.namespace
      - name: service.version

      # Request characteristics
      - name: http.request.method
      - name: http.route
      - name: http.response.status_class
      - name: url.scheme

      # Infrastructure
      - name: k8s.cluster.name
      - name: k8s.namespace.name
      - name: deployment.environment

      # Database operations
      - name: db.system
      - name: db.operation

    # Metric naming
    namespace: platform.spans

    # Aggregation
    aggregation_temporality: AGGREGATION_TEMPORALITY_CUMULATIVE
    metrics_flush_interval: 30s
    metrics_expiration: 5m

  # Aggregated metrics for dashboards
  span_metrics/aggregated:
    histogram:
      explicit:
        buckets: [100ms, 500ms, 1s, 5s, 10s]

    dimensions:
      - name: service.namespace
      - name: deployment.environment
      - name: http.response.status_class

    namespace: platform.aggregated
    metrics_flush_interval: 60s

exporters:
  # Export traces to Tempo
  otlp/tempo:
    endpoint: tempo:4317
    compression: gzip
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000

  # Detailed metrics to Prometheus
  prometheus_remote_write/detailed:
    endpoint: http://prometheus:9090/api/v1/write
    compression: snappy
    external_labels:
      cluster: production
      detail_level: high

  # Aggregated metrics to long-term storage
  prometheus_remote_write/aggregated:
    endpoint: http://prometheus-longterm:9090/api/v1/write
    compression: snappy
    external_labels:
      cluster: production
      detail_level: aggregate

service:
  telemetry:
    logs:
      level: info
    metrics:
      level: detailed
      readers:
        - pull:
            exporter:
              prometheus:
                host: 0.0.0.0
                port: 8888

  pipelines:
    # Main traces pipeline
    traces/platform:
      receivers: [otlp]
      processors:
        - memory_limiter
        - resourcedetection
        - filter/meaningful
        - transform/normalize
        - batch
      exporters: [span_metrics/detailed, span_metrics/aggregated, otlp/tempo]

    # Detailed metrics pipeline
    metrics/detailed:
      receivers: [span_metrics/detailed]
      processors: [batch]
      exporters: [prometheus_remote_write/detailed]

    # Aggregated metrics pipeline
    metrics/aggregated:
      receivers: [span_metrics/aggregated]
      processors: [batch]
      exporters: [prometheus_remote_write/aggregated]
```

This configuration creates comprehensive span-derived metrics with both detailed and aggregated views, suitable for real-time monitoring and long-term analysis.

## Querying Generated Metrics

Once metrics are exported to Prometheus, you can query them for analysis and alerting:

```promql
# Request rate per service

rate(platform_spans_calls_total[5m])

# P95 latency by service and route
histogram_quantile(0.95,
  sum by (service_name, http_route, le) (
    rate(platform_spans_duration_bucket[5m])
  )
)

# Error rate percentage
(
  rate(platform_spans_calls_total{http_response_status_class="5xx"}[5m])
  /
  rate(platform_spans_calls_total[5m])
) * 100

# Services with highest latency
topk(5,
  histogram_quantile(0.99,
    sum by (service_name, le) (
      rate(platform_spans_duration_bucket[5m])
    )
  )
)

# Throughput by HTTP method
sum by (http_request_method) (rate(platform_spans_calls_total[5m]))
```

These queries enable powerful dashboards and alerts based on your span-derived metrics.

## Performance Optimization

The Span Metrics connector maintains state for aggregation. Optimize performance with these strategies:

**Control Cardinality**: Limit dimensions to essential attributes. Avoid high-cardinality dimensions like user IDs, trace IDs, or request IDs.

```yaml
connectors:
  span_metrics/optimized:
    histogram:
      explicit:
        buckets: [100ms, 500ms, 1s, 5s, 10s]  # Fewer buckets

    dimensions:
      # Keep dimensions limited
      - name: http.request.method
      - name: http.response.status_class  # Use class, not exact code
      # Avoid:
      # - name: url.full  # High cardinality
      # - name: user.id  # High cardinality
      # - name: trace.id  # High cardinality
```

**Use Sampling Carefully**: For high-volume services, sample trace export separately from metric generation so request counts and latency histograms are based on unsampled spans:

```yaml
processors:
  probabilistic_sampler:
    sampling_percentage: 10.0

connectors:
  span_metrics:
    histogram:
      explicit:
        buckets: [100ms, 500ms, 1s, 5s, 10s]

service:
  pipelines:
    traces/metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [span_metrics]

    traces/sampled-export:
      receivers: [otlp]
      processors: [probabilistic_sampler, batch]
      exporters: [otlp/traces]

    metrics:
      receivers: [span_metrics]
      exporters: [prometheus_remote_write]
```

**Adjust Flush Intervals**: Longer flush intervals reduce metric update frequency and overhead:

```yaml
connectors:
  span_metrics:
    metrics_flush_interval: 60s  # Update metrics every 60 seconds
```

## Monitoring Span Metrics Generation

Track the health of your Span Metrics connector:

```yaml
service:
  telemetry:
    logs:
      level: info
    metrics:
      level: detailed
      readers:
        - pull:
            exporter:
              prometheus:
                host: 0.0.0.0
                port: 8888
```

Monitor these internal metrics:

- `otelcol_receiver_accepted_spans`: Number of spans accepted by the collector.
- `otelcol_exporter_sent_metric_points`: Number of metric points successfully exported.
- `otelcol_exporter_send_failed_metric_points`: Number of metric points that failed to export.

If the number of generated series grows unexpectedly in your metrics backend, you have a cardinality problem. Review your dimensions and add filtering.

## Troubleshooting Common Issues

**No Metrics Generated**: Verify that spans are reaching the connector and that your metrics pipeline uses the connector as a receiver. Missing optional dimension attributes are omitted unless you configure a `default` value.

**High Memory Usage**: Reduce dimensions, add filtering, configure an aggregation cardinality limit, or increase the flush interval to reduce the number of unique metric series.

**Metrics Don't Match Traces**: Ensure you're not filtering traces differently than you filter for metric generation. Inconsistent filtering creates discrepancies.

**Missing Dimension Values**: Use the `default` field on dimension entries to provide fallback values for optional attributes.

## Related Resources

For more information about connectors and metrics generation:

- [How to Use Connectors to Link Traces and Metrics Pipelines](https://oneuptime.com/blog/post/2026-02-06-connectors-link-traces-metrics-pipelines-opentelemetry/view)
- [How to Generate Service Graph Metrics from Traces in the Collector](https://oneuptime.com/blog/post/2026-02-06-generate-service-graph-metrics-traces-collector/view)
- [How to Configure the Signal to Metrics Connector in the OpenTelemetry Collector](https://oneuptime.com/blog/post/2026-02-06-signal-to-metrics-connector-opentelemetry-collector/view)

The Span Metrics connector eliminates duplicate instrumentation, ensures consistency between traces and metrics, and enables you to derive comprehensive monitoring metrics automatically from your distributed traces.
