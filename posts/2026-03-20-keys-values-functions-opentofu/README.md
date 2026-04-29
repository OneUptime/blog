# How to Use the keys and values Functions in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Key, Value, Map Function, HCL, Infrastructure as Code, DevOps

Description: Learn how to use the keys and values functions in OpenTofu to extract keys or values from a map as sorted lists.

---

`keys()` returns a sorted list of all keys in a map, and `values()` returns a sorted (by key) list of all values. Both return lists in lexicographical key order.

---

## Syntax

```hcl
keys(map)
values(map)
```

---

## Basic Examples

```hcl
locals {
  my_map = {
    bravo   = "B"
    alpha   = "A"
    charlie = "C"
  }

  map_keys   = keys(local.my_map)    # ["alpha", "bravo", "charlie"] (sorted)
  map_values = values(local.my_map)  # ["A", "B", "C"] (sorted by key)
}
```

---

## Getting a Sorted List of Environment Names

```hcl
variable "environments" {
  type = map(object({
    instance_type = string
    min_size      = number
  }))
  default = {
    production = { instance_type = "m5.large",  min_size = 3 }
    staging    = { instance_type = "t3.medium", min_size = 1 }
    dev        = { instance_type = "t3.micro",  min_size = 1 }
  }
}

output "environment_names" {
  value = keys(var.environments)
  # ["dev", "production", "staging"] (lexicographically sorted)
}
```

---

## Iterating Over Map Values with for_each

`values()` is useful when you have a `for_each` resource (which produces a map) and need to use it in a context expecting a list:

```hcl
resource "aws_instance" "app" {
  for_each = tomap({
    web    = "t3.micro"
    api    = "t3.small"
    worker = "t3.medium"
  })

  ami           = data.aws_ami.amazon_linux.id
  instance_type = each.value
}

output "instance_ids" {
  # values() converts the for_each map result to a list
  value = values(aws_instance.app)[*].id
}
```

---

## Validation: Checking Allowed Keys

```hcl
variable "service_ports" {
  type = map(number)
}

locals {
  allowed_services = toset(["http", "https", "grpc", "admin"])
  provided_keys    = toset(keys(var.service_ports))
  unknown_services = setsubtract(local.provided_keys, local.allowed_services)
}

# Note: validation with setsubtract checks for unknown keys

# Use in postcondition or locals for early feedback
```

---

## Converting Map to List for count

```hcl
variable "tag_overrides" {
  type = map(string)
  default = {
    Environment = "production"
    Team        = "platform"
    Project     = "myapp"
  }
}

# When you need each key-value pair as a separate resource
resource "aws_ssm_parameter" "tags" {
  count = length(keys(var.tag_overrides))

  name  = "/app/tags/${keys(var.tag_overrides)[count.index]}"
  type  = "String"
  value = values(var.tag_overrides)[count.index]
}
```

---

## keys vs for expression

```hcl
locals {
  my_map = { a = 1, b = 2, c = 3 }

  # These are equivalent:
  using_keys    = keys(local.my_map)         # ["a", "b", "c"]
  using_for_exp = [for k, v in local.my_map : k]  # ["a", "b", "c"]
}
```

`keys()` is more concise. Use a for expression when you need to transform or filter the keys.

---

## Summary

`keys(map)` returns a lexicographically sorted list of all map keys. `values(map)` returns a list of map values in the same sorted-by-key order. Use `keys()` to get environment names, feature flags, or resource names from a map variable. Use `values()` when you need list access to `for_each` resource results (maps). Both functions always return sorted lists, ensuring consistent ordering across runs.
