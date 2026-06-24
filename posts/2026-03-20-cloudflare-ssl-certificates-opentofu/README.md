# How to Cloudflare Ssl Certificates with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the Cloudflare Ssl Certificates provider in OpenTofu to manage Cloudflare Ssl Certificates resources as code.

## Introduction

The Cloudflare provider for OpenTofu enables managing Cloudflare SSL certificate resources with the same plan/apply workflow as your cloud infrastructure. This guide covers authentication, ordering an advanced certificate pack, and production best practices. The example below uses Cloudflare Advanced Certificate Manager.

## Provider Installation

```hcl
terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.19.0"
    }
  }
  required_version = ">= 1.6.0"
}
```

## Authentication

The Cloudflare provider can read credentials from environment variables:

```bash
# API token with SSL and Certificates Write permission for the target zone
export CLOUDFLARE_API_TOKEN="your-api-token"
```

```hcl
provider "cloudflare" {
  # Credentials are read from CLOUDFLARE_API_TOKEN
}
```

## Example Resource

```hcl
resource "cloudflare_certificate_pack" "main" {
  zone_id = var.zone_id

  certificate_authority = "lets_encrypt"
  hosts                 = [var.zone_name, "*.${var.zone_name}", "www.${var.zone_name}"]
  type                  = "advanced"
  validation_method     = "txt"
  validity_days         = 14
  cloudflare_branding   = false
}
```

## Variables

```hcl
variable "zone_id"   { type = string }
variable "zone_name" { type = string }
```

## Outputs

```hcl
output "certificate_pack_id" { value = cloudflare_certificate_pack.main.id }
```

## Best Practices

- Store API tokens in environment variables or a secrets manager, never in `.tf` files
- Pin provider versions in `required_providers` to prevent unexpected updates
- Commit the `.terraform.lock.hcl` file to lock exact provider versions
- Use separate provider configurations per environment using aliases or workspaces
- Ordering advanced certificate packs requires the Advanced Certificate Manager add-on

## Conclusion

Managing Cloudflare SSL certificate resources with OpenTofu brings the same consistency and auditability to SaaS tooling as you get with cloud infrastructure. Start by codifying your most critical resources and gradually expand coverage over time.
