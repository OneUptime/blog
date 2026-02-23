# How to Use the one Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, Terraform Functions, Collection Functions

Description: Learn how to use the one function in Terraform to extract a single element from a list or set that contains exactly one item, with examples and error handling.

---

Terraform's `one` function solves a specific but common problem: extracting a single element from a list or set that you know contains exactly one item. This comes up frequently when working with `for_each` results, filtered data sources, and conditional resource creation where a resource is either present (count of 1) or absent (count of 0).

This guide explains how the `one` function works, when to use it, and the patterns it simplifies.

## What is the one Function?

The `one` function takes a list or set and returns its single element. If the collection has zero elements, it returns `null`. If it has more than one element, Terraform raises an error.

```hcl
# Returns the single element, null for empty, or errors for multiple
one(collection)
```

This function was introduced in Terraform 1.0.

## Basic Usage in Terraform Console

```hcl
# Single element list - returns the element
> one(["hello"])
"hello"

# Empty list - returns null
> one([])
null

# Multiple elements - causes an error
# one(["a", "b"]) -> Error: must have zero or one elements

# Works with sets too
> one(toset(["only-item"]))
"only-item"

# Works with any element type
> one([{name = "web", port = 80}])
{
  "name" = "web"
  "port" = 80
}
```

## The Problem one Solves

Before `one` existed, extracting a single element from a conditional resource (created with `count`) was awkward.

```hcl
# Without one - the old way
resource "aws_eip" "nat" {
  count  = var.enable_nat ? 1 : 0
  domain = "vpc"
}

# Referencing it required index access with a conditional
output "nat_ip" {
  value = length(aws_eip.nat) > 0 ? aws_eip.nat[0].public_ip : null
}

# With one - much cleaner
output "nat_ip" {
  value = one(aws_eip.nat[*].public_ip)
}
```

The `one` function combined with the splat expression (`[*]`) produces clean, readable references to conditional resources.

## Conditional Resources with count

The primary use case for `one` is working with resources that use `count` with a boolean condition.

```hcl
variable "create_nat_gateway" {
  type    = bool
  default = true
}

resource "aws_eip" "nat" {
  count  = var.create_nat_gateway ? 1 : 0
  domain = "vpc"
}

resource "aws_nat_gateway" "main" {
  count         = var.create_nat_gateway ? 1 : 0
  allocation_id = one(aws_eip.nat[*].id)
  subnet_id     = aws_subnet.public.id
}

# Clean output - returns the ID or null
output "nat_gateway_id" {
  value = one(aws_nat_gateway.main[*].id)
}

output "nat_public_ip" {
  value = one(aws_eip.nat[*].public_ip)
}
```

When `create_nat_gateway` is `true`, the splat expression produces a single-element list, and `one` extracts it. When `false`, the splat produces an empty list, and `one` returns `null`.

## Filtered Data Sources

When filtering data sources, you often expect exactly one result. The `one` function validates this expectation.

```hcl
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

# The data source already returns one AMI because of most_recent
# But for custom filters that should return exactly one result:
data "aws_vpc" "selected" {
  filter {
    name   = "tag:Environment"
    values = [var.environment]
  }
}

# When you have a list and expect one match
locals {
  target_subnet = one([
    for s in data.aws_subnet.all :
    s if s.tags["Name"] == "primary-subnet"
  ])
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"
  subnet_id     = local.target_subnet != null ? local.target_subnet.id : null
}
```

## Using one with for_each Resources

When referencing a resource created with `for_each` that has a single known key, `one` is not typically needed. But when you convert a `count`-based resource to `for_each` or vice versa, `one` helps with the transition.

```hcl
variable "enable_redis" {
  type    = bool
  default = true
}

resource "aws_elasticache_cluster" "redis" {
  count = var.enable_redis ? 1 : 0

  cluster_id           = "app-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
}

# Using one to get the endpoint cleanly
locals {
  redis_endpoint = one(aws_elasticache_cluster.redis[*].cache_nodes[0].address)
}

output "redis_connection_string" {
  value = local.redis_endpoint != null ? "redis://${local.redis_endpoint}:6379" : "Redis not enabled"
}
```

## Chaining one with Splat Expressions

The combination of `one` and splat expressions is the most common pattern.

```hcl
resource "aws_lb" "app" {
  count              = var.create_lb ? 1 : 0
  name               = "app-lb"
  internal           = false
  load_balancer_type = "application"
  subnets            = var.public_subnet_ids
}

resource "aws_lb_listener" "https" {
  count             = var.create_lb ? 1 : 0
  load_balancer_arn = one(aws_lb.app[*].arn)
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# All these outputs are clean and null-safe
output "lb_dns_name" {
  value = one(aws_lb.app[*].dns_name)
}

output "lb_zone_id" {
  value = one(aws_lb.app[*].zone_id)
}

output "lb_arn" {
  value = one(aws_lb.app[*].arn)
}
```

## one vs Element Access

Here is how `one` compares to other ways of accessing single elements.

```hcl
resource "aws_eip" "nat" {
  count  = var.enable_nat ? 1 : 0
  domain = "vpc"
}

# Method 1: Conditional index access (old way)
output "ip_v1" {
  value = length(aws_eip.nat) > 0 ? aws_eip.nat[0].public_ip : null
}

# Method 2: try with index access
output "ip_v2" {
  value = try(aws_eip.nat[0].public_ip, null)
}

# Method 3: one with splat (recommended)
output "ip_v3" {
  value = one(aws_eip.nat[*].public_ip)
}
```

Method 3 is the cleanest and most idiomatic. It clearly communicates intent: "this list should have at most one element."

## Using one in Module Outputs

Modules that conditionally create resources benefit greatly from `one` in their outputs.

```hcl
# Module: optional-rds

variable "create_database" {
  type    = bool
  default = true
}

resource "aws_db_instance" "main" {
  count = var.create_database ? 1 : 0

  identifier     = "app-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.medium"
  allocated_storage = 50
  username       = "admin"
  password       = var.db_password
}

output "db_endpoint" {
  value = one(aws_db_instance.main[*].endpoint)
}

output "db_address" {
  value = one(aws_db_instance.main[*].address)
}

output "db_port" {
  value = one(aws_db_instance.main[*].port)
}

output "db_arn" {
  value = one(aws_db_instance.main[*].arn)
}
```

Consumers of this module get `null` for all outputs when the database is not created, without any messy conditional logic.

## Error Behavior

Understanding when `one` errors is important:

```hcl
# Zero elements - returns null (not an error)
> one([])
null

# One element - returns the element
> one(["single"])
"single"

# Two or more elements - ERROR
# one(["a", "b"])
# Error: must have zero or one elements

# This is intentional - it catches bugs where you expected
# at most one result but got multiple
```

The error on multiple elements is a feature, not a bug. It acts as an assertion that your data meets expectations.

## Summary

The `one` function provides a clean, idiomatic way to extract a single element from a collection that should have at most one item. Combined with splat expressions, it is the standard way to reference conditional resources in Terraform.

Key takeaways:

- `one(list)` returns the single element, `null` for empty lists, or errors for multiple elements
- Combines naturally with splat expressions (`resource[*].attribute`)
- Ideal for referencing resources created with `count = condition ? 1 : 0`
- Returns `null` when the resource does not exist, which works well with downstream conditionals
- Acts as an assertion that at most one element exists
- Cleaner than conditional index access or `try`

Use `one` everywhere you have conditional resources. It makes your references cleaner and your intent clearer.
