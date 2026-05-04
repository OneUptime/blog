# How to Create Grafana Dashboards with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Grafana, Dashboard, Monitoring, Infrastructure as Code

Description: Learn how to create and manage Grafana dashboards with OpenTofu, including JSON dashboard provisioning and folder organization.

Grafana dashboards created manually tend to drift and disappear. Managing them with OpenTofu keeps dashboards in version control, enables code review for dashboard changes, and ensures consistent deployment across staging and production Grafana instances.

## Provider Configuration

```hcl
terraform {
  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = "~> 3.0"
    }
  }
}

provider "grafana" {
  url  = var.grafana_url
  auth = var.grafana_token
}
```

## Creating a Folder

```hcl
resource "grafana_folder" "application" {
  title = "Application Dashboards"
  uid   = "application-dashboards"
}
```

## Dashboard from JSON

The most common pattern is to define dashboards in JSON and provision them via OpenTofu.

```hcl
resource "grafana_dashboard" "api_overview" {
  folder      = grafana_folder.application.id
  config_json = file("${path.module}/dashboards/api-overview.json")
}
```

The JSON file `dashboards/api-overview.json` follows Grafana's dashboard model:

```json
{
  "title": "API Overview",
  "uid": "api-overview",
  "schemaVersion": 36,
  "refresh": "30s",
  "time": { "from": "now-1h", "to": "now" },
  "panels": [
    {
      "id": 1,
      "title": "Request Rate",
      "type": "timeseries",
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 },
      "targets": [{
        "datasource": { "type": "prometheus" },
        "expr": "rate(http_requests_total{job=\"api\"}[5m])",
        "legendFormat": "{{method}} {{status}}"
      }]
    },
    {
      "id": 2,
      "title": "Error Rate",
      "type": "stat",
      "gridPos": { "h": 4, "w": 6, "x": 12, "y": 0 },
      "targets": [{
        "datasource": { "type": "prometheus" },
        "expr": "sum(rate(http_requests_total{job=\"api\",status=~\"5..\"}[5m])) / sum(rate(http_requests_total{job=\"api\"}[5m])) * 100",
        "legendFormat": "Error %"
      }],
      "options": {
        "reduceOptions": { "calcs": ["lastNotNull"] },
        "orientation": "auto",
        "colorMode": "background"
      }
    }
  ]
}
```

## Dashboard from Inline JSON

For simpler dashboards, define the JSON inline using jsonencode:

```hcl
resource "grafana_dashboard" "infrastructure" {
  folder = grafana_folder.application.id

  config_json = jsonencode({
    title         = "Infrastructure Health"
    uid           = "infra-health"
    schemaVersion = 36
    refresh       = "1m"
    panels = [
      {
        id    = 1
        title = "CPU Usage"
        type  = "timeseries"
        gridPos = { h = 8, w = 24, x = 0, y = 0 }
        targets = [{
          datasource = { type = "prometheus" }
          expr        = "100 - (avg by (instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)"
          legendFormat = "{{instance}}"
        }]
      }
    ]
  })
}
```

## Multiple Dashboards with for_each

```hcl
locals {
  services = ["api", "worker", "scheduler"]
}

resource "grafana_dashboard" "services" {
  for_each = toset(local.services)

  folder      = grafana_folder.application.id
  config_json = templatefile("${path.module}/dashboards/service-template.json", {
    service_name = each.key
    dashboard_uid = "${each.key}-overview"
  })
}
```

## Folder Permissions

```hcl
resource "grafana_folder_permission" "application" {
  folder_uid = grafana_folder.application.uid

  permissions {
    team_id    = grafana_team.backend.id
    permission = "Edit"
  }

  permissions {
    team_id    = grafana_team.oncall.id
    permission = "View"
  }
}
```

## Conclusion

Managing Grafana dashboards with OpenTofu prevents dashboard sprawl and ensures your observability views are as carefully maintained as your infrastructure. Store dashboard JSON in your repository, provision it via OpenTofu, and organize dashboards into folders with appropriate access controls. Changes go through code review before reaching production.
