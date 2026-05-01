# How to Use Dynamic Blocks for DNS Records in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, DNS, Route53, Dynamic Blocks, Networking

Description: Learn how to use dynamic blocks and for_each in OpenTofu to manage large numbers of DNS records from structured data files, reducing repetitive record definitions.

## Introduction

Managing dozens of DNS records as individual resources is tedious. OpenTofu's `for_each` and dynamic blocks let you define all records in a structured data format - a YAML or JSON file - and create every record with a single resource block.

## Managing Route53 Records with for_each

```hcl
variable "dns_records" {
  description = "Map of DNS records to create"
  type = map(object({
    type    = string
    ttl     = number
    records = list(string)
  }))
  default = {
    "api" = {
      type    = "A"
      ttl     = 300
      records = ["203.0.113.10"]
    }
    "www" = {
      type    = "CNAME"
      ttl     = 3600
      records = ["api.example.com"]
    }
    "mail" = {
      type    = "MX"
      ttl     = 3600
      records = ["10 mail.example.com"]
    }
  }
}

data "aws_route53_zone" "main" {
  name = var.domain_name
}

# Create one Route53 record per entry in the map

resource "aws_route53_record" "records" {
  for_each = var.dns_records

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.key
  type    = each.value.type
  ttl     = each.value.ttl
  records = each.value.records
}
```

## Loading DNS Records from a YAML File

Externalize record definitions for easier management by non-Terraform users.

```hcl
# File: dns/records.yaml
# records:
#   - subdomain: "api"
#     type: "A"
#     ttl: 300
#     values: ["203.0.113.10", "203.0.113.11"]
#   - subdomain: "staging"
#     type: "CNAME"
#     ttl: 300
#     values: ["api.example.com"]

locals {
  # Load DNS records from YAML and convert to a map keyed by subdomain
  dns_yaml = yamldecode(file("${path.module}/dns/records.yaml"))
  dns_records = {
    for record in local.dns_yaml.records :
    record.subdomain => record
  }
}

resource "aws_route53_record" "from_file" {
  for_each = local.dns_records

  zone_id = data.aws_route53_zone.main.zone_id
  name    = "${each.key}.${var.domain_name}"
  type    = each.value.type
  ttl     = each.value.ttl
  records = each.value.values
}
```

## Alias Records with Dynamic Blocks

For alias records (pointing to AWS resources like ALBs and CloudFront), use a dynamic block to generate the nested `alias` block.

```hcl
variable "alias_records" {
  type = list(object({
    name                   = string
    type                   = string
    alias_dns_name         = string
    alias_hosted_zone_id   = string
    evaluate_target_health = bool
  }))
  default = []
}

resource "aws_route53_record" "aliases" {
  for_each = {
    for record in var.alias_records : record.name => record
  }

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type

  # Alias block instead of TTL and records
  dynamic "alias" {
    for_each = [each.value]
    content {
      name                   = alias.value.alias_dns_name
      zone_id                = alias.value.alias_hosted_zone_id
      evaluate_target_health = alias.value.evaluate_target_health
    }
  }
}
```

## Multi-Environment DNS with Per-Environment Records

```hcl
locals {
  # Environment-specific DNS configurations
  env_dns = {
    "dev" = {
      api_ip     = "10.0.1.100"
      www_target = "dev-alb.us-east-1.elb.amazonaws.com"
    }
    "prod" = {
      api_ip     = "203.0.113.50"
      www_target = "prod-alb.us-east-1.elb.amazonaws.com"
    }
  }

  # Build a flat map of all DNS records for the current environment
  current_env_dns = local.env_dns[var.environment]
}

output "dns_api_ip" {
  value = local.current_env_dns.api_ip
}
```

## Conclusion

Managing DNS records through structured data in OpenTofu gives you a single source of truth for all records, version history through git, and the ability to manage hundreds of records with a few lines of HCL. Combine this with YAML file loading to give DNS ownership to teams without OpenTofu expertise.
