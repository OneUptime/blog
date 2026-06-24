# How to Configure Dns Provider with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the Dns provider in OpenTofu to manage Dns resources as code.

## Introduction

The DNS provider for OpenTofu enables managing DNS record sets on servers that support RFC 2136 dynamic updates with the same plan/apply workflow as your cloud infrastructure. This guide covers provider configuration, TSIG authentication, basic resource configuration, and production best practices.

## Provider Installation

```hcl
terraform {
  required_providers {
    dns = {
      source  = "hashicorp/dns"
      version = "~> 3.5"
    }
  }
  required_version = ">= 1.6.0"
}
```

## Authentication

The DNS provider can source its update settings from environment variables:

```bash
export DNS_UPDATE_SERVER="192.0.2.53"
export DNS_UPDATE_KEYNAME="example.com."
export DNS_UPDATE_KEYALGORITHM="hmac-sha256"
export DNS_UPDATE_KEYSECRET="c3VwZXJzZWNyZXQ="
```

```hcl
provider "dns" {
  update {
    # Values are read from the DNS_UPDATE_* environment variables
  }
}
```

## Example Resource

```hcl
# Example resource demonstrating provider usage
resource "dns_a_record_set" "main" {
  zone = var.zone
  name = var.name

  addresses = var.addresses
  ttl       = 300
}
```

## Variables

```hcl
variable "zone" {
  type        = string
  description = "DNS zone as an FQDN with a trailing dot."
}

variable "name" {
  type        = string
  description = "Relative record name."
}

variable "addresses" {
  type        = list(string)
  description = "IPv4 addresses for the A record."
}
```

## Outputs

```hcl
output "resource_id" {
  value = dns_a_record_set.main.id
}
```

## Best Practices

- Store TSIG secrets in environment variables or a secrets manager, never in `.tf` files
- Pin provider versions in `required_providers` to prevent unexpected updates
- Commit the `.terraform.lock.hcl` file to lock exact provider versions
- Use a fully qualified zone name with a trailing dot, such as `example.com.`
- Use separate provider configurations per environment using aliases or workspaces

## Conclusion

Managing DNS records with OpenTofu brings the same consistency and auditability to your DNS changes as you get with cloud infrastructure. Start by codifying your most critical records and gradually expand coverage over time.
