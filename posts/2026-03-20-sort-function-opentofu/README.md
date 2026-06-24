# How to Use the sort Function in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Sort, List Functions, HCL, Infrastructure as Code, DevOps

Description: Learn how to use the sort function in OpenTofu to sort a list of strings in lexicographic (alphabetical) order.

---

`sort()` takes a list of strings and returns a new list with the elements sorted lexicographically by Unicode code point. It only works on lists of strings.

---

## Syntax

```hcl
sort(list_of_strings)
```

---

## Basic Examples

```hcl
locals {
  unsorted = ["banana", "apple", "cherry", "date"]
  sorted   = sort(local.unsorted)
  # ["apple", "banana", "cherry", "date"]

  mixed_case = ["Banana", "apple", "Cherry"]
  sorted_mixed = sort(local.mixed_case)
  # ["Banana", "Cherry", "apple"]
  # Uppercase Latin letters sort before lowercase Latin letters in Unicode code point order
}
```

---

## Sorting Tags for Consistent Plans

```hcl
variable "tags" {
  type = map(string)
}

locals {
  # Sort tag keys for consistent, readable output
  sorted_tag_keys = sort(keys(var.tags))
}

output "sorted_tags" {
  value = { for k in local.sorted_tag_keys : k => var.tags[k] }
}
```

---

## Normalizing Security Group Rule Order

```hcl
variable "allowed_ips" {
  type    = list(string)
  default = ["10.0.0.3", "10.0.0.1", "10.0.0.2"]
}

locals {
  # Sort IPs so the plan is consistent regardless of input order
  sorted_ips = sort(var.allowed_ips)
}

resource "aws_vpc_security_group_ingress_rule" "allow" {
  count             = length(local.sorted_ips)
  security_group_id = aws_security_group.app.id
  cidr_ipv4         = "${local.sorted_ips[count.index]}/32"
  from_port         = 443
  ip_protocol       = "tcp"
  to_port           = 443
}
```

---

## Descending Sort

`sort()` only sorts ascending. For descending order, use `reverse(sort(list))`:

```hcl
variable "versions" {
  type    = list(string)
  default = ["v1.2", "v2.0", "v1.0", "v1.1"]
}

locals {
  ascending  = sort(var.versions)
  # ["v1.0", "v1.1", "v1.2", "v2.0"]

  descending = reverse(sort(var.versions))
  # ["v2.0", "v1.2", "v1.1", "v1.0"]

  latest = reverse(sort(var.versions))[0]
  # "v2.0" for this sample input; this is lexicographic, not semantic version sorting
}
```

---

## Sorting Subnet IDs for Consistent Configuration

```hcl
variable "subnet_ids" {
  type    = list(string)
  default = ["subnet-xyz", "subnet-abc", "subnet-mno"]
}

resource "aws_lb" "app" {
  name     = "app-lb"
  internal = false

  # Sort for consistent plan diffs when subnet list order changes
  subnets  = sort(var.subnet_ids)
}
```

---

## Deterministic Output from Sets

Sets in OpenTofu are unordered. For sets of strings, use `sort(tolist(my_set))` to get a consistently ordered list:

```hcl
resource "aws_security_group" "app" {
  name = "app-sg"
}

locals {
  # Convert set to sorted list for deterministic output
  sg_ids_sorted = sort(tolist(toset([
    aws_security_group.app.id,
    "sg-existing-1",
    "sg-existing-2",
  ])))
}
```

---

## Summary

`sort(list)` returns a lexicographically sorted list of strings. Use it to normalize the order of resource name lists, IP address lists, and tag keys so that plans are consistent even when input order varies. For descending order, use `reverse(sort(list))`. Sorting is only supported for lists of strings; OpenTofu does not provide a custom comparator for `sort()`, and converting numbers to strings sorts them lexicographically rather than numerically.
