# How to Implement Anomaly Detection Alerts Using Google Cloud Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Monitoring, Anomaly Detection, Alerting, Machine Learning

Description: Learn how to set up anomaly detection alerts in Google Cloud Monitoring to automatically detect unusual patterns in your metrics without manually defining static thresholds.

---

Static thresholds are the blunt instrument of monitoring. You set "alert if CPU > 80%" and call it a day. But what about a service that normally runs at 20% CPU and suddenly jumps to 50%? That is a significant change that a static threshold misses entirely. Or the service that legitimately runs at 85% CPU during peak hours - a static threshold fires every afternoon for no reason.

Anomaly detection solves this by comparing recent behavior with a calculated baseline and alerting when the actual value deviates significantly from the expected range. Google Cloud Monitoring does not provide a general-purpose, built-in ML anomaly detector for every metric, but it does support forecasted threshold alerts and query-based dynamic thresholds with PromQL. In this post I will show you how to set those up effectively.

## How Anomaly Detection Works in Cloud Monitoring

Cloud Monitoring's forecasted metric-value conditions, currently a Preview feature, predict whether a metric will violate a threshold within a future forecast window. For anomaly-style detection, use PromQL to compare the current value with a rolling baseline such as the recent mean plus a standard-deviation band. When the actual metric value falls outside this band for a sustained period, the alert triggers.

Query-based baselines can account for:
- Recent traffic patterns
- Short-term trends
- Metric-specific variance
- Known minimum-volume guards

PromQL-based alerting policies in Cloud Monitoring have alerting-window limits, so use them for short rolling baselines. For multi-day, weekly, or seasonal baselines, export metrics or query Cloud Monitoring from a scheduled job and run the anomaly detection logic yourself.

## Creating a Forecasted Threshold Alert

Here is how to create a forecasted threshold alert policy using Terraform:

```hcl
# Terraform: Forecasted threshold alert for request latency

resource "google_monitoring_alert_policy" "latency_forecast" {
  display_name = "Latency Forecast Alert"
  combiner     = "OR"

  conditions {
    display_name = "Latency Predicted To Exceed SLO"

    condition_threshold {
      filter = <<-FILTER
        resource.type = "cloud_run_revision"
        AND metric.type = "run.googleapis.com/request_latencies"
      FILTER

      # Alert if p99 latency is forecast to exceed 1000 ms within the next hour.
      comparison      = "COMPARISON_GT"
      threshold_value = 1000
      duration        = "300s"

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_PERCENTILE_99"
      }

      forecast_options {
        forecast_horizon = "3600s"
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.slack.id,
  ]

  documentation {
    content   = "Latency is forecast to exceed the p99 latency SLO. This may indicate a performance regression, infrastructure issue, or unusual traffic pattern."
    mime_type = "text/markdown"
  }
}
```

## Using PromQL for Anomaly Detection

PromQL provides more control over anomaly detection through rolling-window functions:

```text
# Detect anomalies in request rate using standard deviation
sum by (service_name) (
  rate({"run.googleapis.com/request_count", monitored_resource="cloud_run_revision"}[5m])
)
>
avg_over_time((
  sum by (service_name) (
    rate({"run.googleapis.com/request_count", monitored_resource="cloud_run_revision"}[5m])
  )
)[23h:5m])
+
3 * stddev_over_time((
  sum by (service_name) (
    rate({"run.googleapis.com/request_count", monitored_resource="cloud_run_revision"}[5m])
  )
)[23h:5m])
```

This query calculates the mean and standard deviation of request rate over a 23-hour rolling window and triggers when the current value exceeds three standard deviations above the mean.

For a more conservative approach based on a recent high percentile:

```text
# Anomaly detection using the recent p95 request-rate baseline
sum by (service_name) (
  rate({"run.googleapis.com/request_count", monitored_resource="cloud_run_revision"}[10m])
)
>
quantile_over_time(0.95, (
  sum by (service_name) (
    rate({"run.googleapis.com/request_count", monitored_resource="cloud_run_revision"}[10m])
  )
)[23h:10m])
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

    condition_prometheus_query_language {
      query = <<-PROMQL
        (
          sum by (service_name) (
            rate({"run.googleapis.com/request_count", monitored_resource="cloud_run_revision"}[5m])
          )
          <
          avg_over_time((
            sum by (service_name) (
              rate({"run.googleapis.com/request_count", monitored_resource="cloud_run_revision"}[5m])
            )
          )[23h:5m])
          -
          2 * stddev_over_time((
            sum by (service_name) (
              rate({"run.googleapis.com/request_count", monitored_resource="cloud_run_revision"}[5m])
            )
          )[23h:5m])
        )
        and
        avg_over_time((
          sum by (service_name) (
            rate({"run.googleapis.com/request_count", monitored_resource="cloud_run_revision"}[5m])
          )
        )[23h:5m]) > 1
      PROMQL

      duration            = "600s"
      evaluation_interval = "60s"
    }
  }

  # Condition for unexpected traffic spikes
  conditions {
    display_name = "Unexpected Traffic Spike"

    condition_prometheus_query_language {
      query = <<-PROMQL
        sum by (service_name) (
          rate({"run.googleapis.com/request_count", monitored_resource="cloud_run_revision"}[5m])
        )
        >
        avg_over_time((
          sum by (service_name) (
            rate({"run.googleapis.com/request_count", monitored_resource="cloud_run_revision"}[5m])
          )
        )[23h:5m])
        +
        3 * stddev_over_time((
          sum by (service_name) (
            rate({"run.googleapis.com/request_count", monitored_resource="cloud_run_revision"}[5m])
          )
        )[23h:5m])
      PROMQL

      duration            = "600s"
      evaluation_interval = "60s"
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

    condition_prometheus_query_language {
      query = <<-PROMQL
        (
          100 *
          sum by (service_name) (
            rate({"run.googleapis.com/request_count", monitored_resource="cloud_run_revision", response_code_class="5xx"}[5m])
          )
          /
          sum by (service_name) (
            rate({"run.googleapis.com/request_count", monitored_resource="cloud_run_revision"}[5m])
          )
        )
        >
        avg_over_time((
          100 *
          sum by (service_name) (
            rate({"run.googleapis.com/request_count", monitored_resource="cloud_run_revision", response_code_class="5xx"}[5m])
          )
          /
          sum by (service_name) (
            rate({"run.googleapis.com/request_count", monitored_resource="cloud_run_revision"}[5m])
          )
        )[23h:5m])
        +
        3 * stddev_over_time((
          100 *
          sum by (service_name) (
            rate({"run.googleapis.com/request_count", monitored_resource="cloud_run_revision", response_code_class="5xx"}[5m])
          )
          /
          sum by (service_name) (
            rate({"run.googleapis.com/request_count", monitored_resource="cloud_run_revision"}[5m])
          )
        )[23h:5m])
        and
        (
          100 *
          sum by (service_name) (
            rate({"run.googleapis.com/request_count", monitored_resource="cloud_run_revision", response_code_class="5xx"}[5m])
          )
          /
          sum by (service_name) (
            rate({"run.googleapis.com/request_count", monitored_resource="cloud_run_revision"}[5m])
          )
        ) > 1
      PROMQL

      duration            = "300s"
      evaluation_interval = "60s"
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

    condition_prometheus_query_language {
      query = <<-PROMQL
        histogram_quantile(0.95,
          sum by (service_name, le) (
            rate({"run.googleapis.com/container/memory/utilizations_bucket", monitored_resource="cloud_run_revision"}[5m])
          )
        )
        >
        avg_over_time((
          histogram_quantile(0.95,
            sum by (service_name, le) (
              rate({"run.googleapis.com/container/memory/utilizations_bucket", monitored_resource="cloud_run_revision"}[5m])
            )
          )
        )[23h:5m])
        +
        2 * stddev_over_time((
          histogram_quantile(0.95,
            sum by (service_name, le) (
              rate({"run.googleapis.com/container/memory/utilizations_bucket", monitored_resource="cloud_run_revision"}[5m])
            )
          )
        )[23h:5m])
      PROMQL

      duration            = "900s" # 15 minutes to avoid transient spikes
      evaluation_interval = "60s"
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.slack.id,
  ]
}
```

## Custom Anomaly Detection with Cloud Functions

For more sophisticated anomaly detection, including multi-day or seasonal baselines, you can build a custom system using Cloud Functions and BigQuery:

```python
# Custom anomaly detection using statistical methods
import functions_framework
from google.cloud import monitoring_v3
from google.cloud import bigquery
from datetime import datetime, timedelta, timezone
import numpy as np

monitoring_client = monitoring_v3.MetricServiceClient()
bq_client = bigquery.Client()

@functions_framework.http
def detect_anomalies(request):
    """Custom anomaly detection using z-score analysis."""
    project_name = "projects/my-project"

    # Fetch recent metric data
    now = datetime.now(timezone.utc)
    interval = monitoring_v3.TimeInterval({
        "end_time": {"seconds": int(now.timestamp())},
        "start_time": {"seconds": int((now - timedelta(hours=24)).timestamp())},
    })

    # Query for request latency
    results = monitoring_client.list_time_series(
        request={
            "name": project_name,
            "filter": (
                'resource.type = "cloud_run_revision" '
                'AND metric.type = "run.googleapis.com/request_latencies"'
            ),
            "interval": interval,
            "view": monitoring_v3.ListTimeSeriesRequest.TimeSeriesView.FULL,
            "aggregation": monitoring_v3.Aggregation({
                "alignment_period": {"seconds": 300},
                "per_series_aligner": monitoring_v3.Aggregation.Aligner.ALIGN_PERCENTILE_99,
            }),
        }
    )

    anomalies = []

    for series in results:
        service_name = series.resource.labels.get("service_name", "unknown")
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
                "service": service_name,
                "metric": "p99_latency",
                "value": latest,
                "mean": mean,
                "z_score": z_score,
                "direction": "high" if z_score > 0 else "low",
            })

    # Store anomalies for tracking
    if anomalies:
        store_anomalies(anomalies)
        send_anomaly_alerts(anomalies)

    return {"anomalies_detected": len(anomalies), "details": anomalies}

def store_anomalies(anomalies):
    """Store detected anomalies in BigQuery for analysis."""
    table_id = "my-project.monitoring.detected_anomalies"
    rows = [{
        "detected_at": datetime.now(timezone.utc).isoformat(),
        "service": a["service"],
        "metric": a["metric"],
        "value": a["value"],
        "baseline_mean": a["mean"],
        "z_score": a["z_score"],
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

1. **The window size.** Cloud Monitoring PromQL alerting policies are suitable for short rolling windows. A longer historical window in a custom detector (14-30 days) produces a more stable baseline but responds slower to gradual changes. A shorter window adapts faster but is more susceptible to recent outliers.

2. **The threshold multiplier.** Using 2 standard deviations catches more anomalies but produces more false positives. Using 3 standard deviations is more conservative.

Here is a guideline:

| Use Case | Window | Threshold | Duration |
|---|---|---|---|
| Critical metrics | 23 hours in Cloud Monitoring, 7 days in custom detection | 2 stddev | 5 min |
| Performance metrics | 23 hours in Cloud Monitoring, 14 days in custom detection | 3 stddev | 10 min |
| Capacity metrics | 23 hours in Cloud Monitoring, 30 days in custom detection | 2 stddev | 15 min |
| Cost metrics | 23 hours in Cloud Monitoring, 30 days in custom detection | 3 stddev | 1 hour |

## Best Practices

1. **Combine anomaly detection with static thresholds.** Use anomaly detection for subtle changes and static thresholds for absolute limits (like 99% disk usage, regardless of what is "normal").

2. **Exclude known anomalies.** If your traffic drops every Sunday, your custom anomaly detector should learn this. Make sure your historical window covers at least two full weekly cycles.

3. **Start with high thresholds and tune down.** Begin with 3+ standard deviations and only reduce if you are missing real issues.

4. **Monitor the anomaly detector itself.** Track how many alerts it fires and how many are actionable. If the actionable rate is below 50%, increase your thresholds.

Anomaly detection is a natural complement to static threshold alerts. Together with monitoring tools like OneUptime, they give you comprehensive coverage: static alerts catch the "definitely broken" scenarios, and anomaly detection catches the "something changed" scenarios that would otherwise go unnoticed until they become critical.
