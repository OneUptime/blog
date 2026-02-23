# How to Create GCP Monitoring Uptime Checks in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Monitoring, Uptime Checks, Infrastructure as Code

Description: Learn how to create Google Cloud Monitoring uptime checks using Terraform to continuously verify the availability of your services and endpoints.

---

GCP Monitoring uptime checks continuously verify that your services are available and responsive. They run from multiple global locations and can check HTTP, HTTPS, and TCP endpoints. Combined with alerting policies, uptime checks form the foundation of availability monitoring. This guide shows you how to create and manage them with Terraform.

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

## HTTP Uptime Check

```hcl
# Create an HTTP uptime check
resource "google_monitoring_uptime_check_config" "website" {
  display_name = "Website Availability Check"
  timeout      = "10s"
  period       = "60s"

  http_check {
    path           = "/"
    port           = 443
    use_ssl        = true
    validate_ssl   = true
    request_method = "GET"

    accepted_response_status_codes {
      status_class = "STATUS_CLASS_2XX"
    }
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = var.website_domain
    }
  }

  # Check from multiple regions
  selected_regions = [
    "USA",
    "EUROPE",
    "ASIA_PACIFIC",
    "SOUTH_AMERICA"
  ]
}

variable "website_domain" {
  type    = string
  default = "example.com"
}
```

## API Endpoint Check with Content Matching

```hcl
# Check an API health endpoint and validate the response
resource "google_monitoring_uptime_check_config" "api_health" {
  display_name = "API Health Check"
  timeout      = "10s"
  period       = "60s"

  http_check {
    path           = "/api/health"
    port           = 443
    use_ssl        = true
    validate_ssl   = true
    request_method = "GET"

    # Verify the response body contains expected content
    content_matchers {
      content = "\"status\":\"healthy\""
      matcher = "CONTAINS_STRING"
    }

    accepted_response_status_codes {
      status_value = 200
    }

    # Add custom headers if needed
    headers = {
      "Accept" = "application/json"
    }
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = var.api_domain
    }
  }

  selected_regions = ["USA", "EUROPE", "ASIA_PACIFIC"]
}

variable "api_domain" {
  type    = string
  default = "api.example.com"
}
```

## TCP Uptime Check

```hcl
# TCP check for a database or custom service
resource "google_monitoring_uptime_check_config" "database" {
  display_name = "Database TCP Check"
  timeout      = "10s"
  period       = "300s"

  tcp_check {
    port = 5432
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = var.db_host
    }
  }

  selected_regions = ["USA"]
}

variable "db_host" {
  type = string
}
```

## Creating Alerting Policies for Uptime Checks

```hcl
# Create a notification channel
resource "google_monitoring_notification_channel" "email" {
  display_name = "Operations Email"
  type         = "email"

  labels = {
    email_address = var.ops_email
  }
}

# Alert when the website uptime check fails
resource "google_monitoring_alert_policy" "website_down" {
  display_name = "Website Down Alert"
  combiner     = "OR"

  conditions {
    display_name = "Website Uptime Check Failed"

    condition_threshold {
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\" AND metric.label.\"check_id\"=\"${google_monitoring_uptime_check_config.website.uptime_check_id}\""
      comparison      = "COMPARISON_GT"
      threshold_value = 1
      duration        = "300s"

      aggregations {
        alignment_period     = "1200s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.*"]
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.name]

  alert_strategy {
    auto_close = "604800s"
  }
}

variable "ops_email" {
  type = string
}
```

## Multiple Endpoint Checks

```hcl
variable "endpoints" {
  type = map(object({
    host    = string
    path    = string
    port    = number
    period  = string
  }))
  default = {
    "website" = { host = "www.example.com", path = "/", port = 443, period = "60s" }
    "api"     = { host = "api.example.com", path = "/health", port = 443, period = "60s" }
    "docs"    = { host = "docs.example.com", path = "/", port = 443, period = "300s" }
  }
}

resource "google_monitoring_uptime_check_config" "endpoints" {
  for_each = var.endpoints

  display_name = "${each.key} uptime check"
  timeout      = "10s"
  period       = each.value.period

  http_check {
    path         = each.value.path
    port         = each.value.port
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = each.value.host
    }
  }

  selected_regions = ["USA", "EUROPE", "ASIA_PACIFIC"]
}
```

## Uptime Check with Custom Headers and Authentication

For authenticated endpoints, you can add custom headers:

```hcl
# Uptime check with authentication headers
resource "google_monitoring_uptime_check_config" "authenticated_api" {
  display_name = "Authenticated API Check"
  timeout      = "10s"
  period       = "60s"

  http_check {
    path           = "/api/v1/status"
    port           = 443
    use_ssl        = true
    validate_ssl   = true
    request_method = "GET"

    headers = {
      "Authorization" = "Bearer ${var.api_token}"
      "Accept"        = "application/json"
    }

    accepted_response_status_codes {
      status_value = 200
    }

    content_matchers {
      content = "\"status\":\"ok\""
      matcher = "CONTAINS_STRING"
    }
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = "api.example.com"
    }
  }

  selected_regions = ["USA", "EUROPE", "ASIA_PACIFIC"]
}

variable "api_token" {
  type      = string
  sensitive = true
}
```

## Best Practices

Use multiple check regions to avoid false positives from regional network issues. Set timeouts appropriate to your service's expected response time. Use content matchers to verify that the response is valid, not just that the server responded. Create alerting policies that require failures from multiple regions before triggering. Use shorter check periods (60 seconds) for critical services and longer periods (300 seconds) for less critical ones.

For comprehensive application monitoring beyond uptime checks, see our guide on [GCP Monitoring notification channels](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-monitoring-notification-channels-in-terraform/view).

## Conclusion

GCP Monitoring uptime checks created through Terraform provide the foundation for availability monitoring. By checking your endpoints from multiple global locations, you get early warning when services become unreachable. Combined with alerting policies and notification channels, uptime checks ensure that your team is notified immediately when availability issues arise.
