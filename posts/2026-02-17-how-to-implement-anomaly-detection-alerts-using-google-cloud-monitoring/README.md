# How to Implement Anomaly Detection Alerts Using Google Cloud Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Monitoring, Anomaly Detection, Alerting, Machine Learning

Description: Learn how to set up anomaly detection alerts in Google Cloud Monitoring to automatically detect unusual patterns in your metrics without manually defining static thresholds.

---

Static thresholds are the blunt instrument of monitoring. You set "alert if CPU > 80%" and call it a day. But what about a service that normally runs at 20% CPU and suddenly jumps to 50%? That is a significant change that a static threshold misses entirely. Or the service that legitimately runs at 85% CPU during peak hours - a static threshold fires every afternoon for no reason.

Anomaly detection solves this by learning what "normal" looks like for each metric and alerting when the actual value deviates significantly from the expected range. Google Cloud Monitoring supports this through its condition types, and in this post I will show you how to set it up effectively.

## How Anomaly Detection Works in Cloud Monitoring

Cloud Monitoring's anomaly detection uses the metric's historical data to build a dynamic baseline. It calculates an expected value and a confidence band around it. When the actual metric value falls outside this band for a sustained period, it triggers an alert.

The system accounts for:
- Daily patterns (higher traffic during business hours)
- Weekly patterns (less traffic on weekends)
- Gradual trends (growing baseline over months)
- Seasonal variations

This means you do not need to manually adjust thresholds as your service grows or traffic patterns change.

## Creating an Anomaly Detection Alert

Here is how to create an anomaly detection alert policy using Terraform:

```hcl
# Terraform: Anomaly detection alert for request latency
resource "google_monitoring_alert_policy" "latency_anomaly" {
  display_name = "Latency Anomaly Detection"
  combiner     = "OR"

  conditions {
    display_name = "Unusual Latency Detected"

    condition_threshold {
      filter = <<-FILTER
        resource.type = "cloud_run_revision"
        AND metric.type = "run.googleapis.com/request_latencies"
      FILTER

      # Use COMPARISON_GT with a forecast-based threshold
      comparison      = "COMPARISON_GT"
      threshold_value = 0  # The forecast handles the actual threshold
      duration        = "300s"

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_PERCENTILE_99"
        group_by_fields      = ["resource.label.service_name"]
        cross_series_reducer = "REDUCE_NONE"
      }

      # Enable forecast-based anomaly detection
      forecast_options {
        forecast_horizon = "3600s"  # Look ahead 1 hour
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.slack.id,
  ]

  documentation {
    content   = "Latency has deviated significantly from its expected pattern. This may indicate a performance regression, infrastructure issue, or unusual traffic pattern."
    mime_type = "text/markdown"
  }
}
```

## Using MQL for Anomaly Detection

MQL provides more control over anomaly detection through its built-in functions:

```
# Detect anomalies in request rate using standard deviation
fetch cloud_run_revision
| metric 'run.googleapis.com/request_count'
| align rate(5m)
| group_by [resource.service_name], [rps: aggregate(val())]
| window 7d  # Use 7 days of history for the baseline
| condition rps > mean(rps) + 3 * stddev(rps)
```

This query calculates the mean and standard deviation of request rate over a 7-day window and triggers when the current value exceeds three standard deviations above the mean.

For a more sophisticated approach that accounts for time-of-day patterns:

```
# Anomaly detection with time-of-day awareness
fetch cloud_run_revision
| metric 'run.googleapis.com/request_count'
| align rate(10m)
| group_by [resource.service_name], [rps: aggregate(val())]
| {
    # Current value
    ident
  ;
    # Historical baseline for the same time of day
    window 14d
    | group_by [resource.service_name],
        [baseline: percentile(rps, 95)]
  }
| join
| value [deviation: rps - baseline]
| condition deviation > 0
```

## Setting Up Anomaly Detection for Different Metric Types

### Traffic Volume Anomalies

Detect unusual drops or spikes in traffic:

```hcl
resource "google_monitoring_alert_policy" "traffic_anomaly" {
  display_name = "Traffic Volume Anomaly"
  combiner     = "OR"

  # Condition for unexpected traffic drops
  conditions {
    display_name = "Unexpected Traffic Drop"

    condition_monitoring_query_language {
      query = <<-MQL
        fetch cloud_run_revision
        | metric 'run.googleapis.com/request_count'
        | align rate(5m)
        | group_by [resource.service_name], [rps: aggregate(val())]
        | window 7d
        | condition rps < mean(rps) - 2 * stddev(rps) && mean(rps) > 1
      MQL

      duration = "600s"
      trigger {
        count = 1
      }
    }
  }

  # Condition for unexpected traffic spikes
  conditions {
    display_name = "Unexpected Traffic Spike"

    condition_monitoring_query_language {
      query = <<-MQL
        fetch cloud_run_revision
        | metric 'run.googleapis.com/request_count'
        | align rate(5m)
        | group_by [resource.service_name], [rps: aggregate(val())]
        | window 7d
        | condition rps > mean(rps) + 3 * stddev(rps)
      MQL

      duration = "600s"
      trigger {
        count = 1
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.slack.id,
  ]
}
```

### Error Rate Anomalies

Detect when error rates deviate from their normal pattern:

```hcl
resource "google_monitoring_alert_policy" "error_anomaly" {
  display_name = "Error Rate Anomaly"
  combiner     = "OR"

  conditions {
    display_name = "Unusual Error Rate"

    condition_monitoring_query_language {
      query = <<-MQL
        fetch cloud_run_revision
        | metric 'run.googleapis.com/request_count'
        | align rate(5m)
        | group_by [resource.service_name, metric.response_code_class],
            [val: aggregate(val())]
        | {
            filter metric.response_code_class = '5xx'
            | group_by [resource.service_name], [errors: aggregate(val)]
          ;
            group_by [resource.service_name], [total: aggregate(val)]
          }
        | join
        | value [error_rate: errors / total * 100]
        | window 7d
        | condition error_rate > mean(error_rate) + 3 * stddev(error_rate)
           && error_rate > 1
      MQL

      duration = "300s"
      trigger {
        count = 1
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.pagerduty.id,
  ]
}
```

### Resource Utilization Anomalies

Detect unusual resource consumption patterns:

```hcl
resource "google_monitoring_alert_policy" "memory_anomaly" {
  display_name = "Memory Usage Anomaly"
  combiner     = "OR"

  conditions {
    display_name = "Unusual Memory Growth"

    condition_monitoring_query_language {
      query = <<-MQL
        fetch cloud_run_revision
        | metric 'run.googleapis.com/container/memory/utilizations'
        | align mean(5m)
        | group_by [resource.service_name], [mem: mean(val())]
        | window 7d
        | condition mem > mean(mem) + 2 * stddev(mem)
      MQL

      duration = "900s"  # 15 minutes to avoid transient spikes
      trigger {
        count = 1
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.slack.id,
  ]
}
```

## Custom Anomaly Detection with Cloud Functions

For more sophisticated anomaly detection, you can build a custom system using Cloud Functions and BigQuery:

```python
# Custom anomaly detection using statistical methods
import functions_framework
from google.cloud import monitoring_v3
from google.cloud import bigquery
from datetime import datetime, timedelta
import numpy as np

monitoring_client = monitoring_v3.MetricServiceClient()
bq_client = bigquery.Client()

@functions_framework.http
def detect_anomalies(request):
    """Custom anomaly detection using z-score analysis."""
    project_name = f"projects/my-project"

    # Fetch recent metric data
    now = datetime.utcnow()
    interval = monitoring_v3.TimeInterval({
        'end_time': {'seconds': int(now.timestamp())},
        'start_time': {'seconds': int((now - timedelta(hours=24)).timestamp())},
    })

    # Query for request latency
    results = monitoring_client.list_time_series(
        request={
            'name': project_name,
            'filter': 'metric.type = "run.googleapis.com/request_latencies"',
            'interval': interval,
            'view': monitoring_v3.ListTimeSeriesRequest.TimeSeriesView.FULL,
            'aggregation': monitoring_v3.Aggregation({
                'alignment_period': {'seconds': 300},
                'per_series_aligner': monitoring_v3.Aggregation.Aligner.ALIGN_PERCENTILE_99,
                'group_by_fields': ['resource.label.service_name'],
            }),
        }
    )

    anomalies = []

    for series in results:
        service_name = series.resource.labels.get('service_name', 'unknown')
        values = [point.value.double_value for point in series.points]

        if len(values) < 10:
            continue

        # Calculate z-score for the most recent value
        mean = np.mean(values[1:])  # Exclude the latest value from baseline
        std = np.std(values[1:])

        if std == 0:
            continue

        latest = values[0]
        z_score = (latest - mean) / std

        # Flag as anomaly if z-score exceeds threshold
        if abs(z_score) > 3:
            anomalies.append({
                'service': service_name,
                'metric': 'p99_latency',
                'value': latest,
                'mean': mean,
                'z_score': z_score,
                'direction': 'high' if z_score > 0 else 'low',
            })

    # Store anomalies for tracking
    if anomalies:
        store_anomalies(anomalies)
        send_anomaly_alerts(anomalies)

    return {'anomalies_detected': len(anomalies), 'details': anomalies}

def store_anomalies(anomalies):
    """Store detected anomalies in BigQuery for analysis."""
    table_id = 'my-project.monitoring.detected_anomalies'
    rows = [{
        'detected_at': datetime.utcnow().isoformat(),
        'service': a['service'],
        'metric': a['metric'],
        'value': a['value'],
        'baseline_mean': a['mean'],
        'z_score': a['z_score'],
    } for a in anomalies]

    bq_client.insert_rows_json(table_id, rows)

def send_anomaly_alerts(anomalies):
    """Send alerts for detected anomalies."""
    # Implement notification logic here
    for anomaly in anomalies:
        print(f"ANOMALY: {anomaly['service']} - {anomaly['metric']} "
              f"z-score={anomaly['z_score']:.2f}")
```

## Tuning Anomaly Detection Sensitivity

The sensitivity of anomaly detection depends on two factors:

1. **The window size.** A longer historical window (14-30 days) produces a more stable baseline but responds slower to gradual changes. A shorter window (3-7 days) adapts faster but is more susceptible to recent outliers.

2. **The threshold multiplier.** Using 2 standard deviations catches more anomalies but produces more false positives. Using 3 standard deviations is more conservative.

Here is a guideline:

| Use Case | Window | Threshold | Duration |
|---|---|---|---|
| Critical metrics | 7 days | 2 stddev | 5 min |
| Performance metrics | 14 days | 3 stddev | 10 min |
| Capacity metrics | 30 days | 2 stddev | 15 min |
| Cost metrics | 30 days | 3 stddev | 1 hour |

## Best Practices

1. **Combine anomaly detection with static thresholds.** Use anomaly detection for subtle changes and static thresholds for absolute limits (like 99% disk usage, regardless of what is "normal").

2. **Exclude known anomalies.** If your traffic drops every Sunday, the anomaly detector should learn this. Make sure your historical window covers at least two full weekly cycles.

3. **Start with high thresholds and tune down.** Begin with 3+ standard deviations and only reduce if you are missing real issues.

4. **Monitor the anomaly detector itself.** Track how many alerts it fires and how many are actionable. If the actionable rate is below 50%, increase your thresholds.

Anomaly detection is a natural complement to static threshold alerts. Together with monitoring tools like OneUptime, they give you comprehensive coverage: static alerts catch the "definitely broken" scenarios, and anomaly detection catches the "something changed" scenarios that would otherwise go unnoticed until they become critical.
