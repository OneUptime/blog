# How to Monitor Bigtable Performance Using Cloud Monitoring Dashboards

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Bigtable, Cloud Monitoring, Dashboards, Performance

Description: Learn how to set up Cloud Monitoring dashboards for Cloud Bigtable to track latency, throughput, CPU usage, and storage metrics for optimal performance.

---

Running a Bigtable cluster without monitoring is like driving without a dashboard. You have no idea how fast you are going, whether you are running low on fuel, or if the engine is overheating. Cloud Monitoring gives you real-time visibility into your Bigtable instance's health - latency, throughput, CPU load, storage, and more. Combined with alerting, it lets you catch problems before they affect your users.

In this guide, I will show you how to set up a comprehensive monitoring dashboard for Bigtable and configure the alerts that matter most.

## Key Metrics to Monitor

Before building a dashboard, you need to know which metrics are important. Here are the ones I always watch:

**CPU utilization**: This is your primary capacity indicator. Bigtable recommends keeping CPU below 70% for production workloads. Above that, you should add nodes.

**Request latency**: The P50, P95, and P99 latencies for read and write operations. Latency spikes usually indicate hotspots or insufficient capacity.

**Throughput**: Rows read and written per second. Helps you understand traffic patterns and plan capacity.

**Storage utilization**: Total data stored across the instance. Important for cost management and capacity planning.

**Error rate**: The count and rate of server errors. Should be near zero in normal operation.

## Creating a Dashboard with gcloud

You can create a monitoring dashboard using the `gcloud` CLI with a JSON definition.

```bash
# Create a monitoring dashboard for Bigtable
# This command creates a dashboard with multiple charts
gcloud monitoring dashboards create --config-from-file=bigtable-dashboard.json \
  --project=your-project-id
```

Here is a comprehensive dashboard definition:

```json
{
  "displayName": "Bigtable Performance Dashboard",
  "mosaicLayout": {
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "CPU Utilization by Cluster",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"bigtable.googleapis.com/cluster/cpu_load\" resource.type=\"bigtable_cluster\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_MEAN"
                  }
                }
              }
            }],
            "yAxis": { "label": "CPU %", "scale": "LINEAR" }
          }
        }
      },
      {
        "xPos": 6,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Read/Write Latency (P99)",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"bigtable.googleapis.com/server/latencies\" resource.type=\"bigtable_table\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_PERCENTILE_99"
                  }
                }
              }
            }]
          }
        }
      }
    ]
  }
}
```

## Setting Up Through the Cloud Console

For a more interactive experience, build the dashboard in the Cloud Console.

1. Navigate to Cloud Monitoring in your GCP project
2. Click "Dashboards" in the left sidebar
3. Click "Create Dashboard"
4. Add widgets using the chart builder

For each chart, search for Bigtable metrics by typing "bigtable" in the metric finder. The most useful metrics are under the `bigtable.googleapis.com` prefix.

## Essential Charts to Include

Here are the specific charts I recommend for every Bigtable dashboard.

**CPU Utilization chart**: Shows CPU load per cluster. This is your most important capacity metric.

```
Metric: bigtable.googleapis.com/cluster/cpu_load
Resource: bigtable_cluster
Aggregation: Mean, 1-minute alignment
Threshold line: 70% (warning)
```

**Request Latency chart**: Shows P50 and P99 latency broken down by method type.

```
Metric: bigtable.googleapis.com/server/latencies
Resource: bigtable_table
Aggregation: P50 and P99 percentiles
Group by: method (to separate reads from writes)
```

**Throughput chart**: Shows rows read and written per second.

```
Metric: bigtable.googleapis.com/server/request_count
Resource: bigtable_table
Aggregation: Rate, 1-minute alignment
Group by: method
```

**Storage utilization chart**: Shows total bytes stored.

```
Metric: bigtable.googleapis.com/cluster/storage_utilization
Resource: bigtable_cluster
Aggregation: Mean
```

**Error rate chart**: Shows server-side errors.

```
Metric: bigtable.googleapis.com/server/error_count
Resource: bigtable_table
Aggregation: Sum, 1-minute alignment
```

## Using the Metrics Explorer

For ad-hoc analysis, the Metrics Explorer is more flexible than a fixed dashboard.

```bash
# Query Bigtable metrics using the gcloud CLI
# This is useful for scripting and automation

# Get current CPU utilization
gcloud monitoring metrics list \
  --filter='metric.type = starts_with("bigtable.googleapis.com/cluster/cpu")' \
  --project=your-project-id

# Query specific time series data
gcloud monitoring time-series list \
  --filter='metric.type="bigtable.googleapis.com/cluster/cpu_load"' \
  --interval-start-time="2026-02-17T00:00:00Z" \
  --interval-end-time="2026-02-17T12:00:00Z" \
  --project=your-project-id
```

## Setting Up Alerts

Dashboards are great for watching, but alerts catch problems when you are not looking.

```bash
# Create an alert for high CPU utilization
gcloud monitoring policies create \
  --display-name="Bigtable High CPU" \
  --condition-display-name="CPU above 70% for 5 minutes" \
  --condition-filter='metric.type="bigtable.googleapis.com/cluster/cpu_load" AND resource.type="bigtable_cluster"' \
  --condition-threshold-value=0.7 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=300s \
  --notification-channels=projects/your-project-id/notificationChannels/your-channel-id \
  --project=your-project-id
```

Here are the alerts I set up on every Bigtable deployment:

```python
# Python script to create essential Bigtable alerts
from google.cloud import monitoring_v3

client = monitoring_v3.AlertPolicyServiceClient()
project_name = f"projects/your-project-id"

# Alert 1: CPU above 70% for 5 minutes
cpu_alert = monitoring_v3.AlertPolicy({
    "display_name": "Bigtable CPU > 70%",
    "conditions": [{
        "display_name": "High CPU utilization",
        "condition_threshold": {
            "filter": 'metric.type="bigtable.googleapis.com/cluster/cpu_load"'
                      ' AND resource.type="bigtable_cluster"',
            "comparison": monitoring_v3.ComparisonType.COMPARISON_GT,
            "threshold_value": 0.7,
            "duration": {"seconds": 300},
            "aggregations": [{
                "alignment_period": {"seconds": 60},
                "per_series_aligner": monitoring_v3.Aggregation.Aligner.ALIGN_MEAN
            }]
        }
    }],
    "notification_channels": ["projects/your-project-id/notificationChannels/123"],
    "combiner": monitoring_v3.AlertPolicy.ConditionCombinerType.AND
})

# Alert 2: P99 latency above 100ms
latency_alert = monitoring_v3.AlertPolicy({
    "display_name": "Bigtable P99 Latency > 100ms",
    "conditions": [{
        "display_name": "High read latency",
        "condition_threshold": {
            "filter": 'metric.type="bigtable.googleapis.com/server/latencies"'
                      ' AND resource.type="bigtable_table"',
            "comparison": monitoring_v3.ComparisonType.COMPARISON_GT,
            "threshold_value": 100,
            "duration": {"seconds": 300},
            "aggregations": [{
                "alignment_period": {"seconds": 60},
                "per_series_aligner": monitoring_v3.Aggregation.Aligner.ALIGN_PERCENTILE_99
            }]
        }
    }],
    "notification_channels": ["projects/your-project-id/notificationChannels/123"],
    "combiner": monitoring_v3.AlertPolicy.ConditionCombinerType.AND
})

# Alert 3: Error rate above threshold
error_alert = monitoring_v3.AlertPolicy({
    "display_name": "Bigtable Error Rate > 1%",
    "conditions": [{
        "display_name": "High error rate",
        "condition_threshold": {
            "filter": 'metric.type="bigtable.googleapis.com/server/error_count"'
                      ' AND resource.type="bigtable_table"',
            "comparison": monitoring_v3.ComparisonType.COMPARISON_GT,
            "threshold_value": 10,
            "duration": {"seconds": 120},
            "aggregations": [{
                "alignment_period": {"seconds": 60},
                "per_series_aligner": monitoring_v3.Aggregation.Aligner.ALIGN_RATE
            }]
        }
    }],
    "notification_channels": ["projects/your-project-id/notificationChannels/123"],
    "combiner": monitoring_v3.AlertPolicy.ConditionCombinerType.AND
})

# Create the alert policies
for alert in [cpu_alert, latency_alert, error_alert]:
    policy = client.create_alert_policy(
        name=project_name,
        alert_policy=alert
    )
    print(f"Created alert: {policy.display_name}")
```

## Using Key Visualizer

Key Visualizer is a Bigtable-specific tool that shows you the access pattern across your row key space. It is invaluable for detecting hotspots.

Access it from the Bigtable instance page in the Cloud Console. It shows a heatmap where:
- The X-axis is time
- The Y-axis is the row key space
- The color intensity represents the amount of read/write activity

A well-distributed workload looks like a uniform gradient. A hotspot shows up as a bright horizontal band, indicating that a narrow key range is getting disproportionate traffic.

Key Visualizer requires at least 24 hours of data before it starts showing results, and the instance must be a production instance (not development).

## Building Custom Metrics

For application-specific monitoring, you can write custom metrics from your application.

```python
# Write a custom metric for Bigtable query duration from your application
from google.cloud import monitoring_v3
import time

client = monitoring_v3.MetricServiceClient()
project_name = f"projects/your-project-id"

def record_query_duration(table_name, operation, duration_ms):
    """Record a custom metric for Bigtable query duration."""
    series = monitoring_v3.TimeSeries()
    series.metric.type = "custom.googleapis.com/bigtable/query_duration"
    series.metric.labels["table"] = table_name
    series.metric.labels["operation"] = operation
    series.resource.type = "global"

    now = time.time()
    interval = monitoring_v3.TimeInterval({
        "end_time": {"seconds": int(now)}
    })

    point = monitoring_v3.Point({
        "interval": interval,
        "value": {"double_value": duration_ms}
    })

    series.points = [point]
    client.create_time_series(name=project_name, time_series=[series])

# Usage in your application code
start = time.time()
result = table.read_rows(prefix='user#123')
duration = (time.time() - start) * 1000
record_query_duration('user-events', 'read_rows', duration)
```

## Wrapping Up

Monitoring is not optional for production Bigtable deployments. Set up a dashboard with CPU utilization, request latency, throughput, and error rate charts. Configure alerts for CPU above 70%, latency spikes, and error rate increases. Use Key Visualizer regularly to check for hotspots in your access patterns. And when something looks off, use the Metrics Explorer to dig into the details. Good monitoring turns Bigtable from a black box into a system you understand and can confidently operate at scale.
