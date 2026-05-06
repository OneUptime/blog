# How to Configure Cloudflare Provider with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the Cloudflare provider in OpenTofu to manage Cloudflare resources as code.

## Introduction

The Cloudflare provider for OpenTofu enables managing Cloudflare resources with the same plan/apply workflow as your cloud infrastructure. This guide covers authentication, basic resource configuration, and production best practices.

## Provider Installation

```hcl
terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5"
    }
  }
  required_version = ">= 1.6.0"
}
```

## Authentication

The Cloudflare provider supports authentication through environment variables. API tokens are the recommended option:

```bash
export CLOUDFLARE_API_TOKEN="your-api-token"
```

```hcl
provider "cloudflare" {
  # api_token is read from CLOUDFLARE_API_TOKEN
}
```

## Example Resource

```hcl
resource "cloudflare_dns_record" "main" {
  zone_id = var.zone_id
  name    = "www"
  content = var.origin_ip
  type    = "A"
  ttl     = 1
  proxied = true
  comment = "Managed by OpenTofu"
}
```

## Variables

```hcl
variable "zone_id"   { type = string }
variable "origin_ip" { type = string }
```

## Outputs

```hcl
output "resource_id" { value = cloudflare_dns_record.main.id }
```

## Best Practices

- Store API tokens in environment variables or a secrets manager, never in `.tf` files
- Pin provider versions in `required_providers` to prevent unexpected updates
- Commit the `.terraform.lock.hcl` file to lock exact provider versions
- Use separate OpenTofu configurations per environment when you need isolated credentials and state; use provider aliases when you need multiple Cloudflare configurations in one root module

## Conclusion

Managing Cloudflare resources with OpenTofu brings the same consistency and auditability to SaaS tooling as you get with cloud infrastructure. Start by codifying your most critical resources and gradually expand coverage over time.
