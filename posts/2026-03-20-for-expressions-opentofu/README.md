# How to Use for Expressions in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, For Expressions, HCL, Collection, Infrastructure as Code

Description: Learn how to use for expressions in OpenTofu to transform lists and maps - filtering, mapping, grouping, and reshaping data structures within your configurations.

## Introduction

For expressions in OpenTofu transform collections - turning lists into maps, filtering based on conditions, extracting attributes, and reshaping data. They replace what would be complex loops in other languages with concise inline expressions.

## List Transformation

```hcl
# Transform a list of strings

variable "subnet_cidrs" {
  default = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

# Extract just the third octet (for naming)
locals {
  subnet_names = [for cidr in var.subnet_cidrs : "subnet-${split(".", cidr)[2]}"]
  # ["subnet-1", "subnet-2", "subnet-3"]
}

# Uppercase all environment names
variable "environments" {
  default = ["dev", "staging", "prod"]
}
locals {
  env_upper = [for env in var.environments : upper(env)]
  # ["DEV", "STAGING", "PROD"]
}
```

## Map Transformation

```hcl
variable "instances" {
  default = {
    web = "t3.small"
    api = "t3.medium"
    db  = "t3.large"
  }
}

# Invert key/value
locals {
  size_to_name = { for name, size in var.instances : size => name }
  # {"t3.small" = "web", "t3.medium" = "api", "t3.large" = "db"}
}

# Add a prefix to all keys
locals {
  prefixed = { for name, size in var.instances : "prod-${name}" => size }
  # {"prod-web" = "t3.small", "prod-api" = "t3.medium", "prod-db" = "t3.large"}
}
```

## Filtering with Conditions

```hcl
variable "subnets" {
  default = [
    { name = "public-1",  type = "public",  cidr = "10.0.1.0/24" },
    { name = "public-2",  type = "public",  cidr = "10.0.2.0/24" },
    { name = "private-1", type = "private", cidr = "10.0.3.0/24" },
    { name = "private-2", type = "private", cidr = "10.0.4.0/24" }
  ]
}

# Filter to only private subnets
locals {
  private_subnets = [for s in var.subnets : s if s.type == "private"]
  # [{name="private-1", type="private", cidr="10.0.3.0/24"}, ...]

  # Filter and extract just CIDRs
  private_cidrs = [for s in var.subnets : s.cidr if s.type == "private"]
  # ["10.0.3.0/24", "10.0.4.0/24"]
}
```

## List to Map Conversion

Convert a list of objects to a map (required for for_each):

```hcl
variable "users" {
  default = [
    { name = "alice", role = "admin",   team = "platform" },
    { name = "bob",   role = "viewer",  team = "app" },
    { name = "carol", role = "editor",  team = "platform" }
  ]
}

# Convert to map keyed by name (for use with for_each)
locals {
  users_by_name = { for user in var.users : user.name => user }
  # {"alice" = {name="alice", role="admin", team="platform"}, ...}
}

# Now use with for_each
resource "aws_iam_user" "team" {
  for_each = local.users_by_name

  name = each.key
  tags = { Role = each.value.role, Team = each.value.team }
}
```

## Grouping: List to Map of Lists

```hcl
# Group users by team
locals {
  users_by_team = {
    for user in var.users : user.team => user.name...
    # The "..." groups multiple values for the same key into a list
  }
  # {"platform" = ["alice", "carol"], "app" = ["bob"]}
}
```

## Extracting Resource Attributes

```hcl
# After creating subnets with for_each, collect all IDs
resource "aws_subnet" "private" {
  for_each = { for s in local.private_subnets : s.name => s }

  vpc_id     = aws_vpc.main.id
  cidr_block = each.value.cidr
}

# Collect all subnet IDs into a list
locals {
  private_subnet_ids = [for s in aws_subnet.private : s.id]
  # ["subnet-abc123", "subnet-def456"]
}

# Use in another resource
resource "aws_db_subnet_group" "main" {
  name       = "prod-db-subnet-group"
  subnet_ids = local.private_subnet_ids
}
```

## Conditional Map Building

```hcl
variable "enable_detailed_monitoring" { default = false }
variable "environment" { default = "prod" }

locals {
  instance_tags = merge(
    {
      Name        = "web-server"
      Environment = var.environment
    },
    var.enable_detailed_monitoring ? { Monitoring = "detailed" } : {}
  )
}
```

## Conclusion

For expressions are the primary tool for data transformation in OpenTofu HCL. Use `[for item in list : transform(item)]` to map over lists, `{ for k, v in map : new_k => new_v }` to transform maps, and add `if condition` to filter. The `...` grouping operator collects multiple values per key into a list. Combine for expressions with `merge()`, `flatten()`, and `toset()` to reshape complex data structures for use with `for_each` and resource arguments.
