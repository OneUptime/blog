# How to Create Cloud Monitoring Alerting Policies and Notification Channels with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, Cloud Monitoring, Alerting, Notification Channels, Observability

Description: Learn how to create Google Cloud Monitoring alerting policies and notification channels using Terraform to automate your monitoring-as-code setup on GCP.

---

Setting up monitoring alerts through the Cloud Console works, but it creates a problem: your alerting configuration is invisible to the rest of the team, impossible to review in pull requests, and not reproducible when you set up a new environment. Managing alerting policies with Terraform brings your monitoring under the same version control as your infrastructure.

This guide covers creating alerting policies and notification channels with Terraform, from simple uptime alerts to complex metric-based conditions.

## Understanding the Components

Cloud Monitoring alerting has three main pieces:

- **Notification Channels**: Where alerts get sent (email, Slack, PagerDuty, webhook)
- **Alerting Policies**: The rules that define when to alert
- **Conditions**: The metric thresholds or absence checks within an alerting policy

An alerting policy contains one or more conditions and references one or more notification channels.

## Creating Notification Channels

Start by defining where alerts should go:

```hcl
# notification_channels.tf - Define where alerts get delivered

# Email notification channel for the oncall team
resource "google_monitoring_notification_channel" "email_oncall" {
  display_name = "Oncall Team Email"
  type         = "email"
  project      = var.project_id

  labels = {
    email_address = "oncall@yourcompany.com"
  }
}

# Slack notification channel
resource "google_monitoring_notification_channel" "slack_alerts" {
  display_name = "Slack Alerts Channel"
  type         = "slack"
  project      = var.project_id

  labels = {
    channel_name = "#production-alerts"
  }

  sensitive_labels {
    auth_token = var.slack_auth_token
  }
}

# PagerDuty notification channel
resource "google_monitoring_notification_channel" "pagerduty" {
  display_name = "PagerDuty Production"
  type         = "pagerduty"
  project      = var.project_id

  labels = {
    service_key = var.pagerduty_service_key
  }
}

# Webhook notification channel
resource "google_monitoring_notification_channel" "webhook" {
  display_name = "Custom Webhook"
  type         = "webhook_tokenauth"
  project      = var.project_id

  labels = {
    url = "https://alerts.yourcompany.com/webhook"
  }
}
```

## Basic Alerting Policy - CPU Utilization

Here is an alerting policy that fires when CPU utilization exceeds a threshold:

```hcl
# alerting.tf - CPU utilization alert
resource "google_monitoring_alert_policy" "high_cpu" {
  display_name = "High CPU Utilization"
  project      = var.project_id
  combiner     = "OR"  # Alert if ANY condition is met

  conditions {
    display_name = "CPU utilization above 80%"

    condition_threshold {
      filter = "resource.type = \"gce_instance\" AND metric.type = \"compute.googleapis.com/instance/cpu/utilization\""

      comparison      = "COMPARISON_GT"
      threshold_value = 0.8  # 80%
      duration        = "300s"  # Must persist for 5 minutes

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }

      trigger {
        count = 1
      }
    }
  }

  # Send alerts to these channels
  notification_channels = [
    google_monitoring_notification_channel.email_oncall.name,
    google_monitoring_notification_channel.slack_alerts.name,
  ]

  # Documentation that appears in the alert
  documentation {
    content   = "CPU utilization has exceeded 80% for more than 5 minutes on a Compute Engine instance. Check for runaway processes or consider scaling up."
    mime_type = "text/markdown"
  }

  alert_strategy {
    auto_close = "1800s"  # Auto-close after 30 minutes of no alerts
  }
}
```

## Memory Utilization Alert

```hcl
# alerting.tf - Memory utilization alert
resource "google_monitoring_alert_policy" "high_memory" {
  display_name = "High Memory Utilization"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Memory utilization above 90%"

    condition_threshold {
      filter = "resource.type = \"gce_instance\" AND metric.type = \"agent.googleapis.com/memory/percent_used\" AND metric.labels.state = \"used\""

      comparison      = "COMPARISON_GT"
      threshold_value = 90
      duration        = "300s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email_oncall.name,
    google_monitoring_notification_channel.slack_alerts.name,
  ]

  documentation {
    content   = "Memory usage has exceeded 90% for more than 5 minutes. Check for memory leaks or OOM conditions."
    mime_type = "text/markdown"
  }
}
```

## Cloud SQL Alerting Policies

Database alerts are critical for production:

```hcl
# sql_alerts.tf - Cloud SQL monitoring alerts

# Cloud SQL CPU alert
resource "google_monitoring_alert_policy" "sql_cpu" {
  display_name = "Cloud SQL High CPU"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Cloud SQL CPU above 80%"

    condition_threshold {
      filter          = "resource.type = \"cloudsql_database\" AND metric.type = \"cloudsql.googleapis.com/database/cpu/utilization\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8
      duration        = "300s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.pagerduty.name,
    google_monitoring_notification_channel.slack_alerts.name,
  ]

  documentation {
    content = "Cloud SQL instance CPU utilization is above 80%. Consider optimizing queries or scaling up the instance tier."
  }
}

# Cloud SQL disk utilization alert
resource "google_monitoring_alert_policy" "sql_disk" {
  display_name = "Cloud SQL Disk Space Low"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Cloud SQL disk usage above 85%"

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
    google_monitoring_notification_channel.pagerduty.name,
    google_monitoring_notification_channel.email_oncall.name,
  ]

  documentation {
    content = "Cloud SQL disk utilization is above 85%. If autoresize is not enabled, the database may run out of space."
  }
}

# Cloud SQL connection count alert
resource "google_monitoring_alert_policy" "sql_connections" {
  display_name = "Cloud SQL High Connection Count"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Connection count near limit"

    condition_threshold {
      filter          = "resource.type = \"cloudsql_database\" AND metric.type = \"cloudsql.googleapis.com/database/network/connections\""
      comparison      = "COMPARISON_GT"
      threshold_value = 180  # Near the default PostgreSQL limit of 200
      duration        = "120s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.slack_alerts.name,
  ]

  documentation {
    content = "Cloud SQL connection count is approaching the maximum. Check for connection leaks or consider increasing max_connections."
  }
}
```

## Cloud Run Alerting Policies

```hcl
# cloudrun_alerts.tf - Cloud Run monitoring

# Cloud Run latency alert
resource "google_monitoring_alert_policy" "cloudrun_latency" {
  display_name = "Cloud Run High Latency"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Request latency above 2 seconds (p95)"

    condition_threshold {
      filter = "resource.type = \"cloud_run_revision\" AND metric.type = \"run.googleapis.com/request_latencies\""

      comparison      = "COMPARISON_GT"
      threshold_value = 2000  # 2000ms = 2 seconds
      duration        = "300s"

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_PERCENTILE_95"
        cross_series_reducer = "REDUCE_MAX"
        group_by_fields      = ["resource.label.service_name"]
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.slack_alerts.name,
  ]

  documentation {
    content = "Cloud Run p95 latency has exceeded 2 seconds for 5 minutes. Check for slow dependencies or resource constraints."
  }
}

# Cloud Run error rate alert
resource "google_monitoring_alert_policy" "cloudrun_errors" {
  display_name = "Cloud Run High Error Rate"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "5xx error rate above 5%"

    condition_threshold {
      filter = "resource.type = \"cloud_run_revision\" AND metric.type = \"run.googleapis.com/request_count\" AND metric.labels.response_code_class = \"5xx\""

      comparison      = "COMPARISON_GT"
      threshold_value = 5
      duration        = "120s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.pagerduty.name,
    google_monitoring_notification_channel.slack_alerts.name,
  ]

  documentation {
    content = "Cloud Run service is returning more than 5% server errors. Check application logs for error details."
  }
}
```

## Uptime Check Alerts

Monitor external endpoint availability:

```hcl
# uptime.tf - Uptime check and alert

# Create an uptime check
resource "google_monitoring_uptime_check_config" "api_health" {
  display_name = "API Health Check"
  project      = var.project_id
  timeout      = "10s"
  period       = "60s"

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
      host       = "api.example.com"
    }
  }

  checker_type = "STATIC_IP_CHECKERS"
}

# Alert when the uptime check fails
resource "google_monitoring_alert_policy" "uptime_alert" {
  display_name = "API Uptime Check Failed"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Uptime check failing"

    condition_threshold {
      filter          = "resource.type = \"uptime_url\" AND metric.type = \"monitoring.googleapis.com/uptime_check/check_passed\" AND metric.labels.check_id = \"${google_monitoring_uptime_check_config.api_health.uptime_check_id}\""
      comparison      = "COMPARISON_GT"
      threshold_value = 1
      duration        = "300s"

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.*"]
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.pagerduty.name,
    google_monitoring_notification_channel.email_oncall.name,
  ]

  documentation {
    content = "The API health check at api.example.com/health is failing. The service may be down."
  }
}
```

## Using a Module for Reusable Alert Patterns

When you have many services, a module reduces duplication:

```hcl
# modules/service-alerts/variables.tf
variable "project_id" { type = string }
variable "service_name" { type = string }
variable "notification_channels" { type = list(string) }
variable "latency_threshold_ms" { type = number; default = 2000 }
variable "error_rate_threshold" { type = number; default = 5 }

# modules/service-alerts/main.tf
resource "google_monitoring_alert_policy" "latency" {
  display_name = "${var.service_name} - High Latency"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "p95 latency above ${var.latency_threshold_ms}ms"
    condition_threshold {
      filter          = "resource.type = \"cloud_run_revision\" AND metric.type = \"run.googleapis.com/request_latencies\" AND resource.labels.service_name = \"${var.service_name}\""
      comparison      = "COMPARISON_GT"
      threshold_value = var.latency_threshold_ms
      duration        = "300s"
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_PERCENTILE_95"
      }
    }
  }

  notification_channels = var.notification_channels
}

# Usage
module "api_alerts" {
  source = "./modules/service-alerts"

  project_id             = var.project_id
  service_name           = "api-service"
  notification_channels  = [google_monitoring_notification_channel.slack_alerts.name]
  latency_threshold_ms   = 1500
}
```

## Best Practices

1. **Include documentation in every alert.** When someone gets paged at 3 AM, the alert should tell them what is wrong and where to start looking.
2. **Set appropriate durations.** A 30-second CPU spike is not worth paging for. Use 5-minute durations to filter out transient spikes.
3. **Use tiered notification channels.** Send everything to Slack, but only page for critical alerts via PagerDuty.
4. **Create alerts for every critical metric.** CPU, memory, disk, error rate, latency, and connection counts at minimum.
5. **Test your alerts.** Intentionally trigger conditions to verify notifications arrive.
6. **Store sensitive values in variables or Secret Manager.** Never hardcode Slack tokens or PagerDuty keys.
7. **Use auto_close** to prevent stale incidents from cluttering the dashboard.

## Wrapping Up

Managing alerting policies with Terraform means your monitoring configuration is reviewed, versioned, and reproducible. When you set up a new environment, all the alerts come along automatically. Start with the critical metrics - CPU, memory, disk, error rate, and uptime - and add more specific alerts as you learn your application's behavior patterns.
