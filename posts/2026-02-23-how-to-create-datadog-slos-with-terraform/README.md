# How to Create Datadog SLOs with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Datadog, SLO, SLI, Monitoring, Infrastructure as Code

Description: Learn how to create Datadog Service Level Objectives using Terraform to track and manage reliability targets for your services.

---

Service Level Objectives (SLOs) define the reliability targets for your services. Datadog SLOs let you track how well you are meeting these targets over time, helping you balance feature development with reliability work. Managing SLOs through Terraform ensures they are version-controlled and consistently applied. This guide shows you how.

## Setting Up the Provider

```hcl
terraform {
  required_providers {
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.0"
    }
  }
}

provider "datadog" {
  api_key = var.datadog_api_key
  app_key = var.datadog_app_key
}

variable "datadog_api_key" { type = string; sensitive = true }
variable "datadog_app_key" { type = string; sensitive = true }
```

## Monitor-Based SLO

```hcl
# First create the monitors that form the SLI
resource "datadog_monitor" "api_uptime" {
  name    = "API Service Health Check"
  type    = "metric alert"
  message = "API service health check is failing. @ops-team"
  query   = "avg(last_5m):avg:synthetics.http.response.status_code{check_id:api-health} > 299"

  monitor_thresholds {
    critical = 299
  }
}

# Create a monitor-based SLO
resource "datadog_service_level_objective" "api_availability" {
  name        = "API Service Availability"
  type        = "monitor"
  description = "The API service should be available 99.9% of the time"

  # Reference the monitor IDs
  monitor_ids = [datadog_monitor.api_uptime.id]

  # Define the target
  thresholds {
    timeframe = "7d"
    target    = 99.9
    warning   = 99.95
  }

  thresholds {
    timeframe = "30d"
    target    = 99.9
    warning   = 99.95
  }

  thresholds {
    timeframe = "90d"
    target    = 99.9
    warning   = 99.95
  }

  tags = ["service:api", "team:backend", "tier:critical"]
}
```

## Metric-Based SLO

```hcl
# Create a metric-based SLO for latency
resource "datadog_service_level_objective" "api_latency" {
  name        = "API Service Latency SLO"
  type        = "metric"
  description = "99% of API requests should complete within 500ms"

  query {
    # Numerator: count of requests faster than 500ms
    numerator   = "sum:trace.web.request.hits{service:api-service,env:production}.as_count() - sum:trace.web.request.duration.by.service.above_500ms{service:api-service,env:production}.as_count()"
    # Denominator: total request count
    denominator = "sum:trace.web.request.hits{service:api-service,env:production}.as_count()"
  }

  thresholds {
    timeframe = "7d"
    target    = 99.0
    warning   = 99.5
  }

  thresholds {
    timeframe = "30d"
    target    = 99.0
    warning   = 99.5
  }

  tags = ["service:api", "team:backend", "slo-type:latency"]
}

# SLO for error rate
resource "datadog_service_level_objective" "api_error_rate" {
  name        = "API Service Error Rate SLO"
  type        = "metric"
  description = "Less than 0.1% of API requests should result in errors"

  query {
    # Numerator: successful requests
    numerator   = "sum:trace.web.request.hits{service:api-service,env:production}.as_count() - sum:trace.web.request.errors{service:api-service,env:production}.as_count()"
    # Denominator: total requests
    denominator = "sum:trace.web.request.hits{service:api-service,env:production}.as_count()"
  }

  thresholds {
    timeframe = "7d"
    target    = 99.9
    warning   = 99.95
  }

  thresholds {
    timeframe = "30d"
    target    = 99.9
    warning   = 99.95
  }

  tags = ["service:api", "team:backend", "slo-type:error-rate"]
}
```

## SLO Alert (Error Budget Alert)

```hcl
# Alert when error budget is being consumed too quickly
resource "datadog_monitor" "slo_error_budget" {
  name    = "API Availability SLO Error Budget Alert"
  type    = "slo alert"
  message = "Error budget for API availability SLO is being consumed rapidly. @ops-team @pagerduty"

  query = "error_budget(\"${datadog_service_level_objective.api_availability.id}\").over(\"7d\") > 75"

  monitor_thresholds {
    critical = 75
    warning  = 50
  }

  tags = ["slo:api-availability", "team:backend"]
}

# Alert when SLO target is at risk
resource "datadog_monitor" "slo_burn_rate" {
  name    = "API Latency SLO Burn Rate Alert"
  type    = "slo alert"
  message = "API latency SLO burn rate is too high. Investigate performance issues. @ops-team"

  query = "burn_rate(\"${datadog_service_level_objective.api_latency.id}\").over(\"7d\").long_window(\"1h\").short_window(\"5m\") > 14.4"

  monitor_thresholds {
    critical = 14.4
    warning  = 7.2
  }

  tags = ["slo:api-latency", "team:backend"]
}
```

## Multiple Service SLOs

```hcl
variable "service_slos" {
  type = map(object({
    service     = string
    target      = number
    description = string
  }))
  default = {
    "api" = {
      service     = "api-service"
      target      = 99.9
      description = "API service availability"
    }
    "web" = {
      service     = "web-frontend"
      target      = 99.5
      description = "Web frontend availability"
    }
    "worker" = {
      service     = "background-worker"
      target      = 99.0
      description = "Background worker availability"
    }
  }
}

resource "datadog_service_level_objective" "services" {
  for_each = var.service_slos

  name        = "${each.key} Service Availability SLO"
  type        = "metric"
  description = each.value.description

  query {
    numerator   = "sum:trace.web.request.hits{service:${each.value.service},env:production}.as_count() - sum:trace.web.request.errors{service:${each.value.service},env:production}.as_count()"
    denominator = "sum:trace.web.request.hits{service:${each.value.service},env:production}.as_count()"
  }

  thresholds {
    timeframe = "30d"
    target    = each.value.target
    warning   = each.value.target + 0.05
  }

  tags = ["service:${each.value.service}", "managed-by:terraform"]
}
```

## Best Practices

Define SLOs based on user-facing metrics rather than internal system metrics. Use multiple timeframes (7d, 30d, 90d) to track both short-term and long-term reliability. Set up error budget alerts alongside SLOs so your team knows when to prioritize reliability over features. Use metric-based SLOs when possible for more accurate calculations. Define SLOs collaboratively with product and engineering teams. Review and adjust SLO targets periodically based on business needs.

For monitoring the infrastructure supporting your SLOs, see our guide on [Datadog monitors](https://oneuptime.com/blog/post/2026-02-23-how-to-create-datadog-monitors-with-terraform/view).

## Conclusion

Datadog SLOs managed through Terraform provide a structured, version-controlled approach to reliability management. By defining SLOs as code, you ensure that reliability targets are consistently tracked across services and that error budget alerts keep your team informed about when to focus on stability. Combined with Datadog monitors and dashboards, SLOs form the foundation of a mature reliability practice.
