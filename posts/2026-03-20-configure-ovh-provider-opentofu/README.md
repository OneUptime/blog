# How to Configure Ovh Provider with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the Ovh provider in OpenTofu to manage Ovh resources as code.

## Introduction

The Ovh provider for OpenTofu enables managing Ovh resources with the same plan/apply workflow as your cloud infrastructure. This guide covers authentication, basic resource configuration, and production best practices.

## Provider Installation

```hcl
terraform {
  required_providers {
    ovh = {
      source  = "ovh/ovh"
      version = "~> 2.0"
    }
  }
  required_version = ">= 1.6.0"
}
```

## Authentication

The OVH provider reads credentials from environment variables. Generate an application key, application secret, and consumer key from the OVHcloud API token creation page (e.g. `https://api.ovh.com/createToken/` for the `ovh-eu` endpoint).

```bash
# Set OVH credentials via environment variables

export OVH_ENDPOINT="ovh-eu"
export OVH_APPLICATION_KEY="your-application-key"
export OVH_APPLICATION_SECRET="your-application-secret"
export OVH_CONSUMER_KEY="your-consumer-key"
```

```hcl
provider "ovh" {
  # Credentials are read from the OVH_* environment variables
  # endpoint = "ovh-eu"  # Alternative: inline (not recommended)
}
```

## Example Resource

```hcl
# Create an A record on an OVH-managed DNS zone
resource "ovh_domain_zone_record" "main" {
  zone      = var.zone
  subdomain = "${var.name}-${var.environment}"
  fieldtype = "A"
  ttl       = 3600
  target    = "203.0.113.10"
}
```

## Variables

```hcl
variable "name"        { type = string }
variable "environment" { type = string }
variable "zone"        { type = string }
```

## Outputs

```hcl
output "record_id" { value = ovh_domain_zone_record.main.id }
```

## Best Practices

- Store API keys in environment variables or a secrets manager-never in .tf files
- Pin provider versions in `required_providers` to prevent unexpected updates
- Commit the `.terraform.lock.hcl` file to lock exact provider versions
- Use separate provider configurations per environment using aliases or workspaces

## Conclusion

Managing Ovh resources with OpenTofu brings the same consistency and auditability to SaaS tooling as you get with cloud infrastructure. Start by codifying your most critical resources and gradually expand coverage over time.
