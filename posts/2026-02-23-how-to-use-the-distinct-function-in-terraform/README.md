# How to Use the distinct Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, Terraform Functions, Collection Functions

Description: Learn how to use the distinct function in Terraform to remove duplicate elements from a list while preserving order, with practical examples and use cases.

---

Duplicate values in lists can cause unexpected behavior in Terraform configurations - from creating redundant resources to violating uniqueness constraints. The `distinct` function removes duplicate elements from a list while preserving the order of the first occurrence of each unique value.

This guide covers the `distinct` function's behavior, its usage patterns, and real-world scenarios where deduplication matters.

## What is the distinct Function?

The `distinct` function takes a list and returns a new list with all duplicate elements removed. Only the first occurrence of each value is kept.

```hcl
# Returns a list with duplicates removed
distinct(list)
```

The order of elements in the result matches the order of their first appearance in the input.

## Basic Usage in Terraform Console

```hcl
# Remove duplicate strings
> distinct(["a", "b", "a", "c", "b"])
["a", "b", "c"]

# Remove duplicate numbers
> distinct([1, 2, 3, 2, 1])
[1, 2, 3]

# No duplicates, list unchanged
> distinct(["x", "y", "z"])
["x", "y", "z"]

# Empty list returns empty
> distinct([])
[]

# Single element
> distinct(["only"])
["only"]

# All duplicates of the same value
> distinct(["same", "same", "same"])
["same"]
```

## Deduplicating Merged Lists

When combining lists from multiple sources with `concat`, duplicates are common. Use `distinct` to clean them up.

```hcl
variable "team_a_access" {
  type    = list(string)
  default = ["us-east-1", "us-west-2", "eu-west-1"]
}

variable "team_b_access" {
  type    = list(string)
  default = ["us-west-2", "eu-west-1", "ap-southeast-1"]
}

locals {
  # Combine and deduplicate region lists
  all_regions = distinct(concat(var.team_a_access, var.team_b_access))
  # Result: ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"]
}

# Create a VPC in each unique region
resource "aws_vpc" "regional" {
  for_each = toset(local.all_regions)

  cidr_block = "10.0.0.0/16"

  tags = {
    Name   = "vpc-${each.key}"
    Region = each.key
  }
}
```

## Removing Duplicate Security Group Rules

Security group CIDR blocks from multiple sources often overlap. `distinct` prevents duplicate rules.

```hcl
variable "office_cidrs" {
  type    = list(string)
  default = ["10.0.0.0/8", "172.16.0.0/12"]
}

variable "vpn_cidrs" {
  type    = list(string)
  default = ["10.0.0.0/8", "192.168.0.0/16"]
}

locals {
  # The 10.0.0.0/8 appears in both lists - deduplicate
  all_cidrs = distinct(concat(var.office_cidrs, var.vpn_cidrs))
  # Result: ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
}

resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = aws_vpc.main.id

  dynamic "ingress" {
    for_each = local.all_cidrs
    content {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = [ingress.value]
    }
  }
}
```

## Extracting Unique Values from Objects

You can use `distinct` with `for` expressions to extract unique values from a list of objects.

```hcl
variable "instances" {
  type = list(object({
    name   = string
    type   = string
    region = string
  }))
  default = [
    { name = "web-1", type = "t3.micro", region = "us-east-1" },
    { name = "web-2", type = "t3.small", region = "us-east-1" },
    { name = "api-1", type = "t3.micro", region = "us-west-2" },
    { name = "api-2", type = "m5.large", region = "us-west-2" },
  ]
}

locals {
  # Get unique instance types across all instances
  unique_types = distinct([for inst in var.instances : inst.type])
  # Result: ["t3.micro", "t3.small", "m5.large"]

  # Get unique regions
  unique_regions = distinct([for inst in var.instances : inst.region])
  # Result: ["us-east-1", "us-west-2"]
}

output "instance_summary" {
  value = {
    unique_types   = local.unique_types
    unique_regions = local.unique_regions
  }
}
```

## Deduplicating After Transformations

After applying transformations to a list, duplicates may appear in the results. `distinct` handles this cleanly.

```hcl
variable "server_fqdns" {
  type    = list(string)
  default = [
    "web1.us-east-1.example.com",
    "web2.us-east-1.example.com",
    "api1.eu-west-1.example.com",
    "api2.eu-west-1.example.com",
    "db1.us-east-1.example.com",
  ]
}

locals {
  # Extract unique domain suffixes
  unique_domains = distinct([
    for fqdn in var.server_fqdns :
    join(".", slice(split(".", fqdn), 1, length(split(".", fqdn))))
  ])
  # Result: ["us-east-1.example.com", "eu-west-1.example.com"]
}
```

## Combining distinct with Other Functions

The `distinct` function fits into many function chains.

```hcl
locals {
  raw_tags = ["web", "api", "", "web", "database", "", "api"]

  # Remove empty strings first, then deduplicate
  clean_tags = distinct(compact(local.raw_tags))
  # Result: ["web", "api", "database"]

  # Or reverse the operations - both work here
  also_clean = compact(distinct(local.raw_tags))
  # Result: ["web", "api", "database"]
}
```

When combining `distinct` with `compact`, the order does not matter for the final result, but applying `compact` first can be slightly more efficient since `distinct` then has fewer elements to process.

## Validating Uniqueness

You can use `distinct` to validate that a list has no duplicates.

```hcl
variable "subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for subnets - must be unique"

  validation {
    condition     = length(var.subnet_cidrs) == length(distinct(var.subnet_cidrs))
    error_message = "Subnet CIDR blocks must be unique. Duplicates were found."
  }
}

variable "instance_names" {
  type        = list(string)
  description = "Instance names - must be unique"

  validation {
    condition     = length(var.instance_names) == length(distinct(var.instance_names))
    error_message = "Instance names must be unique."
  }
}
```

This pattern compares the length of the original list with the length after deduplication. If they differ, duplicates exist.

## Practical Example: Route53 Records

When collecting DNS records from various sources, deduplication prevents conflicts.

```hcl
variable "api_endpoints" {
  type    = list(string)
  default = ["api.example.com", "api-v2.example.com"]
}

variable "web_endpoints" {
  type    = list(string)
  default = ["www.example.com", "api.example.com"]  # Note: api.example.com appears again
}

locals {
  # Deduplicate all endpoints
  all_endpoints = distinct(concat(var.api_endpoints, var.web_endpoints))
}

resource "aws_route53_record" "endpoints" {
  for_each = toset(local.all_endpoints)

  zone_id = aws_route53_zone.main.zone_id
  name    = each.key
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
```

Without `distinct`, the duplicate `api.example.com` would cause a Terraform error when using `for_each` with `toset`.

## Edge Cases

A few things to note about `distinct`:

- **Type matching**: All elements must be of the same type. Mixing strings and numbers will cause an error.
- **Comparison semantics**: Comparison is exact. `"Hello"` and `"hello"` are considered different values.
- **Complex types**: `distinct` works with simple types (strings, numbers, booleans). For lists of objects, it compares the entire object structure.

```hcl
# Case matters
> distinct(["Hello", "hello", "HELLO"])
["Hello", "hello", "HELLO"]

# Objects are compared by structure
> distinct([{a = 1}, {a = 2}, {a = 1}])
[{a = 1}, {a = 2}]
```

## Summary

The `distinct` function is essential for keeping your Terraform configurations clean and free of duplicates. It is most valuable when merging lists from multiple sources, extracting unique values from object collections, and validating input uniqueness.

Key takeaways:

- `distinct` removes duplicate elements while preserving order
- First occurrence of each value is kept
- Works with strings, numbers, booleans, and complex types
- Pairs naturally with `concat` for merge-and-deduplicate patterns
- Use the `length(list) == length(distinct(list))` pattern to validate uniqueness
- Comparison is exact and case-sensitive

Reach for `distinct` whenever you combine lists and need to ensure each element appears only once.
