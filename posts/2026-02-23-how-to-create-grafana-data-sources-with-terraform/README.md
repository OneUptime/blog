# How to Create Grafana Data Sources with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Grafana, Data Source, Monitoring, Infrastructure as Code

Description: Learn how to create Grafana data sources using Terraform to connect Prometheus, Elasticsearch, CloudWatch, and other monitoring backends.

---

Grafana data sources connect your dashboards to the monitoring backends that store your metrics, logs, and traces. Managing data sources through Terraform ensures that every Grafana instance has consistent access to the right backends. This guide covers configuring the most common data source types.

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

## Prometheus Data Source

```hcl
resource "grafana_data_source" "prometheus" {
  type = "prometheus"
  name = "Prometheus"
  url  = "http://prometheus:9090"

  is_default = true

  json_data_encoded = jsonencode({
    httpMethod   = "POST"
    timeInterval = "15s"
  })
}
```

## Elasticsearch Data Source

```hcl
resource "grafana_data_source" "elasticsearch" {
  type = "elasticsearch"
  name = "Elasticsearch Logs"
  url  = "http://elasticsearch:9200"

  json_data_encoded = jsonencode({
    esVersion  = "8.0.0"
    timeField  = "@timestamp"
    logLevelField = "level"
    logMessageField = "message"
  })
}
```

## CloudWatch Data Source

```hcl
resource "grafana_data_source" "cloudwatch" {
  type = "cloudwatch"
  name = "CloudWatch"

  json_data_encoded = jsonencode({
    defaultRegion = "us-east-1"
    authType      = "keys"
  })

  secure_json_data_encoded = jsonencode({
    accessKey = var.aws_access_key
    secretKey = var.aws_secret_key
  })
}

variable "aws_access_key" { type = string; sensitive = true }
variable "aws_secret_key" { type = string; sensitive = true }
```

## InfluxDB Data Source

```hcl
resource "grafana_data_source" "influxdb" {
  type = "influxdb"
  name = "InfluxDB"
  url  = "http://influxdb:8086"

  json_data_encoded = jsonencode({
    version        = "Flux"
    organization   = "my-org"
    defaultBucket  = "metrics"
  })

  secure_json_data_encoded = jsonencode({
    token = var.influxdb_token
  })
}

variable "influxdb_token" { type = string; sensitive = true }
```

## Loki Data Source

```hcl
resource "grafana_data_source" "loki" {
  type = "loki"
  name = "Loki"
  url  = "http://loki:3100"

  json_data_encoded = jsonencode({
    maxLines       = 1000
    derivedFields = [
      {
        name          = "TraceID"
        matcherRegex  = "traceID=(\\w+)"
        url           = "$${__value.raw}"
        datasourceUid = grafana_data_source.tempo.uid
      }
    ]
  })
}
```

## Tempo (Tracing) Data Source

```hcl
resource "grafana_data_source" "tempo" {
  type = "tempo"
  name = "Tempo"
  url  = "http://tempo:3200"

  json_data_encoded = jsonencode({
    tracesToLogs = {
      datasourceUid = grafana_data_source.loki.uid
      tags          = ["service.name"]
    }
    serviceMap = {
      datasourceUid = grafana_data_source.prometheus.uid
    }
  })
}
```

## PostgreSQL Data Source

```hcl
resource "grafana_data_source" "postgres" {
  type = "postgres"
  name = "PostgreSQL"
  url  = "postgres:5432"

  json_data_encoded = jsonencode({
    database       = "app_metrics"
    sslmode        = "require"
    maxOpenConns   = 10
    postgresVersion = 1500
    timescaledb    = false
  })

  secure_json_data_encoded = jsonencode({
    password = var.postgres_password
  })
}

variable "postgres_password" { type = string; sensitive = true }
```

## Multiple Data Sources at Scale

```hcl
variable "prometheus_instances" {
  type = map(object({
    url         = string
    is_default  = bool
    environment = string
  }))
  default = {
    "prod" = { url = "http://prometheus-prod:9090", is_default = true, environment = "production" }
    "stg"  = { url = "http://prometheus-stg:9090", is_default = false, environment = "staging" }
    "dev"  = { url = "http://prometheus-dev:9090", is_default = false, environment = "development" }
  }
}

resource "grafana_data_source" "prometheus_instances" {
  for_each = var.prometheus_instances

  type       = "prometheus"
  name       = "Prometheus (${each.value.environment})"
  url        = each.value.url
  is_default = each.value.is_default

  json_data_encoded = jsonencode({
    httpMethod = "POST"
  })
}
```

## Azure Monitor Data Source

```hcl
resource "grafana_data_source" "azure_monitor" {
  type = "grafana-azure-monitor-datasource"
  name = "Azure Monitor"

  json_data_encoded = jsonencode({
    tenantId       = var.azure_tenant_id
    clientId       = var.azure_client_id
    subscriptionId = var.azure_subscription_id
    cloudName      = "azuremonitor"
  })

  secure_json_data_encoded = jsonencode({
    clientSecret = var.azure_client_secret
  })
}

variable "azure_tenant_id" { type = string }
variable "azure_client_id" { type = string }
variable "azure_subscription_id" { type = string }
variable "azure_client_secret" { type = string; sensitive = true }
```

## Data Source Health Checks

After creating data sources, you can verify they are working by checking the health endpoint:

```hcl
# Use a null_resource to verify data source connectivity
resource "null_resource" "verify_prometheus" {
  triggers = {
    datasource_id = grafana_data_source.prometheus.id
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Check if the data source is reachable
      curl -s -o /dev/null -w "%%{http_code}" \
        -H "Authorization: Bearer ${var.grafana_auth}" \
        "${var.grafana_url}/api/datasources/proxy/${grafana_data_source.prometheus.id}/api/v1/query?query=up" \
        | grep -q "200" && echo "Prometheus data source is healthy" || echo "WARNING: Prometheus data source may not be reachable"
    EOT
  }
}
```

## Provisioning Data Sources from Configuration Files

For complex setups, you can load data source configurations from YAML files:

```hcl
# Load data source configuration from a file
locals {
  datasource_configs = yamldecode(file("${path.module}/datasources.yaml"))
}
```

This approach is particularly useful when you have many data sources with complex configurations that would be unwieldy to define inline.

## Best Practices

Set one Prometheus instance as the default data source. Use secure_json_data_encoded for all credentials. Link related data sources together (Loki to Tempo, Tempo to Prometheus) for correlated observability. Use consistent naming conventions that include the environment. Test data source connectivity after creation by querying from a dashboard.

For creating dashboards that use these data sources, see our guide on [Grafana dashboards](https://oneuptime.com/blog/post/2026-02-23-how-to-create-grafana-dashboards-with-terraform/view).

## Conclusion

Grafana data sources managed through Terraform ensure that every Grafana instance connects to the right monitoring backends with the correct configuration. By defining data sources as code, you eliminate manual setup errors and ensure consistency across environments. The modular approach makes it easy to add new data sources as your monitoring stack evolves.
