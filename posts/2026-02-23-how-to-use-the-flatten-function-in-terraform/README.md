# How to Use the flatten Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, Terraform Functions, Collection Functions

Description: Learn how to use the flatten function in Terraform to convert nested lists into a single flat list, with practical examples for multi-level resource generation.

---

Nested lists are a common byproduct of `for` expressions and module outputs in Terraform. When you need to iterate over these nested structures with `for_each` or `count`, you first need to flatten them into a single list. That is exactly what the `flatten` function does - it takes a list of lists (arbitrarily nested) and produces a single flat list.

This guide covers the `flatten` function, its recursive behavior, and real-world patterns where it becomes indispensable.

## What is the flatten Function?

The `flatten` function takes a list that may contain other lists and returns a single flat list with all nested elements brought to the top level.

```hcl
# Recursively flattens nested lists into a single list
flatten(list)
```

The flattening is recursive, meaning it handles any level of nesting.

## Basic Usage in Terraform Console

```hcl
# Flatten one level of nesting
> flatten([["a", "b"], ["c", "d"]])
["a", "b", "c", "d"]

# Flatten deeper nesting
> flatten([["a", ["b", "c"]], ["d"]])
["a", "b", "c", "d"]

# Already flat list is unchanged
> flatten(["a", "b", "c"])
["a", "b", "c"]

# Mixed nesting depths
> flatten([["a"], "b", ["c", ["d", "e"]]])
["a", "b", "c", "d", "e"]

# Empty lists are removed
> flatten([[], ["a"], [], ["b"]])
["a", "b"]

# Completely empty
> flatten([[], []])
[]
```

## The Classic Use Case: Nested for Expressions

The most common reason to use `flatten` is when you have a nested `for` expression that produces a list of lists.

```hcl
variable "vpcs" {
  type = map(object({
    cidr_block = string
    subnets    = list(string)
  }))
  default = {
    production = {
      cidr_block = "10.0.0.0/16"
      subnets    = ["10.0.1.0/24", "10.0.2.0/24"]
    }
    staging = {
      cidr_block = "10.1.0.0/16"
      subnets    = ["10.1.1.0/24", "10.1.2.0/24"]
    }
  }
}

locals {
  # Without flatten, this produces a list of lists
  # flatten converts it to a flat list of objects
  all_subnets = flatten([
    for vpc_name, vpc in var.vpcs : [
      for subnet_cidr in vpc.subnets : {
        vpc_name   = vpc_name
        cidr_block = subnet_cidr
      }
    ]
  ])
}

resource "aws_subnet" "all" {
  for_each = {
    for subnet in local.all_subnets :
    "${subnet.vpc_name}-${subnet.cidr_block}" => subnet
  }

  vpc_id     = aws_vpc.all[each.value.vpc_name].id
  cidr_block = each.value.cidr_block

  tags = {
    Name = "${each.value.vpc_name}-${each.value.cidr_block}"
  }
}
```

Without `flatten`, the nested `for` expression produces `[[{...}, {...}], [{...}, {...}]]`. The `flatten` call converts it to `[{...}, {...}, {...}, {...}]`, which can then be consumed by `for_each`.

## Multi-Level Resource Generation

When you need to create resources based on combinations of multiple dimensions, `flatten` is the bridge between nested iteration and resource creation.

```hcl
variable "environments" {
  type    = list(string)
  default = ["dev", "staging", "prod"]
}

variable "services" {
  type    = list(string)
  default = ["api", "web", "worker"]
}

locals {
  # Generate all environment-service combinations
  service_deployments = flatten([
    for env in var.environments : [
      for svc in var.services : {
        environment = env
        service     = svc
        name        = "${env}-${svc}"
      }
    ]
  ])
}

resource "aws_cloudwatch_log_group" "services" {
  for_each = {
    for deployment in local.service_deployments :
    deployment.name => deployment
  }

  name              = "/app/${each.value.environment}/${each.value.service}"
  retention_in_days = each.value.environment == "prod" ? 90 : 30

  tags = {
    Environment = each.value.environment
    Service     = each.value.service
  }
}
```

This creates 9 log groups (3 environments times 3 services), each with appropriate settings.

## Flattening Module Outputs

When calling a module multiple times with `for_each`, the outputs form a nested structure that often needs flattening.

```hcl
module "vpc" {
  for_each = toset(["us-east-1", "us-west-2"])

  source     = "./modules/vpc"
  region     = each.key
  cidr_block = each.key == "us-east-1" ? "10.0.0.0/16" : "10.1.0.0/16"
}

locals {
  # Each module instance outputs a list of subnet IDs
  # Flatten them into a single list
  all_subnet_ids = flatten([
    for region, vpc in module.vpc : vpc.subnet_ids
  ])
}

output "total_subnets" {
  value = length(local.all_subnet_ids)
}
```

## flatten vs concat

These functions are related but serve different purposes.

```hcl
# concat joins separate list arguments
> concat(["a", "b"], ["c", "d"])
["a", "b", "c", "d"]

# flatten takes a single list-of-lists argument
> flatten([["a", "b"], ["c", "d"]])
["a", "b", "c", "d"]

# The key difference: flatten is recursive
> flatten([["a", ["b", "c"]], ["d"]])
["a", "b", "c", "d"]

# concat does not flatten nested elements
> concat(["a", ["b", "c"]], ["d"])
# This would keep ["b", "c"] as a nested list
```

Use `concat` when you have separate list variables to join. Use `flatten` when you have a computed list of lists (typically from a `for` expression). For more on `concat`, see [How to Use the concat Function in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-concat-function-in-terraform/view).

## Three-Level Nesting

Sometimes your data model requires three levels of iteration. `flatten` handles this cleanly.

```hcl
variable "departments" {
  type = map(object({
    teams = map(object({
      members = list(string)
    }))
  }))
  default = {
    engineering = {
      teams = {
        backend = { members = ["alice", "bob"] }
        frontend = { members = ["carol"] }
      }
    }
    operations = {
      teams = {
        sre = { members = ["dave", "eve"] }
      }
    }
  }
}

locals {
  # Flatten three levels into a single list of user objects
  all_users = flatten([
    for dept_name, dept in var.departments : [
      for team_name, team in dept.teams : [
        for member in team.members : {
          department = dept_name
          team       = team_name
          username   = member
        }
      ]
    ]
  ])
}

resource "aws_iam_user" "team_members" {
  for_each = {
    for user in local.all_users :
    user.username => user
  }

  name = each.key

  tags = {
    Department = each.value.department
    Team       = each.value.team
  }
}
```

## Combining flatten with Filtering

You can filter the flattened results using an `if` clause in the `for` expression.

```hcl
variable "server_groups" {
  type = map(list(object({
    name    = string
    enabled = bool
  })))
  default = {
    web = [
      { name = "web-1", enabled = true },
      { name = "web-2", enabled = false },
    ]
    api = [
      { name = "api-1", enabled = true },
      { name = "api-2", enabled = true },
    ]
  }
}

locals {
  # Flatten and filter in one step
  active_servers = flatten([
    for group, servers in var.server_groups : [
      for server in servers : {
        group = group
        name  = server.name
      }
      if server.enabled
    ]
  ])
  # Result: [{group="web", name="web-1"}, {group="api", name="api-1"}, {group="api", name="api-2"}]
}
```

## Edge Cases

A few things to keep in mind:

- **Non-list elements**: Elements that are not lists are left as-is in the output. `flatten(["a", ["b"]])` gives `["a", "b"]`.
- **Deep nesting**: The flattening is fully recursive. There is no way to flatten only one level.
- **Type consistency**: All leaf elements must be of compatible types.

```hcl
# Non-list elements pass through
> flatten(["a", ["b", "c"], "d"])
["a", "b", "c", "d"]

# Fully recursive
> flatten([[["deep"]]])
["deep"]
```

## Summary

The `flatten` function is one of Terraform's most important collection functions. It bridges the gap between nested `for` expressions and flat resource iteration, making it essential for any configuration that involves multi-dimensional data.

Key takeaways:

- `flatten` recursively converts nested lists into a single flat list
- It is the standard companion to nested `for` expressions
- Essential for `for_each` patterns with multi-dimensional data
- Non-list elements pass through unchanged
- Empty nested lists are removed
- Use `concat` for joining separate lists; use `flatten` for nested list structures

Whenever your `for` expression produces a list of lists, `flatten` is how you make it usable.
