# How to Use for_each with Conditional Filtering in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, for_each, Filtering, Conditional, HCL

Description: Learn how to filter map and list inputs before passing them to for_each in OpenTofu, creating only the resources that meet your specified criteria.

## Introduction

`for_each` creates one resource per element in a map or set of strings. By filtering the collection before passing it to `for_each`, you can create resources selectively based on any condition - environment flags, tier requirements, feature flags, or complex multi-field criteria.

## Filtering with if in for Expression

```hcl
variable "users" {
  type = map(object({
    active       = bool
    role         = string
    console_access = bool
  }))
  default = {
    "alice" = { active = true,  role = "admin",  console_access = true  }
    "bob"   = { active = true,  role = "viewer", console_access = false }
    "carol" = { active = false, role = "admin",  console_access = true  }
    "dave"  = { active = true,  role = "admin",  console_access = true  }
  }
}

# Create IAM users only for active users

resource "aws_iam_user" "active_users" {
  for_each = {
    for name, user in var.users : name => user
    if user.active
  }

  name = each.key
}

# Create login profiles only for active users with console access
resource "aws_iam_user_login_profile" "console_users" {
  for_each = {
    for name, user in var.users : name => user
    if user.active && user.console_access
  }

  user                    = aws_iam_user.active_users[each.key].name
  password_reset_required = true
}
```

## Multi-Condition Filtering

Combine multiple conditions for complex selection logic.

```hcl
variable "services" {
  type = map(object({
    enabled     = bool
    tier        = string  # "frontend", "backend", "database"
    public      = bool
    port        = number
  }))
}

variable "environment" { type = string }

locals {
  is_prod = var.environment == "prod"

  # In prod: all enabled services get target groups
  # In non-prod: only frontend and backend services (not database tier)
  eligible_services = {
    for name, svc in var.services : name => svc
    if svc.enabled && (local.is_prod || svc.tier != "database")
  }

  # Public-facing services only (for DNS records)
  public_services = {
    for name, svc in var.services : name => svc
    if svc.enabled && svc.public && svc.port > 0
  }
}

resource "aws_lb_target_group" "services" {
  for_each = local.eligible_services

  name     = "tg-${each.key}-${var.environment}"
  port     = each.value.port
  protocol = "HTTP"
  vpc_id   = var.vpc_id
}

resource "aws_route53_record" "public_services" {
  for_each = local.public_services

  zone_id = data.aws_route53_zone.main.zone_id
  name    = "${each.key}.${var.domain}"
  type    = "A"
  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }
}
```

## Filtering by Value Presence

Create resources only when a specific field is non-empty.

```hcl
variable "certificates" {
  type = map(object({
    domain          = string
    san_domains     = list(string)
    custom_cert_arn = string  # Empty string means use ACM-managed cert
  }))
}

# Only use custom certs where one is specified; ACM-managed otherwise
locals {
  custom_cert_configs = {
    for name, cert in var.certificates : name => cert
    if cert.custom_cert_arn != ""
  }

  acm_managed_configs = {
    for name, cert in var.certificates : name => cert
    if cert.custom_cert_arn == ""
  }
}

resource "aws_acm_certificate" "managed" {
  for_each = local.acm_managed_configs

  domain_name               = each.value.domain
  subject_alternative_names = each.value.san_domains
  validation_method         = "DNS"
}
```

## Filtering with lookup and length Checks

```hcl
variable "subnets" {
  type = map(object({
    cidr = string
    az   = string
    tags = map(string)
  }))
}

locals {
  # Only subnets tagged as "private" tier
  private_subnets = {
    for name, subnet in var.subnets : name => subnet
    if lookup(subnet.tags, "Tier", "") == "private"
  }

  # Subnets with at least one tag
  tagged_subnets = {
    for name, subnet in var.subnets : name => subnet
    if length(subnet.tags) > 0
  }
}
```

## Conclusion

Filtering before `for_each` is cleaner than using `count = condition ? 1 : 0` on individual resources when you have a collection. The `for ... if ...` expression syntax is readable and composable - define filtered views as named `locals` and reference them in multiple resource blocks for consistent selection logic.
