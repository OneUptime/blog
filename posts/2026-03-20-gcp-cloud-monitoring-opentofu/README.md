# How to Set Up GCP Cloud Monitoring with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Cloud Monitoring, Alerting, Observability, Infrastructure as Code, Google Cloud

Description: Learn how to configure GCP Cloud Monitoring alert policies, notification channels, and uptime checks using OpenTofu for automated observability on Google Cloud.

---

GCP Cloud Monitoring provides metrics, alerting, dashboards, and uptime checks for your Google Cloud infrastructure. With OpenTofu's Google provider, you can define your entire monitoring configuration as code, ensuring consistent observability across all environments.

## Setting Up Notification Channels

Notification channels define where alerts are sent. Configure them before creating alert policies.

```hcl
# main.tf

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.30"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Email notification channel
resource "google_monitoring_notification_channel" "email" {
  display_name = "Ops Team Email"
  type         = "email"

  labels = {
    email_address = var.ops_email
  }
}

# PagerDuty notification channel
resource "google_monitoring_notification_channel" "pagerduty" {
  display_name = "PagerDuty On-Call"
  type         = "pagerduty"

  sensitive_labels {
    service_key = var.pagerduty_service_key
  }
}

# Slack notification channel
resource "google_monitoring_notification_channel" "slack" {
  display_name = "Slack Alerts Channel"
  type         = "slack"

  labels = {
    channel_name = "#infrastructure-alerts"
  }

  sensitive_labels {
    auth_token = var.slack_auth_token
  }
}
```

## Creating Alert Policies

```hcl
# alert_policies.tf
# Alert on high CPU utilization for GCE instances
resource "google_monitoring_alert_policy" "high_cpu" {
  display_name = "High CPU Utilization"
  combiner     = "OR"

  conditions {
    display_name = "CPU utilization above 80%"

    condition_threshold {
      filter          = "resource.type=\"gce_instance\" AND metric.type=\"compute.googleapis.com/instance/cpu/utilization\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8
      duration        = "300s"  # Must persist for 5 minutes

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.name,
    google_monitoring_notification_channel.slack.name,
  ]

  documentation {
    content   = "CPU utilization has exceeded 80% for 5 minutes. Investigate the affected instance and consider scaling."
    mime_type = "text/markdown"
  }
}

# Alert on Cloud Run request latency
resource "google_monitoring_alert_policy" "cloud_run_latency" {
  display_name = "Cloud Run High Latency"
  combiner     = "OR"

  conditions {
    display_name = "95th percentile latency above 2 seconds"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_latencies\""
      comparison      = "COMPARISON_GT"
      threshold_value = 2000  # milliseconds
      duration        = "60s"

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_PERCENTILE_95"
        cross_series_reducer = "REDUCE_MEAN"
        group_by_fields      = ["resource.label.service_name"]
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.pagerduty.name]
}
```

## Creating Uptime Checks

```hcl
# uptime_checks.tf
# HTTP uptime check for a public endpoint
resource "google_monitoring_uptime_check_config" "app_health" {
  display_name = "App Health Check"
  timeout      = "10s"

  # Check every minute
  period = "60s"

  http_check {
    path         = "/health"
    port         = 443
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = var.app_hostname
    }
  }

  # Check from multiple regions for geographic redundancy
  selected_regions = ["USA", "EUROPE", "ASIA_PACIFIC"]
}

# Alert when the uptime check is failing in multiple regions
resource "google_monitoring_alert_policy" "uptime_failure" {
  display_name = "App Uptime Check Failed"
  combiner     = "OR"

  conditions {
    display_name = "Uptime check failing"

    condition_threshold {
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\" AND metric.label.check_id=\"${google_monitoring_uptime_check_config.app_health.uptime_check_id}\""
      comparison      = "COMPARISON_GT"
      threshold_value = 1
      duration        = "0s"

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.*"]
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.pagerduty.name]
}
```

## Best Practices

- Use `combiner = "OR"` for independent conditions and `"AND"` only when conditions are correlated.
- Include runbook links in the `documentation` block so on-call engineers know what to do when an alert fires.
- Set `duration` on threshold conditions to reduce false positives from transient spikes.
- Test notification channels before production. For Slack, the console offers a "Send test notification" option during setup; for other channel types, verify them with a temporary alert policy.
- Co-locate monitoring configuration with the infrastructure it monitors so they change together.
