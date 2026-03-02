# How to Create Datadog Dashboards with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Datadog, Dashboard, Monitoring, Infrastructure as Code

Description: Learn how to create Datadog dashboards using Terraform to build consistent, reproducible monitoring visualizations for your infrastructure.

---

Datadog dashboards provide visual overviews of your infrastructure and application health. Managing them through Terraform ensures dashboards are consistent across environments, version-controlled, and automatically deployed. This guide covers creating various dashboard widgets and layouts with Terraform.

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

## Service Overview Dashboard

```hcl
resource "datadog_dashboard" "service_overview" {
  title       = "Service Overview Dashboard"
  description = "High-level overview of all production services"
  layout_type = "ordered"

  # Request rate widget
  widget {
    timeseries_definition {
      title = "Request Rate by Service"
      request {
        q            = "sum:trace.web.request.hits{env:production} by {service}.as_rate()"
        display_type = "bars"
        style {
          palette = "dog_classic"
        }
      }
      yaxis {
        min = "0"
      }
    }
  }

  # Error rate widget
  widget {
    timeseries_definition {
      title = "Error Rate by Service"
      request {
        q            = "sum:trace.web.request.errors{env:production} by {service}.as_rate() / sum:trace.web.request.hits{env:production} by {service}.as_rate() * 100"
        display_type = "line"
        style {
          palette = "warm"
        }
      }
      yaxis {
        min = "0"
      }
    }
  }

  # P95 Latency widget
  widget {
    timeseries_definition {
      title = "P95 Latency by Service"
      request {
        q            = "avg:trace.web.request.duration.by.service.95p{env:production} by {service}"
        display_type = "line"
      }
    }
  }

  # Host map
  widget {
    hostmap_definition {
      title   = "Infrastructure Host Map"
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

  # Query value widgets for key metrics
  widget {
    group_definition {
      title       = "Key Metrics"
      layout_type = "ordered"

      widget {
        query_value_definition {
          title = "Active Hosts"
          request {
            q          = "sum:system.cpu.user{*}"
            aggregator = "avg"
          }
          autoscale = true
          precision = 0
        }
      }

      widget {
        query_value_definition {
          title = "Total Requests/sec"
          request {
            q          = "sum:trace.web.request.hits{env:production}.as_rate()"
            aggregator = "avg"
          }
          autoscale = true
        }
      }
    }
  }

  # Log stream
  widget {
    log_stream_definition {
      title        = "Recent Error Logs"
      query        = "status:error"
      columns      = ["host", "service", "status"]
      show_date_column  = true
      show_message_column = true
      sort {
        column = "time"
        order  = "desc"
      }
    }
  }

  tags = ["team:platform", "env:production"]
}
```

## Infrastructure Dashboard

```hcl
resource "datadog_dashboard" "infrastructure" {
  title       = "Infrastructure Dashboard"
  description = "Server and container infrastructure metrics"
  layout_type = "ordered"

  widget {
    timeseries_definition {
      title = "CPU Utilization by Host"
      request {
        q            = "avg:system.cpu.user{environment:production} by {host}"
        display_type = "line"
      }
    }
  }

  widget {
    timeseries_definition {
      title = "Memory Usage"
      request {
        q            = "avg:system.mem.used{environment:production} by {host}"
        display_type = "area"
        style { palette = "cool" }
      }
    }
  }

  widget {
    timeseries_definition {
      title = "Disk I/O"
      request {
        q            = "avg:system.io.await{environment:production} by {host}"
        display_type = "line"
      }
    }
  }

  widget {
    toplist_definition {
      title = "Top CPU Consumers"
      request {
        q = "top(avg:system.cpu.user{*} by {host}, 10, 'mean', 'desc')"
      }
    }
  }

  tags = ["team:infrastructure"]
}
```

## Template Variables

```hcl
resource "datadog_dashboard" "with_variables" {
  title       = "Filterable Service Dashboard"
  layout_type = "ordered"

  # Template variables for filtering
  template_variable {
    name    = "service"
    prefix  = "service"
    default = "*"
  }

  template_variable {
    name    = "environment"
    prefix  = "env"
    default = "production"
  }

  widget {
    timeseries_definition {
      title = "Request Rate"
      request {
        q = "sum:trace.web.request.hits{$service,$environment}.as_rate()"
      }
    }
  }

  widget {
    timeseries_definition {
      title = "Error Rate"
      request {
        q = "sum:trace.web.request.errors{$service,$environment}.as_rate()"
      }
    }
  }
}
```

## Free-Form Dashboard Layout

For dashboards where you need precise widget placement:

```hcl
resource "datadog_dashboard" "freeform" {
  title       = "Custom Layout Dashboard"
  layout_type = "free"

  widget {
    timeseries_definition {
      title = "CPU by Service"
      request {
        q            = "avg:system.cpu.user{*} by {service}"
        display_type = "line"
      }
    }
    widget_layout {
      x      = 0
      y      = 0
      width  = 6
      height = 4
    }
  }

  widget {
    query_value_definition {
      title = "Current Error Count"
      request {
        q          = "sum:trace.web.request.errors{env:production}.as_count()"
        aggregator = "sum"
      }
      autoscale = true
      precision = 0
    }
    widget_layout {
      x      = 6
      y      = 0
      width  = 3
      height = 2
    }
  }

  widget {
    alert_graph_definition {
      title      = "Monitor Status"
      alert_id   = datadog_monitor.cpu_high.id
      viz_type   = "timeseries"
    }
    widget_layout {
      x      = 9
      y      = 0
      width  = 3
      height = 4
    }
  }
}
```

## Dashboard Lists

Organize dashboards into navigable lists:

```hcl
resource "datadog_dashboard_list" "team_dashboards" {
  name = "Platform Team Dashboards"

  dash_item {
    type    = "custom_timeboard"
    dash_id = datadog_dashboard.service_overview.id
  }

  dash_item {
    type    = "custom_timeboard"
    dash_id = datadog_dashboard.infrastructure.id
  }
}
```

## Best Practices

Use ordered layouts for dashboards that tell a story from top to bottom. Use template variables so dashboards can be filtered without creating duplicates. Group related widgets together for better organization. Include both real-time metrics and trend data. Set meaningful titles and descriptions. Use consistent color palettes across dashboards for easier interpretation.

For creating the monitors that complement your dashboards, see our guide on [Datadog monitors](https://oneuptime.com/blog/post/2026-02-23-how-to-create-datadog-monitors-with-terraform/view).

## Conclusion

Datadog dashboards managed through Terraform provide consistent, reproducible visualizations of your infrastructure and application health. By defining dashboards as code, you ensure that every team member and environment has the same view of your systems. Combined with template variables and automated deployment, Terraform-managed dashboards scale effortlessly with your monitoring needs.
