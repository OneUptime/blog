# How to Use the floor Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, floor Function, Math, HCL, Infrastructure as Code, Numeric Functions

Description: Learn how to use the floor function in Terraform to round numbers down to the nearest integer for budget-aware infrastructure sizing and resource allocation.

---

Sometimes in Terraform you need to round a number down instead of up. Maybe you are working within a budget constraint and cannot overshoot, or you need to divide resources conservatively. The `floor` function rounds a number down to the largest integer that is less than or equal to the input, and it is the counterpart to `ceil`.

## What Is the floor Function?

The `floor` function takes a numeric value and returns the largest integer that is less than or equal to it. Put simply, it always rounds toward negative infinity.

```hcl
# floor(number)
# Rounds down to nearest integer
floor(4.9)  # Returns: 4
floor(4.1)  # Returns: 4
floor(4.0)  # Returns: 4
floor(-4.1) # Returns: -5
```

## Trying It Out in terraform console

```hcl
# Launch with: terraform console

# Fractional numbers round down
> floor(3.7)
3

> floor(3.2)
3

> floor(3.999)
3

# Whole numbers stay the same
> floor(5)
5

> floor(0)
0

# Negative numbers round toward negative infinity
> floor(-1.1)
-2

> floor(-1.9)
-2

# Very small positive fractions
> floor(0.99)
0

# Division results
> floor(10 / 3)
3

> floor(7 / 2)
3
```

## Budget-Constrained Instance Sizing

When you have a fixed budget, `floor` ensures you do not exceed it:

```hcl
variable "monthly_budget" {
  type    = number
  default = 500  # dollars
}

variable "instance_cost_per_month" {
  type    = number
  default = 73  # t3.medium on-demand, approximate
}

locals {
  # How many instances can we afford?
  max_affordable = floor(var.monthly_budget / var.instance_cost_per_month)
  # 500 / 73 = 6.85 -> floor = 6 instances
  estimated_cost = local.max_affordable * var.instance_cost_per_month
}

resource "aws_instance" "worker" {
  count         = local.max_affordable
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"

  tags = {
    Name = "worker-${count.index}"
  }
}

output "budget_info" {
  value = "Can afford ${local.max_affordable} instances at $${var.instance_cost_per_month}/mo = $${local.estimated_cost} of $${var.monthly_budget} budget"
  # Output: "Can afford 6 instances at $73/mo = $438 of $500 budget"
}
```

Using `ceil` here would give you 7 instances at $511, blowing past your $500 budget.

## Allocating Storage with Reserved Space

When provisioning storage, you might need to reserve a percentage and only use what remains:

```hcl
variable "total_disk_gb" {
  type    = number
  default = 100
}

variable "reserved_percentage" {
  type    = number
  default = 15  # Reserve 15% for system use
}

locals {
  # Calculate usable storage, rounded down to whole GB
  reserved_gb = var.total_disk_gb * (var.reserved_percentage / 100)
  usable_gb   = floor(var.total_disk_gb - local.reserved_gb)
  # 100 - 15 = 85 (exact here, but would round down if fractional)
}

output "storage_allocation" {
  value = "Total: ${var.total_disk_gb} GB, Reserved: ${ceil(local.reserved_gb)} GB, Usable: ${local.usable_gb} GB"
}
```

## Conservative Resource Distribution

When distributing resources across zones and you want to avoid over-provisioning:

```hcl
variable "total_replicas" {
  type    = number
  default = 10
}

variable "num_zones" {
  type    = number
  default = 3
}

locals {
  # Conservative per-zone allocation
  base_per_zone = floor(var.total_replicas / var.num_zones)
  # 10 / 3 = 3.33 -> floor = 3 per zone

  remainder = var.total_replicas - (local.base_per_zone * var.num_zones)
  # 10 - 9 = 1 remainder

  # Distribute remainder to first N zones
  zone_allocations = [
    for i in range(var.num_zones) :
    local.base_per_zone + (i < local.remainder ? 1 : 0)
  ]
  # Result: [4, 3, 3] = 10 total
}

output "zone_distribution" {
  value = "Distribution: ${join(", ", local.zone_allocations)} = ${sum(local.zone_allocations)} total"
}
```

This is a better approach than using `ceil` per zone because `ceil(10/3) = 4` per zone would give you 12 total, which is more than the 10 you wanted.

## Converting Units Conservatively

When converting between units and you want to be conservative:

```hcl
variable "memory_mb" {
  type    = number
  default = 3500
}

locals {
  # Convert to GB, rounding down (conservative estimate)
  memory_gb = floor(var.memory_mb / 1024)
  # 3500 / 1024 = 3.42 -> floor = 3 GB
}

output "memory" {
  value = "${var.memory_mb} MB = ${local.memory_gb} GB (conservative)"
}
```

## Calculating Retention Periods

When computing retention periods with partial results:

```hcl
variable "storage_limit_gb" {
  type    = number
  default = 50
}

variable "daily_log_size_gb" {
  type    = number
  default = 3.5
}

locals {
  # How many full days of logs can we retain?
  retention_days = floor(var.storage_limit_gb / var.daily_log_size_gb)
  # 50 / 3.5 = 14.28 -> floor = 14 days
  storage_used = local.retention_days * var.daily_log_size_gb
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/app/logs"
  retention_in_days = local.retention_days

  tags = {
    StorageUsed = "${local.storage_used} GB of ${var.storage_limit_gb} GB"
  }
}

output "retention_info" {
  value = "Can retain ${local.retention_days} full days of logs (${local.storage_used} GB used)"
}
```

## Rate Limiting Calculations

When setting up rate limits, `floor` ensures you do not exceed the allowed rate:

```hcl
variable "requests_per_minute" {
  type    = number
  default = 100
}

locals {
  # Convert to per-second rate, rounded down to be conservative
  requests_per_second = floor(var.requests_per_minute / 60)
  # 100 / 60 = 1.67 -> floor = 1 per second

  # For burst allowance, use the minute rate divided into 10-second windows
  burst_per_10s = floor(var.requests_per_minute / 6)
  # 100 / 6 = 16.67 -> floor = 16 per 10-second window
}

output "rate_limits" {
  value = {
    per_second    = local.requests_per_second
    per_10_seconds = local.burst_per_10s
    per_minute    = var.requests_per_minute
  }
}
```

## Chunk Size Calculations

When breaking data into chunks for parallel processing:

```hcl
variable "total_records" {
  type    = number
  default = 1000
}

variable "num_workers" {
  type    = number
  default = 7
}

locals {
  # Base chunk size (floor ensures no worker gets too much)
  chunk_size = floor(var.total_records / var.num_workers)
  # 1000 / 7 = 142.86 -> floor = 142

  remainder = var.total_records - (local.chunk_size * var.num_workers)
  # 1000 - 994 = 6 remaining records

  # Worker allocations
  worker_loads = [
    for i in range(var.num_workers) :
    local.chunk_size + (i < local.remainder ? 1 : 0)
  ]
  # First 6 workers get 143, last worker gets 142
}

output "worker_distribution" {
  value = {
    chunk_size   = local.chunk_size
    remainder    = local.remainder
    worker_loads = local.worker_loads
  }
}
```

## Downscaling Percentages

When scaling down resources by a percentage, `floor` ensures you do not keep more than intended:

```hcl
variable "current_instances" {
  type    = number
  default = 20
}

variable "scale_down_percentage" {
  type    = number
  default = 30  # Reduce by 30%
}

locals {
  # Calculate how many instances to keep
  keep_fraction = 1 - (var.scale_down_percentage / 100)
  target_instances = floor(var.current_instances * local.keep_fraction)
  # 20 * 0.7 = 14 (exact here, but floor handles fractional results)

  # Ensure we keep at least 1
  final_instances = max(local.target_instances, 1)
}

output "scaling_plan" {
  value = "Scaling down from ${var.current_instances} to ${local.final_instances} instances (${var.scale_down_percentage}% reduction)"
}
```

## floor vs ceil - Choosing the Right One

The decision between `floor` and `ceil` depends on what matters more - not exceeding a limit, or meeting a minimum:

```hcl
locals {
  value = 7.5

  # Use floor when you must NOT exceed a limit
  # Example: staying within budget, not exceeding quota
  conservative = floor(local.value)  # 7

  # Use ceil when you must MEET a minimum
  # Example: enough capacity, enough instances
  generous = ceil(local.value)  # 8
}
```

As a rule of thumb: use `floor` for constraints and budgets, use `ceil` for requirements and capacity.

## Combining floor with Modulo

The `floor` function and the modulo operator work together naturally for division-with-remainder problems:

```hcl
variable "items" {
  type    = number
  default = 47
}

variable "containers" {
  type    = number
  default = 5
}

locals {
  items_per_container = floor(var.items / var.containers)
  leftover            = var.items % var.containers

  container_contents = [
    for i in range(var.containers) :
    local.items_per_container + (i < local.leftover ? 1 : 0)
  ]
}

output "packing" {
  value = "Packed ${var.items} items into ${var.containers} containers: ${join(", ", local.container_contents)}"
  # Output: "Packed 47 items into 5 containers: 10, 10, 9, 9, 9"
}
```

## Summary

The `floor` function rounds numbers down to the nearest integer, and it is the right tool when overshooting is worse than undershooting. Use it for budget calculations, conservative resource allocation, rate limiting, and any scenario where exceeding a limit would be problematic. Remember that for negative numbers, `floor` rounds toward negative infinity (so `floor(-2.3)` is `-3`), and whole numbers pass through unchanged. Pair `floor` with `max` to enforce minimums, and compare it with `ceil` for the complementary "always round up" behavior.

For more Terraform math functions, check out our guides on the [ceil function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-ceil-function-in-terraform/view) and the [pow function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-pow-function-in-terraform/view).
