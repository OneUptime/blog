# How to Configure Datadog Provider with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the Datadog provider in OpenTofu to manage Datadog resources as code.

## Introduction

The Datadog provider for OpenTofu enables managing Datadog resources with the same plan/apply workflow as your cloud infrastructure. This guide covers authentication, basic resource configuration, and production best practices.

## Provider Installation

```hcl
terraform {
  required_providers {
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 4.0"
    }
  }
  required_version = ">= 1.6.0"
}
```

## Authentication

The Datadog provider can read credentials from environment variables:

```bash
export DD_API_KEY="your-api-key"
export DD_APP_KEY="your-app-key"
# Optional for non-US1 Datadog sites
export DD_HOST="https://api.datadoghq.eu/"
```

```hcl
provider "datadog" {
  # api_key and app_key are read from DD_API_KEY and DD_APP_KEY
  # Set DD_HOST or api_url if you are not using the Datadog US1 site
}
```

## Example Resource

```hcl
resource "datadog_monitor" "main" {
  name    = "High CPU usage - ${var.name}-${var.environment}"
  type    = "metric alert"
  message = "CPU usage is above the threshold."

  query = "avg(last_5m):avg:system.cpu.user{*} by {host} > 80"

  monitor_thresholds {
    critical = 80
  }

  include_tags = true
  tags         = ["environment:${var.environment}", "managed_by:opentofu"]
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

- Store Datadog API and application keys in environment variables or a secrets manager, never in `.tf` files
- Pin provider versions in `required_providers` to prevent unexpected updates
- Commit the `.terraform.lock.hcl` file to lock exact provider versions
- Use separate provider configurations per environment using aliases or workspaces

## Conclusion

Managing Datadog resources with OpenTofu brings the same consistency and auditability to SaaS tooling as you get with cloud infrastructure. Start by codifying your most critical resources and gradually expand coverage over time.
