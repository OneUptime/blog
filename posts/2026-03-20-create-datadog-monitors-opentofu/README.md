# How to Create Datadog Monitors with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the Datadog Monitors provider in OpenTofu to manage Datadog Monitors resources as code.

## Introduction

The Datadog provider for OpenTofu enables managing Datadog monitors with the same plan/apply workflow as your cloud infrastructure. This guide covers authentication, basic resource configuration, and production best practices.

## Provider Installation

```hcl
terraform {
  required_providers {
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.0"
    }
  }
  required_version = ">= 1.6.0"
}
```

## Authentication

The Datadog provider reads credentials from environment variables:

```bash
# Set provider credentials via environment variables

export DD_API_KEY="your-api-key"
export DD_APP_KEY="your-app-key"
```

```hcl
provider "datadog" {
  # Credentials are read from DD_API_KEY and DD_APP_KEY by default.
  # api_key = var.datadog_api_key  # Alternative: inline (not recommended)
  # app_key = var.datadog_app_key
  # api_url = "https://api.datadoghq.eu/"  # Override for non-US sites
}
```

## Example Resource

```hcl
# Metric alert monitor that triggers on high CPU usage
resource "datadog_monitor" "main" {
  name    = "${var.name}-${var.environment} high CPU"
  type    = "metric alert"
  message = "CPU is high on {{host.name}}. Notify: @ops-team"
  query   = "avg(last_5m):avg:system.cpu.user{env:${var.environment}} by {host} > 90"

  monitor_thresholds {
    warning  = 80
    critical = 90
  }

  include_tags = true

  tags = [
    "environment:${var.environment}",
    "managed_by:opentofu",
  ]
}
```

## Variables

```hcl
variable "name"        { type = string }
variable "environment" { type = string }
```

## Outputs

```hcl
output "resource_id" { value = datadog_monitor.main.id }
```

## Best Practices

- Store API keys in environment variables or a secrets manager-never in .tf files
- Pin provider versions in `required_providers` to prevent unexpected updates
- Commit the `.terraform.lock.hcl` file to lock exact provider versions
- Use separate provider configurations per environment using aliases or workspaces

## Conclusion

Managing Datadog monitors with OpenTofu brings the same consistency and auditability to SaaS tooling as you get with cloud infrastructure. Start by codifying your most critical monitors and gradually expand coverage over time.
