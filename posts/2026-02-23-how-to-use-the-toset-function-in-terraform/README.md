# How to Use the toset Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, DevOps, Terraform Functions, Type Conversion

Description: Learn how to use the toset function in Terraform to convert lists into sets for use with for_each, deduplication, and set operations in your configurations.

---

If you have used `for_each` in Terraform, you have almost certainly used `toset`. It is one of the most frequently used type conversion functions because `for_each` requires either a map or a set - it does not accept plain lists. Beyond `for_each`, `toset` is also handy for deduplication and as input to set operation functions.

## What is toset?

The `toset` function converts a list (or other collection) into a set. Sets have two key properties: they contain only unique values, and they are unordered.

```hcl
# Convert a list to a set
> toset(["b", "a", "c", "a"])
toset([
  "a",
  "b",
  "c",
])
```

Notice two things happened: the duplicate `"a"` was removed, and the elements were sorted (sets in Terraform display in lexicographic order).

## The Primary Use Case: for_each

The number one reason people use `toset` is to make a list work with `for_each`:

```hcl
variable "bucket_names" {
  type    = list(string)
  default = ["logs", "artifacts", "backups"]
}

# for_each requires a map or set, not a list
resource "aws_s3_bucket" "main" {
  for_each = toset(var.bucket_names)

  bucket = "${var.project}-${each.value}"

  tags = {
    Name = each.value
  }
}
```

Without the `toset` call, Terraform would throw an error saying that `for_each` does not support list values.

When you use `toset` with `for_each`, both `each.key` and `each.value` contain the same value (the set element):

```hcl
resource "aws_s3_bucket" "main" {
  for_each = toset(["logs", "artifacts"])

  # each.key   = "logs" (or "artifacts")
  # each.value = "logs" (or "artifacts")
  # They are the same for sets
  bucket = each.value
}
```

## Deduplication

The second most common use is removing duplicates from a list:

```hcl
variable "all_regions" {
  type = list(string)
  default = [
    "us-east-1",    # Team A
    "us-west-2",    # Team A
    "us-east-1",    # Team B (duplicate)
    "eu-west-1",    # Team B
    "us-west-2",    # Team C (duplicate)
  ]
}

locals {
  # Remove duplicates
  unique_regions = toset(var.all_regions)
  # Result: toset(["eu-west-1", "us-east-1", "us-west-2"])
}

# Deploy to each unique region exactly once
resource "aws_s3_bucket" "regional" {
  for_each = local.unique_regions

  provider = aws.by_region[each.value]
  bucket   = "my-app-${each.value}"
}
```

## Input for Set Operations

Terraform's set functions (`setunion`, `setintersection`, `setsubtract`) work with sets. If your data starts as lists, convert them first:

```hcl
variable "team_a_access" {
  type    = list(string)
  default = ["s3", "ec2", "rds", "lambda"]
}

variable "team_b_access" {
  type    = list(string)
  default = ["s3", "dynamodb", "lambda", "sqs"]
}

locals {
  # Convert lists to sets for set operations
  a_set = toset(var.team_a_access)
  b_set = toset(var.team_b_access)

  # Find services both teams can access
  shared_access = setintersection(local.a_set, local.b_set)
  # Result: toset(["lambda", "s3"])

  # Find services only Team A can access
  a_only = setsubtract(local.a_set, local.b_set)
  # Result: toset(["ec2", "rds"])

  # All services across both teams
  all_access = setunion(local.a_set, local.b_set)
  # Result: toset(["dynamodb", "ec2", "lambda", "rds", "s3", "sqs"])
}
```

## Creating Multiple IAM Users

A classic `for_each` pattern:

```hcl
variable "iam_users" {
  type    = list(string)
  default = ["alice", "bob", "carol", "dave"]
}

resource "aws_iam_user" "users" {
  for_each = toset(var.iam_users)

  name = each.value
  path = "/team/"

  tags = {
    ManagedBy = "terraform"
  }
}

# Reference specific users
output "alice_arn" {
  value = aws_iam_user.users["alice"].arn
}
```

This is much better than using `count` because if you remove a user from the middle of the list, Terraform will only destroy that specific user instead of recreating all subsequent ones.

## Creating Multiple Security Group Rules

```hcl
variable "allowed_ports" {
  type    = list(number)
  default = [22, 80, 443, 8080, 8443]
}

resource "aws_security_group_rule" "ingress" {
  for_each = toset([for port in var.allowed_ports : tostring(port)])

  type              = "ingress"
  from_port         = tonumber(each.value)
  to_port           = tonumber(each.value)
  protocol          = "tcp"
  cidr_blocks       = ["10.0.0.0/8"]
  security_group_id = aws_security_group.main.id
  description       = "Allow port ${each.value}"
}
```

Note the `tostring` conversion - `toset` for `for_each` typically requires string elements because Terraform uses them as resource identifiers.

## toset with Conditional Logic

```hcl
variable "enable_monitoring" {
  type    = bool
  default = true
}

variable "monitoring_targets" {
  type    = list(string)
  default = ["web", "api", "database"]
}

# Only create monitoring resources if enabled
resource "aws_cloudwatch_metric_alarm" "health" {
  for_each = var.enable_monitoring ? toset(var.monitoring_targets) : toset([])

  alarm_name = "${each.value}-health-check"
  # ... other configuration
}
```

## toset Removes Duplicates Silently

This is important to understand - `toset` will not warn you about duplicates:

```hcl
> toset(["a", "b", "a", "c", "b"])
toset([
  "a",
  "b",
  "c",
])
```

If you need to detect duplicates (maybe they indicate a configuration error), check the length before and after:

```hcl
variable "instance_names" {
  type = list(string)
}

# Validate no duplicate names
locals {
  unique_names = toset(var.instance_names)
  has_duplicates = length(var.instance_names) != length(local.unique_names)
}

# This will fail validation if there are duplicates
resource "null_resource" "validate" {
  count = local.has_duplicates ? "Duplicate instance names detected" : 0
}
```

Or use a validation block:

```hcl
variable "instance_names" {
  type = list(string)

  validation {
    condition     = length(var.instance_names) == length(toset(var.instance_names))
    error_message = "Instance names must be unique."
  }
}
```

## toset vs distinct

Both remove duplicates, but they return different types:

```hcl
# distinct returns a list (preserves order of first occurrence)
> distinct(["c", "a", "b", "a"])
[
  "c",
  "a",
  "b",
]

# toset returns a set (sorted, unordered)
> toset(["c", "a", "b", "a"])
toset([
  "a",
  "b",
  "c",
])
```

Use `distinct` when you need a list with preserved ordering. Use `toset` when you need a set (for `for_each` or set operations).

## Working with Numbers

Sets can contain numbers too, but remember that `for_each` requires string sets:

```hcl
# Number set
> toset([3, 1, 4, 1, 5])
toset([
  1,
  3,
  4,
  5,
])

# For for_each, convert numbers to strings
resource "aws_security_group_rule" "ports" {
  for_each = toset([for p in [80, 443, 8080] : tostring(p)])

  type      = "ingress"
  from_port = tonumber(each.value)
  to_port   = tonumber(each.value)
  protocol  = "tcp"
  # ...
}
```

## Edge Cases

```hcl
# Empty list becomes empty set
> toset([])
toset([])

# Single element
> toset(["only"])
toset([
  "only",
])

# Already a set - returns as-is
> toset(toset(["a", "b"]))
toset([
  "a",
  "b",
])
```

## Summary

The `toset` function is essential Terraform knowledge. You will use it constantly with `for_each` to create multiple resources from a list, for deduplication, and as preparation for set operations. The key things to remember are that sets are unordered (so do not rely on element positions) and they automatically remove duplicates. For the reverse conversion, see the [tolist function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-tolist-function-in-terraform/view), and for working with set operations, check out [setunion](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-setunion-function-in-terraform/view).
