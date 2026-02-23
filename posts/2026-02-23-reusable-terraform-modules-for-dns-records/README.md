# How to Create Reusable Terraform Modules for DNS Records

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, AWS, Route53, DNS

Description: Build a Terraform module for managing Route53 DNS records that handles A records, CNAME records, aliases, weighted routing, and health checks in a single interface.

---

DNS records are one of those resources that every project needs but nobody wants to think about too much. You create a few Route53 records, copy-paste them for the next service, and before you know it you have dozens of records scattered across multiple Terraform files with inconsistent configurations.

A DNS module brings order to this by providing a single interface for creating records regardless of type, routing policy, or whether they point to an ALB alias or a plain IP address.

## Design Goals

The module should support:

- Simple records (A, AAAA, CNAME, MX, TXT)
- Alias records (for ALBs, CloudFront, S3, etc.)
- Weighted routing
- Optional health checks
- TTL management

## Module Structure

```
modules/dns-record/
  main.tf
  variables.tf
  outputs.tf
  versions.tf
```

## Variables

```hcl
# modules/dns-record/variables.tf

variable "zone_id" {
  description = "Route53 hosted zone ID"
  type        = string
}

variable "name" {
  description = "DNS record name (e.g., 'api' or 'api.example.com')"
  type        = string
}

variable "type" {
  description = "DNS record type (A, AAAA, CNAME, MX, TXT)"
  type        = string
  default     = "A"

  validation {
    condition     = contains(["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA", "SRV"], var.type)
    error_message = "type must be one of: A, AAAA, CNAME, MX, TXT, NS, SOA, SRV"
  }
}

variable "ttl" {
  description = "TTL in seconds. Ignored for alias records."
  type        = number
  default     = 300
}

variable "records" {
  description = "List of record values. Not used for alias records."
  type        = list(string)
  default     = []
}

# Alias configuration (for ALB, CloudFront, S3, etc.)
variable "alias" {
  description = "Alias target configuration"
  type = object({
    name                   = string
    zone_id                = string
    evaluate_target_health = optional(bool, true)
  })
  default = null
}

# Weighted routing
variable "weighted_routing" {
  description = "Weighted routing policy configuration"
  type = object({
    weight         = number
    set_identifier = string
  })
  default = null
}

# Health check
variable "health_check" {
  description = "Health check configuration"
  type = object({
    fqdn              = optional(string)
    port               = optional(number, 443)
    type               = optional(string, "HTTPS")
    resource_path      = optional(string, "/health")
    failure_threshold  = optional(number, 3)
    request_interval   = optional(number, 30)
  })
  default = null
}
```

## Main Resource

```hcl
# modules/dns-record/main.tf

# Health check (optional)
resource "aws_route53_health_check" "this" {
  count = var.health_check != null ? 1 : 0

  fqdn              = var.health_check.fqdn != null ? var.health_check.fqdn : var.name
  port               = var.health_check.port
  type               = var.health_check.type
  resource_path      = var.health_check.resource_path
  failure_threshold  = var.health_check.failure_threshold
  request_interval   = var.health_check.request_interval

  tags = {
    Name = "hc-${var.name}"
  }
}

# Standard DNS record (non-alias)
resource "aws_route53_record" "standard" {
  count = var.alias == null ? 1 : 0

  zone_id = var.zone_id
  name    = var.name
  type    = var.type
  ttl     = var.ttl
  records = var.records

  # Health check reference
  health_check_id = var.health_check != null ? aws_route53_health_check.this[0].id : null

  # Weighted routing policy (optional)
  dynamic "weighted_routing_policy" {
    for_each = var.weighted_routing != null ? [var.weighted_routing] : []

    content {
      weight = weighted_routing_policy.value.weight
    }
  }

  # Set identifier required for weighted routing
  set_identifier = var.weighted_routing != null ? var.weighted_routing.set_identifier : null
}

# Alias DNS record
resource "aws_route53_record" "alias" {
  count = var.alias != null ? 1 : 0

  zone_id = var.zone_id
  name    = var.name
  type    = var.type

  alias {
    name                   = var.alias.name
    zone_id                = var.alias.zone_id
    evaluate_target_health = var.alias.evaluate_target_health
  }

  # Health check reference
  health_check_id = var.health_check != null ? aws_route53_health_check.this[0].id : null

  # Weighted routing policy (optional)
  dynamic "weighted_routing_policy" {
    for_each = var.weighted_routing != null ? [var.weighted_routing] : []

    content {
      weight = weighted_routing_policy.value.weight
    }
  }

  set_identifier = var.weighted_routing != null ? var.weighted_routing.set_identifier : null
}
```

## Outputs

```hcl
# modules/dns-record/outputs.tf

output "fqdn" {
  description = "Fully qualified domain name of the record"
  value       = var.alias != null ? aws_route53_record.alias[0].fqdn : aws_route53_record.standard[0].fqdn
}

output "name" {
  description = "Name of the record"
  value       = var.alias != null ? aws_route53_record.alias[0].name : aws_route53_record.standard[0].name
}

output "health_check_id" {
  description = "ID of the health check (if created)"
  value       = var.health_check != null ? aws_route53_health_check.this[0].id : null
}
```

## Usage Examples

A simple A record pointing to an IP:

```hcl
module "bastion_dns" {
  source = "./modules/dns-record"

  zone_id = data.aws_route53_zone.main.zone_id
  name    = "bastion.example.com"
  type    = "A"
  ttl     = 300
  records = ["10.0.1.50"]
}
```

An alias record pointing to an ALB:

```hcl
module "api_dns" {
  source = "./modules/dns-record"

  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  alias = {
    name    = module.api_alb.dns_name
    zone_id = module.api_alb.zone_id
  }
}
```

Weighted routing between two regions:

```hcl
module "api_dns_us_east" {
  source = "./modules/dns-record"

  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  alias = {
    name    = module.api_alb_us_east.dns_name
    zone_id = module.api_alb_us_east.zone_id
  }

  weighted_routing = {
    weight         = 70
    set_identifier = "us-east-1"
  }

  health_check = {
    fqdn          = "api-us-east.example.com"
    resource_path = "/health"
    port          = 443
  }
}

module "api_dns_eu_west" {
  source = "./modules/dns-record"

  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  alias = {
    name    = module.api_alb_eu_west.dns_name
    zone_id = module.api_alb_eu_west.zone_id
  }

  weighted_routing = {
    weight         = 30
    set_identifier = "eu-west-1"
  }

  health_check = {
    fqdn          = "api-eu-west.example.com"
    resource_path = "/health"
    port          = 443
  }
}
```

A CNAME record for a third-party service:

```hcl
module "email_verification" {
  source = "./modules/dns-record"

  zone_id = data.aws_route53_zone.main.zone_id
  name    = "mail.example.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["verify.mailprovider.com"]
}
```

## Handling Multiple Records at Once

If you need to create many records, use `for_each` at the module call level:

```hcl
locals {
  dns_records = {
    api = {
      name = "api.example.com"
      alias = {
        name    = module.api_alb.dns_name
        zone_id = module.api_alb.zone_id
      }
    }
    app = {
      name = "app.example.com"
      alias = {
        name    = module.cdn.domain_name
        zone_id = module.cdn.hosted_zone_id
      }
    }
  }
}

module "dns_records" {
  source   = "./modules/dns-record"
  for_each = local.dns_records

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = "A"
  alias   = each.value.alias
}
```

## TTL Best Practices

A common mistake is setting TTLs too high. For records that might change during deployments or failovers, keep TTLs low (60-300 seconds). For stable records like MX records or CNAME records pointing to external services, higher TTLs (3600+) reduce DNS query costs.

Alias records do not have a TTL because they inherit the TTL from the target resource. This is one reason to prefer alias records over CNAME records for AWS resources.

For more on building modules that work together, check out [how to handle module dependencies in Terraform](https://oneuptime.com/blog/post/2026-02-23-handle-module-dependencies-in-terraform/view).
