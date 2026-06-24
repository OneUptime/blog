# How to Configure the Interval Processor in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Processor, Interval, Metric, Aggregation, Observability

Description: Learn how to configure the Interval Processor in OpenTelemetry Collector to aggregate and downsample metrics at configurable intervals for reduced cardinality and storage costs.

High-frequency metrics can overwhelm your observability backend and drive up storage costs. The Interval Processor addresses this by aggregating metrics over configurable time windows, reducing metric export frequency while preserving the latest cumulative values for supported metric streams. This processor is particularly valuable for high-volume metrics that don't require second-by-second granularity.

## What Is the Interval Processor?

The Interval Processor aggregates metrics over specified time intervals before exporting them. Instead of forwarding every aggregatable metric data point as it arrives, the processor buffers the latest data point for each matching metric stream and emits those latest values at regular intervals. Delta metrics and non-monotonic sums are passed through unchanged.

This is useful when:

- You have high-frequency cumulative metrics that don't need real-time granularity
- Your backend charges based on data points or ingestion volume
- You want to reduce network bandwidth between Collector and backend
- You need to reduce export frequency for long-term retention

## Architecture Overview

The Interval Processor sits between receivers and exporters, buffering and forwarding the latest aggregatable metrics:

```mermaid
graph LR
    A[Services emitting metrics every 1s] -->|High frequency| B[Interval Processor]
    B -->|Latest values every 60s| C[Backend]

    style B fill:#f9f,stroke:#333,stroke-width:2px
```

Metrics arrive at high frequency, aggregatable metrics are buffered, and the latest values are exported at the configured interval.

## Basic Configuration

Here's a minimal Interval Processor configuration that exports aggregatable metrics every 60 seconds:

```yaml
# Configure receivers to accept metrics

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

# Define the Interval Processor
processors:
  # The interval processor buffers aggregatable metrics over time windows
  interval:
    # Export aggregated metrics every 60 seconds
    interval: 60s

  # Batch processor for efficient export
  batch:
    timeout: 10s
    send_batch_size: 1024

# Configure export destination
exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

# Wire everything together in pipelines
service:
  pipelines:
    # Metrics pipeline with interval aggregation
    metrics:
      receivers: [otlp]
      processors: [interval, batch]
      exporters: [otlphttp]
```

## Understanding Aggregation Modes

The Interval Processor does not expose per-type aggregation modes such as `min`, `max`, `mean`, or histogram bucket merging. It keeps the newest data point for each metric stream during the interval and forwards those latest values when the interval elapses.

### Gauge Aggregation

Gauges represent point-in-time values. By default, the processor forwards the latest gauge data point seen in the interval. If you do not want gauges aggregated, configure pass-through:

```yaml
processors:
  interval:
    interval: 60s
    pass_through:
      gauge: true
```

### Sum Aggregation

Only monotonically increasing cumulative sums are aggregated. Delta sums and non-monotonic sums are passed through unchanged:

```yaml
processors:
  interval:
    interval: 60s
```

### Histogram Aggregation

Only cumulative histograms and cumulative exponential histograms are aggregated. Delta histograms are passed through unchanged:

```yaml
processors:
  interval:
    interval: 60s
```

Summaries are also aggregated by default. If you do not want summaries aggregated, configure pass-through:

```yaml
processors:
  interval:
    interval: 60s
    pass_through:
      summary: true
```

## Advanced Configuration

### Metric-Specific Intervals

The Interval Processor does not have built-in include or exclude filters. To configure different intervals for different metric patterns, use Filter processors in separate pipelines:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Keep only high-frequency system metrics in this pipeline
  filter/system:
    error_mode: ignore
    metric_conditions:
      - 'not IsMatch(metric.name, "^system[.].*") and not IsMatch(metric.name, "^process[.].*")'

  # Keep only application metrics in this pipeline
  filter/application:
    error_mode: ignore
    metric_conditions:
      - 'not IsMatch(metric.name, "^http[.].*") and not IsMatch(metric.name, "^rpc[.].*")'

  # Keep only business metrics in this pipeline
  filter/business:
    error_mode: ignore
    metric_conditions:
      - 'not IsMatch(metric.name, "^checkout[.].*") and not IsMatch(metric.name, "^payment[.].*")'

  # High-frequency system metrics - aggregate aggressively
  interval/system:
    interval: 120s

  # Application metrics - moderate aggregation
  interval/application:
    interval: 60s

  # Business metrics - minimal aggregation
  interval/business:
    interval: 30s

  batch:
    timeout: 10s
    send_batch_size: 1024

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

service:
  pipelines:
    metrics/system:
      receivers: [otlp]
      processors: [filter/system, interval/system, batch]
      exporters: [otlphttp]

    metrics/application:
      receivers: [otlp]
      processors: [filter/application, interval/application, batch]
      exporters: [otlphttp]

    metrics/business:
      receivers: [otlp]
      processors: [filter/business, interval/business, batch]
      exporters: [otlphttp]
```

Resource-Aware Aggregation

The Interval Processor keeps separate metric streams based on the metric identity, including resource and data point attributes. It does not provide `resource_attributes` or `metric_attributes` settings for choosing which attributes to preserve:

```yaml
processors:
  interval:
    interval: 60s
    pass_through:
      # Optional: forward gauges and summaries immediately instead of aggregating them
      gauge: false
      summary: false
```

## Production Configuration Example

Here's a complete production-ready configuration with interval processing, monitoring, and error handling:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  # Prometheus receiver for scraping internal metrics
  prometheus:
    config:
      scrape_configs:
        - job_name: 'otel-collector'
          scrape_interval: 30s
          static_configs:
            - targets: ['localhost:8888']

processors:
  # Memory limiter prevents OOM issues
  memory_limiter:
    check_interval: 1s
    limit_mib: 1024
    spike_limit_mib: 256

  # Keep only high-frequency system metrics in this pipeline
  filter/system:
    error_mode: ignore
    metric_conditions:
      - 'not IsMatch(metric.name, "^system[.]cpu[.].*") and not IsMatch(metric.name, "^system[.]memory[.].*") and not IsMatch(metric.name, "^system[.]disk[.].*") and not IsMatch(metric.name, "^system[.]network[.].*") and not IsMatch(metric.name, "^process[.]cpu[.].*") and not IsMatch(metric.name, "^process[.]memory[.].*")'

  # Keep only application metrics in this pipeline
  filter/application:
    error_mode: ignore
    metric_conditions:
      - 'not IsMatch(metric.name, "^http[.]server[.].*") and not IsMatch(metric.name, "^http[.]client[.].*") and not IsMatch(metric.name, "^rpc[.]server[.].*") and not IsMatch(metric.name, "^rpc[.]client[.].*") and not IsMatch(metric.name, "^db[.]client[.].*")'

  # Keep only business-critical metrics in this pipeline
  filter/business:
    error_mode: ignore
    metric_conditions:
      - 'not IsMatch(metric.name, "^checkout[.].*") and not IsMatch(metric.name, "^payment[.].*") and not IsMatch(metric.name, "^order[.].*") and not IsMatch(metric.name, "^revenue[.].*")'

  # High-frequency system metrics - aggressive aggregation
  interval/system:
    interval: 120s

  # Application metrics - moderate aggregation
  interval/application:
    interval: 60s

  # Business-critical metrics - minimal aggregation
  interval/business:
    interval: 30s

  # Add deployment context
  resource:
    attributes:
      - key: collector.version
        value: ${COLLECTOR_VERSION}
        action: upsert

  # Batch for efficient export
  batch:
    timeout: 10s
    send_batch_size: 1024
    send_batch_max_size: 2048

exporters:
  # Primary backend
  otlphttp/primary:
    endpoint: https://oneuptime.com/otlp
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}
    compression: gzip
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

  # Debug exporter for troubleshooting
  debug:
    verbosity: normal
    sampling_initial: 5
    sampling_thereafter: 50

service:
  extensions: [health_check, pprof]

  pipelines:
    # System metrics with aggressive aggregation
    metrics/system:
      receivers: [otlp]
      processors: [memory_limiter, filter/system, interval/system, resource, batch]
      exporters: [otlphttp/primary]

    # Application metrics with moderate aggregation
    metrics/application:
      receivers: [otlp]
      processors: [memory_limiter, filter/application, interval/application, resource, batch]
      exporters: [otlphttp/primary]

    # Business metrics with minimal aggregation
    metrics/business:
      receivers: [otlp]
      processors: [memory_limiter, filter/business, interval/business, resource, batch]
      exporters: [otlphttp/primary]

    # Collector internal metrics without aggregation
    metrics/internal:
      receivers: [prometheus]
      processors: [batch]
      exporters: [otlphttp/primary]

extensions:
  health_check:
    endpoint: 0.0.0.0:13133
  pprof:
    endpoint: 0.0.0.0:1777
```

## Deployment in Kubernetes

Deploy the Interval Processor in Kubernetes for cost-effective metrics aggregation:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: observability
data:
  collector.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

    processors:
      memory_limiter:
        check_interval: 1s
        limit_mib: 2048

      filter/high_frequency:
        error_mode: ignore
        metric_conditions:
          - 'not IsMatch(metric.name, "^system[.].*") and not IsMatch(metric.name, "^process[.].*") and not IsMatch(metric.name, "^runtime[.].*")'

      filter/standard:
        error_mode: ignore
        metric_conditions:
          - 'IsMatch(metric.name, "^system[.].*") or IsMatch(metric.name, "^process[.].*") or IsMatch(metric.name, "^runtime[.].*")'

      # Aggregate high-frequency metrics
      interval/high_frequency:
        interval: 120s

      # Standard aggregation for most metrics
      interval/standard:
        interval: 60s

      batch:
        timeout: 10s
        send_batch_size: 1024

    exporters:
      otlphttp:
        endpoint: https://oneuptime.com/otlp
        headers:
          x-oneuptime-token: ${ONEUPTIME_TOKEN}

    extensions:
      health_check:
        endpoint: 0.0.0.0:13133

    service:
      extensions: [health_check]
      pipelines:
        metrics/high_frequency:
          receivers: [otlp]
          processors: [memory_limiter, filter/high_frequency, interval/high_frequency, batch]
          exporters: [otlphttp]

        metrics/standard:
          receivers: [otlp]
          processors: [memory_limiter, filter/standard, interval/standard, batch]
          exporters: [otlphttp]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: observability
spec:
  replicas: 3
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:0.153.0
        args:
          - "--config=/conf/collector.yaml"
        env:
        - name: ONEUPTIME_TOKEN
          valueFrom:
            secretKeyRef:
              name: oneuptime-credentials
              key: token
        - name: COLLECTOR_VERSION
          value: "0.153.0"
        volumeMounts:
        - name: config
          mountPath: /conf
        ports:
        - containerPort: 4317
          name: otlp-grpc
        - containerPort: 4318
          name: otlp-http
        - containerPort: 13133
          name: health-check
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /
            port: 13133
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 13133
          initialDelaySeconds: 10
          periodSeconds: 5
      volumes:
      - name: config
        configMap:
          name: otel-collector-config
---
apiVersion: v1
kind: Service
metadata:
  name: otel-collector
  namespace: observability
spec:
  type: ClusterIP
  selector:
    app: otel-collector
  ports:
  - name: otlp-grpc
    port: 4317
    targetPort: 4317
  - name: otlp-http
    port: 4318
    targetPort: 4318
```

## Cost Optimization Examples

### Before Interval Processor

Without aggregation, a service emitting metrics every second generates:

- 86,400 data points per metric per day
- 100 metrics = 8.64 million data points per day
- At $0.10 per 1M data points = $0.86/day per service

### After Interval Processor

With 60-second aggregation:

- 1,440 data points per metric per day
- 100 metrics = 144,000 data points per day
- At $0.10 per 1M data points = $0.014/day per service

**Savings: 98.4% reduction in data points and costs** for metrics that can tolerate interval-based latest-value exports.

## Validating Aggregation Behavior

To verify that the Interval Processor is working correctly:

```yaml
exporters:
  # Add debug exporter to see processed metrics
  debug:
    verbosity: detailed
    sampling_initial: 10
    sampling_thereafter: 100

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [interval, batch]
      # Include debug exporter for validation
      exporters: [otlphttp, debug]
```

Check the Collector logs to verify that metrics are exported at the configured interval. Debug exporter output formats can change between Collector versions, so use it to inspect the emitted metrics rather than relying on exact log messages:

```bash
# View Collector logs
kubectl logs -n observability deployment/otel-collector -f
```

## Common Use Cases

### Reducing High-Frequency Infrastructure Metrics

System metrics often emit at 1-second intervals but don't need that granularity:

```yaml
processors:
  filter/infrastructure:
    error_mode: ignore
    metric_conditions:
      - 'not IsMatch(metric.name, "^system[.].*") and not IsMatch(metric.name, "^process[.].*") and not IsMatch(metric.name, "^container[.].*")'

  interval/infrastructure:
    interval: 300s  # 5-minute aggregation
```

### Long-Term Retention with Downsampling

Create multiple pipelines with different aggregation intervals for tiered retention:

```yaml
processors:
  # Short-term: 1-minute aggregation for 7 days
  interval/short_term:
    interval: 60s

  # Medium-term: 5-minute aggregation for 30 days
  interval/medium_term:
    interval: 300s

  # Long-term: 1-hour aggregation for 1 year
  interval/long_term:
    interval: 3600s

exporters:
  otlphttp/short_term:
    endpoint: https://oneuptime.com/otlp/short
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

  otlphttp/medium_term:
    endpoint: https://oneuptime.com/otlp/medium
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

  otlphttp/long_term:
    endpoint: https://oneuptime.com/otlp/long
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

service:
  pipelines:
    metrics/short:
      receivers: [otlp]
      processors: [interval/short_term, batch]
      exporters: [otlphttp/short_term]

    metrics/medium:
      receivers: [otlp]
      processors: [interval/medium_term, batch]
      exporters: [otlphttp/medium_term]

    metrics/long:
      receivers: [otlp]
      processors: [interval/long_term, batch]
      exporters: [otlphttp/long_term]
```

## Monitoring Interval Processor

Track Collector internal telemetry to ensure the processor is working efficiently:

```yaml
service:
  telemetry:
    logs:
      level: info
    metrics:
      level: detailed
```

Create alerts for:

- Collector memory usage approaching memory limits
- Processor or exporter errors in Collector logs
- Unexpected drops in emitted metrics

## Troubleshooting

### Metrics Not Being Aggregated

If metrics bypass aggregation, confirm that the metric type is supported. Delta metrics and non-monotonic sums are passed through unchanged:

```yaml
processors:
  interval:
    interval: 60s
```

Use the debug exporter to inspect emitted metrics:

```yaml
exporters:
  debug:
    verbosity: detailed
```

### Memory Usage Growing

If the processor consumes excessive memory:

```yaml
processors:
  # Add memory limiter before interval processor
  memory_limiter:
    check_interval: 1s
    limit_mib: 2048

  interval:
    interval: 60s
```

## Best Practices

1. **Match interval to query patterns**: Set aggregation intervals based on how you query metrics (1m for dashboards, 5m for long-term analysis)
2. **Preserve key attributes upstream**: The processor groups metric streams by their existing identity, so manage high-cardinality attributes before interval aggregation
3. **Start conservative**: Begin with longer intervals (120s) and reduce if you need more granularity
4. **Monitor memory**: The processor buffers metrics in memory; ensure adequate resources
5. **Use multiple pipelines**: Create separate pipelines for metrics with different aggregation requirements

## Performance Considerations

The Interval Processor's memory usage scales with:

- Number of unique metric time series
- Number of resource and data point attributes that define those time series
- Aggregation interval duration

For high-cardinality environments, consider:

- Shorter intervals to reduce buffer size
- Filtering metrics before aggregation
- Horizontal scaling of Collector instances

## Related Resources

- [What is OpenTelemetry Collector and Why Use One](https://oneuptime.com/blog/post/2025-09-18-what-is-opentelemetry-collector-and-why-use-one/view)
- [How to Reduce Noise in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-25-how-to-reduce-noise-in-opentelemetry/view)
- [How to Configure the Metrics Generation Processor in OpenTelemetry Collector](https://oneuptime.com/blog/post/2026-02-06-metrics-generation-processor-opentelemetry-collector/view)

## Final Thoughts

The Interval Processor is a useful tool for managing metrics volume and costs when your metrics can tolerate interval-based latest-value exports. By aggregating high-frequency metrics at appropriate intervals, you reduce data points sent to your backend while keeping the latest values for supported metric streams.

Start by identifying metrics that don't require second-by-second granularity, configure appropriate aggregation intervals based on your query patterns, and monitor the processor's performance to ensure it operates efficiently. With the Interval Processor, you gain control over metrics volume while keeping your observability costs predictable and manageable.
