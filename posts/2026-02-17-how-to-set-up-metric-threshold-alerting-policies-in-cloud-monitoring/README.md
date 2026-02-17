# How to Set Up Metric-Threshold Alerting Policies in Cloud Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Monitoring, Alerting, Metrics, DevOps

Description: Configure metric-threshold alerting policies in Google Cloud Monitoring to get notified when your infrastructure or application metrics cross defined boundaries.

---

Alerts are the backbone of any monitoring setup. Without them, you are just collecting data that nobody looks at until something breaks badly enough that users start complaining. Google Cloud Monitoring's metric-threshold alerting policies let you define conditions based on metric values and get notified when those thresholds are crossed.

This guide walks you through setting up metric-threshold alerts for common scenarios.

## How Metric-Threshold Alerts Work

A metric-threshold alert fires when a metric value crosses a boundary you define for a specified duration. For example: "Alert me when CPU utilization exceeds 80% for more than 5 minutes." The duration requirement prevents one-off spikes from waking you up at 3 AM.

Each alerting policy consists of:

- One or more conditions (the metric and threshold)
- A notification channel (where alerts go)
- Optional documentation (runbook links, context)
- A combiner logic (ALL conditions must be met, or ANY condition)

## Creating a Simple CPU Alert via gcloud

Here is an alert that fires when any VM instance exceeds 80% CPU utilization for 5 minutes.

```bash
# Create an alerting policy for high CPU utilization
gcloud alpha monitoring policies create \
  --display-name="High CPU Utilization" \
  --condition-display-name="CPU above 80%" \
  --condition-filter='resource.type="gce_instance" AND metric.type="compute.googleapis.com/instance/cpu/utilization"' \
  --condition-threshold-value=0.8 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=300s \
  --condition-threshold-aggregation='{"alignmentPeriod":"60s","perSeriesAligner":"ALIGN_MEAN"}' \
  --notification-channels=CHANNEL_ID \
  --documentation="CPU utilization has exceeded 80% for 5 minutes. Check the instance for runaway processes."
```

## Creating Alerts with JSON Policy Files

For more control, define your alerting policy as JSON. This is also the approach you want for version-controlled alert definitions.

```json
{
  "displayName": "High Memory Usage Alert",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "Memory utilization above 90%",
      "conditionThreshold": {
        "filter": "resource.type = \"gce_instance\" AND metric.type = \"agent.googleapis.com/memory/percent_used\" AND metric.labels.state = \"used\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 90,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_MEAN",
            "crossSeriesReducer": "REDUCE_NONE"
          }
        ],
        "trigger": {
          "count": 1
        }
      }
    }
  ],
  "notificationChannels": [
    "projects/my-project/notificationChannels/CHANNEL_ID"
  ],
  "documentation": {
    "content": "Memory usage on instance ${resource.label.instance_id} has exceeded 90% for 5 minutes.\n\nRunbook: https://wiki.company.com/runbooks/high-memory",
    "mimeType": "text/markdown"
  },
  "alertStrategy": {
    "autoClose": "604800s"
  }
}
```

Apply the policy.

```bash
# Create an alerting policy from a JSON file
gcloud alpha monitoring policies create --policy-from-file=alert-policy.json
```

## Common Alert Configurations

Here are alerting policies for scenarios you will encounter often.

High error rate for a Cloud Run service.

```json
{
  "displayName": "Cloud Run High Error Rate",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "5xx error rate above 5%",
      "conditionThreshold": {
        "filter": "resource.type = \"cloud_run_revision\" AND metric.type = \"run.googleapis.com/request_count\" AND metric.labels.response_code_class = \"5xx\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 5,
        "duration": "60s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_RATE",
            "crossSeriesReducer": "REDUCE_SUM"
          }
        ]
      }
    }
  ],
  "notificationChannels": ["projects/my-project/notificationChannels/CHANNEL_ID"]
}
```

Disk usage nearing capacity.

```json
{
  "displayName": "Disk Usage Above 85%",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "Disk utilization above 85%",
      "conditionThreshold": {
        "filter": "resource.type = \"gce_instance\" AND metric.type = \"agent.googleapis.com/disk/percent_used\" AND metric.labels.state = \"used\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 85,
        "duration": "0s",
        "aggregations": [
          {
            "alignmentPeriod": "300s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ]
      }
    }
  ],
  "notificationChannels": ["projects/my-project/notificationChannels/CHANNEL_ID"],
  "documentation": {
    "content": "Disk usage on ${resource.label.instance_id} is above 85%. Consider cleaning up temp files or expanding the disk.",
    "mimeType": "text/markdown"
  }
}
```

## Understanding Aggregation

Aggregation is how Cloud Monitoring processes raw metric data points before evaluating the threshold. Two types of aggregation matter:

- Per-series aligner: Processes each time series individually. `ALIGN_MEAN` averages data points within the alignment period. `ALIGN_MAX` takes the maximum. `ALIGN_RATE` computes the rate of change.
- Cross-series reducer: Combines multiple time series into one. `REDUCE_SUM` adds them up. `REDUCE_MEAN` averages them. `REDUCE_NONE` keeps them separate.

For a CPU alert, you probably want `ALIGN_MEAN` with a 60-second period and `REDUCE_NONE` (to alert on individual instances). For a request count alert, you might want `ALIGN_RATE` with `REDUCE_SUM` (to get the total request rate across all instances).

## Multi-Condition Policies

You can create policies with multiple conditions and specify whether all conditions or any condition must be met.

```json
{
  "displayName": "Service Degradation Alert",
  "combiner": "AND",
  "conditions": [
    {
      "displayName": "High error rate",
      "conditionThreshold": {
        "filter": "resource.type = \"k8s_container\" AND metric.type = \"custom.googleapis.com/http/error_rate\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 0.05,
        "duration": "120s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ]
      }
    },
    {
      "displayName": "High latency",
      "conditionThreshold": {
        "filter": "resource.type = \"k8s_container\" AND metric.type = \"custom.googleapis.com/http/latency_p99\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 2000,
        "duration": "120s",
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

With `"combiner": "AND"`, this alert only fires when both conditions are true simultaneously - the service has both high errors and high latency. This reduces noise from temporary blips in either metric.

## Trigger Configuration

The trigger field controls how many time series need to violate the threshold before the condition is met.

```json
"trigger": {
  "count": 3
}
```

This means 3 different instances need to exceed the threshold simultaneously. For a percentage-based trigger:

```json
"trigger": {
  "percent": 50
}
```

This fires when 50% of the monitored instances exceed the threshold. Percentage triggers are useful for fleet-wide alerts where a single instance having high CPU is not unusual.

## Managing Alert Policies

List, update, and manage your alerting policies through the CLI.

```bash
# List all alerting policies
gcloud alpha monitoring policies list

# Describe a specific policy
gcloud alpha monitoring policies describe POLICY_ID

# Disable a policy temporarily (useful during maintenance)
gcloud alpha monitoring policies update POLICY_ID --no-enabled

# Re-enable a policy
gcloud alpha monitoring policies update POLICY_ID --enabled

# Delete a policy
gcloud alpha monitoring policies delete POLICY_ID
```

## Alert Documentation Best Practices

The documentation field in an alerting policy shows up in notifications. Make it useful.

Include:

- A clear description of what the alert means
- The impact (who or what is affected)
- Initial investigation steps
- Links to runbooks and dashboards
- Team contact information

```json
"documentation": {
  "content": "## High Error Rate Alert\n\n**Impact**: Users may experience errors on the /api/v1/orders endpoint.\n\n**Investigation steps**:\n1. Check the [error dashboard](https://console.cloud.google.com/monitoring/dashboards/...)\n2. Look for recent deployments\n3. Check downstream service health\n\n**Escalation**: Page the backend-oncall team if the error rate exceeds 10%.\n\n**Runbook**: https://wiki.company.com/runbooks/high-error-rate",
  "mimeType": "text/markdown"
}
```

## Summary

Metric-threshold alerts in Cloud Monitoring are your first line of defense against service issues. By defining clear thresholds with appropriate durations and aggregations, you can catch problems before users notice. Start with the basics - CPU, memory, disk, and error rates - and then add application-specific alerts as you learn what matters for your service. Keep alert documentation rich and actionable so the person who gets paged at night knows exactly what to do.
