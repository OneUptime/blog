# How to Use the log Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Log Function, Math, HCL, Infrastructure as Code, Numeric Functions, Logarithm

Description: Learn how to use the log function in Terraform to calculate logarithms for subnet sizing, capacity planning, and other infrastructure calculations.

---

Logarithms might seem like they belong in a math textbook rather than an infrastructure tool, but the `log` function in Terraform has some surprisingly practical uses. From calculating the number of bits needed for subnet addressing to determining how many levels a binary tree needs, `log` shows up more often than you might expect.

## What Is the log Function?

The `log` function returns the logarithm of a given number in a specified base. The syntax is:

```hcl
# log(number, base)
# Returns the logarithm of number in the given base
log(16, 2)   # Returns: 4 (because 2^4 = 16)
log(1000, 10) # Returns: 3 (because 10^3 = 1000)
```

If you need the natural logarithm (base e), you would use `log(number, 2.718281828459045)`, though this is rarely needed in infrastructure work.

## Exploring in terraform console

```hcl
# Launch with: terraform console

# Base 2 logarithms (most common in infrastructure)
> log(2, 2)
1
> log(4, 2)
2
> log(8, 2)
3
> log(16, 2)
4
> log(256, 2)
8

# Base 10 logarithms
> log(10, 10)
1
> log(100, 10)
2
> log(1000, 10)
3

# Non-integer results
> log(5, 2)
2.321928094887362

> log(50, 10)
1.6989700043360187

# log of 1 is always 0 regardless of base
> log(1, 2)
0
> log(1, 10)
0
```

## Calculating Subnet Bits

The most common use of `log` in Terraform is calculating how many bits you need to create a certain number of subnets. Since subnets are powers of 2, you need to figure out the exponent:

```hcl
variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "desired_subnets" {
  type    = number
  default = 6
}

locals {
  # How many additional bits do we need in the CIDR prefix?
  # log2(6) = 2.58, ceil to 3, which gives us 2^3 = 8 subnet slots
  newbits = ceil(log(var.desired_subnets, 2))

  # Generate subnet CIDRs
  subnet_cidrs = [
    for i in range(var.desired_subnets) :
    cidrsubnet(var.vpc_cidr, local.newbits, i)
  ]
}

output "subnet_info" {
  value = {
    newbits        = local.newbits
    available_slots = pow(2, local.newbits)
    subnet_cidrs   = local.subnet_cidrs
  }
}
# Output:
# newbits = 3
# available_slots = 8
# subnet_cidrs = ["10.0.0.0/19", "10.0.32.0/19", ..., "10.0.160.0/19"]
```

## Determining Partition Count for Messaging

When configuring message queues or Kafka-like systems, the number of partitions is often a power of 2:

```hcl
variable "expected_throughput_mbps" {
  type    = number
  default = 200
}

variable "partition_throughput_mbps" {
  type    = number
  default = 10
}

locals {
  # Calculate minimum partitions needed
  min_partitions = var.expected_throughput_mbps / var.partition_throughput_mbps
  # 200 / 10 = 20

  # Round up to nearest power of 2 for optimal distribution
  partition_bits = ceil(log(local.min_partitions, 2))
  partition_count = pow(2, local.partition_bits)
  # log2(20) = 4.32, ceil = 5, 2^5 = 32 partitions
}

output "kafka_config" {
  value = {
    min_needed      = local.min_partitions
    actual_partitions = local.partition_count
    headroom_pct    = ((local.partition_count - local.min_partitions) / local.min_partitions) * 100
  }
}
```

## Hash Table Sizing

If you are generating configurations that involve hash-based data structures, `log` helps calculate optimal sizes:

```hcl
variable "expected_entries" {
  type    = number
  default = 10000
}

variable "load_factor" {
  type    = number
  default = 0.75
}

locals {
  # Calculate the minimum hash table size for the desired load factor
  raw_size = var.expected_entries / var.load_factor
  # 10000 / 0.75 = 13333.33

  # Round up to next power of 2
  size_bits = ceil(log(local.raw_size, 2))
  table_size = pow(2, local.size_bits)
  # log2(13333) = 13.7, ceil = 14, 2^14 = 16384

  actual_load_factor = var.expected_entries / local.table_size
}

output "hash_config" {
  value = {
    table_size         = local.table_size
    actual_load_factor = local.actual_load_factor
  }
}
```

## Connection Pool Sizing

Logarithmic scaling is a common pattern for connection pools where you want growth to slow as the system gets larger:

```hcl
variable "num_application_instances" {
  type    = number
  default = 50
}

variable "base_connections" {
  type    = number
  default = 5
}

locals {
  # Scale connections logarithmically with instance count
  # More instances means less connections per instance (shared pool)
  connections_per_instance = max(
    1,
    floor(var.base_connections * log(var.num_application_instances, 10))
  )
  # 5 * log10(50) = 5 * 1.7 = 8.5, floor = 8

  total_connections = local.connections_per_instance * var.num_application_instances
}

output "pool_config" {
  value = {
    per_instance     = local.connections_per_instance
    total_connections = local.total_connections
  }
}
```

## Binary Tree Depth

If you are configuring hierarchical structures (like load balancer trees or DNS delegation), `log` tells you the depth:

```hcl
variable "total_leaf_nodes" {
  type    = number
  default = 1000
}

locals {
  # Depth of a balanced binary tree with N leaves
  tree_depth = ceil(log(var.total_leaf_nodes, 2))
  # log2(1000) = 9.97, ceil = 10

  # Maximum nodes at the deepest level
  max_leaves = pow(2, local.tree_depth)
  # 2^10 = 1024
}

output "tree_info" {
  value = {
    depth      = local.tree_depth
    max_leaves = local.max_leaves
    utilization = (var.total_leaf_nodes / local.max_leaves) * 100
  }
}
```

## Determining Number of Shards

Database sharding often benefits from power-of-2 shard counts:

```hcl
variable "estimated_data_size_gb" {
  type    = number
  default = 500
}

variable "target_shard_size_gb" {
  type    = number
  default = 50
}

locals {
  # Calculate minimum shards needed
  min_shards = var.estimated_data_size_gb / var.target_shard_size_gb
  # 500 / 50 = 10

  # Round to nearest power of 2
  shard_bits = ceil(log(local.min_shards, 2))
  shard_count = pow(2, local.shard_bits)
  # log2(10) = 3.32, ceil = 4, 2^4 = 16 shards

  actual_shard_size = var.estimated_data_size_gb / local.shard_count
}

output "shard_plan" {
  value = {
    shard_count      = local.shard_count
    target_shard_size = var.target_shard_size_gb
    actual_shard_size = local.actual_shard_size
  }
}
```

## Order of Magnitude Calculations

The base-10 logarithm gives you the order of magnitude, which is useful for tiered pricing or configuration:

```hcl
variable "monthly_requests" {
  type    = number
  default = 5000000  # 5 million
}

locals {
  # Determine the order of magnitude
  magnitude = floor(log(var.monthly_requests, 10))
  # log10(5000000) = 6.7, floor = 6

  # Use magnitude to select a tier
  tier = (
    local.magnitude <= 3 ? "small" :
    local.magnitude <= 6 ? "medium" :
    local.magnitude <= 9 ? "large" :
    "enterprise"
  )
}

output "tier_info" {
  value = {
    requests  = var.monthly_requests
    magnitude = local.magnitude
    tier      = local.tier
  }
  # Output: { requests = 5000000, magnitude = 6, tier = "medium" }
}
```

## Exponential Backoff Configuration

When configuring retry policies with exponential backoff, `log` helps calculate the maximum number of retries within a time budget:

```hcl
variable "max_wait_seconds" {
  type    = number
  default = 300  # 5 minutes total wait
}

variable "base_delay_seconds" {
  type    = number
  default = 1
}

locals {
  # Total wait with exponential backoff: sum of 2^0 + 2^1 + ... + 2^(n-1) = 2^n - 1
  # So 2^n - 1 <= max_wait / base_delay
  # n <= log2(max_wait / base_delay + 1)
  max_retries = floor(log(var.max_wait_seconds / var.base_delay_seconds + 1, 2))
  # log2(301) = 8.23, floor = 8 retries

  # Actual total wait time with 8 retries
  actual_total_wait = var.base_delay_seconds * (pow(2, local.max_retries) - 1)
  # 1 * (256 - 1) = 255 seconds
}

output "retry_config" {
  value = {
    max_retries      = local.max_retries
    base_delay       = var.base_delay_seconds
    total_wait_limit = var.max_wait_seconds
    actual_max_wait  = local.actual_total_wait
  }
}
```

## Important Notes About log

There are a few things to keep in mind:

```hcl
# log(0, base) is undefined and will cause an error
# log(negative, base) is undefined and will cause an error

# Always validate inputs before using log
variable "count" {
  type    = number
  default = 10

  validation {
    condition     = var.count > 0
    error_message = "Count must be positive for logarithm calculation."
  }
}
```

## Summary

The `log` function in Terraform computes the logarithm of a number in a given base. While it sounds purely mathematical, it is genuinely useful for infrastructure calculations - especially anything involving powers of 2 (subnets, partitions, shards) or order-of-magnitude decisions (tier selection, scaling policies). The most common pattern is `ceil(log(n, 2))` to find how many bits or levels you need to accommodate a certain number of items. Just remember to validate that your inputs are positive, since logarithms of zero or negative numbers are undefined.

For more Terraform math functions, check out our posts on the [pow function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-pow-function-in-terraform/view) and the [ceil function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-ceil-function-in-terraform/view).
