# How to Create SLOs with OpenTofu on Datadog

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Datadog, Infrastructure as Code, IaC, SLO, Reliability, Observability

Description: Learn how to create Datadog Service Level Objectives with metric and monitor-based SLOs using OpenTofu.

## Introduction

Datadog Service Level Objectives (SLOs) define availability and latency targets and track error budget consumption. OpenTofu manages SLOs as code using the `datadog_service_level_objective` resource, enabling teams to version and review SLO definitions alongside their infrastructure.

## Prerequisites

- OpenTofu v1.6+
- Datadog API key and Application key
- The `DataDog/datadog` OpenTofu provider

## Provider Configuration

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.39"
    }
  }
}

provider "datadog" {
  api_key = var.datadog_api_key
  app_key = var.datadog_app_key
}
```

## Metric-Based SLO (Request Success Rate)

A metric SLO measures the ratio of good events to total events over a rolling time window.

```hcl
# slos.tf

resource "datadog_service_level_objective" "api_availability" {
  name        = "[${var.environment}] API Availability"
  type        = "metric"
  description = "Percentage of successful API requests (non-5xx responses)"

  # Good events = requests without errors
  query {
    numerator   = "sum:trace.web.request.hits{env:${var.environment},!http.status_class:5xx}.as_count()"
    denominator = "sum:trace.web.request.hits{env:${var.environment}}.as_count()"
  }

  # 99.9% uptime target over 30 days
  thresholds {
    timeframe = "30d"
    target    = 99.9
    warning   = 99.95
  }

  # Additional 7-day window for shorter-term tracking
  thresholds {
    timeframe = "7d"
    target    = 99.9
    warning   = 99.95
  }

  tags = ["env:${var.environment}", "service:api", "managed-by:opentofu"]
}
```

## Monitor-Based SLO

A monitor SLO uses existing Datadog monitors to track uptime.

```hcl
resource "datadog_monitor" "api_health" {
  name    = "[${var.environment}] API Health Check"
  type    = "metric alert"
  message = "API health check failing. @pagerduty-${var.environment}"
  query   = "avg(last_1m):avg:http.response_time{env:${var.environment},check:api} > 5"

  monitor_thresholds {
    critical = 5.0
  }

  tags = ["env:${var.environment}", "managed-by:opentofu"]
}

resource "datadog_service_level_objective" "api_uptime" {
  name        = "[${var.environment}] API Uptime (Monitor-Based)"
  type        = "monitor"
  description = "API uptime based on health check monitor status"

  monitor_ids = [datadog_monitor.api_health.id]

  thresholds {
    timeframe = "30d"
    target    = 99.5
    warning   = 99.7
  }

  tags = ["env:${var.environment}", "managed-by:opentofu"]
}
```

## SLO Alert (Error Budget Burn Rate)

Alert when the error budget is being consumed too fast. Burn rate alerts are created using the `datadog_monitor` resource with `type = "slo alert"` and a `burn_rate()` query referencing the SLO ID:

```hcl
resource "datadog_monitor" "burn_rate_high" {
  name    = "[${var.environment}] API SLO - High Burn Rate"
  type    = "slo alert"
  message = "Error budget is burning too fast for the API availability SLO. @pagerduty-${var.environment}"

  # 14.4x burn rate over a 1h long window with a 5m short window
  # will exhaust a 30-day error budget in ~2 days.
  query = "burn_rate(\"${datadog_service_level_objective.api_availability.id}\").over(\"30d\").long_window(\"1h\").short_window(\"5m\") > 14.4"

  monitor_thresholds {
    critical = 14.4
  }

  tags = ["env:${var.environment}", "managed-by:opentofu"]
}
```

## Outputs

```hcl
output "api_availability_slo_id" {
  description = "ID of the API availability SLO"
  value       = datadog_service_level_objective.api_availability.id
}
```

## Deploy

```bash
export DD_API_KEY="your-datadog-api-key"
export DD_APP_KEY="your-datadog-app-key"

tofu init
tofu apply
```

## Conclusion

Datadog SLOs defined with OpenTofu make reliability targets explicit, versionable, and reviewable as code. Use metric SLOs for ratio-based availability (requests, errors) and monitor SLOs for existing check-based uptime tracking. Define burn rate alerts alongside SLOs to get early warning before error budgets are exhausted. Tag all SLOs with `env:${var.environment}` to enable environment-scoped SLO dashboards in Datadog.
