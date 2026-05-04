# How to Configure Hetzner Provider with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the Hetzner provider in OpenTofu to manage Hetzner resources as code.

## Introduction

The Hetzner provider for OpenTofu enables managing Hetzner resources with the same plan/apply workflow as your cloud infrastructure. This guide covers authentication, basic resource configuration, and production best practices.

## Provider Installation

```hcl
terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.48"
    }
  }
  required_version = ">= 1.6.0"
}
```

## Authentication

The Hetzner Cloud provider reads credentials from an environment variable:

```bash
# Set the Hetzner Cloud API token

export HCLOUD_TOKEN="your-api-token"
```

Generate the token from the Hetzner Cloud Console under your project's *Security > API Tokens*.

```hcl
provider "hcloud" {
  # Token is read from the HCLOUD_TOKEN environment variable
  # token = var.hcloud_token  # Alternative: inline (not recommended)
}
```

## Example Resource

```hcl
# Example resource: a Hetzner Cloud server
resource "hcloud_server" "main" {
  name        = "${var.name}-${var.environment}"
  server_type = "cx22"
  image       = "ubuntu-24.04"
  location    = "nbg1"

  labels = {
    environment = var.environment
    managed_by  = "opentofu"
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
output "resource_id"  { value = hcloud_server.main.id }
output "ipv4_address" { value = hcloud_server.main.ipv4_address }
```

## Best Practices

- Store API keys in environment variables or a secrets manager-never in .tf files
- Pin provider versions in `required_providers` to prevent unexpected updates
- Commit the `.terraform.lock.hcl` file to lock exact provider versions
- Use separate provider configurations per environment using aliases or workspaces

## Conclusion

Managing Hetzner Cloud resources with OpenTofu brings consistency and auditability to your infrastructure provisioning. Start by codifying your most critical resources and gradually expand coverage over time.
