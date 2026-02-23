# How to Create GCP Monitoring Notification Channels in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Monitoring, Notifications, Infrastructure as Code

Description: Learn how to create Google Cloud Monitoring notification channels using Terraform for email, Slack, PagerDuty, and webhook alert delivery.

---

Google Cloud Monitoring notification channels define how and where alert notifications are delivered. They support email, SMS, Slack, PagerDuty, webhooks, and more. Managing these channels through Terraform ensures consistent notification configuration across your projects. This guide covers creating all major channel types.

## Setting Up the Provider

```hcl
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
}

variable "project_id" { type = string }
```

## Email Notification Channel

```hcl
resource "google_monitoring_notification_channel" "email_ops" {
  display_name = "Operations Team Email"
  type         = "email"
  labels = {
    email_address = "ops@company.com"
  }
}

resource "google_monitoring_notification_channel" "email_dev" {
  display_name = "Development Team Email"
  type         = "email"
  labels = {
    email_address = "dev@company.com"
  }
}
```

## Slack Notification Channel

```hcl
resource "google_monitoring_notification_channel" "slack" {
  display_name = "Slack Alerts Channel"
  type         = "slack"
  labels = {
    channel_name = "#alerts"
  }
  sensitive_labels {
    auth_token = var.slack_token
  }
}

variable "slack_token" {
  type      = string
  sensitive = true
}
```

## PagerDuty Notification Channel

```hcl
resource "google_monitoring_notification_channel" "pagerduty" {
  display_name = "PagerDuty Integration"
  type         = "pagerduty"
  labels = {
    service_key = var.pagerduty_service_key
  }
}

variable "pagerduty_service_key" {
  type      = string
  sensitive = true
}
```

## Webhook Notification Channel

```hcl
resource "google_monitoring_notification_channel" "webhook" {
  display_name = "Custom Webhook"
  type         = "webhook_tokenauth"
  labels = {
    url = var.webhook_url
  }
  sensitive_labels {
    password = var.webhook_token
  }
}

variable "webhook_url" { type = string }
variable "webhook_token" {
  type      = string
  sensitive = true
}
```

## SMS Notification Channel

```hcl
resource "google_monitoring_notification_channel" "sms" {
  display_name = "On-Call SMS"
  type         = "sms"
  labels = {
    number = var.oncall_phone
  }
}

variable "oncall_phone" { type = string }
```

## Using Channels in Alert Policies

```hcl
# Create an alert policy that uses multiple notification channels
resource "google_monitoring_alert_policy" "high_cpu" {
  display_name = "High CPU Alert"
  combiner     = "OR"

  conditions {
    display_name = "CPU above 80%"
    condition_threshold {
      filter          = "metric.type=\"compute.googleapis.com/instance/cpu/utilization\" resource.type=\"gce_instance\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8
      duration        = "300s"
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  # Send to multiple channels
  notification_channels = [
    google_monitoring_notification_channel.email_ops.name,
    google_monitoring_notification_channel.slack.name,
    google_monitoring_notification_channel.pagerduty.name,
  ]
}
```

## Pub/Sub Notification Channel

For programmatic alert handling, you can route notifications to a Pub/Sub topic:

```hcl
# Create a Pub/Sub topic for alert notifications
resource "google_pubsub_topic" "alerts" {
  name    = "monitoring-alerts"
  project = var.project_id
}

# Create a notification channel that publishes to Pub/Sub
resource "google_monitoring_notification_channel" "pubsub" {
  display_name = "Alert Processing Pipeline"
  type         = "pubsub"
  labels = {
    topic = google_pubsub_topic.alerts.id
  }
}

# Subscribe a Cloud Function to process alerts
resource "google_pubsub_subscription" "alert_processor" {
  name  = "alert-processor"
  topic = google_pubsub_topic.alerts.name

  ack_deadline_seconds = 20

  push_config {
    push_endpoint = var.cloud_function_url
  }
}

variable "cloud_function_url" {
  type    = string
  default = ""
}
```

## Tiered Notification Strategy

A common pattern is creating channel groups for different severity levels. Critical alerts go to PagerDuty and SMS, warnings go to Slack, and informational alerts go to email:

```hcl
# Group channels by severity for easy reference in alert policies
locals {
  critical_channels = [
    google_monitoring_notification_channel.pagerduty.name,
    google_monitoring_notification_channel.sms.name,
    google_monitoring_notification_channel.email_ops.name,
  ]

  warning_channels = [
    google_monitoring_notification_channel.slack.name,
    google_monitoring_notification_channel.email_ops.name,
  ]

  info_channels = [
    google_monitoring_notification_channel.email_dev.name,
  ]
}

# Use these grouped channels in alert policies
resource "google_monitoring_alert_policy" "critical_example" {
  display_name = "Critical Service Down"
  combiner     = "OR"

  conditions {
    display_name = "Service unavailable"
    condition_threshold {
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" resource.type=\"uptime_url\""
      comparison      = "COMPARISON_GT"
      threshold_value = 1
      duration        = "300s"
      aggregations {
        alignment_period     = "1200s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.*"]
      }
    }
  }

  # Route to all critical channels
  notification_channels = local.critical_channels
}
```

## Verifying Notification Channels

After creating channels, you should verify they work. GCP requires email channels to be verified before they can receive notifications. You can track the verification status:

```hcl
# Output channel verification status
output "notification_channels" {
  value = {
    email_ops = {
      name     = google_monitoring_notification_channel.email_ops.name
      verified = google_monitoring_notification_channel.email_ops.verification_status
    }
    slack = {
      name = google_monitoring_notification_channel.slack.name
    }
    pagerduty = {
      name = google_monitoring_notification_channel.pagerduty.name
    }
  }
}
```

## Dynamic Channel Creation

```hcl
variable "email_channels" {
  type = map(string)
  default = {
    "ops"      = "ops@company.com"
    "dev"      = "dev@company.com"
    "security" = "security@company.com"
    "managers" = "managers@company.com"
  }
}

resource "google_monitoring_notification_channel" "emails" {
  for_each     = var.email_channels
  display_name = "${each.key} email channel"
  type         = "email"
  labels = {
    email_address = each.value
  }
}
```

## Best Practices

Create notification channels for each team and severity level. Use sensitive_labels for tokens and passwords to keep them out of Terraform state in plaintext. Test channels by creating a low-threshold alert to verify delivery. Use multiple channel types for critical alerts to ensure redundancy. Organize channels by team ownership so alert routing is clear.

For creating the alert policies that use these channels, see our guides on [GCP Monitoring uptime checks](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-monitoring-uptime-checks-in-terraform/view) and [GCP Logging metrics](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-logging-metrics-in-terraform/view).

## Conclusion

GCP Monitoring notification channels managed through Terraform provide consistent, version-controlled alert delivery configuration. By defining channels as code, you ensure that your alerting infrastructure is reproducible and auditable. Combined with alert policies and uptime checks, notification channels complete the monitoring pipeline from detection to response.
