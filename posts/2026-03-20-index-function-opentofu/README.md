# How to Use the index Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Index, List Functions, HCL, Infrastructure as Code, DevOps

Description: Learn how to use the index function in OpenTofu to find the position of a value within a list.

---

`index()` searches a list for a given value and returns its position (zero-based). If the value is not found, it throws an error. Use `contains()` to check first if the value might not be present.

---

## Syntax

```hcl
index(list, value)
```

---

## Basic Examples

```hcl
locals {
  fruits  = ["apple", "banana", "cherry", "date"]

  apple_pos  = index(local.fruits, "apple")   # 0
  cherry_pos = index(local.fruits, "cherry")  # 2

  # ERROR if value not found:
  # index(local.fruits, "mango")  → Error: value not found
}
```

---

## Finding Availability Zone Index

```hcl
variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "preferred_az" {
  type    = string
  default = "us-east-1b"
}

locals {
  # Find the index of the preferred AZ
  preferred_az_index = index(var.availability_zones, var.preferred_az)
  # 1

  # Use the index to select the corresponding subnet
  preferred_subnet_id = aws_subnet.app[local.preferred_az_index].id
}
```

---

## Safe Index Lookup

Since `index()` errors when the value isn't found, check with `contains()` first:

```hcl
variable "supported_regions" {
  type    = list(string)
  default = ["us-east-1", "us-west-2", "eu-west-1"]
}

variable "deploy_region" {
  type = string
}

locals {
  # Safe lookup - check first
  region_supported = contains(var.supported_regions, var.deploy_region)
  region_index     = local.region_supported ? index(var.supported_regions, var.deploy_region) : -1
}

output "region_index" {
  value = local.region_index
}
```

---

## Building a Value-to-Index Map

```hcl
variable "instance_types" {
  type    = list(string)
  default = ["t3.micro", "t3.small", "t3.medium"]
}

locals {
  # Build a map of instance type to index
  type_to_index = { for i, t in var.instance_types : t => i }
  # { "t3.micro" = 0, "t3.small" = 1, "t3.medium" = 2 }
}
```

---

## Assigning List-Based Priority Values

```hcl
variable "ordered_regions" {
  type    = list(string)
  default = ["us-east-1", "eu-west-1", "ap-southeast-1"]
}

# Create a map of region to priority (lower index = higher priority)

locals {
  region_priority = {
    for region in var.ordered_regions :
    region => index(var.ordered_regions, region)
  }
  # { "us-east-1" = 0, "eu-west-1" = 1, "ap-southeast-1" = 2 }
}
```

---

## index vs element

| Function | Direction | On Missing |
|---|---|---|
| `index(list, value)` | value → position | Error |
| `element(list, index)` | position → value | Wraps cyclically |

You can combine them as `element(list, index(list, v)) == v` when `v` is in the list. In most cases, use the built-in index syntax `list[index]`; `element()` is mainly useful for wrap-around behavior.

---

## Summary

`index(list, value)` returns the zero-based position of a value in a list. Use it to find the position of a known value - such as the index of a preferred availability zone in a list of zones, or to map values to their ordinal positions. Always use `contains()` first to guard against the error thrown when the value isn't found. For the reverse operation (position to value), use `list[index]` in most cases, or `element()` if you specifically want wrap-around behavior.
