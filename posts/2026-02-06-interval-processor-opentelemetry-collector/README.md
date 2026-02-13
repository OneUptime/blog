# How to Configure the Interval Processor in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Processors, Interval, Metrics, Aggregation, Observability

Description: Learn how to configure the Interval Processor in OpenTelemetry Collector to aggregate and downsample metrics at configurable intervals for reduced cardinality and storage costs.

High-frequency metrics can overwhelm your observability backend and drive up storage costs. The Interval Processor addresses this by aggregating metrics over configurable time windows, reducing cardinality while preserving statistical accuracy. This processor is particularly valuable for high-volume metrics that don't require second-by-second granularity.

## What Is the Interval Processor?

The Interval Processor aggregates metrics over specified time intervals before exporting them. Instead of forwarding every metric data point as it arrives, the processor buffers metrics and emits aggregated values at regular intervals. This reduces the volume of data sent to backends while maintaining statistical properties like sum, count, min, max, and percentiles.

This is useful when:

- You have high-frequency metrics that don't need real-time granularity
- Your backend charges based on data points or ingestion volume
- You want to reduce network bandwidth between Collector and backend
- You need to downsample metrics for long-term retention

## Architecture Overview

The Interval Processor sits between receivers and exporters, buffering and aggregating metrics:

```mermaid
graph LR
    A[Services emitting metrics every 1s] -->|High frequency| B[Interval Processor]
    B -->|Aggregated every 60s| C[Backend]

    style B fill:#f9f,stroke:#333,stroke-width:2px
```

Metrics arrive at high frequency, get buffered and aggregated, then exported at the configured interval with statistical properties preserved.

## Basic Configuration

Here's a minimal Interval Processor configuration that aggregates metrics every 60 seconds:

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
  # The interval processor aggregates metrics over time windows
  interval:
    # Export aggregated metrics every 60 seconds
    # All metrics received during this window are aggregated
    interval: 60s

    # Specify which metric types to aggregate
    # Options: gauge, sum, histogram, exponential_histogram, summary
    aggregation:
      # Gauge metrics: emit the last value seen in the interval
      gauge: last

      # Sum metrics: accumulate all values in the interval
      sum: cumulative

      # Histogram metrics: merge all histograms in the interval
      histogram: explicit

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

The Interval Processor supports different aggregation strategies for different metric types:

### Gauge Aggregation

Gauges represent point-in-time values. Common aggregation strategies:

```yaml
processors:
  interval:
    interval: 60s
    aggregation:
      # last: Emit the most recent value (default)
      # Useful for: temperature, memory usage, queue depth
      gauge: last

      # first: Emit the first value in the interval
      # Useful for: configuration values, version numbers

      # min: Emit the minimum value in the interval
      # Useful for: resource low-water marks

      # max: Emit the maximum value in the interval
      # Useful for: peak resource usage

      # mean: Emit the average of all values in the interval
      # Useful for: smoothing noisy sensors
```

### Sum Aggregation

Sums represent accumulated values. Aggregation strategies:

```yaml
processors:
  interval:
    interval: 60s
    aggregation:
      # cumulative: Add all values in the interval (default)
      # Useful for: request counts, byte counts, error counts
      sum: cumulative

      # delta: Emit the difference between last and first value
      # Useful for: converting cumulative counters to rates
```

### Histogram Aggregation

Histograms represent distributions. Aggregation strategies:

```yaml
processors:
  interval:
    interval: 60s
    aggregation:
      # explicit: Merge all histogram buckets in the interval
      # Preserves distribution characteristics
      histogram: explicit

      # This combines bucket counts across the interval
      # Resulting histogram represents the full distribution
```

## Advanced Configuration

### Metric-Specific Intervals

Configure different intervals for different metric patterns:

```yaml
processors:
  # High-frequency system metrics - aggregate aggressively
  interval/system:
    interval: 120s
    # Match metrics by name pattern
    include:
      match_type: regexp
      metric_names:
        - "^system\\..*"
        - "^process\\..*"

    aggregation:
      gauge: last
      sum: cumulative

  # Application metrics - moderate aggregation
  interval/application:
    interval: 60s
    include:
      match_type: regexp
      metric_names:
        - "^http\\..*"
        - "^rpc\\..*"

    aggregation:
      gauge: last
      sum: cumulative
      histogram: explicit

  # Business metrics - minimal aggregation for accuracy
  interval/business:
    interval: 30s
    include:
      match_type: regexp
      metric_names:
        - "^checkout\\..*"
        - "^payment\\..*"

    aggregation:
      gauge: last
      sum: cumulative
```

### Resource-Aware Aggregation

Aggregate metrics while preserving important resource attributes:

```yaml
processors:
  interval:
    interval: 60s

    # Preserve these resource attributes during aggregation
    # Metrics with different values for these attributes are aggregated separately
    resource_attributes:
      - service.name
      - service.namespace
      - deployment.environment
      - k8s.cluster.name

    # Preserve these metric attributes during aggregation
    metric_attributes:
      - http.method
      - http.route
      - http.status_code

    aggregation:
      gauge: last
      sum: cumulative
      histogram: explicit
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

  # High-frequency system metrics - aggressive aggregation
  interval/system:
    interval: 120s

    include:
      match_type: regexp
      metric_names:
        - "^system\\.cpu\\..*"
        - "^system\\.memory\\..*"
        - "^system\\.disk\\..*"
        - "^system\\.network\\..*"
        - "^process\\.cpu\\..*"
        - "^process\\.memory\\..*"

    # Preserve critical attributes
    resource_attributes:
      - service.name
      - host.name
      - deployment.environment

    aggregation:
      # Use last value for gauges
      gauge: last
      # Accumulate counters
      sum: cumulative

  # Application metrics - moderate aggregation
  interval/application:
    interval: 60s

    include:
      match_type: regexp
      metric_names:
        - "^http\\.server\\..*"
        - "^http\\.client\\..*"
        - "^rpc\\.server\\..*"
        - "^rpc\\.client\\..*"
        - "^db\\.client\\..*"

    resource_attributes:
      - service.name
      - deployment.environment

    metric_attributes:
      - http.method
      - http.route
      - http.status_code
      - rpc.method
      - rpc.service

    aggregation:
      gauge: last
      sum: cumulative
      histogram: explicit

  # Business-critical metrics - minimal aggregation
  interval/business:
    interval: 30s

    include:
      match_type: regexp
      metric_names:
        - "^checkout\\..*"
        - "^payment\\..*"
        - "^order\\..*"
        - "^revenue\\..*"

    resource_attributes:
      - service.name
      - deployment.environment
      - customer.tier

    metric_attributes:
      - payment.method
      - order.status

    aggregation:
      gauge: last
      sum: cumulative

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
  logging:
    loglevel: info
    sampling_initial: 5
    sampling_thereafter: 50

service:
  extensions: [health_check, pprof]

  pipelines:
    # System metrics with aggressive aggregation
    metrics/system:
      receivers: [otlp]
      processors: [memory_limiter, interval/system, resource, batch]
      exporters: [otlphttp/primary]

    # Application metrics with moderate aggregation
    metrics/application:
      receivers: [otlp]
      processors: [memory_limiter, interval/application, resource, batch]
      exporters: [otlphttp/primary]

    # Business metrics with minimal aggregation
    metrics/business:
      receivers: [otlp]
      processors: [memory_limiter, interval/business, resource, batch]
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

      # Aggregate high-frequency metrics
      interval/high_frequency:
        interval: 120s
        include:
          match_type: regexp
          metric_names:
            - "^system\\..*"
            - "^process\\..*"
            - "^runtime\\..*"
        aggregation:
          gauge: last
          sum: cumulative

      # Standard aggregation for most metrics
      interval/standard:
        interval: 60s
        exclude:
          match_type: regexp
          metric_names:
            - "^system\\..*"
            - "^process\\..*"
            - "^runtime\\..*"
        aggregation:
          gauge: last
          sum: cumulative
          histogram: explicit

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
        metrics:
          receivers: [otlp]
          processors: [memory_limiter, interval/high_frequency, interval/standard, batch]
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
        image: otel/opentelemetry-collector-contrib:0.93.0
        args:
          - "--config=/conf/collector.yaml"
        env:
        - name: ONEUPTIME_TOKEN
          valueFrom:
            secretKeyRef:
              name: oneuptime-credentials
              key: token
        - name: COLLECTOR_VERSION
          value: "0.93.0"
        volumeMounts:
        - name: config
          mountPath: /conf
        ports:
        - containerPort: 4317
          name: otlp-grpc
        - containerPort: 4318
          name: otlp-http
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

**Savings: 98.4% reduction in data points and costs** while maintaining statistical accuracy for analysis and alerting.

## Validating Aggregation Behavior

To verify that the Interval Processor is working correctly:

```yaml
exporters:
  # Add logging exporter to see aggregated metrics
  logging:
    loglevel: debug
    sampling_initial: 10
    sampling_thereafter: 100

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [interval, batch]
      # Include logging exporter for validation
      exporters: [otlphttp, logging]
```

Check the Collector logs to verify aggregation intervals:

```bash
# View Collector logs
kubectl logs -n observability deployment/otel-collector -f | grep -A 3 "interval"

# Expected output showing aggregated metrics:
# Aggregated 450 data points into 8 metrics over 60s interval
# Emitting aggregated metrics: system.cpu.utilization (last=45.2%)
# Emitting aggregated metrics: http.server.request.count (sum=1250)
```

## Common Use Cases

### Reducing High-Frequency Infrastructure Metrics

System metrics often emit at 1-second intervals but don't need that granularity:

```yaml
processors:
  interval/infrastructure:
    interval: 300s  # 5-minute aggregation

    include:
      match_type: regexp
      metric_names:
        - "^system\\..*"
        - "^process\\..*"
        - "^container\\..*"

    aggregation:
      gauge: mean  # Use mean for smoothing
      sum: cumulative
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

Track Interval Processor metrics to ensure aggregation is working efficiently:

```yaml
service:
  telemetry:
    logs:
      level: info
    metrics:
      level: detailed
      address: 0.0.0.0:8888

# Monitor these metrics:
# - otelcol_processor_interval_metrics_aggregated
# - otelcol_processor_interval_metrics_emitted
# - otelcol_processor_interval_buffer_size
# - otelcol_processor_interval_aggregation_time_seconds
```

Create alerts for:

- Buffer size approaching memory limits
- Aggregation latency exceeding interval duration
- Unexpected drops in emitted metrics

## Troubleshooting

### Metrics Not Being Aggregated

If metrics bypass aggregation:

```yaml
processors:
  interval:
    interval: 60s

    # Check include/exclude filters are correct
    include:
      match_type: regexp
      metric_names:
        - ".*"  # Match all metrics

    # Enable debug logging
    debug:
      enabled: true
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

    # Reduce buffering for high-cardinality metrics
    max_buffered_metrics: 10000
```

## Best Practices

1. **Match interval to query patterns**: Set aggregation intervals based on how you query metrics (1m for dashboards, 5m for long-term analysis)
2. **Preserve key attributes**: Always specify resource and metric attributes that are important for filtering and grouping
3. **Start conservative**: Begin with longer intervals (120s) and reduce if you need more granularity
4. **Monitor memory**: The processor buffers metrics in memory; ensure adequate resources
5. **Use multiple pipelines**: Create separate pipelines for metrics with different aggregation requirements

## Performance Considerations

The Interval Processor's memory usage scales with:

- Number of unique metric time series
- Number of preserved attributes
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

The Interval Processor is a powerful tool for managing metrics volume and costs without sacrificing observability. By aggregating high-frequency metrics at appropriate intervals, you maintain statistical accuracy for analysis and alerting while dramatically reducing data points sent to your backend.

Start by identifying metrics that don't require second-by-second granularity, configure appropriate aggregation intervals based on your query patterns, and monitor the processor's performance to ensure it operates efficiently. With the Interval Processor, you gain control over metrics volume while keeping your observability costs predictable and manageable.
