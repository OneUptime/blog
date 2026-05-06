# How to Use the coalescelist Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Coalescelist, List Functions, HCL, Infrastructure as Code, DevOps

Description: Learn how to use the coalescelist function in OpenTofu to return the first non-empty list from a set of candidates.

---

`coalescelist()` takes multiple list arguments and returns the first one that is non-empty. This is the list counterpart to `coalesce()` when you're working with list values.

---

## Syntax

```hcl
coalescelist(list1, list2, ...)
```

Returns the first list argument that has one or more elements. Throws an error if all arguments are empty.

---

## Basic Examples

```hcl
locals {
  # Returns ["a", "b"] - the first non-empty list
  result1 = coalescelist([], ["a", "b"], ["c"])
  # ["a", "b"]

  # Returns ["first"] - first non-empty
  result2 = coalescelist(["first"], ["second"])
  # ["first"]

  # All empty would error:
  # coalescelist([], [])  → Error
}
```

---

## Fallback Subnet Selection

```hcl
variable "custom_subnet_ids" {
  type    = list(string)
  default = []   # Empty means "use defaults"
}

data "aws_subnets" "default" {
  filter {
    name   = "default-for-az"
    values = ["true"]
  }
}

locals {
  # Use custom subnets if provided, otherwise fall back to defaults
  subnet_ids = coalescelist(
    var.custom_subnet_ids,
    data.aws_subnets.default.ids
  )
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  subnet_id     = local.subnet_ids[0]
}
```

---

## Security Group Fallback

```hcl
variable "custom_security_groups" {
  type    = list(string)
  default = []
}

locals {
  default_security_groups = [aws_security_group.default.id]

  # Use custom SGs if specified, otherwise use the default
  active_security_groups = coalescelist(
    var.custom_security_groups,
    local.default_security_groups
  )
}
```

---

## Multiple Fallback Levels

```hcl
variable "prod_cidrs" {
  type    = list(string)
  default = []
}

variable "staging_cidrs" {
  type    = list(string)
  default = []
}

locals {
  fallback_cidrs = ["10.0.0.0/8"]

  # Try prod first, then staging, then fall back to default
  active_cidrs = coalescelist(
    var.prod_cidrs,
    var.staging_cidrs,
    local.fallback_cidrs
  )
}
```

---

## coalescelist vs coalesce

| Function | For | Returns First |
|---|---|---|
| `coalesce(val1, val2, ...)` | Scalars/strings | First value that isn't null, or first non-empty string |
| `coalescelist(list1, list2, ...)` | Lists | Non-empty list |

```hcl
locals {
  # coalesce for strings
  name = coalesce(var.custom_name, "default-name")

  # coalescelist for lists
  ids = coalescelist(var.custom_ids, local.default_ids)
}
```

---

## Providing a Fallback Collection for for_each

```hcl
variable "optional_resources" {
  type    = list(string)
  default = []
}

locals {
  # If you want a fallback value for for_each, convert the chosen list to a set
  resources = toset(coalescelist(var.optional_resources, ["placeholder"]))
  # Don't use "placeholder" as a real resource - this is for illustration
}
```

---

## Summary

`coalescelist(list1, list2, ...)` returns the first non-empty list from its arguments. Use it to implement fallback logic for list-type variables - if a user doesn't provide subnets, fall back to defaults; if custom security groups aren't specified, use the default ones. It's the list counterpart to `coalesce()` when you're working with list values.
