# How to Use the setunion Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, DevOps, Terraform Functions, Collections

Description: Learn how to use the setunion function in Terraform to combine multiple sets into one, removing duplicates and simplifying your infrastructure configurations.

---

If you have worked with Terraform long enough, you have probably run into situations where you need to merge lists of values from different sources while ensuring there are no duplicates. Maybe you are combining security group rules, merging allowed IP ranges, or aggregating tags from multiple modules. This is exactly where the `setunion` function becomes useful.

## What is setunion?

The `setunion` function takes two or more sets (or lists) and returns a single set that contains every unique element from all the input sets. It performs the mathematical union operation - if an element appears in any of the input sets, it will appear exactly once in the output.

The basic syntax looks like this:

```hcl
# setunion takes two or more sets and returns all unique elements
setunion(set1, set2, ...)
```

You can test this quickly in the Terraform console:

```hcl
# Combine two sets with overlapping values
> setunion(["a", "b", "c"], ["b", "c", "d"])
toset([
  "a",
  "b",
  "c",
  "d",
])
```

Notice that `"b"` and `"c"` appeared in both sets but only show up once in the result. That is the core behavior of a union operation.

## Understanding the Return Type

One important detail: `setunion` always returns a **set**, not a list. Sets in Terraform are unordered collections of unique values. This means:

1. The order of elements in the output is not guaranteed
2. Duplicate values are automatically removed
3. You cannot index into the result like you would with a list

```hcl
# The return type is always a set
> type(setunion(["a", "b"], ["c"]))
set of string
```

If you need the result as a list (for example, to use with `count` or to maintain ordering), you can wrap it with `tolist`:

```hcl
# Convert the set result to a list
> tolist(setunion(["a", "b"], ["c", "d"]))
tolist([
  "a",
  "b",
  "c",
  "d",
])
```

## Practical Example: Merging Security Group CIDR Blocks

One of the most common uses of `setunion` is combining CIDR blocks from different sources for security group rules.

```hcl
# Define CIDR blocks from different teams or environments
variable "office_cidrs" {
  type    = set(string)
  default = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "vpn_cidrs" {
  type    = set(string)
  default = ["10.0.2.0/24", "172.16.0.0/16"]
}

variable "monitoring_cidrs" {
  type    = set(string)
  default = ["10.0.3.0/24"]
}

# Combine all CIDR blocks into one set - duplicates are removed automatically
locals {
  all_allowed_cidrs = setunion(
    var.office_cidrs,
    var.vpn_cidrs,
    var.monitoring_cidrs
  )
}

# Use the combined set in a security group rule
resource "aws_security_group_rule" "allow_inbound" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = tolist(local.all_allowed_cidrs)
  security_group_id = aws_security_group.main.id
}
```

In this example, `10.0.2.0/24` appears in both `office_cidrs` and `vpn_cidrs`, but the resulting set only includes it once. This prevents duplicate security group rules that could cause confusion or errors.

## Using setunion with More Than Two Sets

The function accepts any number of arguments, so you can merge as many sets as you need in a single call:

```hcl
# Merge multiple tag sets from different modules
locals {
  # Tags from different sources
  team_tags      = ["monitoring", "alerting", "logging"]
  project_tags   = ["infrastructure", "monitoring", "security"]
  compliance_tags = ["audit", "security", "gdpr"]
  env_tags       = ["production", "critical"]

  # Combine all tags into one unique set
  all_tags = setunion(
    local.team_tags,
    local.project_tags,
    local.compliance_tags,
    local.env_tags
  )
}

# Result: toset(["alerting", "audit", "critical", "gdpr",
#   "infrastructure", "logging", "monitoring", "production", "security"])
```

## Using setunion with Dynamic Data

You can also use `setunion` with data that comes from data sources or other resources:

```hcl
# Fetch existing subnets
data "aws_subnets" "private" {
  filter {
    name   = "tag:Type"
    values = ["private"]
  }
}

data "aws_subnets" "database" {
  filter {
    name   = "tag:Type"
    values = ["database"]
  }
}

# Combine subnet IDs from multiple queries
locals {
  all_internal_subnets = setunion(
    toset(data.aws_subnets.private.ids),
    toset(data.aws_subnets.database.ids)
  )
}
```

## setunion vs concat

People sometimes confuse `setunion` with `concat`. Here is the difference:

```hcl
# concat preserves duplicates and order
> concat(["a", "b"], ["b", "c"])
[
  "a",
  "b",
  "b",
  "c",
]

# setunion removes duplicates and returns a set
> setunion(["a", "b"], ["b", "c"])
toset([
  "a",
  "b",
  "c",
])
```

Use `concat` when you want to keep duplicates and ordering. Use `setunion` when you want unique values only.

## setunion with for_each

Since `setunion` returns a set, it works naturally with `for_each`:

```hcl
variable "dev_regions" {
  default = ["us-east-1", "us-west-2"]
}

variable "prod_regions" {
  default = ["us-east-1", "eu-west-1", "ap-southeast-1"]
}

# Create an S3 bucket in every unique region across both environments
resource "aws_s3_bucket" "logs" {
  for_each = setunion(var.dev_regions, var.prod_regions)

  bucket = "my-logs-${each.value}"

  tags = {
    Region = each.value
  }
}
```

This creates buckets in `us-east-1`, `us-west-2`, `eu-west-1`, and `ap-southeast-1` - with no duplicate for `us-east-1` even though it appeared in both variables.

## Edge Cases to Watch For

There are a few things to keep in mind when working with `setunion`:

**Empty sets are valid inputs:**
```hcl
# An empty set simply adds nothing to the union
> setunion(["a", "b"], [])
toset([
  "a",
  "b",
])
```

**All elements must be the same type:**
```hcl
# This will cause an error because you cannot mix strings and numbers
# setunion(["a", "b"], [1, 2])  # Error!
```

**Single argument is allowed:**
```hcl
# With a single argument, it just converts to a set
> setunion(["a", "b", "a"])
toset([
  "a",
  "b",
])
```

## Combining setunion with Other Set Functions

Terraform provides several set functions that work well together. You can use `setunion` alongside `setintersection` and `setsubtract` for more advanced logic:

```hcl
locals {
  # All environments that need monitoring
  monitored_envs = setunion(["staging", "production"], ["production", "dr"])

  # Environments that are in both lists (just production in this case)
  shared_envs = setintersection(["staging", "production"], ["production", "dr"])

  # Environments unique to the first set
  staging_only = setsubtract(["staging", "production"], ["production", "dr"])
}
```

## Summary

The `setunion` function is a straightforward but powerful tool for combining collections in Terraform. It is particularly useful when you need to aggregate values from multiple sources - like CIDR blocks, regions, tags, or any other list of values - while guaranteeing uniqueness. Remember that it always returns a set, so wrap it in `tolist` if you need list behavior downstream. If you are working with infrastructure that pulls configuration from multiple modules or variables, `setunion` will help keep your configurations clean and duplicate-free.

For more Terraform function guides, check out our posts on [setintersection](https://oneuptime.com/blog/post/2026-02-23-how-to-use-setintersection-to-find-common-elements-in-terraform/view) and [zipmap](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-zipmap-function-in-terraform/view).
