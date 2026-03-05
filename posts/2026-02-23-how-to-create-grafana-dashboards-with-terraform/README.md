# How to Create Grafana Dashboards with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Grafana, Dashboard, Monitoring, Infrastructure as Code

Description: Learn how to create Grafana dashboards using Terraform to build reproducible, version-controlled monitoring visualizations for your infrastructure.

---

Grafana dashboards are the visualization layer for many monitoring stacks. Whether you use Prometheus, InfluxDB, Elasticsearch, or cloud monitoring services as data sources, Grafana provides a unified dashboard experience. Managing these dashboards through Terraform ensures they are consistent, reproducible, and deployed automatically. This guide shows you how.

## Setting Up the Provider

```hcl
terraform {
  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = "~> 2.0"
    }
  }
}

provider "grafana" {
  url  = var.grafana_url
  auth = var.grafana_auth
}

variable "grafana_url" { type = string }
variable "grafana_auth" { type = string; sensitive = true }
```

## Creating a Dashboard with JSON

```hcl
# Create a dashboard from a JSON model
resource "grafana_dashboard" "infrastructure" {
  config_json = jsonencode({
    title = "Infrastructure Overview"
    tags  = ["infrastructure", "terraform"]
    timezone = "browser"
    editable = true
    panels = [
      {
        id    = 1
        title = "CPU Usage"
        type  = "timeseries"
        gridPos = { h = 8, w = 12, x = 0, y = 0 }
        targets = [{
          expr         = "100 - (avg by(instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)"
          legendFormat = "{{instance}}"
          refId        = "A"
        }]
        fieldConfig = {
          defaults = {
            unit = "percent"
            min  = 0
            max  = 100
          }
        }
      },
      {
        id    = 2
        title = "Memory Usage"
        type  = "timeseries"
        gridPos = { h = 8, w = 12, x = 12, y = 0 }
        targets = [{
          expr         = "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100"
          legendFormat = "{{instance}}"
          refId        = "A"
        }]
        fieldConfig = {
          defaults = {
            unit = "percent"
            min  = 0
            max  = 100
          }
        }
      },
      {
        id    = 3
        title = "Disk Usage"
        type  = "gauge"
        gridPos = { h = 8, w = 12, x = 0, y = 8 }
        targets = [{
          expr  = "(1 - (node_filesystem_avail_bytes{mountpoint=\"/\"} / node_filesystem_size_bytes{mountpoint=\"/\"})) * 100"
          refId = "A"
        }]
        fieldConfig = {
          defaults = {
            unit = "percent"
            min  = 0
            max  = 100
            thresholds = {
              mode = "absolute"
              steps = [
                { value = null, color = "green" },
                { value = 70, color = "yellow" },
                { value = 85, color = "red" }
              ]
            }
          }
        }
      },
      {
        id    = 4
        title = "Network I/O"
        type  = "timeseries"
        gridPos = { h = 8, w = 12, x = 12, y = 8 }
        targets = [
          {
            expr         = "rate(node_network_receive_bytes_total{device!=\"lo\"}[5m])"
            legendFormat = "{{instance}} - {{device}} rx"
            refId        = "A"
          },
          {
            expr         = "rate(node_network_transmit_bytes_total{device!=\"lo\"}[5m])"
            legendFormat = "{{instance}} - {{device}} tx"
            refId        = "B"
          }
        ]
        fieldConfig = {
          defaults = {
            unit = "Bps"
          }
        }
      }
    ]
    templating = {
      list = [{
        name       = "instance"
        type       = "query"
        datasource = "Prometheus"
        query      = "label_values(up, instance)"
        refresh    = 2
        multi      = true
        includeAll = true
      }]
    }
  })

  folder = grafana_folder.monitoring.id
}

resource "grafana_folder" "monitoring" {
  title = "Monitoring Dashboards"
}
```

## Application Dashboard

```hcl
resource "grafana_dashboard" "application" {
  config_json = jsonencode({
    title = "Application Performance"
    tags  = ["application", "terraform"]
    panels = [
      {
        id    = 1
        title = "Request Rate"
        type  = "timeseries"
        gridPos = { h = 8, w = 8, x = 0, y = 0 }
        targets = [{
          expr         = "sum(rate(http_requests_total[5m])) by (method, status)"
          legendFormat = "{{method}} {{status}}"
          refId        = "A"
        }]
      },
      {
        id    = 2
        title = "Error Rate"
        type  = "stat"
        gridPos = { h = 8, w = 4, x = 8, y = 0 }
        targets = [{
          expr  = "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) * 100"
          refId = "A"
        }]
        fieldConfig = {
          defaults = {
            unit = "percent"
            thresholds = {
              steps = [
                { value = null, color = "green" },
                { value = 1, color = "yellow" },
                { value = 5, color = "red" }
              ]
            }
          }
        }
      },
      {
        id    = 3
        title = "Response Time Histogram"
        type  = "heatmap"
        gridPos = { h = 8, w = 12, x = 0, y = 8 }
        targets = [{
          expr   = "sum(increase(http_request_duration_seconds_bucket[5m])) by (le)"
          format = "heatmap"
          refId  = "A"
        }]
      }
    ]
  })

  folder = grafana_folder.monitoring.id
}
```

## Loading Dashboards from Files

```hcl
# Load dashboard JSON from a file
resource "grafana_dashboard" "from_file" {
  config_json = file("${path.module}/dashboards/kubernetes.json")
  folder      = grafana_folder.monitoring.id
  overwrite   = true
}
```

## Best Practices

Store dashboard JSON in separate files for complex dashboards. Use Grafana template variables for filtering. Set appropriate refresh intervals based on metric granularity. Use consistent panel sizes and layouts across dashboards. Apply color thresholds to gauge and stat panels for quick visual status. Organize dashboards into folders by team or service.

For configuring the data sources your dashboards query, see our guide on [Grafana data sources](https://oneuptime.com/blog/post/2026-02-23-how-to-create-grafana-data-sources-with-terraform/view).

## Conclusion

Grafana dashboards managed through Terraform provide consistent, version-controlled monitoring visualizations. By defining dashboards as code, you ensure they are reproducible across environments and automatically deployed alongside your infrastructure. Whether you use inline JSON or external files, Terraform gives you full control over your Grafana dashboard estate.
