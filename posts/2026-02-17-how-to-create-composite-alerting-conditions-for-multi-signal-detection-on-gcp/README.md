# How to Create Composite Alerting Conditions for Multi-Signal Detection on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Monitoring, Alerting, SRE, Observability

Description: Learn how to create composite alerting conditions in Google Cloud Monitoring that combine multiple signals for smarter, more reliable alert detection with fewer false positives.

---

Single-signal alerts are noisy. If you alert every time CPU goes above 80%, you will get paged at 3 AM for a five-second spike that resolved itself. If you alert every time error rate ticks up, you will learn to ignore your own alerts. The solution is composite conditions - alerts that only fire when multiple signals indicate a real problem.

Google Cloud Monitoring supports multi-condition alert policies that let you combine metrics, set logical operators (AND/OR), and require conditions to hold for a duration before firing. This post covers how to set them up effectively.

## Why Composite Alerts Matter

Consider these scenarios:

**Single alert:** Error rate > 5% for 5 minutes. Fires during a code deploy that takes 3 minutes. False positive.

**Composite alert:** Error rate > 5% AND request volume > 100 rps AND not during a deploy window. Only fires when there are real errors affecting real users. Much more useful.

The idea is that a real outage produces multiple correlated signals. High error rates plus high latency plus dropping throughput together are a much stronger signal than any one of them alone.

## Creating a Multi-Condition Alert Policy

Here is a Terraform configuration for a composite alert that requires both high error rate AND high latency:

```hcl
# terraform/composite_alert.tf
resource "google_monitoring_alert_policy" "service_degradation" {
  display_name = "Service Degradation - High Errors AND High Latency"
  combiner     = "AND"  # All conditions must be true

  conditions {
    display_name = "Error Rate Above 5%"

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
        | condition error_rate > 5
      MQL

      duration = "300s"  # Must hold for 5 minutes

      trigger {
        count = 1
      }
    }
  }

  conditions {
    display_name = "P99 Latency Above 2 seconds"

    condition_monitoring_query_language {
      query = <<-MQL
        fetch cloud_run_revision
        | metric 'run.googleapis.com/request_latencies'
        | align delta(5m)
        | group_by [resource.service_name],
            [p99: percentile(val(), 99)]
        | condition p99 > 2000
      MQL

      duration = "300s"

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.pagerduty.id,
    google_monitoring_notification_channel.slack.id,
  ]

  alert_strategy {
    auto_close = "1800s"  # Auto-close after 30 minutes of recovery
  }

  documentation {
    content   = "Both error rate and latency are elevated, indicating service degradation. Check the service dashboard for more details."
    mime_type = "text/markdown"
  }
}
```

## AND vs OR Combiners

The `combiner` field determines how conditions are combined:

**AND combiner:** All conditions must be true simultaneously. Use this when you want to reduce false positives by requiring multiple symptoms.

**OR combiner:** Any condition being true fires the alert. Use this when you want to catch any one of several possible failure modes.

**AND_WITH_MATCHING_RESOURCE:** All conditions must be true for the same resource. This is crucial for per-service or per-instance alerts.

```hcl
# AND_WITH_MATCHING_RESOURCE - conditions must match the same service
resource "google_monitoring_alert_policy" "per_service_degradation" {
  display_name = "Per-Service Degradation"
  combiner     = "AND_WITH_MATCHING_RESOURCE"

  conditions {
    display_name = "High Error Rate for Service"
    condition_threshold {
      filter          = "resource.type = \"cloud_run_revision\" AND metric.type = \"run.googleapis.com/request_count\" AND metric.labels.response_code_class = \"5xx\""
      comparison      = "COMPARISON_GT"
      threshold_value = 10
      duration        = "300s"

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_RATE"
        group_by_fields    = ["resource.label.service_name"]
      }
    }
  }

  conditions {
    display_name = "High Latency for Service"
    condition_threshold {
      filter          = "resource.type = \"cloud_run_revision\" AND metric.type = \"run.googleapis.com/request_latencies\""
      comparison      = "COMPARISON_GT"
      threshold_value = 3000
      duration        = "300s"

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_PERCENTILE_99"
        group_by_fields      = ["resource.label.service_name"]
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.pagerduty.id,
  ]
}
```

With `AND_WITH_MATCHING_RESOURCE`, the alert only fires when both conditions are true for the same service. If Service A has high errors but low latency, and Service B has high latency but low errors, the alert does not fire.

## Common Composite Alert Patterns

### Pattern 1: Sustained Degradation

Require a problem to persist for several minutes before alerting:

```hcl
# Only alert if the problem lasts more than 10 minutes
conditions {
  display_name = "Sustained High Error Rate"
  condition_monitoring_query_language {
    query = <<-MQL
      fetch cloud_run_revision
      | metric 'run.googleapis.com/request_count'
      | filter metric.response_code_class = '5xx'
      | align rate(5m)
      | group_by [resource.service_name], [errors_per_sec: aggregate(val())]
      | condition errors_per_sec > 1
    MQL
    # The condition must hold continuously for 10 minutes
    duration = "600s"
    trigger {
      count = 1
    }
  }
}
```

### Pattern 2: Capacity Warning

Alert when multiple capacity indicators are high simultaneously:

```hcl
resource "google_monitoring_alert_policy" "capacity_warning" {
  display_name = "Capacity Warning - Multiple Resources Strained"
  combiner     = "AND"

  # CPU above 80%
  conditions {
    display_name = "High CPU"
    condition_threshold {
      filter          = "resource.type = \"gce_instance\" AND metric.type = \"compute.googleapis.com/instance/cpu/utilization\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8
      duration        = "600s"
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  # Memory above 85%
  conditions {
    display_name = "High Memory"
    condition_threshold {
      filter          = "resource.type = \"gce_instance\" AND metric.type = \"agent.googleapis.com/memory/percent_used\""
      comparison      = "COMPARISON_GT"
      threshold_value = 85
      duration        = "600s"
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.slack.id,
  ]
}
```

### Pattern 3: Saturation Detection

Detect when a database is approaching its limits:

```hcl
resource "google_monitoring_alert_policy" "db_saturation" {
  display_name = "Database Saturation Warning"
  combiner     = "OR"  # Any of these conditions is concerning

  conditions {
    display_name = "Connection Pool > 90%"
    condition_threshold {
      filter          = "resource.type = \"cloudsql_database\" AND metric.type = \"cloudsql.googleapis.com/database/network/connections\""
      comparison      = "COMPARISON_GT"
      threshold_value = 900  # Assuming max 1000 connections
      duration        = "300s"
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  conditions {
    display_name = "CPU Utilization > 90%"
    condition_threshold {
      filter          = "resource.type = \"cloudsql_database\" AND metric.type = \"cloudsql.googleapis.com/database/cpu/utilization\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.9
      duration        = "300s"
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  conditions {
    display_name = "Disk Utilization > 85%"
    condition_threshold {
      filter          = "resource.type = \"cloudsql_database\" AND metric.type = \"cloudsql.googleapis.com/database/disk/utilization\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.85
      duration        = "300s"
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.pagerduty.id,
  ]
}
```

## Creating Alerts with the gcloud CLI

For quick setup or testing, you can create alert policies from the command line:

```bash
# Create a composite alert from a JSON policy file
gcloud alpha monitoring policies create \
  --policy-from-file=alert-policy.json \
  --project=my-project
```

The policy JSON file:

```json
{
  "displayName": "Service Health Composite Alert",
  "combiner": "AND",
  "conditions": [
    {
      "displayName": "Error Rate Above Threshold",
      "conditionThreshold": {
        "filter": "resource.type = \"cloud_run_revision\" AND metric.type = \"run.googleapis.com/request_count\" AND metric.labels.response_code_class = \"5xx\"",
        "aggregations": [
          {
            "alignmentPeriod": "300s",
            "perSeriesAligner": "ALIGN_RATE"
          }
        ],
        "comparison": "COMPARISON_GT",
        "thresholdValue": 5,
        "duration": "300s"
      }
    },
    {
      "displayName": "Request Volume Above Minimum",
      "conditionThreshold": {
        "filter": "resource.type = \"cloud_run_revision\" AND metric.type = \"run.googleapis.com/request_count\"",
        "aggregations": [
          {
            "alignmentPeriod": "300s",
            "perSeriesAligner": "ALIGN_RATE"
          }
        ],
        "comparison": "COMPARISON_GT",
        "thresholdValue": 10,
        "duration": "60s"
      }
    }
  ],
  "notificationChannels": [],
  "documentation": {
    "content": "Service is experiencing elevated error rates during active traffic.",
    "mimeType": "text/markdown"
  }
}
```

## Best Practices

1. **Start with AND, not OR.** AND combiners reduce false positives. Reserve OR for catch-all alerts where any single signal is sufficient.

2. **Use AND_WITH_MATCHING_RESOURCE for per-service alerts.** This prevents cross-service false positives where one service is slow and another has errors.

3. **Set meaningful durations.** A 5-minute duration filters out transient spikes. For critical alerts, you might want a shorter duration (1-2 minutes) but require both conditions.

4. **Include a traffic volume condition.** Errors during zero traffic are not actionable. Add a minimum traffic threshold to avoid alerting on low-traffic noise.

5. **Document your alerts.** Use the documentation field to explain what the alert means, why it fires, and what to do about it.

Composite alerts are one of the most effective ways to reduce alert fatigue while maintaining visibility into real problems. Combined with proper escalation through tools like OneUptime, you get a notification system that pages you when it matters and stays quiet when it does not.
