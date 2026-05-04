# How to Configure Mongodb Atlas Provider with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the Mongodb Atlas provider in OpenTofu to manage Mongodb Atlas resources as code.

## Introduction

The Mongodb Atlas provider for OpenTofu enables managing Mongodb Atlas resources with the same plan/apply workflow as your cloud infrastructure. This guide covers authentication, basic resource configuration, and production best practices.

## Provider Installation

```hcl
terraform {
  required_providers {
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.24"
    }
  }
  required_version = ">= 1.6.0"
}
```

## Authentication

The provider reads credentials from environment variables:

```bash
# Set MongoDB Atlas API credentials via environment variables

export MONGODB_ATLAS_PUBLIC_KEY="your-public-key"
export MONGODB_ATLAS_PRIVATE_KEY="your-private-key"
```

```hcl
provider "mongodbatlas" {
  # Credentials are read from environment variables
  # public_key  = var.public_key   # Alternative: inline (not recommended)
  # private_key = var.private_key
}
```

## Example Resource

```hcl
# Example resource demonstrating provider usage
resource "mongodbatlas_project" "main" {
  name   = "${var.name}-${var.environment}"
  org_id = var.org_id

  tags = {
    environment = var.environment
    managed_by  = "opentofu"
  }
}
```

## Variables

```hcl
variable "name"        { type = string }
variable "environment" { type = string }
variable "org_id"      { type = string }
```

## Outputs

```hcl
output "project_id" { value = mongodbatlas_project.main.id }
```

## Best Practices

- Store API keys in environment variables or a secrets manager-never in .tf files
- Pin provider versions in `required_providers` to prevent unexpected updates
- Commit the `.terraform.lock.hcl` file to lock exact provider versions
- Use separate provider configurations per environment using aliases or workspaces

## Conclusion

Managing Mongodb Atlas resources with OpenTofu brings the same consistency and auditability to SaaS tooling as you get with cloud infrastructure. Start by codifying your most critical resources and gradually expand coverage over time.
