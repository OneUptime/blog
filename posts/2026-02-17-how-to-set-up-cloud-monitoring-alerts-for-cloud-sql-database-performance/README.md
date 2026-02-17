# How to Set Up Cloud Monitoring Alerts for Cloud SQL Database Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, Cloud Monitoring, Alerting, Database Monitoring

Description: Step-by-step guide to setting up Cloud Monitoring alerting policies for Cloud SQL, covering CPU, memory, disk, connections, and replication lag.

---

Cloud SQL databases tend to fail silently. CPU creeps up over weeks, disk space fills gradually, and connection counts climb until one day everything falls over. The fix is simple: set up alerts before problems become outages. In this post, I will walk through the most important Cloud SQL metrics to monitor and show you how to configure alerting policies for each.

## Key Cloud SQL Metrics to Monitor

Cloud SQL exposes a rich set of metrics through Cloud Monitoring. Here are the ones that matter most for day-to-day operations:

| Metric | What It Tells You |
|--------|-------------------|
| `cloudsql.googleapis.com/database/cpu/utilization` | How much of the instance's CPU is being used |
| `cloudsql.googleapis.com/database/memory/utilization` | Memory consumption as a fraction of total |
| `cloudsql.googleapis.com/database/disk/utilization` | How full the disk is |
| `cloudsql.googleapis.com/database/disk/bytes_used` | Absolute disk usage in bytes |
| `cloudsql.googleapis.com/database/network/connections` | Current number of active connections |
| `cloudsql.googleapis.com/database/replication/replica_lag` | Replication lag for read replicas |
| `cloudsql.googleapis.com/database/up` | Whether the instance is running |

## Setting Up CPU Utilization Alerts

High CPU utilization is the most common Cloud SQL performance issue. Queries that suddenly become slow, missing indexes, or increased traffic can all push CPU up.

### Using the Cloud Console

1. Go to **Monitoring** > **Alerting** > **Create Policy**
2. Click **Add Condition**
3. In the metric selector, search for `Cloud SQL Database - CPU utilization`
4. Set the threshold to 0.80 (80 percent)
5. Set the duration to 5 minutes
6. Add a notification channel and save

### Using gcloud CLI

The following JSON defines an alerting policy for Cloud SQL CPU utilization:

```json
{
  "displayName": "Cloud SQL High CPU Utilization",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "CPU utilization above 80%",
      "conditionThreshold": {
        "filter": "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/cpu/utilization\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 0.80,
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
  "notificationChannels": [],
  "alertStrategy": {
    "autoClose": "604800s"
  }
}
```

Apply it:

```bash
# Create the CPU utilization alert policy
gcloud alpha monitoring policies create --policy-from-file=cloudsql-cpu-alert.json
```

## Setting Up Memory Alerts

Cloud SQL instances have fixed memory based on their tier. When memory utilization approaches 100 percent, the database starts swapping or refusing new connections.

```json
{
  "displayName": "Cloud SQL High Memory Usage",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "Memory utilization above 90%",
      "conditionThreshold": {
        "filter": "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/memory/utilization\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 0.90,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ]
      }
    }
  ]
}
```

I recommend setting the memory threshold at 90 percent rather than 80 percent because Cloud SQL uses memory caching aggressively, so seeing 70-80 percent usage is normal and healthy.

## Setting Up Disk Space Alerts

Running out of disk space is one of the worst Cloud SQL failures because the database becomes read-only. If you have automatic storage increase enabled, you have a safety net, but you should still alert on it.

Set up two alerts - a warning at 80 percent and a critical at 90 percent:

```json
{
  "displayName": "Cloud SQL Disk Space Warning",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "Disk utilization above 80%",
      "conditionThreshold": {
        "filter": "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/disk/utilization\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 0.80,
        "duration": "0s",
        "aggregations": [
          {
            "alignmentPeriod": "300s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ]
      }
    }
  ]
}
```

For the critical alert, duplicate this but change `thresholdValue` to 0.90 and route it to a higher-priority notification channel (like PagerDuty instead of email).

## Monitoring Connection Counts

Each Cloud SQL instance tier has a maximum connection limit. Hitting that limit means new connections are refused and your application starts throwing errors.

The tricky part is that the connection limit varies by instance tier. For example, a `db-custom-1-3840` instance supports around 250 connections, while a `db-custom-8-30720` supports about 4000. You need to know your instance's limit and set the threshold accordingly.

```json
{
  "displayName": "Cloud SQL High Connection Count",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "Connection count above threshold",
      "conditionThreshold": {
        "filter": "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/network/connections\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 200,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ]
      }
    }
  ]
}
```

Adjust `thresholdValue` based on your instance tier's maximum. I usually set it at about 80 percent of the maximum.

## Monitoring Replication Lag

If you use Cloud SQL read replicas, replication lag is a critical metric. High lag means your replicas are serving stale data, which can cause bugs in applications that expect consistency.

```json
{
  "displayName": "Cloud SQL Replication Lag",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "Replication lag above 30 seconds",
      "conditionThreshold": {
        "filter": "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/replication/replica_lag\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 30,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ]
      }
    }
  ]
}
```

A lag of 30 seconds as the threshold works for most applications, but if your app is sensitive to data freshness, lower it to 5-10 seconds.

## Instance Uptime Alert

The simplest but most important alert - is your database actually running?

```json
{
  "displayName": "Cloud SQL Instance Down",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "Instance is not up",
      "conditionAbsent": {
        "filter": "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/up\"",
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ]
      }
    }
  ]
}
```

This uses `conditionAbsent` instead of `conditionThreshold` - it fires when the metric stops being reported, which indicates the instance is down.

## Terraform Configuration

For teams using Terraform, here is a reusable module pattern for Cloud SQL alerts:

```hcl
# Cloud SQL CPU alert using Terraform
resource "google_monitoring_alert_policy" "cloudsql_cpu" {
  display_name = "Cloud SQL CPU Utilization - ${var.instance_name}"
  combiner     = "OR"

  conditions {
    display_name = "CPU above ${var.cpu_threshold * 100}%"

    condition_threshold {
      filter          = "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/cpu/utilization\" AND resource.labels.database_id=\"${var.project_id}:${var.instance_name}\""
      comparison      = "COMPARISON_GT"
      threshold_value = var.cpu_threshold
      duration        = "300s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = var.notification_channels
}
```

This lets you create per-instance alerts by passing the instance name as a variable.

## Notification Channel Setup

Before your alerts can reach anyone, you need notification channels configured. Here is a quick setup for email and Slack:

```bash
# Create an email notification channel
gcloud beta monitoring channels create \
  --display-name="DBA Team Email" \
  --type=email \
  --channel-labels=email_address=dba-team@yourcompany.com

# Create a Slack notification channel
gcloud beta monitoring channels create \
  --display-name="Alerts Slack Channel" \
  --type=slack \
  --channel-labels=channel_name=alerts
```

Then reference the channel names in your alerting policy JSON.

## Wrapping Up

Database monitoring is not optional - it is one of the first things you should set up after creating a Cloud SQL instance. The alerts described here cover the most common failure modes: CPU saturation, memory pressure, disk exhaustion, connection limits, replication lag, and instance downtime. Together, they give you early warning before minor performance issues turn into production outages.

Start with CPU, disk, and uptime alerts as your minimum, then add memory, connections, and replication lag as your setup grows.
