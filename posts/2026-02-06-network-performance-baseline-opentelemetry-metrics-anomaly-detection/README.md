# How to Build a Network Performance Baseline from OpenTelemetry Metrics for Anomaly Detection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Anomaly Detection, Network Performance, Metrics Baseline

Description: Build a network performance baseline from OpenTelemetry metrics and use it to detect anomalies in your infrastructure.

Static thresholds for network alerts are a constant source of pain. Set them too tight and you drown in false positives. Set them too loose and you miss real problems. The better approach is to build a baseline of what "normal" looks like for your network and then alert when behavior deviates from that baseline.

OpenTelemetry gives you the raw metrics. This post covers how to collect the right network metrics, compute rolling baselines, and set up anomaly detection that adapts to your actual traffic patterns.

## Choosing the Right Metrics for Baselining

Not every network metric is worth baselining. Focus on metrics that have predictable patterns and where deviations actually indicate problems:

- **Throughput** (`system.network.io`) - Usually follows daily and weekly patterns tied to user traffic
- **Latency** (from span data or synthetic probes) - Should be relatively stable for a given path
- **Error rates** (`system.network.errors`) - Should be near zero; any sustained increase is notable
- **TCP retransmissions** - Reflects network quality; a jump often means congestion or packet loss
- **Connection counts** (`system.network.connections`) - Follows application load patterns

## Collecting the Metrics

Here is an OpenTelemetry Collector config that captures the network metrics we need for baselining. We scrape at 30-second intervals to get enough granularity:

```yaml
# otel-collector-config.yaml
receivers:
  hostmetrics:
    collection_interval: 30s
    scrapers:
      network:
        exclude:
          interfaces:
            - "^lo$"
            - "^veth"
          match_type: regexp
      # Include CPU for correlation with network activity
      cpu:

  # Also collect from your application spans
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  cumulativetodelta:
    include:
      metrics:
        - system.network.io
        - system.network.errors
        - system.network.packets
        - system.network.dropped
      match_type: strict

  # Calculate per-second rates from the deltas
  metricstransform:
    transforms:
      - include: system.network.io
        action: update
        operations:
          - action: aggregate_labels
            aggregation_type: sum
            label_set: [direction]

  batch:
    timeout: 10s

exporters:
  otlp:
    endpoint: "https://your-backend.example.com:4317"

service:
  pipelines:
    metrics:
      receivers: [hostmetrics]
      processors: [cumulativetodelta, batch]
      exporters: [otlp]
```

## Computing the Baseline

A good baseline accounts for time-of-day and day-of-week patterns. Here is a Python script that computes a rolling baseline using historical data from your metrics backend. It uses simple statistical methods that work well in practice:

```python
# baseline_calculator.py
import numpy as np
from datetime import datetime, timedelta

def compute_hourly_baseline(metric_data, lookback_weeks=4):
    """
    Compute baseline stats for each hour-of-week bucket.
    metric_data is a list of (timestamp, value) tuples.
    Returns a dict mapping (day_of_week, hour) to (mean, stddev).
    """
    buckets = {}

    for timestamp, value in metric_data:
        dt = datetime.fromtimestamp(timestamp)
        key = (dt.weekday(), dt.hour)

        if key not in buckets:
            buckets[key] = []
        buckets[key].append(value)

    baseline = {}
    for key, values in buckets.items():
        arr = np.array(values)
        baseline[key] = {
            "mean": float(np.mean(arr)),
            "stddev": float(np.std(arr)),
            # Use percentiles for non-normal distributions
            "p50": float(np.percentile(arr, 50)),
            "p95": float(np.percentile(arr, 95)),
            "p99": float(np.percentile(arr, 99)),
        }

    return baseline


def is_anomalous(current_value, baseline_stats, sensitivity=3.0):
    """
    Check if a current value is anomalous compared to the baseline.
    Uses a z-score approach with configurable sensitivity.
    sensitivity=3.0 means alert if value is 3 standard deviations from mean.
    """
    mean = baseline_stats["mean"]
    stddev = baseline_stats["stddev"]

    # Avoid division by zero for very stable metrics
    if stddev < 0.001:
        stddev = 0.001

    z_score = abs(current_value - mean) / stddev
    return z_score > sensitivity, z_score
```

## Running Anomaly Detection as a Scheduled Job

You can run anomaly detection as a cron job that queries your metrics backend, compares current values to the baseline, and fires alerts. Here is a practical implementation:

```python
# anomaly_detector.py
import requests
from baseline_calculator import compute_hourly_baseline, is_anomalous
from datetime import datetime

# Query the last 4 weeks of data to build the baseline
def fetch_metric_history(metric_name, hours=672):
    """Fetch historical metric data from your OTLP-compatible backend."""
    response = requests.get(
        "https://your-backend.example.com/api/v1/query_range",
        params={
            "query": metric_name,
            "start": f"-{hours}h",
            "end": "now",
            "step": "5m",
        },
    )
    data = response.json()
    # Return as list of (timestamp, value) tuples
    return [(float(p[0]), float(p[1])) for p in data["data"]["result"][0]["values"]]


def check_network_metrics():
    metrics_to_check = [
        "system_network_io_total{direction='receive'}",
        "system_network_io_total{direction='transmit'}",
        "system_network_errors_total",
    ]

    now = datetime.now()
    current_bucket = (now.weekday(), now.hour)

    for metric in metrics_to_check:
        history = fetch_metric_history(metric)
        baseline = compute_hourly_baseline(history)

        if current_bucket not in baseline:
            continue

        # Get the most recent value
        current_value = history[-1][1]
        bucket_stats = baseline[current_bucket]

        anomalous, z_score = is_anomalous(current_value, bucket_stats)

        if anomalous:
            send_alert(
                metric=metric,
                current=current_value,
                expected_mean=bucket_stats["mean"],
                z_score=z_score,
            )


def send_alert(metric, current, expected_mean, z_score):
    """Send an alert via your preferred channel."""
    print(f"ANOMALY: {metric}")
    print(f"  Current: {current:.2f}, Expected: {expected_mean:.2f}")
    print(f"  Z-score: {z_score:.2f}")
```

## Handling Edge Cases

Baselines take time to stabilize. During the first few weeks, you may not have enough data for reliable detection. Set a minimum sample count (at least 3 data points per bucket) before trusting the baseline.

Deployments and intentional changes will trigger false positives. Integrate your deployment pipeline to temporarily suppress anomaly alerts for 30-60 minutes after a deploy. You can do this by checking a deployment marker in your detection loop.

Seasonal events like Black Friday or marketing campaigns break patterns. For these, consider maintaining separate baselines for known high-traffic periods or temporarily widening your sensitivity threshold.

## Wrapping Up

Building a performance baseline from OpenTelemetry metrics is not complicated, but it requires some discipline. Collect at a consistent interval, account for time-based patterns, and use statistical methods that tolerate some noise. The result is an anomaly detection system that learns what normal looks like for your specific infrastructure rather than relying on guesswork thresholds.
