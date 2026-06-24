# How to Cloudflare Waf Rules with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the Cloudflare Waf Rules provider in OpenTofu to manage Cloudflare Waf Rules resources as code.

## Introduction

Cloudflare WAF custom rules in OpenTofu are managed through the Cloudflare provider using the `cloudflare_ruleset` resource in the `http_request_firewall_custom` phase. This guide covers authentication, a basic zone-level custom rule, and production best practices.

## Provider Installation

```hcl
terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.19"
    }
  }
  required_version = ">= 1.6.0"
}
```

## Authentication

The Cloudflare provider prefers API tokens and can read them from environment variables:

```bash
# Token should include the permissions needed for your rules.
# For zone-level custom rules, use a token with Zone WAF Write.
export CLOUDFLARE_API_TOKEN="your-api-token"
```

```hcl
provider "cloudflare" {
  # Credentials are read from CLOUDFLARE_API_TOKEN
}
```

## Example Resource

```hcl
resource "cloudflare_ruleset" "zone_custom_firewall" {
  zone_id     = var.zone_id
  name        = "Phase entry point ruleset for custom rules in my zone"
  description = ""
  kind        = "zone"
  phase       = "http_request_firewall_custom"

  rules = [{
    ref         = "block_non_default_ports"
    description = "Block ports other than 80 and 443"
    expression  = "(not cf.edge.server_port in {80 443})"
    action      = "block"
  }]
}
```

## Variables

```hcl
variable "zone_id" { type = string }
```

## Outputs

```hcl
output "resource_id" { value = cloudflare_ruleset.zone_custom_firewall.id }
```

## Best Practices

- Use a scoped API token with the minimum permissions required; zone-level custom rules need `Zone WAF Write`
- Store API tokens in environment variables or a secrets manager-never in `.tf` files
- Pin provider versions in `required_providers` to prevent unexpected updates
- Commit the `.terraform.lock.hcl` file to lock exact provider versions
- Use stable `ref` values for rules to preserve rule IDs across updates

## Conclusion

Managing Cloudflare WAF custom rules with OpenTofu brings the same consistency and auditability to edge security configuration as the rest of your infrastructure. Start with zone-level custom rules in `cloudflare_ruleset` and expand coverage over time.
