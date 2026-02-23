# How to Use the setsubtract Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, Terraform Functions, Set Functions

Description: Learn how to use the setsubtract function in Terraform to find elements in one set that are not in another, with practical examples for diff calculations and exclusions.

---

Knowing what is in one group but not in another is a fundamental operation for infrastructure management. The `setsubtract` function in Terraform computes the difference between two sets - it returns elements that are in the first set but not in the second. This is invaluable for finding missing tags, identifying resources to remove, computing exclusion lists, and detecting configuration drift.

This guide covers the `setsubtract` function, its behavior, and practical use cases for real Terraform projects.

## What is the setsubtract Function?

The `setsubtract` function takes two sets and returns a new set containing the elements from the first set that are not in the second set.

```hcl
# Returns elements in set_a that are NOT in set_b
setsubtract(set_a, set_b)
```

This is also known as the set difference or relative complement.

## Basic Usage in Terraform Console

```hcl
# Elements in first set but not in second
> setsubtract(["a", "b", "c", "d"], ["b", "d"])
toset(["a", "c"])

# No overlap - returns first set entirely
> setsubtract(["a", "b"], ["c", "d"])
toset(["a", "b"])

# Complete overlap - returns empty set
> setsubtract(["a", "b"], ["a", "b"])
toset([])

# Subtracting empty set returns original set
> setsubtract(["a", "b", "c"], [])
toset(["a", "b", "c"])

# Subtracting from empty set returns empty
> setsubtract([], ["a", "b"])
toset([])

# Works with numbers
> setsubtract([1, 2, 3, 4, 5], [2, 4])
toset([1, 3, 5])
```

The operation is not commutative: `setsubtract(A, B)` is not the same as `setsubtract(B, A)`.

## Finding Missing Required Tags

One of the most practical uses is checking which required tags are missing from a resource.

```hcl
variable "required_tags" {
  type    = set(string)
  default = ["Environment", "Team", "CostCenter", "Project", "Owner"]
}

variable "actual_tags" {
  type = map(string)
  default = {
    Environment = "production"
    Team        = "platform"
    Owner       = "john"
  }
}

locals {
  provided_tag_keys = toset(keys(var.actual_tags))

  # Find which required tags are missing
  missing_tags = setsubtract(var.required_tags, local.provided_tag_keys)
  # toset(["CostCenter", "Project"])

  # Find extra tags (not in required list)
  extra_tags = setsubtract(local.provided_tag_keys, var.required_tags)
  # toset(["Owner"]) - wait, Owner IS required. Let me recalculate.
  # Actually: toset([]) since all provided tags are in required list
}

output "tag_audit" {
  value = {
    required = var.required_tags
    provided = local.provided_tag_keys
    missing  = local.missing_tags
    is_compliant = length(local.missing_tags) == 0
  }
}
```

## Resource Cleanup Detection

Identify resources that should be removed because they are no longer in the desired configuration.

```hcl
variable "desired_instances" {
  type    = set(string)
  default = ["web-1", "web-2", "api-1"]
}

variable "existing_instances" {
  type    = set(string)
  default = ["web-1", "web-2", "web-3", "api-1", "legacy-app"]
}

locals {
  # Instances to remove (exist but not desired)
  to_remove = setsubtract(var.existing_instances, var.desired_instances)
  # toset(["legacy-app", "web-3"])

  # Instances to create (desired but don't exist)
  to_create = setsubtract(var.desired_instances, var.existing_instances)
  # toset([]) - all desired instances already exist

  # Instances to keep (both desired and existing)
  to_keep = setintersection(var.desired_instances, var.existing_instances)
  # toset(["api-1", "web-1", "web-2"])
}

output "reconciliation" {
  value = {
    create = local.to_create
    remove = local.to_remove
    keep   = local.to_keep
  }
}
```

## CIDR Block Exclusion

Compute which CIDR blocks need to be added to or removed from a security group.

```hcl
variable "current_allowed_cidrs" {
  type    = set(string)
  default = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "203.0.113.0/24"]
}

variable "new_allowed_cidrs" {
  type    = set(string)
  default = ["10.0.0.0/8", "172.16.0.0/12", "198.51.100.0/24"]
}

locals {
  # CIDRs to add (in new but not in current)
  cidrs_to_add = setsubtract(var.new_allowed_cidrs, var.current_allowed_cidrs)
  # toset(["198.51.100.0/24"])

  # CIDRs to remove (in current but not in new)
  cidrs_to_remove = setsubtract(var.current_allowed_cidrs, var.new_allowed_cidrs)
  # toset(["192.168.0.0/16", "203.0.113.0/24"])
}

output "security_group_changes" {
  value = {
    adding   = local.cidrs_to_add
    removing = local.cidrs_to_remove
  }
}
```

## Permission Auditing

Find which permissions a role has that it should not, or which it is missing.

```hcl
variable "allowed_permissions" {
  type    = set(string)
  default = [
    "s3:GetObject",
    "s3:PutObject",
    "s3:ListBucket",
    "ec2:DescribeInstances",
    "ec2:DescribeVpcs",
  ]
}

variable "current_permissions" {
  type    = set(string)
  default = [
    "s3:GetObject",
    "s3:PutObject",
    "s3:DeleteObject",
    "ec2:DescribeInstances",
    "ec2:TerminateInstances",
  ]
}

locals {
  # Permissions that should be revoked (have but shouldn't)
  excess_permissions = setsubtract(var.current_permissions, var.allowed_permissions)
  # toset(["ec2:TerminateInstances", "s3:DeleteObject"])

  # Permissions that are missing (should have but don't)
  missing_permissions = setsubtract(var.allowed_permissions, var.current_permissions)
  # toset(["ec2:DescribeVpcs", "s3:ListBucket"])
}

output "permission_audit" {
  value = {
    excess  = local.excess_permissions
    missing = local.missing_permissions
    correct = length(local.excess_permissions) == 0 && length(local.missing_permissions) == 0
  }
}
```

## Exclusion-Based Resource Selection

Sometimes it is easier to define what to exclude than what to include.

```hcl
variable "all_regions" {
  type    = set(string)
  default = [
    "us-east-1", "us-east-2", "us-west-1", "us-west-2",
    "eu-west-1", "eu-west-2", "eu-central-1",
    "ap-southeast-1", "ap-northeast-1",
  ]
}

variable "excluded_regions" {
  type    = set(string)
  default = ["us-east-2", "us-west-1", "eu-west-2"]
}

locals {
  # Deploy to all regions except excluded ones
  deployment_regions = setsubtract(var.all_regions, var.excluded_regions)
}

resource "aws_s3_bucket" "regional" {
  for_each = local.deployment_regions

  bucket = "app-data-${each.key}"

  tags = {
    Region = each.key
  }
}
```

## Comparing setsubtract with Other Approaches

You can achieve similar results with `for` expressions, but `setsubtract` is more concise.

```hcl
locals {
  all_items  = toset(["a", "b", "c", "d", "e"])
  exclusions = toset(["b", "d"])

  # Using setsubtract - clean and direct
  result_ss = setsubtract(local.all_items, local.exclusions)
  # toset(["a", "c", "e"])

  # Using for expression - more verbose
  result_for = toset([
    for item in local.all_items : item
    if !contains(local.exclusions, item)
  ])
  # toset(["a", "c", "e"])
}
```

`setsubtract` is clearly more readable when the logic is simply "everything except these."

## The Set Function Family

Here is how all three set functions relate:

```hcl
locals {
  set_a = toset(["a", "b", "c"])
  set_b = toset(["b", "c", "d"])

  # What's in both?
  intersection = setintersection(local.set_a, local.set_b)
  # toset(["b", "c"])

  # What's only in A?
  only_in_a = setsubtract(local.set_a, local.set_b)
  # toset(["a"])

  # What's only in B?
  only_in_b = setsubtract(local.set_b, local.set_a)
  # toset(["d"])

  # All combinations?
  product = setproduct(local.set_a, local.set_b)
  # 9 combinations
}
```

For more on the other set functions, see [How to Use the setintersection Function in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-setintersection-function-in-terraform/view) and [How to Use the setproduct Function in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-setproduct-function-in-terraform/view).

## Using setsubtract in Variable Validation

```hcl
variable "selected_services" {
  type = set(string)

  validation {
    condition = length(setsubtract(
      var.selected_services,
      toset(["api", "web", "worker", "scheduler", "cache"])
    )) == 0
    error_message = "Only valid service names are: api, web, worker, scheduler, cache."
  }
}
```

This validation ensures that no unknown service names are provided. If someone passes `["api", "unknown"]`, the `setsubtract` result would contain `"unknown"`, making the length non-zero and the validation fails.

## Edge Cases

- **Order does not matter for inputs**: Sets are unordered, so `setsubtract(["b", "a"], ["a"])` gives the same result as `setsubtract(["a", "b"], ["a"])`.
- **Subtracting a superset**: If the second set contains all elements of the first, the result is empty.
- **The result is a set**: No duplicates, no guaranteed order. Use `tolist` if you need a list.
- **Not commutative**: `setsubtract(A, B)` is different from `setsubtract(B, A)`.

```hcl
# Not commutative
> setsubtract(["a", "b", "c"], ["b"])
toset(["a", "c"])

> setsubtract(["b"], ["a", "b", "c"])
toset([])
```

## Summary

The `setsubtract` function computes the difference between two sets, returning elements present in the first set but absent from the second. It is essential for reconciliation, drift detection, exclusion logic, and compliance auditing.

Key takeaways:

- `setsubtract(A, B)` returns elements in A that are not in B
- The operation is not commutative
- Returns a set (unordered, no duplicates)
- Perfect for finding missing tags, excess permissions, and resources to clean up
- Pairs with `setintersection` for complete set analysis
- Use in validation blocks to check that inputs are within allowed values
- Subtracting an empty set returns the original set

Whenever you need to answer "what is in group A but not group B," `setsubtract` is your function.
