# How to Use the transpose Function in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Transpose, Map Function, HCL, Infrastructure as Code, DevOps

Description: Learn how to use the transpose function in OpenTofu to invert a map of lists, swapping keys and values.

---

`transpose()` takes a map where each value is a list of strings and inverts it - the strings in the value lists become new keys, and each new key maps to a list of the original keys that contained it.

---

## Syntax

```hcl
transpose(map_of_lists)
```

Input: `map(list(string))`
Output: `map(list(string))` - inverted

---

## Basic Example

```hcl
locals {
  user_roles = {
    alice   = ["admin", "developer"]
    bob     = ["developer"]
    charlie = ["admin", "viewer"]
  }

  # Transpose: get a map of role → users with that role
  role_users = transpose(local.user_roles)
  # {
  #   "admin"     = ["alice", "charlie"]
  #   "developer" = ["alice", "bob"]
  #   "viewer"    = ["charlie"]
  # }
}
```

---

## IAM: From User→Policies to Policy→Users

```hcl
variable "user_policies" {
  type = map(list(string))
  default = {
    alice = ["ReadOnly", "S3Admin"]
    bob   = ["ReadOnly"]
    carol = ["ReadOnly", "EC2Admin", "S3Admin"]
  }
}

variable "policy_arns" {
  type = map(string)
  default = {
    ReadOnly = "arn:aws:iam::aws:policy/ReadOnlyAccess"
    S3Admin  = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
    EC2Admin = "arn:aws:iam::aws:policy/AmazonEC2FullAccess"
  }
}

locals {
  # Invert: which users need each policy?
  policy_users = transpose(var.user_policies)
  # {
  #   "ReadOnly"  = ["alice", "bob", "carol"]
  #   "S3Admin"   = ["alice", "carol"]
  #   "EC2Admin"  = ["carol"]
  # }

  policy_user_pairs = flatten([
    for policy, users in local.policy_users : [
      for user in users : {
        policy = policy
        user   = user
      }
    ]
  ])
}

# Create one attachment per policy/user pair

resource "aws_iam_user_policy_attachment" "attachments" {
  for_each = {
    for pair in local.policy_user_pairs :
    "${pair.policy}-${pair.user}" => pair
  }

  user       = each.value.user
  policy_arn = var.policy_arns[each.value.policy]
}
```

---

## Availability Zone to Subnet Mapping

```hcl
variable "az_subnets" {
  type = map(list(string))
  default = {
    "us-east-1a" = ["subnet-111", "subnet-222"]
    "us-east-1b" = ["subnet-333", "subnet-444"]
    "us-east-1c" = ["subnet-555"]
  }
}

locals {
  # Invert: which AZs does each subnet belong to?
  subnet_to_az = transpose(var.az_subnets)
  # {
  #   "subnet-111" = ["us-east-1a"]
  #   "subnet-222" = ["us-east-1a"]
  #   "subnet-333" = ["us-east-1b"]
  #   ...
  # }
}
```

---

## Tag-Based Resource Grouping

```hcl
variable "resource_tags" {
  type = map(list(string))
  description = "Map of resource name to its tag values"
  default = {
    "web-server-1"  = ["web", "frontend", "prod"]
    "web-server-2"  = ["web", "frontend", "prod"]
    "api-server-1"  = ["api", "backend", "prod"]
    "db-server-1"   = ["database", "backend", "prod"]
  }
}

locals {
  # Get all resources grouped by tag
  tag_resources = transpose(var.resource_tags)
  # {
  #   "web"      = ["web-server-1", "web-server-2"]
  #   "frontend" = ["web-server-1", "web-server-2"]
  #   "prod"     = ["web-server-1", "web-server-2", "api-server-1", "db-server-1"]
  #   ...
  # }
}
```

---

## When to Use transpose

`transpose()` is useful when:
- You have data organized by one dimension and need it organized by another
- You want to invert a many-to-many relationship
- You need to group items by a shared category

It's less commonly needed than other map functions, but provides clean solutions for specific inversion problems.

---

## Summary

`transpose(map_of_lists)` inverts a map where values are lists of strings. Each string from the value lists becomes a key in the output map, and each new key maps to a list of the original keys that contained it. This is useful for restructuring data when you need the inverse relationship - for example, converting "user → roles" to "role → users", or "AZ → subnets" to "subnet → AZ".
