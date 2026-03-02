# How to Use For Expressions with Filtering in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Infrastructure as Code, Expressions, Collection

Description: Learn how to use Terraform for expressions with conditional filtering to select, exclude, and transform specific elements from lists and maps in your infrastructure code.

---

Terraform's for expressions do more than just transform data - they can filter it too. By adding an `if` clause to a for expression, you can select only the elements that match a condition. This is essential when you have a collection of items and need to work with a subset of them.

If you are familiar with the basic for expression syntax (covered in our [Terraform for expressions post](https://oneuptime.com/blog/post/2026-01-30-terraform-for-expressions/view)), filtering adds one more clause that dramatically expands what you can do.

## Basic Filtering Syntax

Add an `if` clause at the end of a for expression:

```hcl
# List comprehension with filter
# [for item in collection : transform if condition]

variable "numbers" {
  default = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
}

locals {
  # Keep only even numbers
  even_numbers = [for n in var.numbers : n if n % 2 == 0]
  # Result: [2, 4, 6, 8, 10]

  # Keep only numbers greater than 5
  large_numbers = [for n in var.numbers : n if n > 5]
  # Result: [6, 7, 8, 9, 10]
}
```

The structure is: iterate over the collection, optionally transform each element, and include it only if the condition is true.

## Filtering Lists of Objects

This is where filtering becomes really practical:

```hcl
variable "servers" {
  type = list(object({
    name        = string
    role        = string
    environment = string
    enabled     = bool
  }))
  default = [
    { name = "web-01",    role = "web",    environment = "production", enabled = true },
    { name = "web-02",    role = "web",    environment = "production", enabled = true },
    { name = "api-01",    role = "api",    environment = "production", enabled = true },
    { name = "worker-01", role = "worker", environment = "production", enabled = false },
    { name = "web-dev",   role = "web",    environment = "dev",        enabled = true },
    { name = "api-dev",   role = "api",    environment = "dev",        enabled = true },
  ]
}

locals {
  # Filter by role
  web_servers = [for s in var.servers : s if s.role == "web"]
  # Result: web-01, web-02, web-dev

  # Filter by environment
  production_servers = [for s in var.servers : s if s.environment == "production"]
  # Result: web-01, web-02, api-01, worker-01

  # Filter by enabled status
  active_servers = [for s in var.servers : s if s.enabled]
  # Result: web-01, web-02, api-01, web-dev, api-dev

  # Combine multiple conditions with &&
  active_prod_web = [
    for s in var.servers : s
    if s.role == "web" && s.environment == "production" && s.enabled
  ]
  # Result: web-01, web-02

  # Extract just names of filtered items
  active_server_names = [for s in var.servers : s.name if s.enabled]
  # Result: ["web-01", "web-02", "api-01", "web-dev", "api-dev"]
}
```

## Filtering Maps

You can filter maps too. The syntax includes both key and value:

```hcl
variable "instances" {
  type = map(object({
    instance_type = string
    environment   = string
    team          = string
  }))
  default = {
    "web-prod" = {
      instance_type = "t3.large"
      environment   = "production"
      team          = "platform"
    }
    "api-prod" = {
      instance_type = "t3.medium"
      environment   = "production"
      team          = "backend"
    }
    "web-dev" = {
      instance_type = "t3.micro"
      environment   = "dev"
      team          = "platform"
    }
    "analytics" = {
      instance_type = "r5.xlarge"
      environment   = "production"
      team          = "data"
    }
  }
}

locals {
  # Filter map to only production instances
  # Result is a new map with only matching entries
  prod_instances = {
    for name, config in var.instances : name => config
    if config.environment == "production"
  }
  # Result: { "web-prod" = {...}, "api-prod" = {...}, "analytics" = {...} }

  # Filter by team
  platform_instances = {
    for name, config in var.instances : name => config
    if config.team == "platform"
  }
  # Result: { "web-prod" = {...}, "web-dev" = {...} }
}
```

## Using Filtered Results with Resources

### Creating Resources from Filtered Lists

```hcl
variable "dns_records" {
  type = list(object({
    name    = string
    type    = string
    value   = string
    enabled = bool
  }))
  default = [
    { name = "api",    type = "A",     value = "10.0.1.10",           enabled = true },
    { name = "web",    type = "A",     value = "10.0.1.11",           enabled = true },
    { name = "mail",   type = "MX",    value = "10 mail.example.com", enabled = true },
    { name = "old-api", type = "A",    value = "10.0.1.5",            enabled = false },
    { name = "legacy", type = "CNAME", value = "old.example.com",     enabled = false },
  ]
}

locals {
  # Filter to only enabled records, convert to map for for_each
  active_records = {
    for record in var.dns_records : record.name => record
    if record.enabled
  }
}

resource "aws_route53_record" "this" {
  for_each = local.active_records

  zone_id = var.zone_id
  name    = "${each.key}.${var.domain}"
  type    = each.value.type
  ttl     = 300
  records = [each.value.value]
}
```

### Filtering for Security Group Rules

```hcl
variable "firewall_rules" {
  type = list(object({
    description = string
    port        = number
    protocol    = string
    cidr_blocks = list(string)
    environment = string  # which environments this rule applies to
  }))
  default = [
    {
      description = "HTTP"
      port        = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      environment = "all"
    },
    {
      description = "HTTPS"
      port        = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      environment = "all"
    },
    {
      description = "SSH from office"
      port        = 22
      protocol    = "tcp"
      cidr_blocks = ["203.0.113.0/24"]
      environment = "all"
    },
    {
      description = "Debug port"
      port        = 9090
      protocol    = "tcp"
      cidr_blocks = ["10.0.0.0/8"]
      environment = "dev"
    },
    {
      description = "Profiler"
      port        = 6060
      protocol    = "tcp"
      cidr_blocks = ["10.0.0.0/8"]
      environment = "dev"
    },
  ]
}

locals {
  # Filter rules for the current environment
  applicable_rules = [
    for rule in var.firewall_rules : rule
    if rule.environment == "all" || rule.environment == var.environment
  ]
}

resource "aws_security_group" "app" {
  name        = "app-${var.environment}"
  description = "Application security group"
  vpc_id      = var.vpc_id

  dynamic "ingress" {
    for_each = local.applicable_rules
    content {
      description = ingress.value.description
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
    }
  }
}
```

## Advanced Filtering Patterns

### Filtering with contains()

```hcl
variable "services" {
  type = list(object({
    name = string
    tags = list(string)
    port = number
  }))
  default = [
    { name = "api",      tags = ["public", "critical"],   port = 8080 },
    { name = "auth",     tags = ["internal", "critical"],  port = 8081 },
    { name = "worker",   tags = ["internal", "batch"],     port = 9090 },
    { name = "frontend", tags = ["public"],                port = 3000 },
    { name = "metrics",  tags = ["internal", "monitoring"], port = 9100 },
  ]
}

locals {
  # Find all public services
  public_services = [
    for svc in var.services : svc
    if contains(svc.tags, "public")
  ]
  # Result: api, frontend

  # Find all critical internal services
  critical_internal = [
    for svc in var.services : svc
    if contains(svc.tags, "critical") && contains(svc.tags, "internal")
  ]
  # Result: auth

  # Get ports of all public services
  public_ports = [
    for svc in var.services : svc.port
    if contains(svc.tags, "public")
  ]
  # Result: [8080, 3000]
}
```

### Filtering with Regex

```hcl
variable "bucket_names" {
  type    = list(string)
  default = [
    "prod-data-us-east-1",
    "prod-logs-us-east-1",
    "dev-data-us-east-1",
    "prod-data-eu-west-1",
    "staging-logs-us-east-1",
    "prod-backups-us-east-1",
  ]
}

locals {
  # Filter buckets matching a pattern
  prod_buckets = [
    for name in var.bucket_names : name
    if can(regex("^prod-", name))
  ]
  # Result: all prod-* buckets

  # Filter US East buckets
  us_east_buckets = [
    for name in var.bucket_names : name
    if can(regex("us-east-1$", name))
  ]

  # Filter log buckets across all environments
  log_buckets = [
    for name in var.bucket_names : name
    if can(regex("-logs-", name))
  ]
}
```

### Negated Filters (Exclusion)

```hcl
locals {
  # Exclude disabled servers (keep only enabled)
  active_servers = [for s in var.servers : s if s.enabled]

  # Exclude specific environments
  non_prod_servers = [
    for s in var.servers : s
    if s.environment != "production"
  ]

  # Exclude items matching a list
  excluded_names = ["legacy", "deprecated", "temp"]
  filtered_servers = [
    for s in var.servers : s
    if !contains(local.excluded_names, s.name)
  ]
}
```

### Filtering with null Checks

```hcl
variable "optional_configs" {
  type = list(object({
    name   = string
    value  = optional(string)
    secret = optional(string)
  }))
  default = [
    { name = "APP_PORT",  value = "8080" },
    { name = "APP_ENV",   value = "production" },
    { name = "DB_PASS",   secret = "ssm:/db/password" },
    { name = "API_KEY",   secret = "ssm:/api/key" },
    { name = "LOG_LEVEL", value = "info" },
  ]
}

locals {
  # Split configs into regular values and secrets
  regular_configs = [
    for cfg in var.optional_configs : cfg
    if cfg.value != null
  ]

  secret_configs = [
    for cfg in var.optional_configs : cfg
    if cfg.secret != null
  ]
}
```

## Combining Filter with Transform

The real power is filtering and transforming in one expression:

```hcl
variable "users" {
  type = list(object({
    name       = string
    email      = string
    role       = string
    department = string
  }))
}

locals {
  # Get admin email addresses only
  admin_emails = [
    for user in var.users : user.email
    if user.role == "admin"
  ]

  # Create a map of engineering team members
  engineering_team = {
    for user in var.users : user.name => {
      email = user.email
      role  = user.role
    }
    if user.department == "engineering"
  }

  # Format strings for specific users
  admin_labels = [
    for user in var.users : "${user.name} <${user.email}>"
    if user.role == "admin"
  ]
}
```

## Performance Considerations

For expression filtering iterates through every element. For most Terraform use cases (tens to hundreds of elements), this is instant. But be aware that if you are filtering the same collection multiple times, you might want to filter once and reuse:

```hcl
locals {
  # Filter once
  production_servers = [
    for s in var.servers : s
    if s.environment == "production"
  ]

  # Reuse the filtered result
  prod_web = [for s in local.production_servers : s if s.role == "web"]
  prod_api = [for s in local.production_servers : s if s.role == "api"]
  prod_db  = [for s in local.production_servers : s if s.role == "db"]
}
```

## Summary

Filtering in Terraform for expressions uses the `if` clause at the end of the expression to include or exclude elements based on conditions. Use it with lists to get filtered lists, with maps to get filtered maps, and combine it with transformation to both filter and reshape data in a single expression. Common filter functions include direct comparison, `contains()` for list membership, `can(regex())` for pattern matching, and null checks for optional values. When filtering gets complex, break it into intermediate locals for clarity.
