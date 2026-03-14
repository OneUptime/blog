# How to Use the distinct Function to Deduplicate Lists

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Distinct Function, Lists, HCL, Infrastructure as Code, Deduplication

Description: Learn how to use the distinct function in Terraform to remove duplicate elements from lists while preserving the original order of first occurrences.

---

Duplicate values in lists can cause all sorts of problems in Terraform - from unexpected resource counts with `for_each` to redundant security group rules. The `distinct` function gives you a clean way to deduplicate lists while keeping the order of first occurrences intact.

## What Is the distinct Function?

The `distinct` function takes a list and returns a new list with all duplicate elements removed. The first occurrence of each value is kept, and subsequent duplicates are dropped. The order of the remaining elements matches their original order in the input list.

```hcl
# distinct(list)
# Returns a deduplicated version of the list
distinct(["a", "b", "a", "c", "b"])
# Returns: ["a", "b", "c"]
```

## Exploring in terraform console

Let's see how `distinct` handles various inputs:

```hcl
# Launch with: terraform console

# Basic deduplication
> distinct(["us-east-1", "us-west-2", "us-east-1", "eu-west-1", "us-west-2"])
[
  "us-east-1",
  "us-west-2",
  "eu-west-1",
]

# Already unique - no change
> distinct(["a", "b", "c"])
[
  "a",
  "b",
  "c",
]

# All same values - returns single element
> distinct(["same", "same", "same"])
[
  "same",
]

# Empty list - returns empty list
> distinct([])
[]

# Works with numbers too
> distinct([1, 2, 3, 2, 1, 4])
[
  1,
  2,
  3,
  4,
]

# Case sensitive - "Dev" and "dev" are different
> distinct(["Dev", "dev", "DEV"])
[
  "Dev",
  "dev",
  "DEV",
]
```

## Why Duplicates Happen in Terraform

Duplicates tend to sneak into Terraform configurations through several common paths:

```hcl
# 1. Merging lists from multiple sources
variable "team_a_regions" {
  default = ["us-east-1", "us-west-2", "eu-west-1"]
}

variable "team_b_regions" {
  default = ["us-west-2", "eu-west-1", "ap-southeast-1"]
}

locals {
  # concat can produce duplicates
  all_regions = concat(var.team_a_regions, var.team_b_regions)
  # Result: ["us-east-1", "us-west-2", "eu-west-1", "us-west-2", "eu-west-1", "ap-southeast-1"]

  # distinct cleans it up
  unique_regions = distinct(local.all_regions)
  # Result: ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"]
}
```

```hcl
# 2. Extracting values from maps or objects
variable "instances" {
  default = {
    web1 = { type = "t3.medium", zone = "us-east-1a" }
    web2 = { type = "t3.medium", zone = "us-east-1b" }
    api1 = { type = "t3.large",  zone = "us-east-1a" }
    db1  = { type = "r5.large",  zone = "us-east-1a" }
  }
}

locals {
  # Extracting zones gives duplicates
  all_zones = [for k, v in var.instances : v.zone]
  # Result: ["us-east-1a", "us-east-1b", "us-east-1a", "us-east-1a"]

  unique_zones = distinct(local.all_zones)
  # Result: ["us-east-1a", "us-east-1b"]
}
```

## Practical Example - Unique Availability Zones

Here is a real-world scenario where `distinct` prevents creating duplicate subnets:

```hcl
variable "services" {
  type = list(object({
    name = string
    az   = string
    cidr = string
  }))
  default = [
    { name = "web",   az = "us-east-1a", cidr = "10.0.1.0/24" },
    { name = "api",   az = "us-east-1a", cidr = "10.0.2.0/24" },
    { name = "cache", az = "us-east-1b", cidr = "10.0.3.0/24" },
    { name = "queue", az = "us-east-1b", cidr = "10.0.4.0/24" },
    { name = "db",    az = "us-east-1c", cidr = "10.0.5.0/24" },
  ]
}

locals {
  # Get the unique AZs where we need NAT gateways
  unique_azs = distinct([for s in var.services : s.az])
  # Result: ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# Create one NAT gateway per unique AZ
resource "aws_nat_gateway" "per_az" {
  for_each      = toset(local.unique_azs)
  allocation_id = aws_eip.nat[each.key].id
  subnet_id     = aws_subnet.public[each.key].id

  tags = {
    Name = "nat-${each.key}"
  }
}
```

## Deduplicating Security Group Rules

When aggregating security rules from multiple sources, duplicates can cause Terraform errors:

```hcl
variable "app_cidrs" {
  default = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "monitoring_cidrs" {
  default = ["10.0.2.0/24", "10.0.3.0/24"]
}

variable "admin_cidrs" {
  default = ["10.0.1.0/24", "10.0.4.0/24"]
}

locals {
  # Combine all CIDR blocks that need access
  all_access_cidrs = distinct(concat(
    var.app_cidrs,
    var.monitoring_cidrs,
    var.admin_cidrs,
  ))
  # Result: ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24", "10.0.4.0/24"]
}

resource "aws_security_group_rule" "ingress" {
  for_each          = toset(local.all_access_cidrs)
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = [each.value]
  security_group_id = aws_security_group.app.id
}
```

Without `distinct`, duplicate CIDR blocks would cause `for_each` to fail because `toset` does not allow duplicates when converting from a list with the same values.

## Case-Insensitive Deduplication

Since `distinct` is case-sensitive, you need an extra step if you want case-insensitive deduplication:

```hcl
variable "tags_input" {
  default = ["Production", "production", "PRODUCTION", "staging"]
}

locals {
  # Case-insensitive dedup by lowercasing first
  normalized_tags = distinct([for t in var.tags_input : lower(t)])
  # Result: ["production", "staging"]
}
```

## Combining distinct with flatten

When working with nested lists, you often need both `flatten` and `distinct`:

```hcl
variable "team_configs" {
  type = map(object({
    allowed_ports = list(number)
  }))
  default = {
    frontend = { allowed_ports = [80, 443, 8080] }
    backend  = { allowed_ports = [443, 8080, 5432] }
    ops      = { allowed_ports = [22, 443, 5432, 9090] }
  }
}

locals {
  # Collect all ports, flatten the nested lists, then deduplicate
  all_ports = distinct(flatten([
    for team, config in var.team_configs : config.allowed_ports
  ]))
  # Result: [80, 443, 8080, 5432, 22, 9090]
}

output "unique_ports" {
  value = sort(local.all_ports)
  # Result: [22, 80, 443, 5432, 8080, 9090]
}
```

## distinct vs toset

You might wonder why not just use `toset` instead of `distinct`. Both remove duplicates, but they behave differently:

```hcl
locals {
  my_list = ["charlie", "alpha", "bravo", "alpha", "charlie"]

  # distinct preserves insertion order
  via_distinct = distinct(local.my_list)
  # Result: ["charlie", "alpha", "bravo"]

  # toset sorts the elements (sets are unordered, but Terraform sorts them)
  via_toset = tolist(toset(local.my_list))
  # Result: ["alpha", "bravo", "charlie"]
}
```

Use `distinct` when order matters. Use `toset` when you need a set type (for example, with `for_each`) and do not care about order.

## Deduplicating Computed Values

A handy pattern is using `distinct` after extracting attributes from a resource:

```hcl
# Suppose you have a data source that returns instances
data "aws_instances" "app" {
  filter {
    name   = "tag:Application"
    values = ["my-app"]
  }
}

locals {
  # Get unique instance types in use
  instance_types = distinct(data.aws_instances.app.instance_type_ids)

  # Get unique subnets where our app instances are running
  app_subnets = distinct([
    for id in data.aws_instances.app.ids :
    data.aws_instance.details[id].subnet_id
  ])
}
```

## Building Unique IAM Policies

When multiple roles need overlapping sets of permissions, `distinct` helps build clean policy attachment lists:

```hcl
variable "role_policies" {
  type = map(list(string))
  default = {
    developer = [
      "arn:aws:iam::aws:policy/ReadOnlyAccess",
      "arn:aws:iam::aws:policy/AmazonS3FullAccess",
    ]
    deployer = [
      "arn:aws:iam::aws:policy/AmazonS3FullAccess",
      "arn:aws:iam::aws:policy/AmazonECS_FullAccess",
    ]
  }
}

locals {
  # All unique policies that need to exist
  all_unique_policies = distinct(flatten([
    for role, policies in var.role_policies : policies
  ]))
}

output "policies_to_audit" {
  description = "All unique IAM policies in use across roles"
  value       = local.all_unique_policies
}
```

## Summary

The `distinct` function is straightforward - it removes duplicates from a list while preserving the order of first occurrences. But its simplicity belies its importance in real Terraform configurations. Any time you merge lists from multiple sources, extract values from complex data structures, or aggregate settings from various modules, duplicates can creep in. The `distinct` function ensures your lists are clean, which prevents errors with `for_each`, avoids duplicate resource creation, and keeps your infrastructure definitions predictable.

For more list manipulation techniques, see our posts on the [compact function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-compact-function-to-remove-empty-strings/view) and the [concat function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-concat-function-to-merge-lists-in-terraform/view).
