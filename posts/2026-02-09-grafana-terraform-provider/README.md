# How to implement Grafana as code with Terraform provider

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Terraform, Infrastructure as Code

Description: Learn how to manage Grafana dashboards, data sources, alerts, and users as code using the Terraform provider for reproducible deployments.

---

Managing Grafana through the UI works fine for small deployments, but it doesn't scale and makes it difficult to replicate configurations across environments. The Grafana Terraform provider lets you define your entire Grafana configuration as code, enabling version control, code reviews, and automated deployments across development, staging, and production environments.

## Installing the Grafana Terraform Provider

Start by configuring the Terraform provider in your project.

```hcl
# main.tf
terraform {
  required_version = ">= 1.0"

  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = "~> 2.0"
    }
  }
}

provider "grafana" {
  url  = "https://grafana.example.com"
  auth = var.grafana_auth

  # Or use service account token
  # service_account_token = var.grafana_sa_token
}

variable "grafana_auth" {
  description = "Grafana admin credentials (admin:password)"
  type        = string
  sensitive   = true
}
```

Initialize Terraform to download the provider:

```bash
terraform init
```

## Managing Data Sources as Code

Define Prometheus, Loki, and other data sources in Terraform.

```hcl
# datasources.tf
resource "grafana_data_source" "prometheus" {
  type = "prometheus"
  name = "Prometheus"
  url  = "http://prometheus:9090"

  json_data_encoded = jsonencode({
    httpMethod    = "POST"
    timeInterval  = "30s"
    queryTimeout  = "60s"
  })
}

resource "grafana_data_source" "loki" {
  type = "loki"
  name = "Loki"
  url  = "http://loki:3100"

  json_data_encoded = jsonencode({
    maxLines      = 1000
    derivedFields = [
      {
        name          = "TraceID"
        matcherRegex  = "trace_id=(\\w+)"
        url           = "https://grafana.example.com/explore?datasource=tempo&query=$${__value.raw}"
        datasourceUid = grafana_data_source.tempo.uid
      }
    ]
  })
}

resource "grafana_data_source" "tempo" {
  type = "tempo"
  name = "Tempo"
  url  = "http://tempo:3200"

  json_data_encoded = jsonencode({
    tracesToLogs = {
      datasourceUid = grafana_data_source.loki.uid
      tags          = ["job", "namespace"]
    }
  })
}
```

These data sources are created with proper linkage for trace-to-logs correlation.

## Creating Dashboards from JSON

Import existing dashboard JSON and manage it through Terraform.

```hcl
# dashboards.tf
resource "grafana_folder" "infrastructure" {
  title = "Infrastructure"
}

resource "grafana_dashboard" "cpu_usage" {
  folder      = grafana_folder.infrastructure.id
  config_json = file("${path.module}/dashboards/cpu-usage.json")
}

resource "grafana_dashboard" "memory_usage" {
  folder = grafana_folder.infrastructure.id

  config_json = jsonencode({
    title   = "Memory Usage"
    uid     = "memory-usage"
    version = 1

    panels = [
      {
        id          = 1
        title       = "Memory Usage by Pod"
        type        = "timeseries"
        gridPos     = { x = 0, y = 0, w = 12, h = 8 }
        datasource  = { uid = grafana_data_source.prometheus.uid }

        targets = [
          {
            expr         = "container_memory_usage_bytes{namespace=\"$namespace\"}"
            legendFormat = "{{pod}}"
            refId        = "A"
          }
        ]

        fieldConfig = {
          defaults = {
            unit = "bytes"
          }
        }
      }
    ]

    templating = {
      list = [
        {
          name       = "namespace"
          type       = "query"
          datasource = { uid = grafana_data_source.prometheus.uid }
          query      = "label_values(kube_pod_info, namespace)"
          multi      = true
          includeAll = true
        }
      ]
    }
  })
}
```

## Managing Alert Rules

Define alerting rules as code for consistent alerting across environments.

```hcl
# alerts.tf
resource "grafana_folder" "alerts" {
  title = "Alert Rules"
}

resource "grafana_rule_group" "infrastructure_alerts" {
  name             = "infrastructure"
  folder_uid       = grafana_folder.alerts.uid
  interval_seconds = 60

  rule {
    name      = "HighCPUUsage"
    condition = "C"

    data {
      ref_id = "A"
      relative_time_range {
        from = 600
        to   = 0
      }
      datasource_uid = grafana_data_source.prometheus.uid
      model = jsonencode({
        expr         = "avg(rate(container_cpu_usage_seconds_total[5m])) by (pod) > 0.8"
        intervalMs   = 1000
        maxDataPoints = 43200
      })
    }

    data {
      ref_id = "C"
      relative_time_range {
        from = 600
        to   = 0
      }
      datasource_uid = "__expr__"
      model = jsonencode({
        type       = "classic_conditions"
        conditions = [
          {
            type      = "query"
            evaluator = {
              type   = "gt"
              params = [0]
            }
            query = {
              params = ["A"]
            }
          }
        ]
      })
    }

    no_data_state  = "NoData"
    exec_err_state = "Error"

    for_duration = "5m"

    annotations = {
      summary     = "High CPU usage detected"
      description = "CPU usage is above 80% for pod {{ $labels.pod }}"
      runbook_url = "https://runbooks.example.com/high-cpu"
    }

    labels = {
      severity = "warning"
      team     = "platform"
    }
  }
}
```

## Configuring Contact Points and Notification Policies

Set up alert routing and notifications.

```hcl
# notifications.tf
resource "grafana_contact_point" "slack" {
  name = "Slack Alerts"

  slack {
    url                   = var.slack_webhook_url
    title                 = "{{ .GroupLabels.alertname }}"
    text                  = "{{ .CommonAnnotations.description }}"
    disable_resolve_message = false
  }
}

resource "grafana_contact_point" "pagerduty" {
  name = "PagerDuty"

  pagerduty {
    integration_key = var.pagerduty_key
    severity        = "critical"
    class           = "production"
    component       = "grafana"
  }
}

resource "grafana_notification_policy" "root" {
  group_by      = ["alertname", "namespace"]
  group_wait    = "30s"
  group_interval = "5m"
  repeat_interval = "12h"

  contact_point = grafana_contact_point.slack.name

  policy {
    matcher {
      label = "severity"
      match = "="
      value = "critical"
    }

    contact_point   = grafana_contact_point.pagerduty.name
    group_by        = ["alertname"]
    group_wait      = "10s"
    group_interval  = "2m"
    repeat_interval = "4h"
  }

  policy {
    matcher {
      label = "team"
      match = "="
      value = "database"
    }

    contact_point   = grafana_contact_point.slack.name
    group_wait      = "1m"
  }
}
```

## Managing Users and Teams

Automate user management and team assignments.

```hcl
# users.tf
resource "grafana_user" "developers" {
  for_each = toset([
    "alice@example.com",
    "bob@example.com",
    "charlie@example.com"
  ])

  email    = each.value
  login    = split("@", each.value)[0]
  password = random_password.user_passwords[each.value].result
}

resource "random_password" "user_passwords" {
  for_each = toset([
    "alice@example.com",
    "bob@example.com",
    "charlie@example.com"
  ])

  length  = 16
  special = true
}

resource "grafana_team" "platform" {
  name  = "Platform Team"
  email = "platform@example.com"

  members = [
    grafana_user.developers["alice@example.com"].email,
    grafana_user.developers["bob@example.com"].email,
  ]
}

resource "grafana_team" "sre" {
  name  = "SRE Team"
  email = "sre@example.com"

  members = [
    grafana_user.developers["charlie@example.com"].email,
  ]
}
```

## Setting Folder and Dashboard Permissions

Control access to dashboards using teams.

```hcl
# permissions.tf
resource "grafana_folder_permission" "infrastructure_permissions" {
  folder_uid = grafana_folder.infrastructure.uid

  permissions {
    role       = "Viewer"
    permission = "View"
  }

  permissions {
    team_id    = grafana_team.platform.id
    permission = "Edit"
  }

  permissions {
    team_id    = grafana_team.sre.id
    permission = "Admin"
  }
}

resource "grafana_dashboard_permission" "sensitive_dashboard" {
  dashboard_uid = grafana_dashboard.cpu_usage.uid

  permissions {
    team_id    = grafana_team.sre.id
    permission = "View"
  }
}
```

## Creating Reusable Modules

Build Terraform modules for common Grafana configurations.

```hcl
# modules/monitoring-stack/main.tf
variable "environment" {
  type = string
}

variable "prometheus_url" {
  type = string
}

resource "grafana_folder" "main" {
  title = "${var.environment} Monitoring"
}

resource "grafana_data_source" "prometheus" {
  type = "prometheus"
  name = "Prometheus ${var.environment}"
  url  = var.prometheus_url
}

resource "grafana_dashboard" "overview" {
  folder      = grafana_folder.main.id
  config_json = templatefile("${path.module}/dashboards/overview.json", {
    datasource_uid = grafana_data_source.prometheus.uid
    environment    = var.environment
  })
}

output "folder_id" {
  value = grafana_folder.main.id
}
```

Use the module in multiple environments:

```hcl
# environments/production/main.tf
module "production_monitoring" {
  source = "../../modules/monitoring-stack"

  environment     = "production"
  prometheus_url  = "http://prometheus-prod:9090"
}

module "staging_monitoring" {
  source = "../../modules/monitoring-stack"

  environment     = "staging"
  prometheus_url  = "http://prometheus-staging:9090"
}
```

## Managing Multiple Grafana Instances

Use provider aliases to manage multiple Grafana instances.

```hcl
# multi-instance.tf
provider "grafana" {
  alias = "prod"
  url   = "https://grafana-prod.example.com"
  auth  = var.grafana_prod_auth
}

provider "grafana" {
  alias = "dev"
  url   = "https://grafana-dev.example.com"
  auth  = var.grafana_dev_auth
}

resource "grafana_dashboard" "prod_dashboard" {
  provider = grafana.prod

  folder      = grafana_folder.prod_infrastructure.id
  config_json = file("dashboards/production.json")
}

resource "grafana_dashboard" "dev_dashboard" {
  provider = grafana.dev

  folder      = grafana_folder.dev_infrastructure.id
  config_json = file("dashboards/development.json")
}
```

## Importing Existing Resources

Import existing Grafana resources into Terraform state.

```bash
# Import a dashboard by UID
terraform import grafana_dashboard.existing <uid>

# Import a data source by ID
terraform import grafana_data_source.existing <id>

# Import a folder by UID
terraform import grafana_folder.existing <uid>

# Import an alert rule
terraform import grafana_rule_group.existing <uid>
```

After importing, run `terraform plan` to see what needs to be added to your configuration to match the imported state.

## Implementing CI/CD for Grafana

Automate Grafana configuration deployment through CI/CD pipelines.

```yaml
# .github/workflows/grafana-deploy.yml
name: Deploy Grafana Configuration

on:
  push:
    branches: [main]
    paths:
      - 'terraform/grafana/**'

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: 1.5.0

      - name: Terraform Init
        working-directory: terraform/grafana
        run: terraform init

      - name: Terraform Plan
        working-directory: terraform/grafana
        env:
          TF_VAR_grafana_auth: ${{ secrets.GRAFANA_AUTH }}
        run: terraform plan -out=tfplan

      - name: Terraform Apply
        working-directory: terraform/grafana
        env:
          TF_VAR_grafana_auth: ${{ secrets.GRAFANA_AUTH }}
        run: terraform apply tfplan
```

## Handling Sensitive Data

Manage secrets securely in Terraform configurations.

```hcl
# secrets.tf
variable "slack_webhook_url" {
  type      = string
  sensitive = true
}

variable "pagerduty_key" {
  type      = string
  sensitive = true
}

# Store in terraform.tfvars (not committed)
# Or use environment variables
# export TF_VAR_slack_webhook_url="https://..."
# export TF_VAR_pagerduty_key="key123"

# Or use a secret management backend
data "aws_secretsmanager_secret_version" "grafana_secrets" {
  secret_id = "grafana/production"
}

locals {
  secrets = jsondecode(data.aws_secretsmanager_secret_version.grafana_secrets.secret_string)
}
```

## Best Practices for Grafana as Code

Keep dashboard JSON files in a separate `dashboards/` directory for easier management and version control.

Use Terraform modules to standardize common configurations across environments.

Tag all resources with environment and ownership information for easier identification.

Store Terraform state in remote backends like S3 with state locking to enable team collaboration.

Review Terraform plans carefully before applying, especially for alert rule changes that could affect production notifications.

Use `terraform fmt` and `terraform validate` in CI/CD to maintain code quality.

Document your Terraform modules with README files explaining their purpose and usage.

Separate data sources, dashboards, and alerts into different files for better organization.

Use variables for environment-specific values to make configurations reusable.

Version your Terraform configurations alongside application code to track changes together.

Test Terraform changes in development environments before applying to production.

Managing Grafana through Terraform transforms it from a collection of manually created resources into a reproducible, version-controlled infrastructure. This approach enables consistency across environments, simplifies disaster recovery, and makes Grafana configuration part of your standard infrastructure deployment process.
