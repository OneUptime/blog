# How to Create Grafana Data Sources with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Grafana, Data Source, Observability, Infrastructure as Code

Description: Learn how to configure Grafana data sources with OpenTofu to connect your dashboards to Prometheus, Loki, CloudWatch, and other backends as code.

Grafana data sources connect dashboards to your metrics, logs, and traces backends. Managing them in OpenTofu ensures every Grafana instance is configured consistently and credentials are rotated through a single, auditable workflow.

## Provider Configuration

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
  url  = var.grafana_url   # e.g., "https://grafana.example.com"
  auth = var.grafana_token # Service account token
}
```

## Prometheus Data Source

```hcl
resource "grafana_data_source" "prometheus" {
  type = "prometheus"
  name = "Prometheus"
  url  = "http://prometheus:9090"

  is_default = true

  json_data_encoded = jsonencode({
    httpMethod        = "POST"
    prometheusType    = "Prometheus"
    prometheusVersion = "2.44.0"
    # Enable exemplar support for trace linking
    exemplarTraceIdDestinations = [{
      name            = "trace_id"
      datasourceUid   = grafana_data_source.tempo.uid
    }]
  })
}
```

## Loki Data Source

```hcl
resource "grafana_data_source" "loki" {
  type = "loki"
  name = "Loki"
  url  = "http://loki:3100"

  json_data_encoded = jsonencode({
    # Link log lines to Tempo traces
    derivedFields = [{
      name          = "TraceID"
      matcherRegex  = "traceID=(\\w+)"
      url           = "$${__value.raw}"
      datasourceUid = grafana_data_source.tempo.uid
    }]
  })
}
```

## Tempo Data Source

```hcl
resource "grafana_data_source" "tempo" {
  type = "tempo"
  name = "Tempo"
  url  = "http://tempo:3200"

  json_data_encoded = jsonencode({
    httpMethod = "GET"
    # Link traces back to logs
    tracesToLogs = {
      datasourceUid = grafana_data_source.loki.uid
      tags          = ["app", "pod"]
    }
    # Link traces to metrics
    tracesToMetrics = {
      datasourceUid = grafana_data_source.prometheus.uid
    }
  })
}
```

## CloudWatch Data Source

```hcl
resource "grafana_data_source" "cloudwatch" {
  type = "cloudwatch"
  name = "CloudWatch"

  json_data_encoded = jsonencode({
    authType      = "default"  # Uses EC2 instance role or ECS task role
    defaultRegion = "us-east-1"
  })
}

# Or with explicit credentials

resource "grafana_data_source" "cloudwatch_explicit" {
  type = "cloudwatch"
  name = "CloudWatch (explicit)"

  json_data_encoded = jsonencode({
    authType      = "keys"
    defaultRegion = "us-east-1"
  })

  secure_json_data_encoded = jsonencode({
    accessKey = var.aws_access_key_id
    secretKey = var.aws_secret_access_key
  })
}
```

## Elasticsearch / OpenSearch Data Source

```hcl
resource "grafana_data_source" "elasticsearch" {
  type = "elasticsearch"
  name = "Elasticsearch"
  url  = "https://elasticsearch:9200"

  basic_auth_enabled   = true
  basic_auth_username  = var.es_username

  secure_json_data_encoded = jsonencode({
    basicAuthPassword = var.es_password
  })

  json_data_encoded = jsonencode({
    index    = "logs-*"
    interval = "Daily"
    timeField = "@timestamp"
    esVersion = "8.0.0"
  })
}
```

## PostgreSQL Data Source

```hcl
resource "grafana_data_source" "postgres" {
  type = "postgres"
  name = "Production DB"
  url  = "${var.db_host}:5432"

  database_name = var.db_name
  username      = var.db_username

  secure_json_data_encoded = jsonencode({
    password = var.db_password
  })

  json_data_encoded = jsonencode({
    sslmode         = "require"
    postgresVersion = 1400
    timescaledb     = false
  })
}
```

## Conclusion

Grafana data sources managed in OpenTofu ensure every dashboard backend connection is documented, version-controlled, and consistently configured. Use secure_json_data_encoded for credentials so secrets never appear in state in plaintext, and link related data sources (Prometheus, Loki, Tempo) to enable correlated observability.
