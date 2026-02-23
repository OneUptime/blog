# How to Configure Datadog Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Datadog, Monitoring, Observability, Providers, Infrastructure as Code

Description: Learn how to configure the Terraform Datadog provider to manage monitors, dashboards, SLOs, and alert policies as infrastructure code for consistent observability.

---

Datadog is a popular monitoring and observability platform, and like most SaaS tools, its configuration can sprawl when managed only through the UI. Monitors get created ad-hoc, dashboards are not standardized, and nobody remembers who set up that one alert that fires at 3 AM. The Terraform Datadog provider brings all of this under version control, so your monitoring configuration gets the same review process as your infrastructure code.

## Prerequisites

You need a Datadog account with API and Application keys. These are different from each other:

- **API Key** - Used to submit data to Datadog (metrics, logs, traces)
- **Application Key** - Used to programmatically manage Datadog configuration

### Creating API and Application Keys

1. Go to Datadog > Organization Settings > API Keys to create or find your API key
2. Go to Datadog > Organization Settings > Application Keys to create an application key

Both keys are required for the Terraform provider.

```bash
# Set the keys as environment variables
export DD_API_KEY="your-api-key-here"
export DD_APP_KEY="your-application-key-here"
```

## Basic Provider Configuration

```hcl
# versions.tf
terraform {
  required_providers {
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.46"
    }
  }
}

# provider.tf
provider "datadog" {
  # Reads from DD_API_KEY and DD_APP_KEY environment variables
}
```

### Explicit Configuration

```hcl
provider "datadog" {
  api_key = var.datadog_api_key
  app_key = var.datadog_app_key

  # Set the Datadog site (defaults to datadoghq.com)
  # Use datadoghq.eu for EU, us3.datadoghq.com for US3, etc.
  api_url = "https://api.datadoghq.com/"
}

variable "datadog_api_key" {
  description = "Datadog API key"
  type        = string
  sensitive   = true
}

variable "datadog_app_key" {
  description = "Datadog Application key"
  type        = string
  sensitive   = true
}
```

### Regional Datadog Sites

If your Datadog account is on a regional site:

```hcl
# EU site
provider "datadog" {
  api_url = "https://api.datadoghq.eu/"
}

# US3 site
provider "datadog" {
  api_url = "https://api.us3.datadoghq.com/"
}

# US5 site
provider "datadog" {
  api_url = "https://api.us5.datadoghq.com/"
}

# AP1 site
provider "datadog" {
  api_url = "https://api.ap1.datadoghq.com/"
}
```

## Creating Monitors

Monitors are the bread and butter of Datadog alerting:

```hcl
# CPU usage monitor
resource "datadog_monitor" "high_cpu" {
  name    = "High CPU Usage on {{host.name}}"
  type    = "metric alert"
  message = <<-EOT
    CPU usage is above 90% on {{host.name}}.

    Please investigate the process causing high CPU.

    @slack-ops-alerts
    @pagerduty-on-call
  EOT

  query = "avg(last_5m):avg:system.cpu.user{*} by {host} > 90"

  monitor_thresholds {
    critical          = 90
    critical_recovery = 80
    warning           = 80
    warning_recovery  = 70
  }

  # Notification preferences
  notify_no_data    = true
  no_data_timeframe = 10
  renotify_interval = 60

  # Tags for organization
  tags = ["team:platform", "env:production", "managed-by:terraform"]
}

# Application error rate monitor
resource "datadog_monitor" "error_rate" {
  name    = "High Error Rate - {{service.name}}"
  type    = "metric alert"
  message = <<-EOT
    Error rate for {{service.name}} is above 5%.

    Check the service logs and recent deployments.

    @slack-engineering
  EOT

  query = "sum(last_5m):sum:trace.http.request.errors{env:production} by {service}.as_count() / sum:trace.http.request.hits{env:production} by {service}.as_count() * 100 > 5"

  monitor_thresholds {
    critical = 5
    warning  = 2
  }

  tags = ["team:backend", "env:production", "managed-by:terraform"]
}

# Log-based monitor
resource "datadog_monitor" "oom_kills" {
  name    = "OOM Kill Detected on {{host.name}}"
  type    = "log alert"
  message = <<-EOT
    An Out of Memory kill was detected on {{host.name}}.

    Check which process was killed and consider increasing memory.

    @slack-ops-alerts
  EOT

  query = "logs(\"source:syslog \\\"Out of memory\\\"\").index(\"main\").rollup(\"count\").by(\"host\").last(\"5m\") > 0"

  monitor_thresholds {
    critical = 0
  }

  tags = ["team:platform", "managed-by:terraform"]
}
```

## Creating Dashboards

Define dashboards as code:

```hcl
resource "datadog_dashboard" "service_overview" {
  title       = "Service Overview - Production"
  description = "Key metrics for production services"
  layout_type = "ordered"

  # Request rate widget
  widget {
    timeseries_definition {
      title = "Request Rate by Service"

      request {
        query {
          metric_query {
            name       = "requests"
            data_source = "metrics"
            query       = "sum:trace.http.request.hits{env:production} by {service}.as_rate()"
          }
        }
        display_type = "line"
      }
    }
  }

  # Error rate widget
  widget {
    timeseries_definition {
      title = "Error Rate by Service"

      request {
        query {
          metric_query {
            name       = "errors"
            data_source = "metrics"
            query       = "sum:trace.http.request.errors{env:production} by {service}.as_rate()"
          }
        }
        display_type = "bars"

        style {
          palette = "warm"
        }
      }
    }
  }

  # Latency widget
  widget {
    timeseries_definition {
      title = "P99 Latency by Service"

      request {
        query {
          metric_query {
            name       = "latency"
            data_source = "metrics"
            query       = "avg:trace.http.request.duration.by.service.99p{env:production} by {service}"
          }
        }
        display_type = "line"
      }
    }
  }

  # Host map widget
  widget {
    hostmap_definition {
      title = "Host CPU Usage"

      request {
        fill {
          q = "avg:system.cpu.user{*} by {host}"
        }
      }

      style {
        palette      = "green_to_orange"
        palette_flip = false
      }
    }
  }

  tags = ["team:platform", "env:production", "managed-by:terraform"]
}
```

## Service Level Objectives (SLOs)

Define SLOs to track reliability targets:

```hcl
# Monitor-based SLO
resource "datadog_service_level_objective" "api_availability" {
  name        = "API Service Availability"
  type        = "monitor"
  description = "99.9% availability for the API service"

  monitor_ids = [datadog_monitor.error_rate.id]

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

  tags = ["team:backend", "service:api", "managed-by:terraform"]
}

# Metric-based SLO
resource "datadog_service_level_objective" "api_latency" {
  name        = "API Latency SLO"
  type        = "metric"
  description = "99% of API requests complete within 500ms"

  query {
    numerator   = "sum:trace.http.request.hits{env:production,service:api,is_duration_ok:true}.as_count()"
    denominator = "sum:trace.http.request.hits{env:production,service:api}.as_count()"
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

  tags = ["team:backend", "service:api", "managed-by:terraform"]
}
```

## Downtime Management

Schedule maintenance windows:

```hcl
resource "datadog_downtime" "weekly_maintenance" {
  scope = ["env:staging"]

  # Recurring schedule - every Sunday 2-4 AM UTC
  recurrence {
    type   = "weeks"
    period = 1
    week_days = ["Sun"]
  }

  start = 1700000000  # Unix timestamp
  end   = 1700007200

  message = "Weekly staging maintenance window - managed by Terraform"

  monitor_tags = ["env:staging"]
}
```

## Synthetic Tests

Create synthetic monitors:

```hcl
resource "datadog_synthetics_test" "api_health" {
  name      = "API Health Check"
  type      = "api"
  subtype   = "http"
  status    = "live"
  locations = ["aws:us-east-1", "aws:eu-west-1"]
  tags      = ["team:backend", "managed-by:terraform"]

  message = "API health check failed! @slack-ops-alerts"

  request_definition {
    method = "GET"
    url    = "https://api.example.com/health"
  }

  assertion {
    type     = "statusCode"
    operator = "is"
    target   = "200"
  }

  assertion {
    type     = "responseTime"
    operator = "lessThan"
    target   = "2000"
  }

  options_list {
    tick_every = 60  # Run every 60 seconds

    retry {
      count    = 2
      interval = 300
    }

    monitor_options {
      renotify_interval = 120
    }
  }
}
```

## Using Modules for Standardized Monitoring

Create reusable monitoring modules:

```hcl
# modules/service-monitors/variables.tf
variable "service_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "alert_channel" {
  type    = string
  default = "@slack-ops-alerts"
}

# modules/service-monitors/main.tf
resource "datadog_monitor" "high_error_rate" {
  name    = "${var.service_name} - High Error Rate (${var.environment})"
  type    = "metric alert"
  message = "Error rate is above threshold for ${var.service_name}. ${var.alert_channel}"
  query   = "sum(last_5m):sum:trace.http.request.errors{env:${var.environment},service:${var.service_name}}.as_count() / sum:trace.http.request.hits{env:${var.environment},service:${var.service_name}}.as_count() * 100 > 5"

  monitor_thresholds {
    critical = 5
    warning  = 2
  }

  tags = ["service:${var.service_name}", "env:${var.environment}", "managed-by:terraform"]
}

# Usage in root module
module "api_monitoring" {
  source = "./modules/service-monitors"

  service_name  = "api-service"
  environment   = "production"
  alert_channel = "@slack-api-alerts @pagerduty-api-team"
}

module "web_monitoring" {
  source = "./modules/service-monitors"

  service_name  = "web-frontend"
  environment   = "production"
  alert_channel = "@slack-frontend-alerts"
}
```

## Summary

The Datadog provider brings your monitoring configuration under version control. Define monitors, dashboards, SLOs, and synthetic tests in Terraform, and they get the same review and approval process as your infrastructure changes. Start with critical monitors and SLOs, build standardized dashboards, and use modules to apply consistent monitoring across all your services. The result is an observability setup that scales with your infrastructure instead of becoming a maintenance burden.
