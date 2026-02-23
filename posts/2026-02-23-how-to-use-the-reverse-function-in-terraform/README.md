# How to Use the reverse Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, Terraform Functions, Collection Functions

Description: Learn how to use the reverse function in Terraform to reverse the order of elements in a list, with practical examples for priority ordering and stack configurations.

---

Sometimes you need to flip the order of elements in a list. The `reverse` function in Terraform does exactly that - it returns a new list with all elements in the opposite order. While this sounds simple, it comes in handy for priority ordering, constructing LIFO (last-in, first-out) structures, reversing DNS names, and creating descending sequences.

This guide covers the `reverse` function, its behavior, and practical use cases.

## What is the reverse Function?

The `reverse` function takes a list and returns a new list with the elements in reversed order.

```hcl
# Returns the list in reverse order
reverse(list)
```

The original list is not modified - a new list is created.

## Basic Usage in Terraform Console

```hcl
# Reverse a string list
> reverse(["a", "b", "c", "d"])
["d", "c", "b", "a"]

# Reverse a number list
> reverse([1, 2, 3, 4, 5])
[5, 4, 3, 2, 1]

# Single element list
> reverse(["only"])
["only"]

# Empty list
> reverse([])
[]

# Reverse a list of objects
> reverse([{name = "first"}, {name = "second"}, {name = "third"}])
[{name = "third"}, {name = "second"}, {name = "first"}]
```

## Priority Ordering for Configurations

When you have a list ordered from lowest to highest priority, `reverse` can flip it to process highest priority first.

```hcl
variable "dns_servers" {
  type    = list(string)
  default = [
    "10.0.0.2",    # Primary
    "10.0.0.3",    # Secondary
    "8.8.8.8",     # Fallback
  ]
}

locals {
  # Some systems want fallback first, primary last
  dns_servers_reversed = reverse(var.dns_servers)
  # ["8.8.8.8", "10.0.0.3", "10.0.0.2"]
}

resource "aws_vpc_dhcp_options" "main" {
  domain_name_servers = var.dns_servers

  tags = {
    Name = "main-dhcp"
  }
}
```

## Building Domain Names from Parts

Reversing is useful when constructing or deconstructing domain names.

```hcl
locals {
  # Build a domain from parts (most specific to least specific)
  domain_parts = ["api", "v2", "us-east", "example", "com"]

  # Reverse to get standard domain order
  domain = join(".", reverse(local.domain_parts))
  # "com.example.us-east.v2.api" - wait, that's backwards

  # Actually, domain parts are usually stored least specific first
  domain_parts_standard = ["com", "example", "us-east", "v2", "api"]
  fqdn = join(".", reverse(local.domain_parts_standard))
  # "api.v2.us-east.example.com"
}
```

## Reversing for LIFO Processing

When you need last-in-first-out processing order, `reverse` makes it straightforward.

```hcl
variable "deployment_history" {
  type    = list(string)
  default = ["v1.0.0", "v1.1.0", "v1.2.0", "v2.0.0", "v2.1.0"]
}

locals {
  # Most recent deployments first
  recent_first = reverse(var.deployment_history)
  # ["v2.1.0", "v2.0.0", "v1.2.0", "v1.1.0", "v1.0.0"]

  # Get the last N deployments
  last_3_versions = slice(local.recent_first, 0, min(3, length(local.recent_first)))
  # ["v2.1.0", "v2.0.0", "v1.2.0"]
}

output "rollback_targets" {
  value = local.last_3_versions
}
```

## Reversing Route Table Priorities

Network routes sometimes need to be applied in reverse order for proper precedence.

```hcl
variable "route_cidrs" {
  type    = list(string)
  description = "CIDR blocks in order of specificity (most specific first)"
  default = [
    "10.0.1.0/24",   # Most specific
    "10.0.0.0/16",   # Medium
    "10.0.0.0/8",    # Least specific
  ]
}

locals {
  # Some systems want least specific first for route table ordering
  routes_least_specific_first = reverse(var.route_cidrs)
  # ["10.0.0.0/8", "10.0.0.0/16", "10.0.1.0/24"]
}

resource "aws_route" "vpn" {
  count = length(local.routes_least_specific_first)

  route_table_id         = aws_route_table.main.id
  destination_cidr_block = local.routes_least_specific_first[count.index]
  gateway_id             = aws_vpn_gateway.main.id
}
```

## Combining reverse with Other Functions

The `reverse` function works well in combination with sorting and sequencing functions.

```hcl
locals {
  # Create a descending sequence
  ascending  = range(1, 6)       # [1, 2, 3, 4, 5]
  descending = reverse(range(1, 6))  # [5, 4, 3, 2, 1]

  # Sort alphabetically then reverse for Z-A ordering
  names      = ["charlie", "alice", "bob"]
  sorted_asc = sort(local.names)         # ["alice", "bob", "charlie"]
  sorted_desc = reverse(sort(local.names))  # ["charlie", "bob", "alice"]

  # Reverse and take first N (equivalent to taking last N)
  all_items = ["a", "b", "c", "d", "e"]
  last_two  = slice(reverse(local.all_items), 0, 2)
  # ["e", "d"]
}
```

## Stack-Like Behavior

You can use `reverse` to implement stack-like patterns.

```hcl
variable "middleware_stack" {
  type    = list(string)
  default = [
    "auth",        # Applied first (outermost)
    "logging",     # Applied second
    "rate-limit",  # Applied third
    "cors",        # Applied last (innermost)
  ]
}

locals {
  # Request processing order (outer to inner)
  request_order = var.middleware_stack
  # ["auth", "logging", "rate-limit", "cors"]

  # Response processing order (inner to outer)
  response_order = reverse(var.middleware_stack)
  # ["cors", "rate-limit", "logging", "auth"]
}

output "processing_order" {
  value = {
    request  = local.request_order
    response = local.response_order
  }
}
```

## Reversing for Display Purposes

Sometimes data needs to be displayed in a different order than it is stored.

```hcl
variable "changelog" {
  type = list(object({
    version = string
    date    = string
    changes = string
  }))
  default = [
    { version = "1.0.0", date = "2025-01-01", changes = "Initial release" },
    { version = "1.1.0", date = "2025-03-15", changes = "Added monitoring" },
    { version = "2.0.0", date = "2025-06-01", changes = "Major rewrite" },
    { version = "2.1.0", date = "2025-09-01", changes = "Performance improvements" },
  ]
}

locals {
  # Show newest entries first
  changelog_newest_first = reverse(var.changelog)
}

output "recent_changes" {
  value = [
    for entry in local.changelog_newest_first :
    "${entry.version} (${entry.date}): ${entry.changes}"
  ]
}
```

## Using reverse with Subnet Allocation

When allocating subnets, you might want to start from the end of the address space.

```hcl
locals {
  vpc_cidr     = "10.0.0.0/16"
  subnet_count = 4

  # Normal allocation: starts from the beginning
  normal_subnets = [for i in range(local.subnet_count) : cidrsubnet(local.vpc_cidr, 8, i)]
  # ["10.0.0.0/24", "10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]

  # Reversed: starts from the end of the range
  reversed_subnets = reverse(local.normal_subnets)
  # ["10.0.3.0/24", "10.0.2.0/24", "10.0.1.0/24", "10.0.0.0/24"]
}
```

## Double Reverse as Identity

Reversing twice returns the original list. This is occasionally useful for testing or as a no-op in conditional logic.

```hcl
locals {
  original = ["a", "b", "c"]

  # Double reverse is identity
  same = reverse(reverse(local.original))
  # ["a", "b", "c"]
}
```

## Edge Cases

- **Empty list**: `reverse([])` returns `[]`.
- **Single element**: `reverse(["a"])` returns `["a"]`.
- **Preserves duplicates**: `reverse(["a", "b", "a"])` returns `["a", "b", "a"]`.
- **Works with any element type**: Strings, numbers, booleans, objects, and nested lists all work.

## Summary

The `reverse` function is a simple utility that flips the order of list elements. While straightforward, it enables patterns for priority reordering, LIFO processing, descending sorts, and display formatting.

Key takeaways:

- `reverse(list)` returns a new list with elements in opposite order
- Does not modify the original list
- Empty and single-element lists are handled gracefully
- Combine with `sort` for descending alphabetical order
- Combine with `range` for descending number sequences
- Combine with `slice` to extract the last N elements
- Double reverse produces the original list

Reach for `reverse` whenever you need to flip the processing or display order of a list.
