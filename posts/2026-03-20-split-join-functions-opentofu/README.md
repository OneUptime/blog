# How to Use the split and join Functions in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Split, Join, String Function, HCL, Infrastructure as Code, DevOps

Description: Learn how to use the split and join functions in OpenTofu to convert between strings and lists, splitting on delimiters and joining collections back to strings.

---

`split()` divides a string into a list at each occurrence of a separator, and `join()` combines a list of strings into a string with a specified separator between elements. Together they let you transform between string and list representations.

---

## Syntax

```hcl
split(separator, string)
join(separator, list)
```

---

## Basic Examples

```hcl
locals {
  # split: string → list
  example1 = split(",", "a,b,c,d")          # ["a", "b", "c", "d"]
  example2 = split("/", "us/east/production") # ["us", "east", "production"]
  example3 = split(".", "api.example.com")   # ["api", "example", "com"]

  # join: list of strings → string
  example4 = join(", ", ["red", "green", "blue"])  # "red, green, blue"
  example5 = join("/", ["us", "east", "production"]) # "us/east/production"
  example6 = join("", ["a", "b", "c"])             # "abc"
}
```

---

## Parsing CSV Input

```hcl
variable "allowed_ips_csv" {
  type    = string
  default = "10.0.0.1,10.0.0.2,10.0.0.3"
}

locals {
  # Convert CSV string to a list
  allowed_ips = split(",", var.allowed_ips_csv)
}

resource "aws_vpc_security_group_ingress_rule" "allow_ips" {
  count             = length(local.allowed_ips)
  security_group_id = aws_security_group.app.id

  cidr_ipv4   = "${local.allowed_ips[count.index]}/32"
  from_port   = 443
  ip_protocol = "tcp"
  to_port     = 443
}
```

---

## Building Comma-Separated Lists for AWS

```hcl
variable "subnet_ids" {
  type    = list(string)
  default = ["subnet-111", "subnet-222", "subnet-333"]
}

locals {
  # Some AWS resources accept subnet IDs as a comma-separated string
  subnet_list_str = join(",", var.subnet_ids)
  # "subnet-111,subnet-222,subnet-333"
}
```

---

## Domain Name Manipulation

```hcl
variable "subdomain" {
  type    = string
  default = "api.v2"
}

variable "base_domain" {
  type    = string
  default = "example.com"
}

locals {
  # Build the full hostname
  full_hostname = join(".", concat(split(".", var.subdomain), split(".", var.base_domain)))
  # ["api", "v2"] + ["example", "com"] = ["api", "v2", "example", "com"]
  # → "api.v2.example.com"
}
```

---

## Creating Tags from a List

```hcl
variable "owners" {
  type    = list(string)
  default = ["alice", "bob", "charlie"]
}

resource "aws_s3_bucket" "app" {
  bucket = "myapp-data"

  tags = {
    # Join the list into a single tag value
    Owners = join(", ", var.owners)
    # "alice, bob, charlie"
  }
}
```

---

## Path Manipulation

```hcl
variable "key_path" {
  type    = string
  default = "environments/production/database/password"
}

locals {
  # Split path into components
  path_parts   = split("/", var.key_path)
  environment  = local.path_parts[1]   # "production"
  service      = local.path_parts[2]   # "database"

  # Rebuild a path without the last component
  parent_path = join("/", slice(local.path_parts, 0, length(local.path_parts) - 1))
  # "environments/production/database"
}
```

---

## Summary

`split(sep, str)` converts a string to a list by splitting at each separator occurrence. `join(sep, list)` converts a list of strings back to a string with the separator between each element. Together they are powerful tools for parsing CSV inputs, building AWS resource identifier strings, manipulating paths, and constructing complex names from parts. Combine with `concat()`, `slice()`, and other list functions for full string-list transformations.
