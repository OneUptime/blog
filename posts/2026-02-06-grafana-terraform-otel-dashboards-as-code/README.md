# How to Build Observability Dashboards as Code with Grafana Terraform Provider and OpenTelemetry Data Sources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Grafana, Terraform, Dashboards as Code

Description: Build and manage Grafana observability dashboards using Terraform and OpenTelemetry data sources for version-controlled dashboards.

Manually creating Grafana dashboards through the UI works for prototyping, but it does not scale. When you have 50 services, each needing a standard set of dashboards, you need dashboards as code. The Grafana Terraform provider lets you define dashboards in HCL, version them in Git, and deploy them alongside your infrastructure.

## Setting Up the Grafana Provider

```hcl
# providers.tf
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
  auth = var.grafana_api_key
}

variable "grafana_url" {
  type    = string
  default = "https://grafana.internal:3000"
}

variable "grafana_api_key" {
  type      = string
  sensitive = true
}
```

## Creating an OpenTelemetry Data Source

First, set up the Tempo data source for traces and Prometheus for OTel metrics:

```hcl
# datasources.tf

resource "grafana_data_source" "tempo" {
  type = "tempo"
  name = "OpenTelemetry Traces"
  url  = "http://tempo:3200"

  json_data_encoded = jsonencode({
    tracesToLogsV2 = {
      datasourceUid = grafana_data_source.loki.uid
      filterByTraceID = true
      filterBySpanID  = true
    }
    tracesToMetrics = {
      datasourceUid = grafana_data_source.prometheus.uid
    }
    serviceMap = {
      datasourceUid = grafana_data_source.prometheus.uid
    }
  })
}

resource "grafana_data_source" "prometheus" {
  type = "prometheus"
  name = "OpenTelemetry Metrics"
  url  = "http://prometheus:9090"

  json_data_encoded = jsonencode({
    exemplarTraceIdDestinations = [{
      datasourceUid = grafana_data_source.tempo.uid
      name          = "trace_id"
    }]
  })
}

resource "grafana_data_source" "loki" {
  type = "loki"
  name = "OpenTelemetry Logs"
  url  = "http://loki:3100"

  json_data_encoded = jsonencode({
    derivedFields = [{
      datasourceUid = grafana_data_source.tempo.uid
      matcherRegex  = "trace_id=(\\w+)"
      name          = "TraceID"
      url           = "$${__value.raw}"
    }]
  })
}
```

## Reusable Dashboard Module

Create a Terraform module that generates a standard service dashboard:

```hcl
# modules/service-dashboard/variables.tf
variable "service_name" {
  type = string
}

variable "folder_uid" {
  type = string
}

variable "prometheus_uid" {
  type = string
}

variable "tempo_uid" {
  type = string
}

variable "slo_target" {
  type    = number
  default = 99.9
}
```

```hcl
# modules/service-dashboard/main.tf

resource "grafana_dashboard" "service" {
  folder = var.folder_uid

  config_json = jsonencode({
    title = "${var.service_name} - Service Overview"
    tags  = ["opentelemetry", "auto-generated", var.service_name]
    time  = { from = "now-6h", to = "now" }
    refresh = "30s"

    panels = [
      # Request Rate panel
      {
        title    = "Request Rate"
        type     = "timeseries"
        gridPos  = { h = 8, w = 12, x = 0, y = 0 }
        datasource = { uid = var.prometheus_uid }
        targets = [{
          expr = "sum(rate(http_server_request_duration_seconds_count{service_name=\"${var.service_name}\"}[5m]))"
          legendFormat = "requests/sec"
        }]
      },

      # Error Rate panel
      {
        title    = "Error Rate"
        type     = "timeseries"
        gridPos  = { h = 8, w = 12, x = 12, y = 0 }
        datasource = { uid = var.prometheus_uid }
        targets = [{
          expr = "sum(rate(http_server_request_duration_seconds_count{service_name=\"${var.service_name}\", http_response_status_code=~\"5..\"}[5m])) / sum(rate(http_server_request_duration_seconds_count{service_name=\"${var.service_name}\"}[5m])) * 100"
          legendFormat = "error %"
        }]
        fieldConfig = {
          defaults = {
            thresholds = {
              steps = [
                { color = "green", value = null },
                { color = "yellow", value = 1 },
                { color = "red", value = 5 }
              ]
            }
          }
        }
      },

      # Latency Percentiles panel
      {
        title    = "Latency Percentiles"
        type     = "timeseries"
        gridPos  = { h = 8, w = 12, x = 0, y = 8 }
        datasource = { uid = var.prometheus_uid }
        targets = [
          {
            expr = "histogram_quantile(0.50, sum(rate(http_server_request_duration_seconds_bucket{service_name=\"${var.service_name}\"}[5m])) by (le))"
            legendFormat = "p50"
          },
          {
            expr = "histogram_quantile(0.95, sum(rate(http_server_request_duration_seconds_bucket{service_name=\"${var.service_name}\"}[5m])) by (le))"
            legendFormat = "p95"
          },
          {
            expr = "histogram_quantile(0.99, sum(rate(http_server_request_duration_seconds_bucket{service_name=\"${var.service_name}\"}[5m])) by (le))"
            legendFormat = "p99"
          }
        ]
      },

      # Recent Traces panel
      {
        title    = "Recent Traces"
        type     = "table"
        gridPos  = { h = 8, w = 12, x = 12, y = 8 }
        datasource = { uid = var.tempo_uid }
        targets = [{
          queryType = "traceql"
          query = "{ resource.service.name = \"${var.service_name}\" } | select(duration, status)"
          limit = 20
        }]
      }
    ]
  })
}
```

## Deploying Dashboards for All Services

```hcl
# main.tf

# Create a folder for auto-generated dashboards
resource "grafana_folder" "services" {
  title = "Service Dashboards (Auto-Generated)"
}

# Define all services
locals {
  services = [
    { name = "api-gateway",      slo = 99.99 },
    { name = "user-service",     slo = 99.9 },
    { name = "payment-service",  slo = 99.99 },
    { name = "catalog-service",  slo = 99.5 },
    { name = "order-service",    slo = 99.9 },
  ]
}

# Generate a dashboard for each service
module "service_dashboards" {
  source   = "./modules/service-dashboard"
  for_each = { for s in local.services : s.name => s }

  service_name   = each.value.name
  folder_uid     = grafana_folder.services.uid
  prometheus_uid = grafana_data_source.prometheus.uid
  tempo_uid      = grafana_data_source.tempo.uid
  slo_target     = each.value.slo
}
```

## Applying

```bash
terraform init
terraform plan
terraform apply
```

## Wrapping Up

Dashboards as code with the Grafana Terraform provider gives you version-controlled, reviewable, and reproducible observability dashboards. Combined with OpenTelemetry data sources, you get a complete pipeline from instrumentation to visualization, all managed in Git.
