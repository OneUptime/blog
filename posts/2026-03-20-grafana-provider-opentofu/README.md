# How to Configure the Grafana Provider in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Grafana, Infrastructure as Code, IaC, Grafana Provider, Monitoring

Description: Learn how to configure the Grafana provider in OpenTofu to manage dashboards, data sources, and alerts as code.

## Introduction

This guide covers How to Configure the Grafana Provider in OpenTofu using OpenTofu with practical examples and production-ready configurations.

## Prerequisites

- OpenTofu v1.6+
- API credentials for the relevant service
- Basic understanding of OpenTofu concepts

## Step 1: Install and Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = "~> 3.0"
    }
  }
}

# Configure the Grafana provider with credentials

provider "grafana" {
  url  = var.grafana_url
  auth = var.grafana_api_key
}
```

## Step 2: Set Up Authentication

```bash
# Use environment variables for authentication
export GRAFANA_URL="https://grafana.example.com"
export GRAFANA_AUTH="your-api-key"
```

```hcl
variable "grafana_url" {
  description = "URL of the Grafana instance"
  type        = string
}

variable "grafana_api_key" {
  description = "API key for Grafana authentication"
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}
```

## Step 3: Create Basic Resources

```hcl
# Create a Grafana folder to organize dashboards
resource "grafana_folder" "main" {
  title = "${var.environment}-dashboards"
}

# Create a Prometheus data source
resource "grafana_data_source" "prometheus" {
  type = "prometheus"
  name = "${var.environment}-prometheus"
  url  = "http://prometheus:9090"

  json_data_encoded = jsonencode({
    httpMethod = "POST"
    timeInterval = "15s"
  })
}

# Create a team for access control
resource "grafana_team" "developers" {
  name = "developers"
}
```

## Step 4: Configure Advanced Settings

```hcl
# Create a contact point for alert notifications
resource "grafana_contact_point" "email" {
  name = "critical-email"

  email {
    addresses = ["ops-team@example.com"]
  }
}

# Create a notification policy
resource "grafana_notification_policy" "default" {
  contact_point = grafana_contact_point.email.name
  group_by      = ["alertname"]

  group_wait      = "30s"
  group_interval  = "5m"
  repeat_interval = "4h"
}

# Create an alert rule
resource "grafana_rule_group" "cpu_alerts" {
  name             = "cpu-alerts"
  folder_uid       = grafana_folder.main.uid
  interval_seconds = 60

  rule {
    name      = "High CPU Usage"
    condition = "C"

    data {
      ref_id         = "A"
      datasource_uid = grafana_data_source.prometheus.uid

      relative_time_range {
        from = 600
        to   = 0
      }

      model = jsonencode({
        expr = "100 - (avg by(instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)"
      })
    }

    data {
      ref_id         = "C"
      datasource_uid = "__expr__"

      relative_time_range {
        from = 0
        to   = 0
      }

      model = jsonencode({
        type       = "threshold"
        expression = "A"
        conditions = [{
          evaluator = { type = "gt", params = [90] }
        }]
      })
    }
  }
}
```

## Step 5: Define Outputs

```hcl
output "folder_uid" {
  description = "The UID of the created Grafana folder"
  value       = grafana_folder.main.uid
}

output "prometheus_datasource_uid" {
  description = "The UID of the Prometheus data source"
  value       = grafana_data_source.prometheus.uid
}
```

## Step 6: Deploy

```bash
# Initialize OpenTofu and download provider
tofu init

# Validate configuration syntax
tofu validate

# Preview planned changes
tofu plan

# Apply configuration
tofu apply
```

## Common Issues and Solutions

### Authentication Errors
Verify API keys are valid and have the required permissions. Check for typos in environment variable names.

### Rate Limiting
Add `depends_on` to serialize resource creation and avoid hitting API rate limits.

### Provider Version Conflicts
Pin to a specific provider version range to ensure reproducible deployments.

## Conclusion

You have successfully configured the Grafana provider in OpenTofu. This provider enables you to manage dashboards, data sources, alerts, and access control as code, ensuring consistency and enabling GitOps workflows. Always use environment variables or secure secret stores for sensitive credentials like API keys.
