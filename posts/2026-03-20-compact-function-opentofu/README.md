# How to Use the compact Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Compact, List Functions, HCL, Infrastructure as Code, DevOps

Description: Learn how to use the compact function in OpenTofu to remove null and empty string values from a list of strings.

---

`compact()` takes a list of strings and returns a new list with all null and empty string values (`""`) removed. It's a simple way to clean up optional or conditionally-populated lists.

---

## Syntax

```hcl
compact(list_of_strings)
```

Returns the input list with null values and empty strings removed. Works only on lists of strings.

---

## Basic Examples

```hcl
locals {
  with_empty = ["a", "", "b", null, "c", ""]
  cleaned    = compact(local.with_empty)
  # ["a", "b", "c"]

  all_empty  = ["", null, ""]
  result     = compact(local.all_empty)
  # []
}
```

---

## Conditional Optional Arguments

The most common use: build a list where some items are optional (empty string means omit):

```hcl
variable "extra_role_arn" {
  type    = string
  default = ""   # empty = not provided
}

variable "admin_role_arn" {
  type    = string
  default = ""
}

locals {
  base_roles = ["arn:aws:iam::123456789012:role/ReadOnlyRole"]

  # Conditionally include optional roles
  all_roles = compact(concat(
    local.base_roles,
    [var.extra_role_arn],      # "" if not set
    [var.admin_role_arn],      # "" if not set
  ))
  # If extra_role_arn = "" and admin_role_arn = "arn:aws:iam::123456789012:role/AdminRole"
  # Result: ["arn:aws:iam::123456789012:role/ReadOnlyRole", "arn:aws:iam::123456789012:role/AdminRole"]
}
```

---

## Cleaning Optional Tag Lists

```hcl
variable "additional_tags_csv" {
  type    = string
  default = ""
}

locals {
  # Split CSV, then compact to remove empty strings from leading/trailing commas
  additional_tags = compact(split(",", var.additional_tags_csv))
  # "tag1,tag2," → split → ["tag1", "tag2", ""] → compact → ["tag1", "tag2"]
}
```

---

## Building Security Group Rules Conditionally

```hcl
variable "admin_ip" {
  type    = string
  default = ""   # empty = no admin access
}

variable "monitoring_ip" {
  type    = string
  default = ""
}

locals {
  admin_cidr      = var.admin_ip != "" ? "${var.admin_ip}/32" : ""
  monitoring_cidr = var.monitoring_ip != "" ? "${var.monitoring_ip}/32" : ""

  # compact removes empty strings - only non-empty CIDRs remain
  management_cidrs = compact([local.admin_cidr, local.monitoring_cidr])
}

resource "aws_security_group_rule" "management" {
  count = length(local.management_cidrs) > 0 ? 1 : 0

  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = local.management_cidrs
  security_group_id = aws_security_group.app.id
}
```

---

## Collecting Optional Outputs from Modules

```hcl
module "app" {
  source = "./modules/app"
  count  = 3
}

locals {
  # Module outputs might be empty strings for disabled resources
  all_endpoints = compact([for m in module.app : m.endpoint])
  # Removes empty string endpoints from disabled module instances
}
```

---

## compact vs filter with for expression

```hcl
locals {
  items = ["a", "", "b", null, "c"]

  # Using compact (cleaner for simple null/empty removal)
  with_compact = compact(local.items)

  # Using for expression (more flexible)
  with_for = [for item in local.items : item if item != null && item != ""]
}
```

Use `compact()` for simple null/empty removal. Use a for expression when you need to filter on more complex conditions.

---

## Summary

`compact(list)` removes all null values and empty strings from a list of strings, returning only non-empty values. It's most useful for cleaning up optionally-populated lists where disabled or unspecified items produce empty strings. Common patterns include building optional CIDR lists, collecting optional role ARNs, and cleaning CSV-split results. For numeric lists or complex filtering conditions, use a for expression with `if` instead.
