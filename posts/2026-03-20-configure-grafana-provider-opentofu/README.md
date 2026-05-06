# How to Configure Grafana Provider with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the Grafana provider in OpenTofu to manage Grafana resources as code.

## Introduction

The Grafana provider for OpenTofu enables managing Grafana resources with the same plan/apply workflow as your cloud infrastructure. This guide covers authentication, basic resource configuration, and production best practices.

## Provider Installation

```hcl
terraform {
  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = "~> 4.0"
    }
  }
  required_version = ">= 1.6.0"
}
```

## Authentication

The Grafana provider can read configuration from environment variables:

```bash
export GRAFANA_URL="https://grafana.example.com"
export GRAFANA_AUTH="your-service-account-token"
```

```hcl
provider "grafana" {
  # url and auth are read from GRAFANA_URL and GRAFANA_AUTH
}
```

## Example Resource

```hcl
resource "grafana_folder" "main" {
  title = "${var.name}-${var.environment}"
}
```

## Variables

```hcl
variable "name"        { type = string }
variable "environment" { type = string }
```

## Outputs

```hcl
output "resource_id" { value = grafana_folder.main.id }
```

## Best Practices

- Store Grafana credentials in environment variables or a secrets manager, never in `.tf` files
- Pin provider versions in `required_providers` to prevent unexpected updates
- Commit the `.terraform.lock.hcl` file to lock exact provider versions
- Use separate provider configurations per environment using aliases or workspaces

## Conclusion

Managing Grafana resources with OpenTofu brings the same consistency and auditability to SaaS tooling as you get with cloud infrastructure. Start by codifying your most critical resources and gradually expand coverage over time.
