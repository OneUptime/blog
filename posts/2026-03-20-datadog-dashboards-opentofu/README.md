# How to Create Dashboards with OpenTofu on Datadog

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Datadog, Infrastructure as Code, IaC, Dashboard, Monitoring

Description: Learn how to create Datadog dashboards with widgets, timeboards, and screenboards using OpenTofu.

## Introduction

Managing Datadog dashboards as code with OpenTofu ensures consistent monitoring views across teams and enables code review for dashboard changes. The `datadog_dashboard` resource supports timeboards and screenboards with metric graphs, query value widgets, and log search panels.

## Prerequisites

- OpenTofu v1.6+
- Datadog API key and Application key
- The `DataDog/datadog` OpenTofu provider

## Provider Configuration

```hcl
# versions.tf

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

## Create a Timeboard with Metric Widgets

```hcl
# dashboards.tf
resource "datadog_dashboard" "service_overview" {
  title        = "[${var.environment}] Service Overview"
  description  = "Key metrics for the ${var.environment} environment"
  layout_type  = "ordered"
  reflow_type  = "auto"

  # Timeseries widget - request rate
  widget {
    timeseries_definition {
      title       = "Request Rate"
      show_legend = true

      request {
        q            = "sum:trace.web.request.hits{env:${var.environment}}.as_rate()"
        display_type = "line"
        style {
          palette    = "dog_classic"
          line_type  = "solid"
          line_width = "normal"
        }
      }

      yaxis {
        label = "requests/s"
        min   = "0"
      }
    }
  }

  # Query value widget - P99 latency
  widget {
    query_value_definition {
      title       = "P99 Latency"
      live_span   = "1h"

      request {
        q          = "p99:trace.web.request{env:${var.environment}}"
        aggregator = "last"

        conditional_formats {
          comparator = ">"
          value      = 1000
          palette    = "red_on_white"
        }
        conditional_formats {
          comparator = ">"
          value      = 500
          palette    = "yellow_on_white"
        }
        conditional_formats {
          comparator = "<="
          value      = 500
          palette    = "green_on_white"
        }
      }

      autoscale   = true
      precision   = 2
      custom_unit = "ms"
    }
  }

  # Heatmap widget - error rate by service
  widget {
    heatmap_definition {
      title = "Error Rate by Service"

      request {
        q = "sum:trace.web.request.errors{env:${var.environment}} by {service}.as_rate() / sum:trace.web.request.hits{env:${var.environment}} by {service}.as_rate() * 100"
      }

      yaxis {
        label = "error %"
        min   = "0"
        max   = "100"
      }
    }
  }

  tags = ["env:${var.environment}", "managed-by:opentofu", "team:platform"]
}
```

## Create a Screenboard with Log Search

```hcl
resource "datadog_dashboard" "logs_overview" {
  title       = "[${var.environment}] Logs Overview"
  layout_type = "free"

  widget {
    log_stream_definition {
      title   = "Recent Errors"
      indexes = ["main"]
      query   = "env:${var.environment} status:error"
      columns = ["core_host", "core_service", "core_status"]
      show_date_column    = true
      show_message_column = true
      sort {
        column    = "time"
        order     = "desc"
      }
    }
    widget_layout {
      x      = 0
      y      = 0
      width  = 12
      height = 6
    }
  }
}
```

## Outputs

```hcl
output "service_overview_url" {
  description = "URL of the service overview dashboard"
  value       = datadog_dashboard.service_overview.url
}
```

## Deploy

```bash
export DD_API_KEY="your-datadog-api-key"
export DD_APP_KEY="your-datadog-app-key"

tofu init
tofu plan -var="datadog_api_key=$DD_API_KEY" -var="datadog_app_key=$DD_APP_KEY"
tofu apply
```

## Conclusion

Datadog dashboards managed with OpenTofu can be versioned in Git, reviewed via pull requests, and deployed consistently across environments. Use the `datadog_dashboard` resource with `layout_type = "ordered"` for timeboards and `"free"` for screenboards. Parameterize with `var.environment` to generate environment-specific dashboards from a single module.
