# How to Configure the Cloudflare Provider in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Cloudflare, Infrastructure as Code, IaC, Cloudflare Provider, DNS

Description: Learn how to configure the Cloudflare provider in OpenTofu with API tokens and zone management.

## Introduction

This guide covers How to Configure the Cloudflare Provider in OpenTofu using OpenTofu with practical examples and production-ready configurations.

## Prerequisites

- OpenTofu v1.6+
- A Cloudflare API token with access to the zones you want to manage
- Your Cloudflare account ID if you plan to create a zone
- Basic understanding of OpenTofu concepts

## Step 1: Install and Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.19.0"
    }
  }
}

# Configure the provider with credentials from the environment
provider "cloudflare" {
  # Set CLOUDFLARE_API_TOKEN in your shell before running OpenTofu.
}
```

## Step 2: Set Up Authentication

```bash
# Use environment variables for authentication and input values
export CLOUDFLARE_API_TOKEN="your-api-token"
export TF_VAR_account_id="your-account-id"
export TF_VAR_zone_name="example.com"
export TF_VAR_origin_ipv4="198.51.100.10"
```

```hcl
variable "account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "zone_name" {
  description = "DNS zone to manage"
  type        = string
}

variable "origin_ipv4" {
  description = "Origin IPv4 address for the DNS record"
  type        = string
}
```

## Step 3: Create Basic Resources

```hcl
resource "cloudflare_zone" "main" {
  account = {
    id = var.account_id
  }

  name = var.zone_name
  type = "full"
}

resource "cloudflare_dns_record" "www" {
  zone_id = cloudflare_zone.main.id
  name    = "www.${var.zone_name}"
  type    = "A"
  content = var.origin_ipv4
  ttl     = 3600
  proxied = true
  comment = "Managed by OpenTofu"
}
```

## Step 4: Configure Advanced Settings

```hcl
# Enable DNSSEC for the zone
resource "cloudflare_zone_dnssec" "main" {
  zone_id = cloudflare_zone.main.id
  status  = "active"
}

# Configure zone-level DNS settings
resource "cloudflare_zone_dns_settings" "main" {
  zone_id            = cloudflare_zone.main.id
  flatten_all_cnames = false
  ns_ttl             = 86400
}
```

## Step 5: Define Outputs

```hcl
output "zone_id" {
  description = "The ID of the created Cloudflare zone"
  value       = cloudflare_zone.main.id
}

output "zone_name" {
  description = "The name of the created Cloudflare zone"
  value       = cloudflare_zone.main.name
}
```

## Step 6: Deploy

```bash
# Initialize OpenTofu and download provider
tofu init

# Validate configuration syntax
tofu validate

# Preview planned changes
tofu plan

# Apply configuration
tofu apply
```

## Common Issues and Solutions

### Authentication Errors
Verify the API token is valid and has permission to manage the target zone and DNS records. Check that `CLOUDFLARE_API_TOKEN` is set in the shell where you run OpenTofu.

### Rate Limiting
Cloudflare enforces API rate limits. If you hit HTTP 429 responses, reduce the number of changes in a single apply and retry after the rate limit window resets.

### Provider Version Conflicts
Pin to a specific provider version range and commit `.terraform.lock.hcl` to keep provider installation reproducible.

## Conclusion

You have successfully configured How to Configure the Cloudflare Provider in OpenTofu using OpenTofu. This provider enables you to manage Cloudflare zones, DNS records, and related DNS settings as code, ensuring consistency and enabling GitOps workflows. Always use environment variables or secure secret stores for sensitive credentials.
