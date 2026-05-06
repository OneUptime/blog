# How to Configure Consul Provider with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the Consul provider in OpenTofu to manage Consul resources as code.

## Introduction

The Consul provider for OpenTofu enables managing Consul resources with the same plan/apply workflow as your cloud infrastructure. This guide covers provider configuration, authentication, and production best practices.

## Provider Installation

```hcl
terraform {
  required_providers {
    consul = {
      source  = "hashicorp/consul"
      version = "~> 2.23"
    }
  }
  required_version = ">= 1.6.0"
}
```

## Authentication

The Consul provider can read connection settings and ACL tokens from Consul environment variables:

```bash
export CONSUL_HTTP_ADDR="https://consul.example.com:8501"
export CONSUL_HTTP_TOKEN="your-consul-acl-token"
```

```hcl
provider "consul" {
  datacenter = "dc1"
}
```

## Example Resource

```hcl
resource "consul_key_prefix" "main" {
  path_prefix = "${var.name}/${var.environment}/"

  subkeys = {
    "service_url" = "https://api.internal.example"
    "log_level"   = "info"
  }
}
```

## Variables

```hcl
variable "name"        { type = string }
variable "environment" { type = string }
```

## Outputs

```hcl
output "resource_id" { value = consul_key_prefix.main.id }
```

## Best Practices

- Store Consul ACL tokens in environment variables or a secrets manager, never in `.tf` files
- Pin provider versions in `required_providers` to prevent unexpected updates
- Commit the `.terraform.lock.hcl` file to lock exact provider versions
- Use separate provider configurations per datacenter or environment using aliases or workspaces

## Conclusion

Managing Consul resources with OpenTofu brings the same consistency and auditability to service discovery and configuration data that you get with cloud infrastructure. Start by codifying your most critical resources and gradually expand coverage over time.
