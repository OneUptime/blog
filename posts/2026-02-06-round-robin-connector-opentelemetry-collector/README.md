# How to Configure the Round Robin Connector in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Connectors, Round Robin, Load Balancing, Telemetry Pipeline

Description: Learn how to configure and use the Round Robin connector in OpenTelemetry Collector to distribute telemetry data evenly across multiple pipelines for load balancing and parallel processing.

The Round Robin connector in the OpenTelemetry Collector provides a sophisticated mechanism for distributing telemetry data across multiple downstream pipelines using a round-robin algorithm. This connector is particularly useful when you need to balance load across multiple processing paths, parallelize data processing, or send telemetry to multiple backends in a distributed manner.

## Understanding the Round Robin Connector

The Round Robin connector acts as a distribution point in your telemetry pipeline. Unlike traditional exporters that send data to external systems, connectors link pipelines within the same Collector instance. The Round Robin connector takes incoming telemetry data and distributes it sequentially across configured output pipelines, ensuring even distribution over time.

This connector supports all three telemetry signals: traces, metrics, and logs. It operates by maintaining an internal counter that tracks which pipeline should receive the next batch of data, cycling through all available pipelines in order.

## Key Use Cases

The Round Robin connector excels in several scenarios:

**Load Distribution**: When processing high-volume telemetry data, you can split the workload across multiple parallel processing pipelines to prevent bottlenecks and improve throughput.

**Multi-Backend Routing**: Send telemetry data to multiple backend systems without duplicating the entire dataset to each backend. Each backend receives a subset of the data.

**Testing and Comparison**: Route portions of your telemetry to different processing configurations or backends for A/B testing, allowing you to compare performance or behavior without committing all data.

**Cost Optimization**: When using multiple observability backends with different pricing models, distribute data strategically to optimize costs while maintaining coverage.

## Basic Configuration Structure

The Round Robin connector follows the standard OpenTelemetry Collector configuration pattern. Here's the basic structure:

```yaml
connectors:
  # Define the Round Robin connector
  roundrobin:
    # The table parameter specifies which pipelines to distribute to
    table:
      - pipelines: [traces/backend-1, traces/backend-2]
      - pipelines: [traces/backend-3]

service:
  pipelines:
    # Input pipeline that feeds the connector
    traces/input:
      receivers: [otlp]
      exporters: [roundrobin]

    # Output pipelines that receive distributed data
    traces/backend-1:
      receivers: [roundrobin]
      exporters: [otlp/backend-1]

    traces/backend-2:
      receivers: [roundrobin]
      exporters: [otlp/backend-2]

    traces/backend-3:
      receivers: [roundrobin]
      exporters: [otlp/backend-3]
```

In this configuration, traces arrive via the OTLP receiver and are distributed across three backend pipelines. The connector cycles through backend-1, backend-2, and backend-3 in sequence.

## Pipeline Flow Architecture

Understanding how data flows through the Round Robin connector is essential for proper configuration:

```mermaid
graph LR
    A[OTLP Receiver] --> B[Input Pipeline]
    B --> C[Round Robin Connector]
    C --> D[Pipeline 1]
    C --> E[Pipeline 2]
    C --> F[Pipeline 3]
    D --> G[Backend 1]
    E --> H[Backend 2]
    F --> I[Backend 3]
```

The connector sits between the input pipeline and multiple output pipelines, acting as an intelligent router that distributes data evenly.

## Configuring for Different Telemetry Types

The Round Robin connector can handle traces, metrics, and logs independently. Here's how to configure it for each signal type.

### Distributing Traces Across Multiple Backends

This configuration distributes traces to three different tracing backends:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

connectors:
  roundrobin/traces:
    table:
      # Define the distribution table
      # Traces will cycle through these pipelines
      - pipelines: [traces/jaeger]
      - pipelines: [traces/tempo]
      - pipelines: [traces/zipkin]

exporters:
  # Configure exporters for each backend
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true

  otlp/tempo:
    endpoint: tempo:4317
    tls:
      insecure: true

  zipkin:
    endpoint: http://zipkin:9411/api/v2/spans

service:
  pipelines:
    # Input pipeline receives all traces
    traces/input:
      receivers: [otlp]
      exporters: [roundrobin/traces]

    # Output pipelines for each backend
    traces/jaeger:
      receivers: [roundrobin/traces]
      processors: [batch]
      exporters: [otlp/jaeger]

    traces/tempo:
      receivers: [roundrobin/traces]
      processors: [batch]
      exporters: [otlp/tempo]

    traces/zipkin:
      receivers: [roundrobin/traces]
      processors: [batch]
      exporters: [zipkin]
```

Each trace batch arriving at the OTLP receiver will be sent to one of the three backends in rotation. The first batch goes to Jaeger, the second to Tempo, the third to Zipkin, then the cycle repeats.

### Distributing Metrics for Parallel Processing

For metrics, you can use Round Robin to distribute load across multiple processing pipelines:

```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: 'app-metrics'
          scrape_interval: 30s
          static_configs:
            - targets: ['app:8080']

processors:
  # Processor for high-cardinality metrics
  filter/high-cardinality:
    metrics:
      include:
        match_type: regexp
        metric_names:
          - '.*_bucket'
          - '.*_count'

  # Processor for simple metrics
  filter/aggregates:
    metrics:
      include:
        match_type: regexp
        metric_names:
          - '.*_sum'
          - '.*_total'

connectors:
  roundrobin/metrics:
    table:
      - pipelines: [metrics/high-cardinality]
      - pipelines: [metrics/aggregates]

exporters:
  prometheusremotewrite/timescale:
    endpoint: http://timescale:9090/api/v1/write

  prometheusremotewrite/victoria:
    endpoint: http://victoria:8428/api/v1/write

service:
  pipelines:
    metrics/input:
      receivers: [prometheus]
      exporters: [roundrobin/metrics]

    metrics/high-cardinality:
      receivers: [roundrobin/metrics]
      processors: [filter/high-cardinality, batch]
      exporters: [prometheusremotewrite/timescale]

    metrics/aggregates:
      receivers: [roundrobin/metrics]
      processors: [filter/aggregates, batch]
      exporters: [prometheusremotewrite/victoria]
```

This configuration distributes metrics between two specialized pipelines, each handling different metric types with appropriate backends.

## Advanced Configuration Patterns

### Weighted Distribution with Table Configuration

The table parameter allows you to control distribution patterns. By listing a pipeline multiple times, you can create weighted distribution:

```yaml
connectors:
  roundrobin/weighted:
    table:
      # Pipeline 1 appears twice, gets 50% of traffic
      - pipelines: [traces/primary]
      - pipelines: [traces/primary]
      # Pipeline 2 appears once, gets 25% of traffic
      - pipelines: [traces/secondary]
      # Pipeline 3 appears once, gets 25% of traffic
      - pipelines: [traces/archive]
```

This creates a 2:1:1 distribution ratio, where the primary pipeline receives twice as much data as the others.

### Combining with Other Connectors

You can chain Round Robin connectors with other connector types for sophisticated routing:

```yaml
connectors:
  # First, extract metrics from traces
  spanmetrics:
    dimensions:
      - name: service.name
      - name: http.method

  # Then distribute those metrics
  roundrobin/metrics:
    table:
      - pipelines: [metrics/prometheus]
      - pipelines: [metrics/influxdb]

service:
  pipelines:
    traces/input:
      receivers: [otlp]
      exporters: [spanmetrics]

    metrics/from-traces:
      receivers: [spanmetrics]
      exporters: [roundrobin/metrics]

    metrics/prometheus:
      receivers: [roundrobin/metrics]
      exporters: [prometheusremotewrite]

    metrics/influxdb:
      receivers: [roundrobin/metrics]
      exporters: [influxdb]
```

This configuration generates metrics from traces and then distributes those metrics across multiple backends.

## Performance Considerations

The Round Robin connector is designed for high-throughput scenarios, but there are several factors to consider:

**Pipeline Balance**: Ensure your output pipelines can handle similar throughput rates. If one pipeline is significantly slower, it may create backpressure that affects the entire system.

**Batch Processing**: Always use batch processors in your output pipelines to optimize network usage and reduce overhead.

**Memory Usage**: Each output pipeline maintains its own buffer. More pipelines mean more memory consumption.

**State Distribution**: Remember that related telemetry data may be split across different pipelines. If your backend requires complete trace context or metric relationships, consider using sampling or filtering instead.

## Monitoring Your Round Robin Configuration

To ensure your Round Robin connector operates correctly, monitor these metrics:

```yaml
exporters:
  prometheus:
    endpoint: 0.0.0.0:8888

service:
  telemetry:
    logs:
      level: info
    metrics:
      level: detailed
      address: 0.0.0.0:8888

  pipelines:
    metrics/internal:
      receivers: [prometheus]
      exporters: [prometheus]
```

Key metrics to watch:

- `otelcol_exporter_sent_spans`: Track spans sent through each output pipeline
- `otelcol_exporter_send_failed_spans`: Monitor failures in distribution
- `otelcol_processor_batch_batch_send_size`: Verify batch sizes are consistent across pipelines

## Troubleshooting Common Issues

**Uneven Distribution**: If you notice uneven distribution, verify that your table configuration is correct and that all output pipelines are functioning properly.

**Dropped Data**: Check for backpressure in slower pipelines. Consider adding memory limiters or adjusting batch sizes.

**Configuration Errors**: Ensure pipeline names in the table match exactly with defined pipeline names in the service configuration.

## Real-World Example: Multi-Region Distribution

Here's a complete example distributing telemetry across three regional backends:

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

  memory_limiter:
    check_interval: 1s
    limit_mib: 512

connectors:
  roundrobin/regional:
    table:
      - pipelines: [traces/us-east]
      - pipelines: [traces/eu-west]
      - pipelines: [traces/ap-south]

exporters:
  otlp/us-east:
    endpoint: collector-us-east.example.com:4317
    compression: gzip

  otlp/eu-west:
    endpoint: collector-eu-west.example.com:4317
    compression: gzip

  otlp/ap-south:
    endpoint: collector-ap-south.example.com:4317
    compression: gzip

service:
  pipelines:
    traces/input:
      receivers: [otlp]
      processors: [memory_limiter]
      exporters: [roundrobin/regional]

    traces/us-east:
      receivers: [roundrobin/regional]
      processors: [batch]
      exporters: [otlp/us-east]

    traces/eu-west:
      receivers: [roundrobin/regional]
      processors: [batch]
      exporters: [otlp/eu-west]

    traces/ap-south:
      receivers: [roundrobin/regional]
      processors: [batch]
      exporters: [otlp/ap-south]
```

This configuration distributes traces evenly across three regional collectors, reducing the load on any single region and improving global observability coverage.

## Related Resources

For more information about OpenTelemetry connectors and pipeline configuration, check out these related posts:

- [How to Use Connectors to Link Traces and Metrics Pipelines](https://oneuptime.com/blog/post/connectors-link-traces-metrics-pipelines-opentelemetry/view)
- [How to Generate Service Graph Metrics from Traces in the Collector](https://oneuptime.com/blog/post/generate-service-graph-metrics-traces-collector/view)
- [How to Convert Spans to Metrics Using the Span Metrics Connector](https://oneuptime.com/blog/post/convert-spans-to-metrics-span-metrics-connector/view)

The Round Robin connector provides a powerful tool for load balancing and distributing telemetry data within your OpenTelemetry Collector deployment. By understanding its configuration options and use cases, you can build more resilient and scalable observability pipelines.
