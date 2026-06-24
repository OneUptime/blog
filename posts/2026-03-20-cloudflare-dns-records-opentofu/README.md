# How to Cloudflare Dns Records with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the Cloudflare Dns Records provider in OpenTofu to manage Cloudflare Dns Records resources as code.

## Introduction

The Cloudflare provider for OpenTofu enables managing Cloudflare DNS records with the same plan/apply workflow as your cloud infrastructure. This guide covers authentication, basic resource configuration, and production best practices.

## Provider Installation

```hcl
terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.19.1"
    }
  }
  required_version = ">= 1.6.0"
}
```

## Authentication

The Cloudflare provider supports API token authentication through environment variables:

```bash
# Preferred: use a scoped API token with DNS permissions
export CLOUDFLARE_API_TOKEN="your-api-token"
```

```hcl
provider "cloudflare" {
  # Credentials are read from environment variables
}
```

## Example Resource

```hcl
# Example resource demonstrating provider usage
resource "cloudflare_dns_record" "main" {
  zone_id = var.zone_id
  # Use the full hostname, for example "app.example.com"
  name    = var.record_name
  type    = "A"
  content = var.ipv4_address
  ttl     = 1
  proxied = true

  comment = "Managed by OpenTofu"

  tags = [
    "environment:${var.environment}",
    "managed_by:opentofu",
  ]
}
```

## Variables

```hcl
variable "zone_id"      { type = string }
variable "record_name"  { type = string }
variable "ipv4_address" { type = string }
variable "environment"  { type = string }
```

## Outputs

```hcl
output "dns_record_id" { value = cloudflare_dns_record.main.id }
```

## Best Practices

- Store API tokens in environment variables or a secrets manager, never in `.tf` files
- Prefer scoped API tokens over Global API keys
- Pin provider versions in `required_providers` to prevent unexpected updates
- Commit the `.terraform.lock.hcl` file to lock exact provider versions
- Use separate provider configurations per environment using aliases or workspaces

## Conclusion

Managing Cloudflare DNS records with OpenTofu brings the same consistency and auditability to SaaS tooling as you get with cloud infrastructure. Start by codifying your most critical records and gradually expand coverage over time.
