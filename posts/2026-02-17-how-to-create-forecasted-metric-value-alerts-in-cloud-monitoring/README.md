# How to Create Forecasted Metric-Value Alerts in Cloud Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Monitoring, Forecasting, Alerting, Capacity Planning

Description: Set up forecasted metric-value alerts in Google Cloud Monitoring to predict when metrics will breach thresholds and act proactively before problems hit.

---

Reacting to problems after they happen is necessary, but predicting them before they happen is better. Google Cloud Monitoring supports forecasted metric-value alerts that use historical trends to predict when a metric will cross a threshold in the future. Instead of alerting when disk is 90% full, you get alerted when the current trend predicts disk will reach 90% within the next 24 hours. This gives you time to act before the issue becomes critical.

In this guide, I will show you how to set up forecasted alerts for common capacity planning scenarios.

## How Forecasted Alerts Work

Cloud Monitoring analyzes the historical trend of a metric and projects where it will be at a future point. If the projected value crosses your threshold within a specified forecast window, the alert fires.

The key parameters are:

- The metric to monitor
- The threshold value
- The forecast window (how far ahead to predict)
- The minimum historical data needed for the forecast

Cloud Monitoring uses linear regression on the recent data to make the prediction. This works well for metrics that trend steadily in one direction, like disk usage growing over time.

## Creating a Disk Usage Forecast Alert

The classic use case for forecasted alerts is disk space. Here is an alert that fires when disk usage is predicted to reach 90% within the next 24 hours.

```json
{
  "displayName": "Disk Usage Forecast - 90% Within 24 Hours",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "Disk predicted to reach 90% in 24h",
      "conditionThreshold": {
        "filter": "resource.type = \"gce_instance\" AND metric.type = \"agent.googleapis.com/disk/percent_used\" AND metric.labels.state = \"used\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 90,
        "duration": "0s",
        "aggregations": [
          {
            "alignmentPeriod": "300s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ],
        "forecastOptions": {
          "forecastHorizon": "86400s"
        }
      }
    }
  ],
  "notificationChannels": ["projects/my-project/notificationChannels/CHANNEL_ID"],
  "documentation": {
    "content": "Disk usage on ${resource.label.instance_id} is trending toward 90% within the next 24 hours based on current growth patterns.\n\nActions:\n1. Check what is consuming disk space\n2. Clean up old logs and temp files\n3. Consider resizing the disk if growth is expected\n\nDashboard: [Disk Usage](https://console.cloud.google.com/monitoring/dashboards/...)",
    "mimeType": "text/markdown"
  }
}
```

The `forecastOptions.forecastHorizon` field specifies how far into the future to project. `86400s` is 24 hours.

Apply the policy.

```bash
# Create the forecasted alert policy
gcloud alpha monitoring policies create --policy-from-file=forecast-alert.json
```

## Memory Usage Forecast

Memory leaks cause gradual memory growth that is hard to catch with static thresholds. A forecast alert detects the trend.

```json
{
  "displayName": "Memory Usage Forecast - Will Exceed 95% in 12 Hours",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "Memory predicted to exceed 95% in 12h",
      "conditionThreshold": {
        "filter": "resource.type = \"gce_instance\" AND metric.type = \"agent.googleapis.com/memory/percent_used\" AND metric.labels.state = \"used\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 95,
        "duration": "0s",
        "aggregations": [
          {
            "alignmentPeriod": "300s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ],
        "forecastOptions": {
          "forecastHorizon": "43200s"
        }
      }
    }
  ],
  "notificationChannels": ["projects/my-project/notificationChannels/CHANNEL_ID"],
  "documentation": {
    "content": "Memory usage is trending upward and is predicted to exceed 95% within 12 hours. This could indicate a memory leak.\n\nInvestigation:\n1. Check for recent deployments that may have introduced a leak\n2. Review heap dumps if available\n3. Consider restarting the application as a temporary measure",
    "mimeType": "text/markdown"
  }
}
```

## Database Connection Pool Exhaustion

If your connection pool usage is growing over time, a forecast alert warns you before connections run out.

```json
{
  "displayName": "Database Connection Pool Exhaustion Forecast",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "Connection pool predicted to reach 90% in 6h",
      "conditionThreshold": {
        "filter": "resource.type = \"cloudsql_database\" AND metric.type = \"cloudsql.googleapis.com/database/network/connections\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 90,
        "duration": "0s",
        "aggregations": [
          {
            "alignmentPeriod": "300s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ],
        "forecastOptions": {
          "forecastHorizon": "21600s"
        }
      }
    }
  ],
  "notificationChannels": ["projects/my-project/notificationChannels/CHANNEL_ID"]
}
```

## Choosing the Right Forecast Horizon

The forecast horizon depends on how quickly you can respond to the issue:

- Disk space: 24-72 hours. You usually need time to plan and execute a resize or cleanup.
- Memory leaks: 6-12 hours. Restarting an application is quick, but you want lead time to investigate.
- Connection pools: 4-6 hours. You might need to scale the database or investigate connection leaks.
- Network bandwidth: 12-24 hours. Scaling network infrastructure takes planning.

Shorter horizons give you more accurate predictions but less reaction time. Longer horizons give more lead time but may be less accurate because the prediction is extrapolated further.

## Combining Forecast with Threshold Alerts

A good strategy is to pair a forecast alert with a traditional threshold alert. The forecast alert gives you early warning. The threshold alert catches you if the prediction was wrong and the metric spikes faster than expected.

```json
{
  "displayName": "Disk Space - Forecast and Threshold",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "Disk predicted to reach 90% in 24h",
      "conditionThreshold": {
        "filter": "resource.type = \"gce_instance\" AND metric.type = \"agent.googleapis.com/disk/percent_used\" AND metric.labels.state = \"used\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 90,
        "duration": "0s",
        "aggregations": [
          {
            "alignmentPeriod": "300s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ],
        "forecastOptions": {
          "forecastHorizon": "86400s"
        }
      }
    },
    {
      "displayName": "Disk currently above 85%",
      "conditionThreshold": {
        "filter": "resource.type = \"gce_instance\" AND metric.type = \"agent.googleapis.com/disk/percent_used\" AND metric.labels.state = \"used\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 85,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ]
      }
    }
  ],
  "notificationChannels": ["projects/my-project/notificationChannels/CHANNEL_ID"]
}
```

With `"combiner": "OR"`, you get alerted either way - if the forecast predicts a problem or if the current value is already high.

## Limitations of Forecasted Alerts

Forecasted alerts work best when the metric trend is relatively linear and consistent. They have some limitations to keep in mind:

- Sudden spikes are not predicted. If disk usage jumps 30% in an hour due to a log explosion, the forecast based on the previous gradual trend would not have caught it.
- Cyclical patterns can confuse the forecast. If memory usage follows a daily cycle (high during business hours, low at night), the forecast might misinterpret the upswing as a continuous trend.
- New metrics without historical data cannot be forecasted. Cloud Monitoring needs enough data points to fit a trend line.

For these reasons, always use forecasted alerts alongside threshold alerts, not as a replacement.

## Monitoring Forecast Alert Behavior

After setting up a forecast alert, monitor how it behaves. Check if it fires too often (noisy) or misses real issues (not sensitive enough).

```bash
# List alert incidents to see how often forecast alerts fire
gcloud alpha monitoring policies list \
  --filter="displayName:'Forecast'" \
  --format="table(displayName, enabled)"

# Check the incident history
gcloud alpha monitoring policies describe POLICY_ID \
  --format="yaml(conditions.conditionThreshold.forecastOptions)"
```

If the alert is too noisy, try increasing the forecast horizon or adjusting the threshold value. If it is not catching real issues, decrease the forecast horizon or lower the threshold.

## Using Forecasts for Capacity Planning

Beyond alerting, forecast data is valuable for capacity planning. By tracking disk growth trends over weeks, you can plan infrastructure purchases and scaling events proactively. Cloud Monitoring dashboards can display forecast lines alongside actual data, giving you a visual sense of where things are heading.

## Summary

Forecasted metric-value alerts in Cloud Monitoring give you advance warning of capacity issues. Instead of reacting when disk is full or memory is exhausted, you get notified hours or days in advance when the current trend predicts a problem. Set them up for gradually-growing metrics like disk usage, memory consumption, and connection pools. Pair them with traditional threshold alerts for complete coverage. The result is fewer emergencies and more planned maintenance.
