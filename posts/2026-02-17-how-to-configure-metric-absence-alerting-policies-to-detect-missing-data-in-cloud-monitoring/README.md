# How to Configure Metric-Absence Alerting Policies to Detect Missing Data in Cloud Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Monitoring, Alerting, Metric Absence, Observability

Description: Set up metric-absence alerting policies in Google Cloud Monitoring to detect when expected metric data stops arriving, catching silent failures early.

---

Most alerting focuses on metrics that are too high or too low. But what about metrics that disappear entirely? A service that stops reporting metrics is often in worse shape than one reporting elevated error rates. Metric-absence alerts fill this gap by triggering when expected data stops arriving. This catches scenarios like crashed processes, broken instrumentation, network partitions, and silently failing services.

In this post, I will show you how to set up metric-absence alerting policies to detect missing data in Cloud Monitoring.

## Why Metric Absence Matters

Consider a scenario where your application crashes. If the application is the one emitting metrics (like request counts or custom metrics), those metrics stop flowing when the app dies. A threshold-based alert on error rate would not fire because there are no data points to evaluate - the error rate is not high, it is nonexistent.

A metric-absence alert catches this by saying: "I expected to see data for this metric, and I have not seen any for X minutes. Something is wrong."

## How Metric-Absence Alerts Work

A metric-absence alert fires when no data points are received for a specified metric within a given time window. The key parameters are:

- The metric to watch
- The duration of absence that triggers the alert (how long to wait before considering data "missing")
- Any filters to narrow the scope

## Creating a Metric-Absence Alert

Here is a metric-absence alert that fires when a Cloud Run service stops reporting request counts for 5 minutes.

```json
{
  "displayName": "Cloud Run Service Not Reporting Requests",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "No requests received for 5 minutes",
      "conditionAbsent": {
        "filter": "resource.type = \"cloud_run_revision\" AND metric.type = \"run.googleapis.com/request_count\" AND resource.labels.service_name = \"my-service\"",
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_SUM",
            "crossSeriesReducer": "REDUCE_SUM"
          }
        ]
      }
    }
  ],
  "notificationChannels": [
    "projects/my-project/notificationChannels/CHANNEL_ID"
  ],
  "documentation": {
    "content": "The service my-service has not received any requests for 5 minutes. This may indicate the service is down, the load balancer is not routing traffic, or there is a network issue.\n\nCheck: https://console.cloud.google.com/run?project=my-project",
    "mimeType": "text/markdown"
  }
}
```

Apply the policy.

```bash
# Create the metric-absence alert
gcloud alpha monitoring policies create --policy-from-file=absence-alert.json
```

## Key Difference from Threshold Alerts

The main structural difference is using `conditionAbsent` instead of `conditionThreshold`. With `conditionAbsent`, there is no threshold value or comparison operator. The only trigger is the absence of data for the specified duration.

```json
{
  "conditionAbsent": {
    "filter": "...",
    "duration": "300s",
    "aggregations": [...]
  }
}
```

Compare this to a threshold condition:

```json
{
  "conditionThreshold": {
    "filter": "...",
    "comparison": "COMPARISON_GT",
    "thresholdValue": 100,
    "duration": "300s",
    "aggregations": [...]
  }
}
```

## Common Use Cases for Metric-Absence Alerts

Here are the scenarios where metric-absence alerts provide the most value.

Monitoring a heartbeat or health check metric. If your application sends a heartbeat metric every minute, a 5-minute absence means the application is likely down.

```json
{
  "displayName": "Application Heartbeat Missing",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "No heartbeat for 5 minutes",
      "conditionAbsent": {
        "filter": "resource.type = \"k8s_container\" AND metric.type = \"custom.googleapis.com/app/heartbeat\" AND resource.labels.container_name = \"my-app\"",
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_COUNT"
          }
        ]
      }
    }
  ],
  "notificationChannels": ["projects/my-project/notificationChannels/CHANNEL_ID"]
}
```

Detecting broken log pipelines. If logs are supposed to flow continuously and they stop, something in the pipeline might be broken.

```json
{
  "displayName": "Log Ingestion Stopped",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "No log entries for 10 minutes",
      "conditionAbsent": {
        "filter": "resource.type = \"k8s_container\" AND metric.type = \"logging.googleapis.com/log_entry_count\" AND resource.labels.namespace_name = \"production\"",
        "duration": "600s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_SUM",
            "crossSeriesReducer": "REDUCE_SUM"
          }
        ]
      }
    }
  ],
  "notificationChannels": ["projects/my-project/notificationChannels/CHANNEL_ID"]
}
```

## Monitoring VM Agent Metrics

If you use the Ops Agent on your VMs, a metric-absence alert detects when the agent stops reporting. This catches agent crashes, VM shutdowns, or network issues.

```json
{
  "displayName": "Ops Agent Not Reporting",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "No CPU metrics from agent for 5 minutes",
      "conditionAbsent": {
        "filter": "resource.type = \"gce_instance\" AND metric.type = \"agent.googleapis.com/cpu/utilization\"",
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_MEAN",
            "crossSeriesReducer": "REDUCE_NONE"
          }
        ]
      }
    }
  ],
  "notificationChannels": ["projects/my-project/notificationChannels/CHANNEL_ID"],
  "documentation": {
    "content": "The Ops Agent on one or more VMs has stopped reporting CPU metrics. The agent may have crashed or the VM may be unreachable.\n\nCheck VM status: `gcloud compute instances list`\nCheck agent status: SSH into the VM and run `sudo systemctl status google-cloud-ops-agent`",
    "mimeType": "text/markdown"
  }
}
```

## Setting the Right Duration

The absence duration is critical. Too short and you get false positives from normal metric gaps. Too long and you miss real issues.

Guidelines for choosing the duration:

- For metrics that report every minute (like most infrastructure metrics): 5-minute absence duration
- For metrics that report every 5 minutes: 15-minute absence duration
- For hourly batch metrics: 2-hour absence duration
- For heartbeat metrics: 2x to 3x the expected reporting interval

The general rule is to set the absence duration to at least 3x the metric's reporting interval to account for normal delays in ingestion.

## Handling Low-Traffic Services

Metric-absence alerts can be tricky for services that legitimately have periods of zero traffic. A service that gets no requests between 2 AM and 6 AM would trigger a request-count absence alert every night.

There are a few ways to handle this:

Use a dedicated heartbeat metric instead of request counts. Your application sends a heartbeat metric periodically regardless of traffic.

```python
# Python example: send a heartbeat metric every 60 seconds
from google.cloud import monitoring_v3
import time

client = monitoring_v3.MetricServiceClient()
project_name = f"projects/my-project"

while True:
    # Create and write the heartbeat metric
    series = monitoring_v3.TimeSeries()
    series.metric.type = "custom.googleapis.com/app/heartbeat"
    series.resource.type = "k8s_container"
    series.resource.labels["container_name"] = "my-app"

    point = monitoring_v3.Point()
    point.value.int64_value = 1
    now = time.time()
    point.interval.end_time.seconds = int(now)
    series.points = [point]

    client.create_time_series(name=project_name, time_series=[series])
    time.sleep(60)
```

## Combining Absence with Threshold Alerts

For comprehensive coverage, pair metric-absence alerts with threshold alerts on the same metric. The threshold alert catches elevated values. The absence alert catches silent failures.

```json
{
  "displayName": "Complete Error Monitoring",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "High error rate",
      "conditionThreshold": {
        "filter": "resource.type = \"cloud_run_revision\" AND metric.type = \"run.googleapis.com/request_count\" AND metric.labels.response_code_class = \"5xx\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 10,
        "duration": "60s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_RATE"
          }
        ]
      }
    },
    {
      "displayName": "No requests at all",
      "conditionAbsent": {
        "filter": "resource.type = \"cloud_run_revision\" AND metric.type = \"run.googleapis.com/request_count\" AND resource.labels.service_name = \"my-service\"",
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_SUM"
          }
        ]
      }
    }
  ],
  "notificationChannels": ["projects/my-project/notificationChannels/CHANNEL_ID"]
}
```

With `"combiner": "OR"`, either condition triggers the alert. You are covered whether the service is producing errors or has gone completely silent.

## Testing Metric-Absence Alerts

Testing absence alerts is easy - just stop the thing that produces the metric and wait. But you want to verify the alert fires and the notification reaches the right channel without actually breaking production.

One approach is to create a test metric that you control and set up an absence alert on it. Stop sending the test metric and confirm the alert fires within the expected timeframe.

## Summary

Metric-absence alerts fill a critical gap in your monitoring strategy. While threshold alerts catch metrics that are too high or too low, absence alerts catch metrics that disappear entirely. This is often the sign of the most severe failures - crashed services, broken pipelines, and unreachable infrastructure. Set up absence alerts for your most critical metrics alongside your threshold alerts, and you will catch problems that would otherwise go unnoticed until users start reporting issues.
