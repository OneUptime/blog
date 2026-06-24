# How to Cloudflare Page Rules with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the Cloudflare Page Rules provider in OpenTofu to manage Cloudflare Page Rules resources as code.

## Introduction

Cloudflare Page Rules are deprecated, but the Cloudflare provider for OpenTofu can still manage existing Page Rules resources with the same plan/apply workflow as your cloud infrastructure. This guide covers authentication, basic resource configuration, and production best practices.

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

The Cloudflare provider supports API tokens via environment variables:

```bash
export CLOUDFLARE_API_TOKEN="your-api-token"
```

```hcl
provider "cloudflare" {
  # API token is read from CLOUDFLARE_API_TOKEN
}
```

## Example Resource

```hcl
resource "cloudflare_page_rule" "main" {
  zone_id  = var.zone_id
  target   = "${var.domain}/old-page"
  priority = 1
  status   = "active"

  actions = {
    forwarding_url = {
      url         = "https://${var.domain}/new-page"
      status_code = 301
    }
  }
}
```

## Variables

```hcl
variable "zone_id" { type = string }
variable "domain"  { type = string }
```

## Outputs

```hcl
output "page_rule_id" { value = cloudflare_page_rule.main.id }
```

## Best Practices

- Store API tokens in environment variables or a secrets manager-never in .tf files
- Pin provider versions in `required_providers` to prevent unexpected updates
- Commit the `.terraform.lock.hcl` file to lock exact provider versions
- Use separate provider configurations per environment using aliases or workspaces

## Conclusion

Managing existing Cloudflare Page Rules resources with OpenTofu brings the same consistency and auditability to SaaS tooling as you get with cloud infrastructure. Because Cloudflare marks Page Rules as deprecated, use this approach mainly for existing Page Rules configurations or when you specifically need Page Rules behavior.
