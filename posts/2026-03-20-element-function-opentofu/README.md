# How to Use the element Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Element, List Functions, HCL, Infrastructure as Code, DevOps

Description: Learn how to use the element function in OpenTofu to access list items by index with automatic wrapping for cycling through values.

---

`element()` retrieves a single element from a list by index. Unlike direct indexing with `list[n]`, `element()` wraps around cyclically when the index is out of range - this makes it useful for distributing resources across a fixed set of values like availability zones.

---

## Syntax

```hcl
element(list, index)
```

For positive out-of-range indices, `element()` uses the index modulo the list length. `element()` also supports negative indices and produces an error if used with an empty list.

---

## Basic Examples

```hcl
locals {
  zones   = ["us-east-1a", "us-east-1b", "us-east-1c"]

  zone_0  = element(local.zones, 0)   # "us-east-1a"
  zone_1  = element(local.zones, 1)   # "us-east-1b"
  zone_2  = element(local.zones, 2)   # "us-east-1c"

  # Wrapping: index 3 → 3 % 3 = 0
  zone_3  = element(local.zones, 3)   # "us-east-1a"
  zone_4  = element(local.zones, 4)   # "us-east-1b"
  zone_5  = element(local.zones, 5)   # "us-east-1c"
}
```

---

## Distributing Subnets Across Availability Zones

```hcl
variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

resource "aws_subnet" "app" {
  count  = 6   # 6 subnets across 3 AZs

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)

  # element() distributes 6 subnets evenly across 3 AZs (cycling)
  availability_zone = element(var.availability_zones, count.index)
  # 0→1a, 1→1b, 2→1c, 3→1a, 4→1b, 5→1c
}
```

---

## Round-Robin Instance Distribution

```hcl
variable "instance_types" {
  type    = list(string)
  default = ["t3.micro", "t3.small"]
}

resource "aws_instance" "app" {
  count = 5

  ami           = data.aws_ami.amazon_linux.id
  # Cycle through instance types: micro, small, micro, small, micro
  instance_type = element(var.instance_types, count.index)
}
```

---

## element vs Direct Indexing

```hcl
locals {
  list = ["a", "b", "c"]

  # Direct indexing: errors if index out of bounds
  direct = local.list[1]      # "b" - works
  # local.list[10]            # Error: index out of range

  # element: wraps around cyclically
  wrapped = element(local.list, 10)  # "b" (10 % 3 = 1)
}
```

Use `element()` when you want cycling behavior. Use direct indexing `[n]` when you want an error if the index is out of bounds.

---

## Last Element

```hcl
locals {
  items    = ["x", "y", "z"]
  last     = element(local.items, length(local.items) - 1)
  # "z"
}
```

---

## Summary

`element(list, index)` retrieves a list element by index with wrap-around cycling behavior. The cycling makes it ideal for distributing resources across a fixed set of values - placing subnets in availability zones, rotating instance types, or assigning resources to clusters in round-robin fashion. For accessing a specific position without cycling, use direct list indexing `list[n]` which fails with an error if the index is out of bounds.
