# How to Configure Digitalocean Provider with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the Digitalocean provider in OpenTofu to manage Digitalocean resources as code.

## Introduction

The Digitalocean provider for OpenTofu enables managing Digitalocean resources with the same plan/apply workflow as your cloud infrastructure. This guide covers authentication, basic resource configuration, and production best practices.

## Provider Installation

```hcl
terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
  required_version = ">= 1.6.0"
}
```

## Authentication

The Digitalocean provider can read credentials from environment variables:

```bash
export DIGITALOCEAN_TOKEN="your-api-token"
# Alternatively:
# export DIGITALOCEAN_ACCESS_TOKEN="your-api-token"
```

```hcl
provider "digitalocean" {
  # Credentials are read from DIGITALOCEAN_TOKEN or DIGITALOCEAN_ACCESS_TOKEN
}
```

## Example Resource

```hcl
resource "digitalocean_project" "main" {
  name        = "${var.name}-${var.environment}"
  description = "Managed by OpenTofu"
  purpose     = "Web Application"
  environment = var.environment
}
```

## Variables

```hcl
variable "name" { type = string }

variable "environment" {
  type = string

  validation {
    condition     = contains(["Development", "Staging", "Production"], var.environment)
    error_message = "environment must be Development, Staging, or Production."
  }
}
```

## Outputs

```hcl
output "resource_id" { value = digitalocean_project.main.id }
```

## Best Practices

- Store the API token in environment variables or a secrets manager, never in `.tf` files
- Constrain provider versions in `required_providers` to prevent unexpected updates
- Commit the `.terraform.lock.hcl` file to lock exact provider versions
- Use separate provider configurations per environment using aliases or workspaces

## Conclusion

Managing Digitalocean resources with OpenTofu brings the same consistency and auditability to SaaS tooling as you get with cloud infrastructure. Start by codifying your most critical resources and gradually expand coverage over time.
