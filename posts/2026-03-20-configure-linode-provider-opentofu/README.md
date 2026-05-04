# How to Configure Linode Provider with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the Linode provider in OpenTofu to manage Linode resources as code.

## Introduction

The Linode provider for OpenTofu enables managing Linode resources with the same plan/apply workflow as your cloud infrastructure. This guide covers authentication, basic resource configuration, and production best practices.

## Provider Installation

```hcl
terraform {
  required_providers {
    linode = {
      source  = "linode/linode"
      version = "~> 2.0"
    }
  }
  required_version = ">= 1.6.0"
}
```

## Authentication

The provider reads credentials from environment variables:

```bash
# Set Linode API token via environment variable

export LINODE_TOKEN="your-personal-access-token"
```

```hcl
provider "linode" {
  # Token is read from the LINODE_TOKEN environment variable
  # token = var.token  # Alternative: inline (not recommended)
}
```

## Example Resource

```hcl
# Example resource demonstrating provider usage
resource "linode_instance" "main" {
  label  = "${var.name}-${var.environment}"
  region = var.region
  type   = "g6-nanode-1"
  image  = "linode/ubuntu22.04"

  tags = [var.environment, "managed-by-opentofu"]
}
```

## Variables

```hcl
variable "name"        { type = string }
variable "environment" { type = string }
variable "region"      { type = string }
```

## Outputs

```hcl
output "instance_id" { value = linode_instance.main.id }
```

## Best Practices

- Store API keys in environment variables or a secrets manager-never in .tf files
- Pin provider versions in `required_providers` to prevent unexpected updates
- Commit the `.terraform.lock.hcl` file to lock exact provider versions
- Use separate provider configurations per environment using aliases or workspaces

## Conclusion

Managing Linode resources with OpenTofu brings the same consistency and auditability to SaaS tooling as you get with cloud infrastructure. Start by codifying your most critical resources and gradually expand coverage over time.
