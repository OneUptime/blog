# How to Design a DNS Module for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Route53, DNS, AWS, Module

Description: Learn how to design a reusable DNS module for OpenTofu that manages Route53 zones, records, and health checks from structured configuration data.

## Introduction

A DNS module centralizes zone and record management, making it easy to maintain consistent DNS configurations across services and environments. It should support A, CNAME, MX, TXT records, alias records for AWS resources, and optional Route53 health check associations.

## variables.tf

```hcl
variable "zone_name"   { type = string }
variable "environment" { type = string }
variable "private_zone" {
  type    = bool
  default = false
}

variable "vpc_id" {
  type    = string
  default = ""
}

variable "records" {
  description = "DNS records to create in the zone"
  type = map(object({
    type    = string
    ttl     = optional(number, 300)
    values  = optional(list(string), [])
    health_check_id = optional(string)
    alias = optional(object({
      name                   = string
      zone_id                = string
      evaluate_target_health = bool
    }))
  }))
  default = {}
}

variable "tags" {
  type    = map(string)
  default = {}
}
```

## main.tf

```hcl
locals {
  tags = merge({ Environment = var.environment, ManagedBy = "OpenTofu" }, var.tags)
}

resource "aws_route53_zone" "main" {
  name = var.zone_name

  dynamic "vpc" {
    for_each = var.private_zone ? [1] : []
    content {
      vpc_id = var.vpc_id
    }
  }

  tags = local.tags

  lifecycle {
    precondition {
      condition     = !var.private_zone || var.vpc_id != ""
      error_message = "vpc_id must be set when private_zone is true."
    }
  }
}

# Separate alias records from standard records

locals {
  alias_records    = { for k, r in var.records : k => r if r.alias != null }
  standard_records = { for k, r in var.records : k => r if r.alias == null }
}

resource "aws_route53_record" "standard" {
  for_each = local.standard_records

  zone_id = aws_route53_zone.main.zone_id
  name    = each.key == "@" ? var.zone_name : "${each.key}.${var.zone_name}"
  type    = each.value.type
  health_check_id = each.value.health_check_id
  ttl             = each.value.ttl
  records         = each.value.values
}

resource "aws_route53_record" "alias" {
  for_each = local.alias_records

  zone_id = aws_route53_zone.main.zone_id
  name    = each.key == "@" ? var.zone_name : "${each.key}.${var.zone_name}"
  type    = each.value.type
  health_check_id = each.value.health_check_id

  alias {
    name                   = each.value.alias.name
    zone_id                = each.value.alias.zone_id
    evaluate_target_health = each.value.alias.evaluate_target_health
  }
}
```

## Example Usage

```hcl
module "dns" {
  source      = "./modules/dns"
  zone_name   = "example.com"
  environment = "prod"

  records = {
    "@" = {
      type = "A"
      alias = {
        name                   = module.alb.alb_dns_name
        zone_id                = module.alb.alb_zone_id
        evaluate_target_health = true
      }
    }
    "www" = {
      type   = "CNAME"
      ttl    = 3600
      values = ["example.com"]
    }
    "mail" = {
      type   = "MX"
      ttl    = 3600
      values = ["10 mail.example.com", "20 mail2.example.com"]
    }
    "_dmarc" = {
      type   = "TXT"
      ttl    = 3600
      values = ["\"v=DMARC1; p=reject; rua=mailto:dmarc@example.com\""]
    }
  }
}
```

## outputs.tf

```hcl
output "zone_id"          { value = aws_route53_zone.main.zone_id }
output "zone_name_servers" { value = aws_route53_zone.main.name_servers }
output "zone_arn"         { value = aws_route53_zone.main.arn }
```

## Conclusion

This DNS module handles all common record types and separates alias from standard records since they have different configurations. The `@` convention for apex records makes the configuration readable. For public zones, expose the name servers output so callers can update their domain registrar delegation.
