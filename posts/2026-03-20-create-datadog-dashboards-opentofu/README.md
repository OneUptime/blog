# How to Create Datadog Dashboards with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Datadog, Dashboard, Monitoring, Infrastructure as Code

Description: Learn how to create Datadog dashboards with OpenTofu to codify your monitoring views and ensure consistent observability across environments.

Managing Datadog dashboards as code means your observability configuration is version-controlled, peer-reviewed, and reproducible. OpenTofu's Datadog provider lets you define dashboards with widgets, layouts, and queries as HCL.

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
  # Set via environment variables:
  # export DD_API_KEY="your-api-key"
  # export DD_APP_KEY="your-app-key"
  api_key = var.datadog_api_key
  app_key = var.datadog_app_key
}

variable "datadog_api_key" { type = string; sensitive = true }
variable "datadog_app_key" { type = string; sensitive = true }
```

## Creating a Timeseries Dashboard

```hcl
resource "datadog_dashboard" "web_metrics" {
  title       = "Web Application Metrics"
  description = "Key metrics for the web application tier"
  layout_type = "ordered"

  widget {
    timeseries_definition {
      title = "Request Rate"

      request {
        q            = "sum:nginx.net.request_per_s{*}.as_rate()"
        display_type = "line"

        style {
          palette    = "dog_classic"
          line_type  = "solid"
          line_width = "normal"
        }
      }

      yaxis {
        label        = "Requests/s"
        scale        = "linear"
        include_zero = true
      }
    }
  }

  widget {
    timeseries_definition {
      title = "Error Rate"

      request {
        q            = "sum:nginx.net.conn_dropped_per_s{*}"
        display_type = "bars"
        style {
          palette = "warm"
        }
      }
    }
  }
}
```

## Adding Query Value and Monitor Summary Widgets

```hcl
resource "datadog_dashboard" "sre_overview" {
  title       = "SRE Overview"
  layout_type = "ordered"

  widget {
    query_value_definition {
      title     = "P99 Latency (ms)"
      autoscale = true
      precision = 2

      request {
        q          = "p99:trace.web.request{env:production}"
        aggregator = "avg"

        conditional_formats {
          comparator = ">"
          value      = 500
          palette    = "white_on_red"
        }

        conditional_formats {
          comparator = "<="
          value      = 200
          palette    = "white_on_green"
        }
      }
    }
  }

  widget {
    manage_status_definition {
      title        = "Active Alerts"
      query        = "tag:env:production"
      summary_type = "monitors"
      sort         = "status,asc"
    }
  }
}
```

## Using Template Variables for Environment-Agnostic Dashboards

```hcl
resource "datadog_dashboard" "service_dashboard" {
  title       = "Service Dashboard - $service in $env"
  layout_type = "ordered"

  # Template variables make the dashboard reusable across environments
  template_variable {
    name    = "env"
    prefix  = "env"
    default = "production"
  }

  template_variable {
    name    = "service"
    prefix  = "service"
    default = "*"
  }

  widget {
    timeseries_definition {
      title = "CPU Usage - $service"

      request {
        q            = "avg:system.cpu.user{$env,$service} by {service}"
        display_type = "line"
      }
    }
  }

  widget {
    timeseries_definition {
      title = "Memory Usage - $service"

      request {
        q            = "avg:system.mem.used{$env,$service} by {service}"
        display_type = "area"
      }
    }
  }
}
```

## Sharing a Dashboard via URL

```hcl
output "dashboard_url" {
  value = "https://app.datadoghq.com/dashboard/${datadog_dashboard.sre_overview.id}"
}
```

## Conclusion

Datadog dashboards defined in OpenTofu bring monitoring configuration under the same version control and review process as infrastructure. Use template variables for environment-agnostic dashboards, conditional formatting to highlight SLO violations, and timeseries widgets for trend visualization. Store API keys in environment variables or a secrets manager - never hardcode them in configuration files.
