# How to Use for_each with Sets to Create Resources in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, for_each, Set, Resource, HCL, Infrastructure as Code, DevOps

Description: Learn how to use for_each with sets of strings in OpenTofu to create multiple resource instances identified by unique string values.

---

`for_each` accepts either a map or a set of strings. When using a set, each element becomes the resource's key (`each.key`), and `each.value` equals `each.key` (since sets have no separate value). This is ideal for creating resources from a list of unique names - like security group rules, IAM policies, or Route53 records.

---

## Basic for_each with a Set

```hcl
variable "allowed_domains" {
  type    = set(string)
  default = ["example.com", "api.example.com", "admin.example.com"]
}

resource "aws_route53_record" "domains" {
  for_each = var.allowed_domains   # set of strings

  zone_id = aws_route53_zone.main.zone_id
  name    = each.key    # each.key is the string value ("example.com")
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
```

---

## Converting a List to a Set

Sets require unique values - if your input is a list with potential duplicates, convert it with `toset()`:

```hcl
variable "environments" {
  type    = list(string)
  default = ["development", "staging", "production"]
}

resource "aws_iam_role" "env_roles" {
  for_each = toset(var.environments)   # convert list to set

  name = "app-${each.key}-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

# Access a specific instance

output "production_role_arn" {
  value = aws_iam_role.env_roles["production"].arn
}
```

---

## for_each with a Set Expression

OpenTofu does not have a set literal syntax, but when the values are known at write time you can pass a set expression directly by wrapping a list literal with `toset()`:

```hcl
resource "aws_iam_user" "service_accounts" {
  for_each = toset(["deploy", "monitoring", "backup"])   # set built from a list literal

  # each.key and each.value are both the account name
  name = "app-${each.key}"
}
```

---

## Sets with Security Group Rules

```hcl
locals {
  management_ips = toset([
    "10.0.0.5",
    "10.0.0.10",
    "10.0.1.50",
  ])
}

resource "aws_vpc_security_group_ingress_rule" "ssh_access" {
  for_each = local.management_ips

  security_group_id = aws_security_group.bastion.id
  cidr_ipv4         = "${each.key}/32"   # each.key is the IP
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"

  description = "SSH from ${each.key}"
}
```

---

## Adding and Removing Items

Like map-based `for_each`, set-based iteration is stable:

```hcl
# Before: 3 domains
# After: adding "status.example.com"
variable "allowed_domains" {
  type    = set(string)
  default = ["example.com", "api.example.com", "admin.example.com", "status.example.com"]
}
# OpenTofu only creates the new "status.example.com" record - others are untouched
```

---

## Set vs Map: When to Use Each

| Use Set | Use Map |
|---|---|
| Items are just strings (names, IPs, domains) | Items need additional configuration |
| `each.value` isn't needed | `each.value` provides the config |
| Example: list of hostnames, IP addresses | Example: map of name → {port, protocol, etc.} |

---

## Summary

`for_each` with sets of strings creates one resource per unique string value, using the string as both `each.key` and `each.value`. Convert lists to sets with `toset()` to use them with `for_each`. Sets are perfect for creating uniform resources identified by a string - like DNS records for a list of domains, security group rules for a list of IPs, or IAM roles for a list of environment names.
