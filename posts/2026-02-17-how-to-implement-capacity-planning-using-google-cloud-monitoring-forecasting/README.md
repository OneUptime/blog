# How to Implement Capacity Planning Using Google Cloud Monitoring Forecasting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Capacity Planning, Google Cloud Monitoring, Forecasting, SRE, Infrastructure

Description: Learn how to use Google Cloud Monitoring forecasting features and metric analysis to implement data-driven capacity planning for your GCP infrastructure.

---

Running out of capacity in production is one of those problems that feels avoidable in hindsight. Your database fills up, your instance group hits its maximum, or your Cloud Run service reaches its concurrency limit during peak traffic. The signs were there in your metrics - you just did not look far enough ahead.

Capacity planning is the practice of using historical data to predict when you will need more resources. Google Cloud Monitoring has forecasting capabilities built into alerting policies, and its dashboards make it practical to visualize the metrics that drive planning even for small teams. In this post, I will show you how to use these features to stay ahead of capacity issues.

## Why Capacity Planning Matters

Reactive scaling - waiting for things to break and then adding capacity - has real costs. Your users experience degraded performance or outages. Your on-call engineers get paged. And emergency scaling under pressure often leads to over-provisioning, which wastes money.

Proactive capacity planning lets you add resources before you need them, during business hours, with proper review. It turns a stressful incident into a routine infrastructure change.

## Using Cloud Monitoring Forecasting in Alerting Policies

Cloud Monitoring supports forecast-based alerting conditions. Instead of alerting when a metric crosses a threshold right now, you can alert when a metric is predicted to cross a threshold within a specified time window.

Here is how to create a forecast-based alert for disk usage:

```bash
# Alert when disk usage is predicted to exceed 90% within the next 24 hours

cat > forecast-disk-policy.json <<'EOF'
{
  "displayName": "Capacity Warning: Disk Space Running Low",
  "combiner": "OR",
  "notificationChannels": [
    "projects/my-project/notificationChannels/12345"
  ],
  "documentation": {
    "content": "Disk is predicted to fill up within 24 hours. Review and expand disk or clean up data.",
    "mimeType": "text/markdown"
  },
  "conditions": [
    {
      "displayName": "Disk predicted to be >90% within 24h",
      "conditionThreshold": {
        "filter": "resource.type = \"gce_instance\" AND metric.type = \"agent.googleapis.com/disk/percent_used\"",
        "aggregations": [
          {
            "alignmentPeriod": "300s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ],
        "comparison": "COMPARISON_GT",
        "thresholdValue": 90,
        "duration": "600s",
        "forecastOptions": {
          "forecastHorizon": "86400s"
        },
        "trigger": {
          "count": 1
        }
      }
    }
  ]
}
EOF

gcloud monitoring policies create \
  --policy-from-file=forecast-disk-policy.json \
  --project=my-project
```

The key field is `forecastOptions.forecastHorizon`. This tells Cloud Monitoring to project the metric forward by that duration and alert if the projected value crosses the threshold during the retest window.

Common forecast horizons for capacity planning:

- 24 hours: for rapidly growing metrics like disk usage
- 48 hours: for steady-growth metrics like database size
- Up to 60 hours: for the longest Cloud Monitoring forecast-based alert window

For 7-day, 30-day, or longer planning, export or query historical metrics and run your own forecasting logic, as shown later in this post.

## Building Capacity Planning Dashboards

Dashboards that show both current usage and historical trends are the foundation of capacity planning. Create a Cloud Monitoring dashboard that shows key capacity metrics over time.

```json
{
  "displayName": "Capacity Planning Dashboard",
  "mosaicLayout": {
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "CPU Utilization - All Instances",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type=\"gce_instance\" AND metric.type=\"compute.googleapis.com/instance/cpu/utilization\"",
                    "aggregation": {
                      "alignmentPeriod": "3600s",
                      "perSeriesAligner": "ALIGN_MEAN",
                      "crossSeriesReducer": "REDUCE_PERCENTILE_95",
                      "groupByFields": []
                    }
                  }
                },
                "plotType": "LINE"
              }
            ],
            "timeshiftDuration": "0s",
            "yAxis": {
              "label": "CPU Utilization",
              "scale": "LINEAR"
            }
          }
        }
      },
      {
        "xPos": 6,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Disk Usage Trend",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type=\"gce_instance\" AND metric.type=\"agent.googleapis.com/disk/percent_used\"",
                    "aggregation": {
                      "alignmentPeriod": "3600s",
                      "perSeriesAligner": "ALIGN_MEAN"
                    }
                  }
                },
                "plotType": "LINE"
              }
            ]
          }
        }
      },
      {
        "width": 6,
        "yPos": 4,
        "height": 4,
        "widget": {
          "title": "Memory Usage Trend",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type=\"gce_instance\" AND metric.type=\"agent.googleapis.com/memory/percent_used\"",
                    "aggregation": {
                      "alignmentPeriod": "3600s",
                      "perSeriesAligner": "ALIGN_MEAN",
                      "crossSeriesReducer": "REDUCE_PERCENTILE_95"
                    }
                  }
                },
                "plotType": "LINE"
              }
            ]
          }
        }
      },
      {
        "xPos": 6,
        "yPos": 4,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Network Throughput",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type=\"gce_instance\" AND metric.type=\"compute.googleapis.com/instance/network/received_bytes_count\"",
                    "aggregation": {
                      "alignmentPeriod": "3600s",
                      "perSeriesAligner": "ALIGN_RATE",
                      "crossSeriesReducer": "REDUCE_SUM"
                    }
                  }
                },
                "plotType": "LINE"
              }
            ]
          }
        }
      }
    ]
  }
}
```

## Programmatic Forecasting with Python

For more sophisticated capacity planning, pull historical metrics from Cloud Monitoring and apply forecasting algorithms. Here is a Python script that fetches historical data and uses linear regression to project future usage:

```python
from google.cloud import monitoring_v3
from datetime import datetime, timedelta, timezone
import numpy as np

def forecast_metric(project_id, metric_filter, days_history=30, days_forecast=14):
    """Fetch historical metric data and forecast future values using linear regression."""
    client = monitoring_v3.MetricServiceClient()
    project_name = f"projects/{project_id}"

    # Define the time range for historical data
    now = datetime.now(timezone.utc)
    start_time = now - timedelta(days=days_history)

    # Build the time series request
    interval = monitoring_v3.TimeInterval()
    interval.end_time.seconds = int(now.timestamp())
    interval.start_time.seconds = int(start_time.timestamp())

    # Fetch the time series data
    results = client.list_time_series(
        request={
            "name": project_name,
            "filter": metric_filter,
            "interval": interval,
            "view": monitoring_v3.ListTimeSeriesRequest.TimeSeriesView.FULL,
            "aggregation": {
                "alignment_period": {"seconds": 3600},
                "per_series_aligner": monitoring_v3.Aggregation.Aligner.ALIGN_MEAN,
                "cross_series_reducer": monitoring_v3.Aggregation.Reducer.REDUCE_MEAN,
            },
        }
    )

    # Extract timestamps and values
    timestamps = []
    values = []
    for ts in results:
        for point in ts.points:
            t = point.interval.end_time.timestamp()
            v = point.value.double_value
            timestamps.append(t)
            values.append(v)

    if not values:
        print("No data found for the given metric filter")
        return None

    # Cloud Monitoring returns points in reverse chronological order within a time series.
    samples = sorted(zip(timestamps, values), key=lambda sample: sample[0])
    timestamps, values = zip(*samples)

    # Convert to numpy arrays for linear regression
    x = np.array(timestamps)
    y = np.array(values)

    # Fit a linear regression model
    # y = mx + b
    m, b = np.polyfit(x, y, 1)

    # Project forward
    future_timestamps = [
        now.timestamp() + (i * 86400) for i in range(1, days_forecast + 1)
    ]
    future_values = [m * t + b for t in future_timestamps]

    # Print the forecast
    print(f"Current value: {values[-1]:.2f}")
    print(f"Growth rate: {m * 86400:.4f} per day")
    print(f"\nForecast:")
    for i, (ts, val) in enumerate(zip(future_timestamps, future_values)):
        date = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")
        print(f"  {date}: {val:.2f}")

    # Calculate when a threshold will be reached
    threshold = 90.0  # percent
    if m > 0 and values[-1] < threshold:
        days_until_threshold = (threshold - values[-1]) / (m * 86400)
        print(f"\nEstimated days until {threshold}% threshold: {days_until_threshold:.1f}")
    elif values[-1] >= threshold:
        print(f"\nAlready above {threshold}% threshold!")

    return {
        "current": values[-1],
        "growth_rate_per_day": m * 86400,
        "forecast": list(zip(future_timestamps, future_values)),
    }

# Example: forecast disk usage
forecast_metric(
    "my-project",
    'resource.type="gce_instance" AND metric.type="agent.googleapis.com/disk/percent_used"',
    days_history=30,
    days_forecast=14,
)
```

## Capacity Planning for Different Resource Types

Different resources need different planning approaches:

**Compute Engine instances**: Track P95 CPU utilization over time. If it is trending above 70%, plan to add capacity. Use managed instance groups with autoscaling, but set alerts for when the group reaches maximum size.

**Cloud SQL databases**: Monitor disk usage growth rate and connection count. Disk can be expanded online, but plan ahead because resizing takes time.

**Cloud Run services**: Track maximum concurrent requests and container instance count relative to your configured concurrency and maximum instances settings. If active instances regularly approach the max instances limit or per-instance concurrency saturates, increase max instances or tune concurrency.

**Pub/Sub topics**: Monitor the oldest unacknowledged message age. If this is growing over time, your subscribers need to scale up.

## Automating Capacity Reviews

Set up a weekly Cloud Function that generates a capacity report and sends it to your team:

```python
def weekly_capacity_report(request):
    """Generate a weekly capacity report and send it via email."""
    project_id = "my-project"

    metrics_to_check = [
        ("CPU Utilization", 'resource.type="gce_instance" AND metric.type="compute.googleapis.com/instance/cpu/utilization"', 80),
        ("Disk Usage", 'resource.type="gce_instance" AND metric.type="agent.googleapis.com/disk/percent_used"', 85),
        ("Memory Usage", 'resource.type="gce_instance" AND metric.type="agent.googleapis.com/memory/percent_used"', 85),
    ]

    report_lines = ["Weekly Capacity Report", "=" * 40]

    for name, metric_filter, threshold in metrics_to_check:
        result = forecast_metric(project_id, metric_filter, days_history=30, days_forecast=14)
        if result:
            report_lines.append(f"\n{name}:")
            report_lines.append(f"  Current: {result['current']:.1f}%")
            report_lines.append(f"  Daily growth: {result['growth_rate_per_day']:.2f}%")

            if result["current"] > threshold:
                report_lines.append(f"  STATUS: OVER THRESHOLD ({threshold}%)")
            elif result["growth_rate_per_day"] > 0:
                days_left = (threshold - result["current"]) / result["growth_rate_per_day"]
                report_lines.append(f"  Estimated days to threshold: {days_left:.0f}")

    report = "\n".join(report_lines)
    print(report)

    # Send via email, Slack, or store in a document
    return report
```

## Summary

Capacity planning does not have to be a manual, spreadsheet-driven process. Google Cloud Monitoring provides forecast-based alerting, historical metric data, and dashboarding tools that let you stay ahead of capacity issues. Start with forecast alerts on your most critical resources (disk, CPU, memory), build a capacity planning dashboard, and automate weekly capacity reviews. The goal is to never be surprised by a capacity-related outage again.
