# How to Convert Lists to Sets for for_each in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, for_each, Sets, Lists, Infrastructure as Code

Description: Learn how to convert Terraform lists to sets and maps for use with for_each, including toset, for expressions, and techniques for transforming list data into for_each-compatible collections.

---

The `for_each` meta-argument in Terraform accepts only maps or sets of strings. It does not accept lists. If your data is in a list - from a variable, a data source, or a local computation - you need to convert it before using it with `for_each`.

This post covers every conversion pattern you will need: `toset()` for simple lists, `for` expressions for lists of objects, and `flatten` plus conversion for nested structures.

## Why for_each Does Not Accept Lists

Lists are ordered and can contain duplicates. `for_each` needs unique keys to identify each resource instance in the Terraform state. If you could pass a list like `["a", "b", "a"]`, there would be two resources with the same key "a" at indices 0 and 2, which would be ambiguous.

Sets are unordered and guarantee uniqueness. Maps have unique keys by definition. Both work.

```hcl
# This FAILS
resource "aws_iam_user" "this" {
  for_each = ["alice", "bob", "charlie"]  # Error: list is not allowed
  name     = each.key
}

# This WORKS
resource "aws_iam_user" "this" {
  for_each = toset(["alice", "bob", "charlie"])  # Set is allowed
  name     = each.key
}
```

## Converting Simple Lists with toset()

The `toset()` function converts a list of strings to a set of strings:

```hcl
variable "namespaces" {
  type    = list(string)
  default = ["frontend", "backend", "monitoring", "logging"]
}

resource "kubernetes_namespace" "this" {
  for_each = toset(var.namespaces)

  metadata {
    name = each.key
  }
}
```

If the list contains duplicates, `toset()` removes them silently:

```hcl
locals {
  # toset removes the duplicate "frontend"
  unique_namespaces = toset(["frontend", "backend", "frontend", "monitoring"])
  # Result: {"backend", "frontend", "monitoring"}
}
```

## Converting Number Lists to String Sets

`for_each` sets must contain strings. If you have a list of numbers, convert them:

```hcl
variable "allowed_ports" {
  type    = list(number)
  default = [80, 443, 8080, 9090]
}

resource "aws_security_group_rule" "ingress" {
  for_each = toset([for p in var.allowed_ports : tostring(p)])

  type              = "ingress"
  from_port         = tonumber(each.key)
  to_port           = tonumber(each.key)
  protocol          = "tcp"
  security_group_id = aws_security_group.app.id
  cidr_blocks       = [var.vpc_cidr]
  description       = "Allow port ${each.key}"
}
```

The `for` expression converts each number to a string, then `toset()` wraps the result.

## Converting Lists of Objects to Maps

Lists of objects cannot be converted to sets because sets only hold strings. Instead, convert them to maps where one attribute serves as the key:

```hcl
variable "users" {
  type = list(object({
    name  = string
    email = string
    role  = string
  }))
  default = [
    { name = "alice", email = "alice@example.com", role = "admin" },
    { name = "bob", email = "bob@example.com", role = "developer" },
    { name = "charlie", email = "charlie@example.com", role = "developer" },
  ]
}

locals {
  # Convert list of objects to a map, keyed by name
  users_map = {
    for user in var.users : user.name => user
  }
  # Result:
  # {
  #   alice   = { name = "alice", email = "alice@example.com", role = "admin" }
  #   bob     = { name = "bob", email = "bob@example.com", role = "developer" }
  #   charlie = { name = "charlie", email = "charlie@example.com", role = "developer" }
  # }
}

resource "aws_iam_user" "this" {
  for_each = local.users_map

  name = each.key

  tags = {
    Email = each.value.email
    Role  = each.value.role
  }
}
```

## Choosing the Right Map Key

The key you choose must be unique across all items. Pick the attribute that serves as the natural identifier:

```hcl
variable "subnets" {
  type = list(object({
    name              = string
    cidr              = string
    availability_zone = string
    public            = bool
  }))
}

# Key by name - most common
locals {
  subnets_by_name = {
    for subnet in var.subnets : subnet.name => subnet
  }
}

# Key by CIDR - useful when CIDRs are the primary identifier
locals {
  subnets_by_cidr = {
    for subnet in var.subnets : subnet.cidr => subnet
  }
}

# Composite key - when no single attribute is unique
locals {
  subnets_by_az_and_type = {
    for subnet in var.subnets :
    "${subnet.availability_zone}-${subnet.public ? "public" : "private"}" => subnet
  }
}
```

## Handling Duplicate Keys

If your list has items with the same key value, the `for` expression will error. You have a few options:

### Option 1: Group by Key

```hcl
variable "rules" {
  type = list(object({
    port        = number
    cidr        = string
    description = string
  }))
}

# Group rules by port - each port can have multiple CIDRs
locals {
  rules_by_port = {
    for rule in var.rules : tostring(rule.port) => rule...
    # The ... groups values with the same key into a list
  }
  # Result: { "443" = [{...}, {...}], "8080" = [{...}] }
}
```

### Option 2: Create Composite Keys

```hcl
locals {
  # Combine multiple attributes to create unique keys
  rules_map = {
    for i, rule in var.rules :
    "${rule.port}-${rule.cidr}" => rule
  }
}
```

### Option 3: Use Index as Part of the Key

```hcl
locals {
  # Use the list index to guarantee uniqueness
  rules_map = {
    for i, rule in var.rules :
    "${rule.port}-${i}" => rule
  }
}
```

Using the index as part of the key preserves uniqueness but has the same drawback as `count` - removing items from the middle shifts the indices.

## Flattening Nested Lists

A common scenario is having a list of objects where each object contains a list, and you need a flat structure for `for_each`:

```hcl
variable "teams" {
  type = list(object({
    name    = string
    members = list(string)
  }))
  default = [
    {
      name    = "engineering"
      members = ["alice", "bob"]
    },
    {
      name    = "platform"
      members = ["charlie", "diana"]
    }
  ]
}

locals {
  # Flatten to one entry per team-member pair
  team_memberships = flatten([
    for team in var.teams : [
      for member in team.members : {
        team_name   = team.name
        member_name = member
      }
    ]
  ])

  # Convert to a map for for_each
  team_membership_map = {
    for tm in local.team_memberships :
    "${tm.team_name}-${tm.member_name}" => tm
  }
}

resource "aws_iam_group_membership" "this" {
  for_each = local.team_membership_map

  name  = each.key
  group = each.value.team_name
  users = [each.value.member_name]
}
```

## Converting Data Source Results

Data sources often return lists. Convert them for `for_each`:

```hcl
# Data source returns a list of subnet IDs
data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }
  tags = {
    Tier = "private"
  }
}

# Convert the list of IDs to a set
resource "aws_route_table_association" "private" {
  for_each = toset(data.aws_subnets.private.ids)

  subnet_id      = each.key
  route_table_id = aws_route_table.private.id
}
```

## Converting Complex Data Pipelines

Sometimes you need multiple transformation steps:

```hcl
variable "applications" {
  type = list(object({
    name         = string
    environments = list(string)
    port         = number
  }))
  default = [
    {
      name         = "api"
      environments = ["dev", "staging", "production"]
      port         = 8080
    },
    {
      name         = "web"
      environments = ["dev", "production"]
      port         = 3000
    }
  ]
}

locals {
  # Step 1: Flatten to one entry per app-environment pair
  app_envs = flatten([
    for app in var.applications : [
      for env in app.environments : {
        app_name = app.name
        env      = env
        port     = app.port
        key      = "${app.name}-${env}"
      }
    ]
  ])

  # Step 2: Convert to map
  app_env_map = {
    for item in local.app_envs : item.key => item
  }

  # Step 3 (optional): Filter
  production_apps = {
    for key, item in local.app_env_map : key => item
    if item.env == "production"
  }
}

resource "aws_ecs_service" "this" {
  for_each = local.app_env_map

  name          = each.key
  desired_count = each.value.env == "production" ? 3 : 1
  # ...
}
```

## Quick Reference

| Source Type | Conversion Method | Result |
|---|---|---|
| `list(string)` | `toset(var.list)` | `set(string)` |
| `list(number)` | `toset([for n in var.list : tostring(n)])` | `set(string)` |
| `list(object)` | `{ for item in var.list : item.key => item }` | `map(object)` |
| Nested lists | `flatten()` then `{ for ... }` | `map(object)` |
| Data source list | `toset(data.source.ids)` | `set(string)` |

## Summary

Converting lists to sets or maps is a routine task when working with `for_each` in Terraform. Use `toset()` for simple string lists, `for` expressions with key selection for lists of objects, and `flatten()` plus `for` for nested structures. Always choose a map key that is unique and stable - it becomes the resource identifier in Terraform state. When in doubt, compute the conversion in a local and reference the local from `for_each`.

For more on `for_each`, see our posts on [using for_each with maps](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-for-each-meta-argument-with-maps-in-terraform/view) and [using for_each with sets](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-for-each-meta-argument-with-sets-in-terraform/view).
