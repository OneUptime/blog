# How to Use the distinct Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Distinct, List Functions, HCL, Infrastructure as Code, DevOps

Description: Learn how to use the distinct function in OpenTofu to remove duplicate values from a list while preserving order.

---

`distinct()` removes duplicate elements from a list, keeping only the first occurrence of each value and preserving the original order.

---

## Syntax

```hcl
distinct(list)
```

---

## Basic Examples

```hcl
locals {
  with_dupes = ["a", "b", "a", "c", "b", "d"]
  deduped    = distinct(local.with_dupes)
  # ["a", "b", "c", "d"]

  numbers    = [1, 2, 1, 3, 2, 4]
  unique_nums = distinct(local.numbers)
  # [1, 2, 3, 4]
}
```

---

## Deduplicating Security Group IDs

```hcl
variable "primary_sgs" {
  type    = list(string)
  default = ["sg-111", "sg-222"]
}

variable "extra_sgs" {
  type    = list(string)
  default = ["sg-222", "sg-333"]   # sg-222 is a duplicate
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"

  # distinct removes the duplicate sg-222
  vpc_security_group_ids = distinct(concat(var.primary_sgs, var.extra_sgs))
  # ["sg-111", "sg-222", "sg-333"]
}
```

---

## Combining Multiple Instance ID Lists

```hcl
module "web" {
  source = "./modules/instance"
  # ...
}

module "api" {
  source = "./modules/instance"
  # ...
}

locals {
  # Collect all instance IDs, deduplicating shared instances
  all_instance_ids = distinct(concat(
    module.web.instance_ids,
    module.api.instance_ids
  ))
}
```

---

## Deduplicating with a for Expression

```hcl
variable "services" {
  type = list(object({
    name   = string
    region = string
  }))
  default = [
    { name = "web",  region = "us-east-1" },
    { name = "api",  region = "us-east-1" },
    { name = "jobs", region = "us-west-2" },
  ]
}

locals {
  # Get unique regions from the services list
  unique_regions = distinct([for s in var.services : s.region])
  # ["us-east-1", "us-west-2"]
}
```

---

## distinct vs toset

```hcl
locals {
  with_dupes = ["a", "b", "a", "c"]

  # distinct: returns a list (ordered, first occurrence kept)
  as_distinct = distinct(local.with_dupes)
  # ["a", "b", "c"]

  # toset: returns a set (unordered, all unique)
  as_set = toset(local.with_dupes)
  # toset(["a", "b", "c"]) - order not guaranteed
}
```

Use `distinct()` when you need a list with preserved order. Use `toset()` when order doesn't matter and you want a set type (e.g., for `for_each`).

---

## Summary

`distinct(list)` removes duplicate values from a list, keeping only the first occurrence of each value and maintaining order. Use it when combining multiple lists that may have overlapping values - like merging security group IDs from different sources, collecting unique regions from service configs, or deduplicating tag lists. For unordered deduplication, `toset()` is an alternative.
