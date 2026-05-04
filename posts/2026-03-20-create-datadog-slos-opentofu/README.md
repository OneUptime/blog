# How to Create Datadog SLOs with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Datadog, SLO, Reliability, Infrastructure as Code

Description: Learn how to define and manage Datadog Service Level Objectives with OpenTofu to track and enforce reliability targets as code.

Service Level Objectives (SLOs) define the reliability targets for your services. Managing SLOs in OpenTofu ensures your reliability contracts are version-controlled, consistently applied across services, and tied to monitor definitions.

## Provider Configuration

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
```

## Metric-Based SLO

Metric SLOs track the ratio of good events to total events over time.

```hcl
resource "datadog_service_level_objective" "api_availability" {
  name        = "API Availability"
  type        = "metric"
  description = "99.9% of API requests return 2xx or 3xx responses"

  thresholds {
    timeframe       = "30d"
    target          = 99.9
    warning         = 99.95
  }

  thresholds {
    timeframe       = "7d"
    target          = 99.9
    warning         = 99.95
  }

  # Good events: successful responses
  query {
    numerator   = "sum:trace.web.request.hits{http.status_code:2*, service:api}.as_count() + sum:trace.web.request.hits{http.status_code:3*, service:api}.as_count()"
    denominator = "sum:trace.web.request.hits{service:api}.as_count()"
  }

  tags = ["service:api", "team:backend", "env:production"]
}
```

## Monitor-Based SLO

Monitor SLOs measure how much time a monitor spends in the OK state.

```hcl
# First define the monitor

resource "datadog_monitor" "api_latency" {
  name    = "API P95 Latency"
  type    = "metric alert"
  message = "API P95 latency is above threshold. @oncall-backend"

  query = "avg(last_5m):p95:trace.web.request{service:api} > 0.5"

  monitor_thresholds {
    critical = 0.5
    warning  = 0.4
  }
}

# SLO based on that monitor
resource "datadog_service_level_objective" "api_latency_slo" {
  name        = "API Latency SLO"
  type        = "monitor"
  description = "API P95 latency stays below 500ms for 99.5% of the time"

  monitor_ids = [datadog_monitor.api_latency.id]

  thresholds {
    timeframe = "30d"
    target    = 99.5
    warning   = 99.7
  }

  tags = ["service:api", "team:backend"]
}
```

## SLO Alert

```hcl
resource "datadog_monitor" "slo_burn_rate" {
  name    = "API SLO Error Budget Burn Rate"
  type    = "slo alert"
  message = "API SLO error budget is burning too fast. @pagerduty-oncall"

  query = "burn_rate(\"${datadog_service_level_objective.api_availability.id}\").over(\"30d\").long_window(\"1h\").short_window(\"5m\") > 14.4"

  monitor_thresholds {
    critical = 14.4  # 1h long window, 30d SLO - 2% budget burned in 1h
    warning  = 7.2
  }
}
```

## SLO Status Dashboard

```hcl
resource "datadog_dashboard" "slo_overview" {
  title       = "SLO Overview"
  description = "Status of all service level objectives"
  layout_type = "ordered"

  widget {
    service_level_objective_definition {
      title      = "API Availability"
      view_type  = "detail"
      slo_id     = datadog_service_level_objective.api_availability.id
      time_windows = ["7d", "30d"]
      show_error_budget = true
    }
  }

  widget {
    service_level_objective_definition {
      title      = "API Latency"
      view_type  = "detail"
      slo_id     = datadog_service_level_objective.api_latency_slo.id
      time_windows = ["7d", "30d"]
      show_error_budget = true
    }
  }
}
```

## Multiple Service SLOs with for_each

```hcl
locals {
  services = {
    api      = { target = 99.9, window = "30d" }
    checkout = { target = 99.95, window = "30d" }
    auth     = { target = 99.99, window = "30d" }
  }
}

resource "datadog_service_level_objective" "services" {
  for_each = local.services

  name        = "${each.key} Availability"
  type        = "metric"
  description = "${each.value.target}% availability for ${each.key}"

  thresholds {
    timeframe = each.value.window
    target    = each.value.target
  }

  query {
    numerator   = "sum:trace.web.request.hits{http.status_code:2*, service:${each.key}}.as_count()"
    denominator = "sum:trace.web.request.hits{service:${each.key}}.as_count()"
  }

  tags = ["service:${each.key}", "managed-by:opentofu"]
}
```

## Conclusion

Datadog SLOs in OpenTofu make your reliability targets explicit, reviewable, and consistent. Define metric-based SLOs for availability, monitor-based SLOs for latency, and configure burn rate alerts to get early warning when your error budget is depleting faster than expected.
