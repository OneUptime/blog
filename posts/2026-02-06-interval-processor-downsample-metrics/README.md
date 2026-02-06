# How to Use the OpenTelemetry Interval Processor to Downsample Metrics and Reduce Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Interval Processor, Downsampling, Metrics

Description: Use the OpenTelemetry Collector interval processor to reduce metric export frequency and lower backend costs.

Metrics that report every 10 seconds generate six times more data points than metrics that report every 60 seconds. For many use cases - capacity planning, weekly trend analysis, cost tracking - 60-second resolution is more than sufficient. The OpenTelemetry Collector's interval processor lets you downsample metrics in-flight, reducing data point volume without modifying application code.

## What the Interval Processor Does

The interval processor aggregates incoming metric data points over a configurable time window and emits a single aggregated data point per interval. If your application exports a counter every 15 seconds but the interval processor is set to 60 seconds, the processor accumulates four data points and exports one.

This works differently for each metric type:

- **Counters (cumulative)**: The processor passes through the latest cumulative value at each interval boundary
- **Gauges**: The processor emits the last observed value at each interval boundary
- **Histograms**: Bucket counts are accumulated and emitted as a single histogram per interval

## Basic Configuration

Here is a minimal Collector configuration that downsamples all metrics from 15-second to 60-second intervals:

```yaml
# Collector config using the interval processor to reduce
# metric export frequency from 15s to 60s.
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # The interval processor collects data points over the
  # specified interval and emits aggregated results.
  interval:
    interval: 60s
    # Passthrough gauge metrics without modification since
    # gauges represent point-in-time values.
    passthrough_gauges: false

  batch:
    send_batch_size: 8192
    timeout: 10s

exporters:
  otlphttp:
    endpoint: https://metrics-backend.internal:4318

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [interval, batch]
      exporters: [otlphttp]
```

## Advanced: Selective Downsampling

Not all metrics should be downsampled equally. Infrastructure metrics for autoscaling need high resolution (15s), while business metrics for weekly reports can tolerate 5-minute intervals. Use multiple pipelines with the routing connector to apply different intervals:

```yaml
# Collector config with multiple interval processors for
# different metric tiers: high-res for alerting, low-res for reporting.
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # High-resolution pipeline: 15-second intervals for
  # metrics used in autoscaling and real-time alerting.
  interval/high_res:
    interval: 15s

  # Standard pipeline: 60-second intervals for dashboards
  # and operational metrics.
  interval/standard:
    interval: 60s

  # Low-resolution pipeline: 5-minute intervals for
  # business metrics and capacity planning.
  interval/low_res:
    interval: 300s

  batch:
    send_batch_size: 8192
    timeout: 10s

connectors:
  routing/metrics:
    default_pipelines: [metrics/standard]
    error_mode: ignore
    table:
      # Route autoscaling metrics to high-res pipeline
      - condition: IsMatch(metric.name, ".*cpu.*|.*memory.*|.*request_rate.*")
        pipelines: [metrics/high_res]
      # Route business metrics to low-res pipeline
      - condition: IsMatch(metric.name, ".*revenue.*|.*signups.*|.*monthly.*")
        pipelines: [metrics/low_res]

exporters:
  otlphttp:
    endpoint: https://metrics-backend.internal:4318

service:
  pipelines:
    metrics/ingest:
      receivers: [otlp]
      processors: []
      exporters: [routing/metrics]

    metrics/high_res:
      receivers: [routing/metrics]
      processors: [interval/high_res, batch]
      exporters: [otlphttp]

    metrics/standard:
      receivers: [routing/metrics]
      processors: [interval/standard, batch]
      exporters: [otlphttp]

    metrics/low_res:
      receivers: [routing/metrics]
      processors: [interval/low_res, batch]
      exporters: [otlphttp]
```

## Cost Reduction Math

The savings scale linearly with the downsampling ratio. Here is what it looks like for a pipeline generating 100,000 metric data points per second:

```python
# Calculate cost savings from downsampling metrics.
original_interval_sec = 15
data_points_per_sec = 100_000

# Scenario 1: Downsample to 60s
new_interval_sec = 60
reduction_factor = new_interval_sec / original_interval_sec  # 4x
new_data_points_per_sec = data_points_per_sec / reduction_factor  # 25,000

# Monthly data point volume
monthly_original = data_points_per_sec * 60 * 60 * 24 * 30  # 259.2 billion
monthly_new = new_data_points_per_sec * 60 * 60 * 24 * 30   # 64.8 billion

# Assuming $1.50 per billion data points
cost_original = monthly_original / 1e9 * 1.50   # $388.80
cost_new = monthly_new / 1e9 * 1.50             # $97.20
savings = cost_original - cost_new               # $291.60/month

print(f"Original: ${cost_original:.2f}/month")
print(f"After 60s downsampling: ${cost_new:.2f}/month")
print(f"Monthly savings: ${savings:.2f} ({(savings/cost_original)*100:.0f}%)")
```

## Preserving Metric Fidelity

Downsampling comes with tradeoffs. A CPU spike that lasts 5 seconds will be invisible in 60-second resolution data. To mitigate this:

1. **Keep high resolution for alerting metrics**: Route metrics used in critical alerts through the high-res pipeline
2. **Use min/max alongside average**: If your application records gauge metrics, emit min and max values alongside the current value so that spikes are preserved even at lower resolution

```python
# Record both current value and extremes so downsampling
# does not hide spikes in gauge-type metrics.
from opentelemetry import metrics

meter = metrics.get_meter("my-service")

# Instead of just recording the current queue depth,
# also record the peak depth seen in the reporting interval.
queue_depth = meter.create_gauge(
    "queue.depth.current",
    description="Current queue depth"
)
queue_depth_peak = meter.create_gauge(
    "queue.depth.peak",
    description="Peak queue depth in interval"
)
```

## When Not to Downsample

Some metrics should never be downsampled:

- **SLO error budget burn rate**: Needs 15-second or finer resolution to detect fast burns
- **Autoscaler input metrics**: HPA decisions depend on recent, granular data
- **Request latency percentiles used in alerting**: p99 latency alerts need high-resolution histograms

The interval processor is one of the simplest and most effective cost reduction tools in the Collector. Start by downsampling non-critical metrics to 60 seconds, measure the cost impact, and then selectively apply higher downsampling to reporting-only metrics. Most teams find they can reduce metric data point volume by 50-75% without any impact on their alerting or dashboarding.
