# How to Use the strcontains Function in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Strcontains, String Function, HCL, Infrastructure as Code, DevOps

Description: Learn how to use the strcontains function in OpenTofu to check whether a string contains a specific substring.

---

The `strcontains()` function returns `true` if a string contains the specified substring, and `false` otherwise. It is case-sensitive.

---

## Syntax

```hcl
strcontains(string, substr)
```

---

## Basic Examples

```hcl
locals {
  example1 = strcontains("hello world", "world")    # true
  example2 = strcontains("hello world", "xyz")      # false
  example3 = strcontains("production-db", "prod")   # true
  example4 = strcontains("MyApp", "myapp")          # false (case-sensitive)
  example5 = strcontains("", "anything")            # false
}
```

---

## Conditional Logic Based on String Content

```hcl
variable "instance_type" {
  type    = string
  default = "m5.large"
}

locals {
  # Check if it's a burstable instance type
  is_burstable = (
    strcontains(var.instance_type, "t2.") ||
    strcontains(var.instance_type, "t3.") ||
    strcontains(var.instance_type, "t3a.") ||
    strcontains(var.instance_type, "t4g.")
  )

  # Check for selected compute-optimized instance families
  is_compute_optimized = strcontains(var.instance_type, "c5.") || strcontains(var.instance_type, "c6i.")
}

resource "aws_cloudwatch_metric_alarm" "cpu_burst" {
  count               = local.is_burstable ? 1 : 0
  alarm_name          = "cpu-credit-balance"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUCreditBalance"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 20
  # ... only created for burstable instances
}
```

---

## Filtering Resources by Tag Value

```hcl
variable "environments" {
  type = map(object({
    instance_type = string
    tags          = map(string)
  }))
}

locals {
  # Find environments tagged as "critical"
  critical_envs = {
    for name, config in var.environments :
    name => config
    if strcontains(lookup(config.tags, "tier", ""), "critical")
  }
}
```

---

## Validation Using strcontains

```hcl
variable "s3_bucket_name" {
  type = string

  validation {
    condition     = !strcontains(var.s3_bucket_name, "_")
    error_message = "S3 bucket names cannot contain underscores."
  }
}

variable "iam_role_name" {
  type = string

  validation {
    condition     = !strcontains(var.iam_role_name, " ")
    error_message = "IAM role names cannot contain spaces."
  }
}
```

---

## strcontains vs Other String Checks

| Check | Function |
|---|---|
| Contains substring | `strcontains(s, substr)` |
| Starts with prefix | `startswith(s, prefix)` |
| Ends with suffix | `endswith(s, suffix)` |
| Matches regex | `can(regex(pattern, s))` |
| Is equal | `s == "value"` |

---

## Case-Insensitive Check

`strcontains()` is case-sensitive. For case-insensitive checks, convert both strings to the same case first:

```hcl
locals {
  name = "Production-Database"

  # Case-insensitive check
  has_prod = strcontains(lower(local.name), "production")
  # true
}
```

---

## Summary

`strcontains(string, substr)` returns `true` if the string contains the given substring (case-sensitive). Use it in conditional expressions, variable validation, and filtering collections. For case-insensitive matching, wrap both arguments with `lower()`. Prefer `startswith()` and `endswith()` when you need to check specifically at the beginning or end of a string.
