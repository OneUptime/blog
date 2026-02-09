# How to Monitor and Predict Storage Capacity Needs from OpenTelemetry Telemetry Volume Trends

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Storage Capacity, Telemetry Volume, Forecasting

Description: Track how much telemetry data your OpenTelemetry pipeline produces and predict when your storage backend will run out of space.

Telemetry backends are hungry for disk. If you run Prometheus, ClickHouse, Elasticsearch, or any other storage system for your OpenTelemetry data, you have probably experienced the unpleasant surprise of running out of disk space. The irony is that the observability system meant to prevent outages can cause one if you do not monitor its own storage consumption.

This post covers how to track telemetry volume through the OpenTelemetry pipeline, forecast storage growth, and get ahead of capacity problems.

## Measuring Telemetry Volume at the Collector

The OpenTelemetry Collector tracks how many spans, metrics, and log records flow through it. These counters are your primary input for storage forecasting.

This collector config enables the internal metrics you need for volume tracking:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    send_batch_size: 8192
    timeout: 5s

exporters:
  otlphttp:
    endpoint: "https://storage-backend:443"

service:
  telemetry:
    metrics:
      level: detailed
      address: 0.0.0.0:8888
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

## Key Volume Metrics

Once the collector is reporting its internals, these PromQL queries tell you exactly how much data is flowing through.

These queries calculate throughput for each telemetry signal type:

```promql
# Spans per second across all collectors
sum(rate(otelcol_receiver_accepted_spans_total[5m]))

# Metric data points per second
sum(rate(otelcol_receiver_accepted_metric_points_total[5m]))

# Log records per second
sum(rate(otelcol_receiver_accepted_log_records_total[5m]))

# Total exporter bytes sent per second (if available)
sum(rate(otelcol_exporter_sent_bytes_total[5m]))

# Breakdown by service to find the top producers
topk(10,
  sum by (service_name) (rate(otelcol_receiver_accepted_spans_total[1h]))
)
```

## Estimating Storage Consumption

The tricky part is converting "spans per second" into "gigabytes per day." The conversion factor depends on your storage backend and the average span size. Here is how to measure it empirically.

This script correlates telemetry throughput with actual disk usage growth to find your storage ratio:

```python
import requests
from datetime import datetime, timedelta

PROM_URL = "http://prometheus:9090"

def query_range(promql, days=7, step="1h"):
    end = datetime.now()
    start = end - timedelta(days=days)
    resp = requests.get(f"{PROM_URL}/api/v1/query_range", params={
        "query": promql,
        "start": start.timestamp(),
        "end": end.timestamp(),
        "step": step
    })
    return resp.json()["data"]["result"]

# Get total spans ingested over the last 7 days
spans_total = query_range(
    'sum(increase(otelcol_receiver_accepted_spans_total[1h]))',
    days=7
)

total_spans_7d = sum(float(v[1]) for v in spans_total[0]["values"])

# Get disk usage growth over the same period (example for Prometheus TSDB)
disk_start = query_range(
    'prometheus_tsdb_storage_blocks_bytes',
    days=7
)

if disk_start[0]["values"]:
    disk_first = float(disk_start[0]["values"][0][1])
    disk_last = float(disk_start[0]["values"][-1][1])
    disk_growth_bytes = disk_last - disk_first
    disk_growth_gb = disk_growth_bytes / (1024 ** 3)

    # Calculate bytes per span (your storage efficiency ratio)
    bytes_per_span = disk_growth_bytes / total_spans_7d if total_spans_7d > 0 else 0

    print(f"7-day stats:")
    print(f"  Total spans ingested: {total_spans_7d:,.0f}")
    print(f"  Disk growth: {disk_growth_gb:.2f} GB")
    print(f"  Average bytes per span: {bytes_per_span:.0f}")
    print(f"  Daily storage rate: {disk_growth_gb / 7:.2f} GB/day")
```

## Building the Storage Forecast

With the storage ratio established, you can project forward. The forecast accounts for both current volume and the growth trend.

This function computes a storage forecast including a growth trend from the last 90 days:

```python
import numpy as np

def forecast_storage_exhaustion(current_usage_gb, total_capacity_gb,
                                 daily_rates_gb, forecast_days=180):
    """
    Predict when storage will be full based on recent daily consumption.

    Args:
        current_usage_gb: Current disk usage
        total_capacity_gb: Total available disk space
        daily_rates_gb: List of daily storage consumption values (last N days)
        forecast_days: How far ahead to project
    """
    days = np.arange(len(daily_rates_gb))
    rates = np.array(daily_rates_gb)

    # Fit a linear trend to the daily consumption rate itself
    # This captures whether ingestion volume is growing or shrinking
    slope, intercept = np.polyfit(days, rates, 1)

    remaining_gb = total_capacity_gb - current_usage_gb
    cumulative = 0
    days_until_full = None

    for day in range(1, forecast_days + 1):
        # Predicted daily rate = base rate + growth trend
        predicted_daily = intercept + slope * (len(daily_rates_gb) + day)
        predicted_daily = max(predicted_daily, 0)  # Cannot be negative
        cumulative += predicted_daily

        if cumulative >= remaining_gb and days_until_full is None:
            days_until_full = day

    if days_until_full:
        from datetime import datetime, timedelta
        exhaustion_date = datetime.now() + timedelta(days=days_until_full)
        print(f"Storage will be exhausted in {days_until_full} days ({exhaustion_date.date()})")
        print(f"  Current usage: {current_usage_gb:.1f} GB / {total_capacity_gb:.1f} GB")
        print(f"  Current daily rate: {daily_rates_gb[-1]:.2f} GB/day")
        print(f"  Projected daily rate in 30 days: {intercept + slope * (len(daily_rates_gb) + 30):.2f} GB/day")
    else:
        print(f"Storage is sufficient for the next {forecast_days} days")

# Example usage with real data
forecast_storage_exhaustion(
    current_usage_gb=450,
    total_capacity_gb=1000,
    daily_rates_gb=[2.1, 2.3, 2.2, 2.4, 2.5, 2.3, 2.6, 2.7, 2.5, 2.8,
                    2.9, 2.7, 3.0, 3.1, 2.9, 3.2, 3.0, 3.3, 3.1, 3.4,
                    3.2, 3.5, 3.3, 3.6, 3.4, 3.7, 3.5, 3.8, 3.6, 3.9]
)
```

## Alerting Before You Run Out

Set up Prometheus alerts that fire when the forecast indicates you are within your provisioning lead time. If it takes two weeks to provision more storage, alert when the forecast shows less than three weeks remaining.

These alerts fire based on both the linear projection and the absolute usage percentage:

```yaml
# storage-alerts.yaml
groups:
  - name: storage_capacity
    rules:
      # Alert based on linear projection of disk usage
      - alert: StorageExhaustionForecast
        expr: |
          (
            node_filesystem_avail_bytes{mountpoint="/data"}
            /
            deriv(node_filesystem_avail_bytes{mountpoint="/data"}[7d])
          ) < 21 * 24 * 3600
          and
          deriv(node_filesystem_avail_bytes{mountpoint="/data"}[7d]) < 0
        for: 6h
        labels:
          severity: warning
        annotations:
          summary: "Storage projected to be exhausted within 21 days"

      # Hard threshold alert as a safety net
      - alert: StorageUsageHigh
        expr: |
          (1 - node_filesystem_avail_bytes{mountpoint="/data"}
               / node_filesystem_size_bytes{mountpoint="/data"}) > 0.85
        for: 1h
        labels:
          severity: critical
        annotations:
          summary: "Storage usage exceeds 85%"

      # Track telemetry volume growth rate
      - alert: TelemetryVolumeSpike
        expr: |
          sum(rate(otelcol_receiver_accepted_spans_total[1h]))
          / sum(rate(otelcol_receiver_accepted_spans_total[1h] offset 1d))
          > 1.5
        for: 2h
        labels:
          severity: warning
        annotations:
          summary: "Telemetry volume increased by more than 50% compared to yesterday"
```

## Controlling Volume Growth

When the forecast says you are running out of space, you have two options: add more storage or reduce telemetry volume. Often, reducing volume is the faster fix.

Use the OpenTelemetry Collector's `filter` processor to drop telemetry you do not need.

This processor config drops health check spans and debug-level logs that typically consume storage without providing value:

```yaml
processors:
  filter:
    traces:
      span:
        - 'attributes["http.route"] == "/healthz"'
        - 'attributes["http.route"] == "/readyz"'
        - 'name == "health_check"'
    logs:
      log_record:
        - 'severity_number < 9'  # Drop DEBUG and TRACE logs

  # Tail sampling keeps only a percentage of normal traces
  # but retains all error traces
  tail_sampling:
    decision_wait: 10s
    policies:
      - name: error-traces
        type: status_code
        status_code: {status_codes: [ERROR]}
      - name: sample-normal
        type: probabilistic
        probabilistic: {sampling_percentage: 10}
```

Keeping an eye on your own telemetry storage is one of those meta-problems that is easy to ignore until it bites you. The combination of OpenTelemetry's internal metrics with basic forecasting math gives you weeks of advance warning instead of a 3 AM page about a full disk.
