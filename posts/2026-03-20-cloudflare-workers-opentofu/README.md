# How to Cloudflare Workers with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the Cloudflare Workers provider in OpenTofu to manage Cloudflare Workers resources as code.

## Introduction

The Cloudflare provider works with OpenTofu to manage Cloudflare Workers resources with the same plan/apply workflow as your cloud infrastructure. This guide covers authentication, basic resource configuration, and production best practices.

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
export CLOUDFLARE_API_TOKEN="your-api-token"
```

```hcl
provider "cloudflare" {}
```

## Example Resource

```hcl
resource "cloudflare_workers_script" "main" {
  account_id  = var.account_id
  script_name = "${var.name}-${var.environment}"

  content = <<-EOT
    export default {
      async fetch(request) {
        return new Response("Hello from Cloudflare Workers");
      },
    }
  EOT

  main_module        = "worker.mjs"
  compatibility_date = "2026-03-20"
}
```

## Variables

```hcl
variable "account_id"   { type = string }
variable "name"         { type = string }
variable "environment"  { type = string }
```

## Outputs

```hcl
output "script_name" { value = cloudflare_workers_script.main.script_name }
```

## Best Practices

- Store API tokens in environment variables or a secrets manager, never in `.tf` files
- Pin provider versions in `required_providers` to prevent unexpected updates
- Commit the `.terraform.lock.hcl` file to lock exact provider versions
- Use separate provider configurations per environment using aliases or workspaces

## Conclusion

Managing Cloudflare Workers resources with OpenTofu brings the same consistency and auditability to SaaS tooling as you get with cloud infrastructure. Start by codifying your most critical resources and gradually expand coverage over time.
