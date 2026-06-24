# How to Cloudflare Tunnels with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the Cloudflare Tunnels provider in OpenTofu to manage Cloudflare Tunnels resources as code.

## Introduction

The Cloudflare provider for OpenTofu enables managing Cloudflare Tunnel resources with the same plan/apply workflow as your cloud infrastructure. This guide covers authentication, basic tunnel configuration, and production best practices.

## Provider Installation

```hcl
terraform {
  required_providers {
    cloudflare = {
      source  = "registry.terraform.io/cloudflare/cloudflare"
      version = "~> 5.19"
    }
  }
  required_version = ">= 1.6.0"
}
```

## Authentication

The Cloudflare provider can read credentials from environment variables. Prefer API tokens over the legacy global API key:

```bash
export CLOUDFLARE_API_TOKEN="your-api-token"
```

```hcl
provider "cloudflare" {
  # Credentials are read from CLOUDFLARE_API_TOKEN
}
```

## Example Resource

```hcl
resource "cloudflare_zero_trust_tunnel_cloudflared" "main" {
  account_id = var.cloudflare_account_id
  name       = var.tunnel_name
  config_src = "cloudflare"
}

resource "cloudflare_dns_record" "app" {
  zone_id = var.cloudflare_zone_id
  name    = var.hostname
  content = "${cloudflare_zero_trust_tunnel_cloudflared.main.id}.cfargotunnel.com"
  type    = "CNAME"
  proxied = true
  ttl     = 1
}

resource "cloudflare_zero_trust_tunnel_cloudflared_config" "main" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.main.id

  config = {
    ingress = [
      {
        hostname = var.hostname
        service  = var.origin_url
      },
      {
        service = "http_status:404"
      }
    ]
  }
}

data "cloudflare_zero_trust_tunnel_cloudflared_token" "main" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.main.id
}
```

## Variables

```hcl
variable "cloudflare_account_id" { type = string }
variable "cloudflare_zone_id"    { type = string }
variable "hostname"              { type = string }
variable "origin_url"            { type = string }
variable "tunnel_name"           { type = string }
```

## Outputs

```hcl
output "tunnel_id" {
  value = cloudflare_zero_trust_tunnel_cloudflared.main.id
}

output "tunnel_token" {
  value     = data.cloudflare_zero_trust_tunnel_cloudflared_token.main.token
  sensitive = true
}
```

## Best Practices

- Store API tokens in environment variables or a secrets manager, never in `.tf` files
- Pin the Cloudflare provider version in `required_providers` to prevent unexpected updates
- Commit the `.terraform.lock.hcl` file to lock the reviewed provider version
- Use separate state and credentials per environment; provider aliases help when one configuration must target multiple Cloudflare accounts

## Conclusion

Managing Cloudflare Tunnel resources with OpenTofu brings the same consistency and auditability to SaaS tooling as you get with cloud infrastructure. Start by codifying your most critical resources and gradually expand coverage over time.
