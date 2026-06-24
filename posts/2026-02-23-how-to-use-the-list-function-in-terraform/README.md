# How to Use the list Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, Terraform Functions, Collection Functions

Description: Learn about the list function in Terraform, its deprecation in favor of tolist and list expressions, and how to construct lists properly in modern Terraform.

---

If you have been working with Terraform for a while, you may have come across references to the `list` function. This function was used in older versions of Terraform (0.11 and earlier) to construct lists. However, it is no longer available in Terraform 0.12 and later, replaced by native list/tuple expressions using square bracket syntax and the `tolist` function when an explicit list value is required.

This post covers the history of the `list` function, why it was removed, what replaced it, and how to properly work with lists in modern Terraform.

## The Original list Function

In Terraform 0.11 and earlier, the `list` function was the way to create a list from individual values.

```hcl
# Old Terraform 0.11 syntax (DEPRECATED)

# list("a", "b", "c")
# This would produce ["a", "b", "c"]
```

This function took any number of arguments and returned them as a list. Each argument became an element in the resulting list.

## Why Was list Removed?

Terraform 0.12 introduced first-class support for complex types and expressions. With this change, list/tuple literals using square bracket syntax became the standard way to write sequential values. The `list` function became redundant.

```hcl
# Terraform 0.12+ syntax - use this instead
["a", "b", "c"]
```

The square bracket syntax is more readable, more consistent with other languages, and integrates better with Terraform's type system.

## Modern List Construction

In current versions of Terraform, you usually write list values using square brackets. Technically, square brackets produce a tuple value, which Terraform automatically converts to a list when a list type is expected.

```hcl
# String list
locals {
  regions = ["us-east-1", "us-west-2", "eu-west-1"]
}

# Number list
locals {
  ports = [80, 443, 8080]
}

# Boolean list
locals {
  flags = [true, false, true]
}

# List of objects
locals {
  servers = [
    { name = "web-1", type = "t3.micro" },
    { name = "web-2", type = "t3.small" },
  ]
}

# Empty list
locals {
  empty = []
}
```

## The tolist Function

While the `list` function is no longer available, the `tolist` function is alive and well. It converts a set or tuple into a list.

```hcl
# Convert a set to a list
> tolist(toset(["b", "a", "c"]))
["a", "b", "c"]

# tolist on an already-list is a no-op
> tolist(["a", "b", "c"])
["a", "b", "c"]
```

The `tolist` function is mainly used when you need to convert a `set` (which has no defined order) or tuple into a list value. When converting a set, the resulting list order is not meaningful, although it is consistent within a particular Terraform run. This comes up when working with `for_each` results and set operations.

## When You Need tolist

Here are the most common situations where `tolist` is necessary.

### Converting a Set to a List

When you have a set and need index-based access, convert it to a list first:

```hcl
variable "instance_names" {
  type    = set(string)
  default = ["web", "api", "worker"]
}

locals {
  # Convert the set to a list for index-based access.
  # Do not rely on the resulting order for long-term stability.
  instance_names_list = tolist(var.instance_names)
}

output "first_instance" {
  value = local.instance_names_list[0]
}
```

### Converting Set Operation Results

Set functions like `setintersection` and `setunion` return sets. Use `tolist` if you need a list-typed value or index access.

```hcl
locals {
  set_a = toset(["us-east-1", "us-west-2", "eu-west-1"])
  set_b = toset(["us-west-2", "eu-west-1", "ap-southeast-1"])

  # setintersection returns a set
  common_set = setintersection(local.set_a, local.set_b)

  # Convert to list if you need a list-typed value or index access
  common_list = tolist(local.common_set)
}
```

## Building Lists Dynamically

Modern Terraform provides several ways to build lists dynamically.

### Using for Expressions

```hcl
variable "instance_count" {
  type    = number
  default = 5
}

locals {
  # Generate a list of instance names
  instance_names = [
    for i in range(var.instance_count) :
    "web-${i + 1}"
  ]
  # Result: ["web-1", "web-2", "web-3", "web-4", "web-5"]
}
```

### Using range

```hcl
locals {
  # Generate a sequence of numbers
  indices = range(5)
  # Result: [0, 1, 2, 3, 4]

  even_numbers = range(0, 10, 2)
  # Result: [0, 2, 4, 6, 8]
}
```

### Using concat

```hcl
locals {
  base_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
  extra_cidrs = ["10.0.3.0/24"]

  all_cidrs = concat(local.base_cidrs, local.extra_cidrs)
  # Result: ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}
```

## Migrating from list() to Modern Syntax

If you are maintaining older Terraform configurations that use the `list` function, here is how to migrate.

```hcl
# Old syntax (Terraform 0.11)
# variable "cidrs" {
#   default = "${list("10.0.1.0/24", "10.0.2.0/24")}"
# }

# New syntax (Terraform 0.12+)
variable "cidrs" {
  type    = list(string)
  default = ["10.0.1.0/24", "10.0.2.0/24"]
}

# Old syntax in locals
# locals {
#   ports = "${list(80, 443, 8080)}"
# }

# New syntax in locals
locals {
  ports = [80, 443, 8080]
}
```

The migration is usually straightforward: replace `list(...)` with `[...]`. If you specifically need a value of Terraform's `list` type rather than a tuple, use `tolist([...])`.

## Practical Examples with List Construction

Here are some real-world patterns for constructing lists in modern Terraform.

### Conditional List Elements

```hcl
variable "enable_https" {
  type    = bool
  default = true
}

locals {
  # Include HTTPS port only if enabled
  open_ports = concat(
    [80],
    var.enable_https ? [443] : [],
  )
}
```

### Flattening Nested Structures into Lists

```hcl
variable "team_configs" {
  type = map(object({
    members = list(string)
  }))
  default = {
    backend  = { members = ["alice", "bob"] }
    frontend = { members = ["carol", "dave"] }
  }
}

locals {
  all_members = flatten([
    for team, config in var.team_configs :
    config.members
  ])
  # Result: ["alice", "bob", "carol", "dave"]
}
```

### Typed List Variables

```hcl
variable "allowed_instance_types" {
  type        = list(string)
  description = "EC2 instance types allowed in this environment"
  default     = ["t3.micro", "t3.small", "t3.medium"]
}

variable "port_mappings" {
  type = list(object({
    host_port      = number
    container_port = number
    protocol       = string
  }))
  default = [
    { host_port = 80, container_port = 8080, protocol = "tcp" },
    { host_port = 443, container_port = 8443, protocol = "tcp" },
  ]
}
```

## Common Pitfalls

### Mixing Types in a List

Terraform requires all elements in a list to be the same type or convertible to a common type.

```hcl
# This works - numbers, strings, and booleans can coexist in a tuple
# but the resulting type depends on Terraform's type unification

# This will cause an error if Terraform must convert incompatible values
# to a more specific list type
# variable "numbers" {
#   type    = list(number)
#   default = [1, "two", true]
# }
```

### Set vs List Confusion

Sets and lists look similar but behave differently. Sets have no order and no duplicates.

```hcl
locals {
  # This is a list - order matters, duplicates allowed
  my_list = ["a", "b", "a"]
  # Result: ["a", "b", "a"]

  # This is a set - no order, no duplicates
  my_set = toset(["a", "b", "a"])
  # Result: toset(["a", "b"])
}
```

## Summary

The `list` function is no longer available and should not be used in modern Terraform. Its replacement - square bracket syntax, with `tolist` when an explicit list value is required - is more readable and better integrated with Terraform's type system. The `tolist` function remains useful for converting sets and tuples into lists.

Key takeaways:

- The `list()` function is no longer available in Terraform 0.12 and later
- Use `[...]` square bracket syntax to write sequential values
- Use `tolist()` to convert sets and tuples into lists
- Build dynamic lists with `for` expressions, `range`, `concat`, and `flatten`
- Always specify list types in variable declarations for clarity
- Migrate old `list()` calls to `[...]` syntax when updating configurations

Modern Terraform gives you all the list construction tools you need without the old `list` function.
