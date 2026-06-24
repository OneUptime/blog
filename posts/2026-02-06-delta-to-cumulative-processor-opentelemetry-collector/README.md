# How to Configure the Delta to Cumulative Processor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Processor, Metric, Delta, Cumulative, Aggregation

Description: Learn how to configure the delta-to-cumulative processor in OpenTelemetry Collector to convert delta metrics into cumulative metrics, handle counter resets.

---

Metrics come in different aggregation temporalities: delta and cumulative. Delta metrics report the change since the last measurement (like bytes transferred in the last minute), while cumulative metrics report the total since the process started (like total bytes transferred). Different backends and monitoring systems have preferences - some work better with cumulative counters, others with delta.

The delta-to-cumulative processor in the OpenTelemetry Collector converts delta metrics into cumulative ones, making your telemetry compatible with backends that expect monotonic counters. This processor is essential when you have instrumentation emitting delta metrics but need to send cumulative data to your observability platform.

## Understanding Delta vs Cumulative Metrics

Before configuring the processor, understanding the difference is critical.

**Delta metrics** represent the change over a time interval:
- HTTP requests handled in the last 10 seconds: 45
- Next interval: 52
- Next interval: 38

**Cumulative metrics** represent the running total since start:
- Total HTTP requests since process start: 45
- Next reading: 97 (45 + 52)
- Next reading: 135 (97 + 38)

```mermaid
graph TD
    A[Application Emits Delta Metrics] -->|10s: +45 requests| B[Delta: 45]
    B -->|10s: +52 requests| C[Delta: 52]
    C -->|10s: +38 requests| D[Delta: 38]

    E[After deltatocumulative Processor] -->|Converts| F[Cumulative: 45]
    F -->|Adds delta| G[Cumulative: 97]
    G -->|Adds delta| H[Cumulative: 135]
```

Many Prometheus-compatible backends expect cumulative counters because they can calculate rates and deltas themselves using PromQL. Converting at the collector level ensures compatibility without modifying your instrumentation.

## Why You Need This Processor

The delta-to-cumulative processor solves several real-world problems:

**Backend Compatibility**: Backends like Prometheus, Cortex, and Thanos expect cumulative counters. If your SDKs or instrumentation emit delta metrics, this processor bridges the gap.

**Stateful Accumulation**: The processor keeps cumulative state for each metric stream in memory, using `max_stale` to remove streams that have stopped reporting.

**Unified Metric Format**: In heterogeneous environments where some services emit delta and others emit cumulative metrics, this processor normalizes everything to cumulative, simplifying downstream analysis.

**Prometheus-Style Querying**: Cumulative monotonic counters work naturally with Prometheus-style rate and increase functions, which calculate changes from cumulative samples.

## Basic Configuration

The processor configuration is straightforward. At minimum, you add it to the metrics pipeline.

Here is a basic configuration that converts delta metrics to cumulative:

```yaml
# RECEIVERS: Accept metrics via OTLP

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

# PROCESSORS: Convert delta to cumulative metrics
processors:
  # Convert all delta temporality metrics to cumulative
  deltatocumulative:
    # By default, converts all delta samples

  # Batch for efficiency
  batch:
    send_batch_size: 1024
    timeout: 10s

# EXPORTERS: Send to Prometheus-compatible backend
exporters:
  otlp_http:
    metrics_endpoint: https://oneuptime.com/otlp/v1/metrics
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

# SERVICE: Define the metrics pipeline
service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [deltatocumulative, batch]
      exporters: [otlp_http]
```

This configuration receives metrics via OTLP, converts delta samples to cumulative, batches them, and exports to OneUptime. The processor automatically detects delta temporality and converts it.

## Advanced Configuration with Max Staleness

In production, metrics streams can be intermittent. A service might stop emitting a metric, then start again hours later. The processor needs to know when to consider a metric stream "stale" and reset its cumulative state.

The following configuration shows how to handle metric staleness:

```yaml
processors:
  # Advanced delta-to-cumulative with staleness handling
  deltatocumulative:
    # Maximum time to keep tracking a metric stream without updates
    # After this duration, the cumulative state is reset
    max_stale: 5m

    # Maximum number of unique metric streams to track
    # Prevents memory exhaustion from high-cardinality metrics
    max_streams: 10000

  # Memory protection for the collector
  memory_limiter:
    limit_mib: 512
    spike_limit_mib: 128
    check_interval: 1s

  batch:
    send_batch_size: 1024
    timeout: 10s

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, deltatocumulative, batch]
      exporters: [otlp_http]
```

The `max_stale` parameter controls when the processor "forgets" about a metric stream. If a metric stops being reported for longer than this duration, its cumulative state is cleared. When the metric reappears, it starts fresh from the new delta value.

The `max_streams` parameter protects against memory exhaustion from high-cardinality metrics. If you have thousands of unique metric series (different label combinations), this limit prevents unbounded memory growth by dropping new streams after the limit is reached.

## Handling Service Restarts and Stale Streams

The processor accumulates delta points in memory for each stream. It does not persist state across Collector restarts, and it treats a stream as the same stream while its metric identity remains the same and it has not exceeded `max_stale`.

Here is how the processor handles active streams and stale streams:

```mermaid
sequenceDiagram
    participant App as Application
    participant Proc as deltatocumulative
    participant Backend as Backend

    App->>Proc: Delta: 100 (startup)
    Proc->>Backend: Cumulative: 100

    App->>Proc: Delta: 50
    Proc->>Backend: Cumulative: 150

    Note over App: Service stops emitting

    Note over Proc: max_stale expires and state is removed

    App->>Proc: Delta: 20 (first value after stale period)
    Note over Proc: Treats stream as new
    Proc->>Backend: Cumulative: 20

    App->>Proc: Delta: 30
    Proc->>Backend: Cumulative: 50
```

The processor tracks metric identity using the combination of metric metadata, scope, resource attributes, and datapoint attributes. When it sees a metric for the first time (or after `max_stale` expiration), it treats the delta value as the starting cumulative value.

## Selective Conversion with Filtering

You might not want to convert all metrics - only specific ones. Combine the processor with the filter processor to target specific metrics.

This configuration converts only HTTP request metrics to cumulative:

```yaml
processors:
  # Filter to select only HTTP request metrics
  filter/http_only:
    error_mode: ignore
    metric_conditions:
      - 'not IsMatch(metric.name, "^http\\..*requests.*$")'

  # Convert the filtered metrics
  deltatocumulative:
    max_stale: 5m
    max_streams: 5000

  # Batch the selected metrics
  batch:
    send_batch_size: 1024
    timeout: 10s

exporters:
  otlp_http/cumulative:
    metrics_endpoint: https://oneuptime.com/otlp/v1/metrics
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

service:
  pipelines:
    # Pipeline for HTTP metrics (converted to cumulative)
    metrics/http:
      receivers: [otlp]
      processors: [filter/http_only, deltatocumulative, batch]
      exporters: [otlp_http/cumulative]
```

This pattern is useful when you have mixed metric types and only need to convert specific subsets for compatibility with particular backends.

## Multi-Backend Routing with Different Temporalities

Some backends prefer delta metrics, others prefer cumulative. The OpenTelemetry Collector can route metrics to different destinations based on their temporality requirements.

Here is a configuration that sends delta metrics to one backend and cumulative to another:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Clone metrics for dual export
  batch/delta:
    send_batch_size: 1024
    timeout: 10s

  # Convert for cumulative backend
  deltatocumulative:
    max_stale: 5m
    max_streams: 10000

  batch/cumulative:
    send_batch_size: 1024
    timeout: 10s

exporters:
  # Backend that prefers delta metrics
  otlp_http/delta_backend:
    metrics_endpoint: https://delta-metrics.example.com/v1/metrics
    headers:
      authorization: Bearer ${DELTA_TOKEN}

  # Backend that requires cumulative metrics (Prometheus-compatible)
  otlp_http/cumulative_backend:
    metrics_endpoint: https://oneuptime.com/otlp/v1/metrics
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

service:
  pipelines:
    # Send original delta metrics to delta-compatible backend
    metrics/delta:
      receivers: [otlp]
      processors: [batch/delta]
      exporters: [otlp_http/delta_backend]

    # Convert and send to cumulative-compatible backend
    metrics/cumulative:
      receivers: [otlp]
      processors: [deltatocumulative, batch/cumulative]
      exporters: [otlp_http/cumulative_backend]
```

This configuration receives metrics once but exports them twice: once in their original delta form and once converted to cumulative. This pattern is common during backend migrations or when maintaining multiple monitoring systems.

## Memory Considerations and Performance Tuning

The delta-to-cumulative processor maintains state for every unique metric stream it encounters. In high-cardinality environments (many unique label combinations), this can consume significant memory.

Here is a production configuration with memory protection:

```yaml
processors:
  # Protect collector from memory exhaustion
  memory_limiter:
    limit_mib: 1024          # Hard limit: 1GB
    spike_limit_mib: 256     # Allow temporary spikes
    check_interval: 1s       # Check memory usage every second

  # Convert with cardinality controls
  deltatocumulative:
    max_stale: 3m            # Shorter staleness window
    max_streams: 50000       # Drop new streams after this limit is reached

  # Reduce cardinality before conversion (optional)
  resource/drop_high_cardinality:
    attributes:
      - key: container_id    # Drop high-cardinality labels
        action: delete
      - key: pod_uid
        action: delete

  batch:
    send_batch_size: 2048
    timeout: 5s

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors:
        - memory_limiter
        - resource/drop_high_cardinality
        - deltatocumulative
        - batch
      exporters: [otlp_http]
```

The memory_limiter processor runs first to protect the entire collector. The resource processor drops high-cardinality labels before conversion, reducing the number of unique streams the delta-to-cumulative processor needs to track.

## Debugging and Validation

To verify the processor is working correctly, enable debug logging and check the collector's internal metrics.

Add this to your configuration to enable detailed logging:

```yaml
service:
  telemetry:
    logs:
      level: debug    # Shows detailed processor operations

  pipelines:
    metrics:
      receivers: [otlp]
      processors: [deltatocumulative, batch]
      exporters: [otlp_http, debug]  # Add debug exporter

exporters:
  debug:
    verbosity: detailed   # Print metrics to console for verification
```

The debug exporter prints processed metrics to the collector logs, allowing you to verify that delta metrics are being converted to cumulative with monotonically increasing values.

## Common Pitfalls and Solutions

**Problem**: Cumulative values seem to reset randomly.

**Solution**: Check your `max_stale` setting. If it's too short, the processor might be clearing state for metrics with irregular reporting intervals. Increase `max_stale` to match your longest expected gap between metric reports.

**Problem**: Collector memory usage keeps growing.

**Solution**: Set `max_streams` to prevent unbounded growth. New streams beyond this limit are dropped, so also investigate whether you have unexpectedly high cardinality in your metrics (too many unique label combinations). Use the resource or attributes processor to drop high-cardinality labels.

**Problem**: Backend shows duplicate data or incorrect values after conversion.

**Solution**: Ensure you're not running multiple instances of the collector that all perform delta-to-cumulative conversion on the same metrics without stable routing. Each instance maintains its own cumulative state, leading to multiple divergent cumulative series. Either centralize conversion in a single collector instance or ensure metrics are consistently routed to the same instance.

## Integration with OneUptime

OneUptime natively supports both delta and cumulative metrics via OTLP. However, for Prometheus-compatible querying, cumulative metrics are often preferred.

Here is a complete configuration for sending converted metrics to OneUptime:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  memory_limiter:
    limit_mib: 512
    spike_limit_mib: 128
    check_interval: 1s

  deltatocumulative:
    max_stale: 5m
    max_streams: 10000

  batch:
    send_batch_size: 1024
    timeout: 10s

exporters:
  otlp_http:
    metrics_endpoint: https://oneuptime.com/otlp/v1/metrics
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, deltatocumulative, batch]
      exporters: [otlp_http]
```

This configuration provides a robust pipeline that converts delta metrics to cumulative format before sending them to OneUptime.

## Related Resources

For more information on OpenTelemetry Collector processors and metrics handling:

- [OpenTelemetry Collector: What It Is, When You Need It, and When You Don't](https://oneuptime.com/blog/post/2025-09-18-what-is-opentelemetry-collector-and-why-use-one/view)
- [How to Collect OpenTelemetry Collector Internal Metrics](https://oneuptime.com/blog/post/2025-01-22-how-to-collect-opentelemetry-collector-internal-metrics/view)
- [How to Reduce Noise in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-25-how-to-reduce-noise-in-opentelemetry/view)

## Conclusion

The delta-to-cumulative processor is a specialized but essential tool when working with metrics in OpenTelemetry. It bridges the gap between instrumentation that emits delta metrics and backends that require cumulative counters, handling the complexity of stateful accumulation, staleness, and memory management.

Configure it with appropriate max_stale and max_streams values for your environment, monitor its memory usage, and combine it with other processors like filtering and batching for a production-ready metrics pipeline. With OneUptime as your backend, you get native OTLP support, making this processor configuration straightforward and reliable.
