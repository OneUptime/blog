# How to Use Connectors to Link Traces and Metrics Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Connector, Trace, Metric, Pipeline Architecture

Description: Master the art of linking traces and metrics pipelines in OpenTelemetry Collector using connectors to create unified observability workflows and derive metrics from traces.

Connectors in the OpenTelemetry Collector represent a paradigm shift in how we process and correlate telemetry data. Unlike traditional receivers and exporters that communicate with external systems, connectors link pipelines within the same Collector instance, enabling sophisticated data transformations and correlations. This capability is particularly powerful when linking traces and metrics pipelines, allowing you to derive metrics from traces, add trace context to generated metrics, and create unified observability workflows.

## Understanding Connectors in OpenTelemetry

Connectors serve as both an exporter and a receiver simultaneously. They act as the endpoint for one pipeline while serving as the starting point for another. This dual nature enables data to flow between pipelines, allowing transformations, aggregations, and correlations that would otherwise require external systems or complex routing.

When linking traces and metrics pipelines, connectors enable several critical capabilities:

**Metric Generation from Traces**: Automatically derive RED (Rate, Error, Duration) metrics from trace data without separate instrumentation.

**Trace Context in Metrics**: Enrich metric data with trace identifiers for correlation in analysis tools.

**Multi-Signal Processing**: Process traces and metrics in coordinated workflows where each signal informs the other.

**Pipeline Orchestration**: Create complex data flows where trace processing triggers metric generation, which may then trigger additional processing.

## Connector Architecture and Data Flow

Understanding how connectors fit into the Collector architecture is essential:

```mermaid
graph TB
    subgraph Input
    A[OTLP Receiver] --> B[Traces Pipeline]
    end

    subgraph Connector Layer
    B --> C[Span Metrics Connector]
    B --> D[Service Graph Connector]
    end

    subgraph Output
    C --> E[Metrics Pipeline 1]
    D --> F[Metrics Pipeline 2]
    B --> G[Trace Exporter]
    E --> H[Metrics Backend]
    F --> H
    end
```

Traces enter through a receiver, flow through a trace pipeline, and then feed into connectors. These connectors generate metrics that enter metrics pipelines, while the original traces continue to their own exporters.

## Basic Trace to Metrics Connection

The most common use case is generating metrics from traces. Here's a foundational configuration:

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
  # Span metrics connector generates metrics from traces
  span_metrics:
    # Define histogram buckets for latency metrics
    histogram:
      explicit:
        buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s]

    # Define dimensions for generated metrics
    dimensions:
      - name: http.method
      - name: http.status_code

    # Configure metric names
    namespace: traces.span.metrics

exporters:
  # Export traces to Jaeger
  otlp/traces:
    endpoint: jaeger:4317
    tls:
      insecure: true

  # Export metrics to Prometheus
  prometheusremotewrite:
    endpoint: http://prometheus:9090/api/v1/write

service:
  pipelines:
    # Traces pipeline feeds the connector
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [span_metrics, otlp/traces]

    # Metrics pipeline receives from connector
    metrics:
      receivers: [span_metrics]
      processors: [batch]
      exporters: [prometheusremotewrite]
```

This configuration creates a direct link between traces and metrics. Every trace that flows through the traces pipeline generates corresponding metrics that flow through the metrics pipeline.

## Generating RED Metrics from Traces

Rate, Error, and Duration (RED) metrics are essential for service monitoring. Connectors can automatically generate these from traces:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Add resource attributes before metric generation
  resource:
    attributes:
      - key: environment
        value: production
        action: insert

  batch:
    timeout: 10s
    send_batch_size: 1024

connectors:
  span_metrics/red:
    # Configure histogram for duration (D in RED)
    histogram:
      explicit:
        buckets: [5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s]

    # Dimensions for all generated metrics
    dimensions:
      - name: http.method
      - name: http.route
      - name: http.status_code

    # Metrics configuration
    metrics_expiration: 5m

exporters:
  otlp/traces:
    endpoint: jaeger:4317

  prometheusremotewrite/metrics:
    endpoint: http://prometheus:9090/api/v1/write
    headers:
      X-Prometheus-Remote-Write-Version: "0.1.0"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [span_metrics/red, otlp/traces]

    metrics/from-traces:
      receivers: [span_metrics/red]
      processors: [batch]
      exporters: [prometheusremotewrite/metrics]
```

This configuration automatically generates:

- Request rate from the generated calls counter
- Error rate by filtering the generated calls counter on error status
- Duration distribution (latency histogram)

All derived from trace data, eliminating the need for separate metric instrumentation.

## Creating Service Dependency Graphs

Connectors can analyze trace relationships to generate service graph metrics:

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
  # Service graph connector analyzes trace relationships
  servicegraph:
    # Configure how long to store trace relationships
    store:
      max_items: 10000
      ttl: 2s

    # Latency histogram for service-to-service calls
    latency_histogram_buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s]

    # Dimensions for service graph metrics
    dimensions:
      - service.name
      - service.namespace

exporters:
  otlp/traces:
    endpoint: tempo:4317

  prometheusremotewrite/graph:
    endpoint: http://prometheus:9090/api/v1/write

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [servicegraph, otlp/traces]

    metrics/service-graph:
      receivers: [servicegraph]
      processors: [batch]
      exporters: [prometheusremotewrite/graph]
```

The service graph connector analyzes parent-child relationships in traces to understand which services call which other services, generating metrics with labels such as `client`, `server`, `failed`, and `connection_type`.

## Multi-Connector Pipeline Architecture

You can use multiple connectors to create sophisticated processing workflows:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

  # Filter traces for specific processing
  filter/http-only:
    traces:
      span:
        - 'attributes["http.method"] != nil'

  filter/db-only:
    traces:
      span:
        - 'attributes["db.system"] != nil'

connectors:
  # Generate HTTP metrics from traces
  span_metrics/http:
    histogram:
      explicit:
        buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s]
    dimensions:
      - name: http.method
      - name: http.route
      - name: http.status_code
    namespace: http

  # Generate database metrics from traces
  span_metrics/database:
    histogram:
      explicit:
        buckets: [1ms, 5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s]
    dimensions:
      - name: db.system
      - name: db.operation
      - name: db.name
    namespace: database

  # Generate service graph
  servicegraph:
    latency_histogram_buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s]

exporters:
  otlp/traces:
    endpoint: jaeger:4317

  prometheusremotewrite:
    endpoint: http://prometheus:9090/api/v1/write

service:
  pipelines:
    # Main traces pipeline
    traces/input:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/traces, servicegraph]

    # HTTP trace processing
    traces/http:
      receivers: [otlp]
      processors: [filter/http-only, batch]
      exporters: [span_metrics/http]

    # Database trace processing
    traces/database:
      receivers: [otlp]
      processors: [filter/db-only, batch]
      exporters: [span_metrics/database]

    # HTTP metrics pipeline
    metrics/http:
      receivers: [span_metrics/http]
      exporters: [prometheusremotewrite]

    # Database metrics pipeline
    metrics/database:
      receivers: [span_metrics/database]
      exporters: [prometheusremotewrite]

    # Service graph metrics pipeline
    metrics/service-graph:
      receivers: [servicegraph]
      exporters: [prometheusremotewrite]
```

This architecture splits trace processing into specialized paths, each generating domain-specific metrics through dedicated connectors.

## Correlating Metrics with Trace Context

While the primary connector flow is traces to metrics, you can also preserve trace context in generated metrics by enabling exemplars. Exemplars let compatible metrics backends attach representative trace and span identifiers to metric points for correlation.

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

connectors:
  # Generate metrics from traces and attach exemplars
  span_metrics:
    histogram:
      explicit:
        buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s]
    dimensions:
      - name: http.route
    exemplars:
      enabled: true

exporters:
  otlp/traces:
    endpoint: jaeger:4317

  prometheusremotewrite:
    endpoint: http://prometheus:9090/api/v1/write

service:
  pipelines:
    # Traces are exported and also feed generated metrics
    traces:
      receivers: [otlp]
      exporters: [span_metrics, otlp/traces]

    # Generated metrics from traces
    metrics/from-traces:
      receivers: [span_metrics]
      exporters: [prometheusremotewrite]
```

This flow keeps the direction traces-to-metrics, but preserves trace correlation in the generated metric stream.

## Monitoring Sampling with Derived Metrics

Use connectors alongside sampling processors to measure the traces that pass through a sampling policy:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Tail-based sampling evaluates trace content before export
  tail_sampling:
    policies:
      - name: sample-errors
        type: status_code
        status_code:
          status_codes: [ERROR]

      - name: sample-slow-requests
        type: latency
        latency:
          threshold_ms: 1000

      - name: sample-random
        type: probabilistic
        probabilistic:
          sampling_percentage: 5.0

connectors:
  # Generate metrics for the sampled trace stream
  span_metrics/sampling:
    histogram:
      explicit:
        buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s]
    dimensions:
      - name: http.route
    enable_metrics_sampling_method: true

exporters:
  otlp/traces:
    endpoint: jaeger:4317

  prometheusremotewrite:
    endpoint: http://prometheus:9090/api/v1/write

service:
  pipelines:
    # Sampled traces
    traces/sampled:
      receivers: [otlp]
      processors: [tail_sampling]
      exporters: [span_metrics/sampling, otlp/traces]

    # Sampling metrics
    metrics/sampling:
      receivers: [span_metrics/sampling]
      exporters: [prometheusremotewrite]
```

This configuration generates RED metrics for the sampled trace stream, helping you understand the traffic represented by the traces that are exported.

## Combining Connectors for Complex Workflows

Connectors can be combined to create multi-stage processing:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

connectors:
  # Stage 1: Generate basic span metrics
  span_metrics:
    histogram:
      explicit:
        buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s]
    dimensions:
      - name: http.method

  # Stage 2: Sum numeric span attributes into a metrics stream
  sum/request-size:
    spans:
      http.request.size:
        source_attribute: http.request.body.size
        attributes:
          - key: service.name
          - key: http.method

  # Stage 3: Generate service graph from traces
  servicegraph:
    latency_histogram_buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s]

exporters:
  otlp/traces:
    endpoint: jaeger:4317

  prometheusremotewrite/detailed:
    endpoint: http://prometheus:9090/api/v1/write
    headers:
      X-Metric-Type: detailed

  prometheusremotewrite/aggregated:
    endpoint: http://prometheus:9090/api/v1/write
    headers:
      X-Metric-Type: aggregated

service:
  pipelines:
    # Stage 1: Process traces
    traces:
      receivers: [otlp]
      exporters: [span_metrics, sum/request-size, servicegraph, otlp/traces]

    # Stage 2: Process span metrics
    metrics/detailed:
      receivers: [span_metrics]
      exporters: [prometheusremotewrite/detailed]

    # Stage 3: Process summed request-size metrics
    metrics/request-size:
      receivers: [sum/request-size]
      exporters: [prometheusremotewrite/aggregated]

    # Stage 3: Process service graph metrics
    metrics/service-graph:
      receivers: [servicegraph]
      exporters: [prometheusremotewrite/detailed]
```

This multi-stage pipeline creates detailed span metrics, service graph metrics, and a separate summed metric from a numeric span attribute.

## Real-World Example: Comprehensive Microservices Monitoring

Here's a complete configuration for monitoring a microservices architecture:

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
    detectors: [env, system, docker]
    timeout: 5s

  # Batch processing
  batch:
    timeout: 10s
    send_batch_size: 1024

  # Memory limiter to prevent overload
  memory_limiter:
    check_interval: 1s
    limit_mib: 1024

  # Add environment tags
  resource:
    attributes:
      - key: environment
        value: production
        action: insert

connectors:
  # Generate RED metrics from traces
  span_metrics/red:
    histogram:
      explicit:
        buckets: [5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s]
    dimensions:
      - name: service.namespace
      - name: http.method
      - name: http.route
      - name: http.status_code
    namespace: traces.span.metrics
    metrics_expiration: 5m

  # Generate service dependency graph
  servicegraph:
    store:
      max_items: 100000
      ttl: 2s
    latency_histogram_buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s]
    dimensions:
      - service.name
      - service.namespace

  # Sum numeric request-size span attributes by service
  sum/request-size-by-service:
    spans:
      http.request.size:
        source_attribute: http.request.body.size
        attributes:
          - key: service.name
          - key: service.namespace

exporters:
  # Export traces to Tempo
  otlp/tempo:
    endpoint: tempo:4317
    compression: gzip
    tls:
      insecure: true

  # Export metrics to Prometheus
  prometheusremotewrite/prom:
    endpoint: http://prometheus:9090/api/v1/write
    compression: snappy

  # Export aggregated metrics to separate backend
  prometheusremotewrite/aggregated:
    endpoint: http://prometheus-aggregated:9090/api/v1/write
    compression: snappy

service:
  telemetry:
    logs:
      level: info
    metrics:
      level: detailed

  pipelines:
    # Main traces pipeline
    traces/main:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, resource, batch]
      exporters: [span_metrics/red, servicegraph, sum/request-size-by-service, otlp/tempo]

    # Detailed metrics from traces
    metrics/detailed:
      receivers: [span_metrics/red, servicegraph]
      processors: [batch]
      exporters: [prometheusremotewrite/prom]

    # Summed service-level request-size metrics
    metrics/request-size:
      receivers: [sum/request-size-by-service]
      processors: [batch]
      exporters: [prometheusremotewrite/aggregated]
```

This configuration creates a complete observability pipeline:

1. Traces are ingested and processed
2. RED metrics are automatically generated from traces
3. Service dependency graphs are created
4. Request-size metrics are summed at the service level
5. All data is exported to appropriate backends

## Performance Optimization

When linking traces and metrics pipelines, consider these performance optimizations:

**Batch Processing**: Always use batch processors to reduce network overhead and improve throughput.

**Memory Management**: Connectors maintain state for metric generation. Use memory limiters to prevent resource exhaustion.

**Selective Processing**: Use filters to process only relevant traces, reducing connector load.

**Cardinality Control**: Limit dimensions in metric generation to control cardinality and storage costs.

```yaml
processors:
  # Batch for efficiency
  batch:
    timeout: 10s
    send_batch_size: 1024

  # Memory protection
  memory_limiter:
    check_interval: 1s
    limit_mib: 512

  # Drop lower-value spans before connector processing
  filter/important:
    traces:
      span:
        - 'attributes["http.status_code"] < 400 and end_time_unix_nano - start_time_unix_nano <= 1000000000'  # 1 second in nanoseconds

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, filter/important, batch]
      exporters: [span_metrics]
```

## Monitoring Connector Health

Monitor your connectors to ensure they're functioning correctly. Add internal telemetry settings to your existing Collector configuration:

```yaml
service:
  telemetry:
    logs:
      level: info
    metrics:
      level: detailed
```

Key metrics to monitor:

- `otelcol_exporter_sent_spans`: Spans sent by trace exporters
- `otelcol_exporter_sent_metric_points`: Metric points sent by metric exporters
- `otelcol_processor_batch_batch_send_size`: Batch sizes in metric pipelines

## Related Resources

For more specific connector implementations and use cases:

- [How to Convert Spans to Metrics Using the Span Metrics Connector](https://oneuptime.com/blog/post/2026-02-06-convert-spans-to-metrics-span-metrics-connector/view)
- [How to Generate Service Graph Metrics from Traces in the Collector](https://oneuptime.com/blog/post/2026-02-06-generate-service-graph-metrics-traces-collector/view)
- [How to Configure the Round Robin Connector in the OpenTelemetry Collector](https://oneuptime.com/blog/post/2026-02-06-round-robin-connector-opentelemetry-collector/view)

Connectors provide the glue that binds your observability pipelines together, enabling sophisticated correlations between traces and metrics while maintaining the flexibility to process each signal type according to its specific requirements.
