# How to Use the signum Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Signum Function, Math, HCL, Infrastructure as Code, Numeric Functions

Description: Learn how to use the signum function in Terraform to determine the sign of a number and apply it for conditional logic based on numeric direction or polarity.

---

The `signum` function is one of those mathematical tools that seems trivial until you find the right use case for it. It returns the sign of a number: -1 for negative, 0 for zero, and 1 for positive. In Terraform, this turns out to be surprisingly handy for conditional logic based on numeric comparisons and for normalizing directional values.

## What Is the signum Function?

The `signum` function takes a single number and returns its sign indicator:

```hcl
# signum(number)
# Returns -1, 0, or 1 based on the sign of the number
signum(-15)  # Returns: -1
signum(0)    # Returns: 0
signum(42)   # Returns: 1
```

The function always returns exactly one of three values: -1, 0, or 1.

## Exploring in terraform console

```hcl
# Launch with: terraform console

# Positive numbers always return 1
> signum(1)
1
> signum(100)
1
> signum(0.001)
1

# Negative numbers always return -1
> signum(-1)
-1
> signum(-100)
-1
> signum(-0.001)
-1

# Zero returns 0
> signum(0)
0

# Works with expressions
> signum(10 - 5)
1

> signum(5 - 10)
-1

> signum(5 - 5)
0

# Floating point
> signum(3.14)
1

> signum(-2.718)
-1
```

## Detecting Scaling Direction

One practical use of `signum` is determining whether a scaling operation is scaling up, scaling down, or staying the same:

```hcl
variable "current_instances" {
  type    = number
  default = 5
}

variable "target_instances" {
  type    = number
  default = 8
}

locals {
  change = var.target_instances - var.current_instances
  direction = signum(local.change)

  direction_label = (
    local.direction == 1  ? "scaling up" :
    local.direction == -1 ? "scaling down" :
    "no change"
  )

  action_required = local.direction != 0
}

output "scaling_info" {
  value = {
    current   = var.current_instances
    target    = var.target_instances
    change    = local.change
    direction = local.direction_label
    action    = local.action_required
  }
}
```

## Conditional Resource Creation Based on Comparison

The `signum` function can drive resource creation based on whether one value exceeds another:

```hcl
variable "current_storage_gb" {
  type    = number
  default = 80
}

variable "threshold_gb" {
  type    = number
  default = 100
}

locals {
  # signum returns 1 if current exceeds threshold, 0 if equal, -1 if below
  over_threshold = signum(var.current_storage_gb - var.threshold_gb)

  # Create an alert only if we are at or over the threshold
  needs_alert = local.over_threshold >= 0 ? 1 : 0
}

resource "aws_cloudwatch_metric_alarm" "storage" {
  count = local.needs_alert

  alarm_name          = "storage-critical"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "DiskUsage"
  namespace           = "Custom/Storage"
  period              = 300
  statistic           = "Average"
  threshold           = var.threshold_gb
  alarm_description   = "Storage usage has reached the threshold"
}
```

## Normalizing Direction for Display

When showing users the direction of a change, `signum` normalizes the magnitude away:

```hcl
variable "budget_spent" {
  type    = number
  default = 4500
}

variable "budget_limit" {
  type    = number
  default = 5000
}

locals {
  budget_remaining = var.budget_limit - var.budget_spent
  budget_status = signum(local.budget_remaining)

  status_message = (
    local.budget_status == 1  ? "Under budget by $${abs(local.budget_remaining)}" :
    local.budget_status == 0  ? "Exactly at budget limit" :
    "Over budget by $${abs(local.budget_remaining)}"
  )
}

output "budget" {
  value = local.status_message
}
```

## Three-Way Branching

The `signum` function effectively gives you a three-way branch on a comparison, which is cleaner than nested conditionals:

```hcl
variable "environment_tier" {
  type    = number
  default = 2  # 1=dev, 2=staging, 3=prod
  description = "1 for dev, 2 for staging, 3 for production"
}

locals {
  # Compare with the staging tier (2)
  tier_comparison = signum(var.environment_tier - 2)

  instance_type = (
    local.tier_comparison == -1 ? "t3.small"   :  # Below staging -> dev
    local.tier_comparison == 0  ? "t3.medium"  :  # Staging
    "t3.large"                                     # Above staging -> prod
  )

  replica_count = (
    local.tier_comparison == -1 ? 1 :  # Dev: single instance
    local.tier_comparison == 0  ? 2 :  # Staging: basic HA
    3                                   # Prod: full HA
  )
}

output "tier_config" {
  value = {
    tier          = var.environment_tier
    instance_type = local.instance_type
    replicas      = local.replica_count
  }
}
```

## Capacity Delta Tracking

When tracking changes over time, `signum` helps categorize the direction of change without worrying about magnitude:

```hcl
variable "metrics" {
  type = map(object({
    previous = number
    current  = number
  }))
  default = {
    cpu_usage      = { previous = 65, current = 72 }
    memory_usage   = { previous = 80, current = 80 }
    disk_usage     = { previous = 45, current = 38 }
    network_in     = { previous = 100, current = 150 }
  }
}

locals {
  # Categorize each metric's trend
  metric_trends = {
    for name, values in var.metrics : name => {
      previous  = values.previous
      current   = values.current
      delta     = values.current - values.previous
      direction = signum(values.current - values.previous)
      trend = (
        signum(values.current - values.previous) == 1  ? "increasing" :
        signum(values.current - values.previous) == -1 ? "decreasing" :
        "stable"
      )
    }
  }

  # Count metrics by trend direction
  increasing_count = length([
    for name, trend in local.metric_trends :
    name if trend.direction == 1
  ])
  stable_count = length([
    for name, trend in local.metric_trends :
    name if trend.direction == 0
  ])
  decreasing_count = length([
    for name, trend in local.metric_trends :
    name if trend.direction == -1
  ])
}

output "trend_summary" {
  value = {
    trends     = local.metric_trends
    increasing = local.increasing_count
    stable     = local.stable_count
    decreasing = local.decreasing_count
  }
}
```

## Priority Ordering

You can use `signum` to implement comparison-based sorting logic:

```hcl
variable "service_a_priority" {
  type    = number
  default = 100
}

variable "service_b_priority" {
  type    = number
  default = 200
}

locals {
  # Determine which service should be primary
  priority_comparison = signum(var.service_a_priority - var.service_b_priority)

  primary_service = (
    local.priority_comparison <= 0 ? "service_a" : "service_b"
  )
  # Lower number = higher priority, so service_a is primary
}

output "service_order" {
  value = {
    primary   = local.primary_service
    secondary = local.primary_service == "service_a" ? "service_b" : "service_a"
  }
}
```

## Version Comparison

When comparing version components:

```hcl
variable "required_major_version" {
  type    = number
  default = 3
}

variable "actual_major_version" {
  type    = number
  default = 4
}

locals {
  version_status = signum(var.actual_major_version - var.required_major_version)

  compatibility = (
    local.version_status == -1 ? "outdated"   :
    local.version_status == 0  ? "exact_match" :
    "newer_than_required"
  )
}

output "version_check" {
  value = {
    required      = var.required_major_version
    actual        = var.actual_major_version
    compatibility = local.compatibility
  }
}
```

## Building Dynamic Tags Based on State

Use `signum` to generate tags that reflect the current state:

```hcl
variable "target_count" {
  type    = number
  default = 10
}

variable "actual_count" {
  type    = number
  default = 7
}

locals {
  gap = var.target_count - var.actual_count
  gap_direction = signum(local.gap)

  state_tag = (
    local.gap_direction == 1  ? "under-provisioned" :
    local.gap_direction == 0  ? "at-target" :
    "over-provisioned"
  )
}

resource "aws_autoscaling_group" "example" {
  # ... configuration ...
  name             = "example-asg"
  min_size         = 1
  max_size         = 20
  desired_capacity = var.actual_count

  tag {
    key                 = "ProvisioningState"
    value               = local.state_tag
    propagate_at_launch = false
  }

  tag {
    key                 = "CapacityGap"
    value               = tostring(abs(local.gap))
    propagate_at_launch = false
  }
}
```

## Summary

The `signum` function reduces any number to its sign: -1, 0, or 1. This makes it a clean tool for three-way branching based on numeric comparisons. Instead of writing nested conditionals that check `> 0`, `== 0`, and `< 0`, you can use `signum` with a single ternary chain. It is particularly useful for detecting scaling direction, categorizing metric trends, determining budget status, and any scenario where you care about the direction of a change but not its magnitude.

For more Terraform numeric functions, see our posts on the [abs function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-abs-function-in-terraform/view) and the [max function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-max-function-in-terraform/view).
