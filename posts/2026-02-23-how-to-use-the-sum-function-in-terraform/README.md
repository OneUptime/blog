# How to Use the sum Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, DevOps, Terraform Functions, Math

Description: Learn how to use the sum function in Terraform to calculate totals from lists of numbers for resource sizing, cost estimation, and capacity planning.

---

Math in Terraform might seem unusual, but there are plenty of situations where you need to add up numbers in your infrastructure code. Whether you are calculating total disk space, aggregating resource counts across modules, or figuring out the total number of instances in an autoscaling configuration, the `sum` function makes this straightforward.

## What is the sum Function?

The `sum` function takes a list of numbers and returns their total. That is it - simple addition.

```hcl
# Add up a list of numbers
> sum([1, 2, 3, 4, 5])
15

> sum([10.5, 20.3, 5.2])
36
```

The syntax is:

```hcl
sum(list_of_numbers)
```

It works with both integers and floating-point numbers.

## Quick Examples in Terraform Console

```hcl
# Sum of integers
> sum([100, 200, 300])
600

# Sum of floats
> sum([1.5, 2.5, 3.0])
7

# Sum with a single element
> sum([42])
42

# Sum of an empty list
> sum([])
0
```

Note that `sum([])` returns `0`, which is a sensible default - the sum of nothing is zero.

## Practical Example: Calculating Total Disk Space

Suppose you are provisioning instances with different disk sizes and need to know the total storage:

```hcl
variable "instances" {
  type = map(object({
    instance_type = string
    disk_size_gb  = number
  }))
  default = {
    web = {
      instance_type = "t3.medium"
      disk_size_gb  = 50
    }
    api = {
      instance_type = "t3.large"
      disk_size_gb  = 100
    }
    worker = {
      instance_type = "m5.xlarge"
      disk_size_gb  = 200
    }
    database = {
      instance_type = "r5.2xlarge"
      disk_size_gb  = 500
    }
  }
}

locals {
  # Calculate the total disk space across all instances
  total_disk_gb = sum([for inst in var.instances : inst.disk_size_gb])
  # Result: 850
}

output "total_disk_space_gb" {
  value       = local.total_disk_gb
  description = "Total disk space provisioned across all instances"
}
```

## Aggregating Counts Across Environments

When you have different instance counts per environment, `sum` helps you calculate the total:

```hcl
variable "environment_instance_counts" {
  type = map(number)
  default = {
    production  = 10
    staging     = 3
    development = 2
    qa          = 2
  }
}

locals {
  # Total instances across all environments
  total_instances = sum(values(var.environment_instance_counts))
  # Result: 17
}

# Use the total for a monitoring check
resource "aws_cloudwatch_metric_alarm" "instance_count" {
  alarm_name          = "total-instance-count"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Average"
  threshold           = local.total_instances * 0.8  # Alert if below 80% of expected
  alarm_description   = "Alert when healthy instances drop below 80% of ${local.total_instances}"
}
```

## Cost Estimation with sum

You can build rough cost estimates right in your Terraform configuration:

```hcl
variable "resources" {
  type = list(object({
    name            = string
    monthly_cost    = number
    count           = number
  }))
  default = [
    {
      name         = "EC2 instances"
      monthly_cost = 150.00
      count        = 5
    },
    {
      name         = "RDS instances"
      monthly_cost = 300.00
      count        = 2
    },
    {
      name         = "NAT Gateways"
      monthly_cost = 45.00
      count        = 3
    }
  ]
}

locals {
  # Calculate total monthly cost
  total_monthly_cost = sum([
    for resource in var.resources : resource.monthly_cost * resource.count
  ])
  # Result: 150*5 + 300*2 + 45*3 = 750 + 600 + 135 = 1485
}

output "estimated_monthly_cost" {
  value = format("$%.2f", local.total_monthly_cost)
  # Result: "$1485.00"
}
```

## Calculating Subnet Sizes

When planning your VPC CIDR allocation, you can use `sum` to make sure your subnets fit:

```hcl
variable "subnet_configs" {
  type = list(object({
    name    = string
    newbits = number  # Additional bits for the subnet mask
  }))
  default = [
    { name = "public-1",   newbits = 4 },  # /20 in a /16 VPC = 4096 IPs
    { name = "public-2",   newbits = 4 },
    { name = "private-1",  newbits = 3 },  # /19 in a /16 VPC = 8192 IPs
    { name = "private-2",  newbits = 3 },
    { name = "database-1", newbits = 6 },  # /22 in a /16 VPC = 1024 IPs
    { name = "database-2", newbits = 6 },
  ]
}

locals {
  # Calculate total IPs allocated
  vpc_cidr_bits = 16
  total_ips_allocated = sum([
    for subnet in var.subnet_configs : pow(2, 32 - local.vpc_cidr_bits - subnet.newbits)
  ])
}

output "total_ips_allocated" {
  value = local.total_ips_allocated
  # Helps verify you are not over-allocating your VPC CIDR space
}
```

## Combining sum with for Expressions

The `for` expression is what makes `sum` truly powerful. You can transform a complex data structure into a list of numbers and then sum it:

```hcl
variable "autoscaling_groups" {
  type = map(object({
    min_size     = number
    max_size     = number
    desired_size = number
  }))
  default = {
    web = {
      min_size     = 2
      max_size     = 10
      desired_size = 4
    }
    api = {
      min_size     = 3
      max_size     = 15
      desired_size = 6
    }
    worker = {
      min_size     = 1
      max_size     = 8
      desired_size = 3
    }
  }
}

locals {
  # Total minimum capacity
  total_min = sum([for asg in var.autoscaling_groups : asg.min_size])
  # Result: 6

  # Total desired capacity
  total_desired = sum([for asg in var.autoscaling_groups : asg.desired_size])
  # Result: 13

  # Total maximum capacity
  total_max = sum([for asg in var.autoscaling_groups : asg.max_size])
  # Result: 33
}

output "capacity_summary" {
  value = "Min: ${local.total_min}, Desired: ${local.total_desired}, Max: ${local.total_max}"
}
```

## sum with Conditional Logic

You can filter values before summing them:

```hcl
variable "services" {
  type = list(object({
    name     = string
    replicas = number
    enabled  = bool
  }))
  default = [
    { name = "frontend", replicas = 3, enabled = true },
    { name = "backend",  replicas = 5, enabled = true },
    { name = "legacy",   replicas = 2, enabled = false },
    { name = "cache",    replicas = 3, enabled = true },
  ]
}

locals {
  # Only count replicas for enabled services
  active_replicas = sum([
    for svc in var.services : svc.replicas if svc.enabled
  ])
  # Result: 3 + 5 + 3 = 11 (legacy's 2 replicas are excluded)
}
```

## Weighted Calculations

```hcl
variable "node_pools" {
  type = list(object({
    name       = string
    node_count = number
    cpu_per_node = number
    memory_gb_per_node = number
  }))
  default = [
    { name = "general",  node_count = 5, cpu_per_node = 4,  memory_gb_per_node = 16 },
    { name = "compute",  node_count = 3, cpu_per_node = 8,  memory_gb_per_node = 32 },
    { name = "memory",   node_count = 2, cpu_per_node = 4,  memory_gb_per_node = 64 },
  ]
}

locals {
  # Total cluster CPU capacity
  total_cpus = sum([for pool in var.node_pools : pool.node_count * pool.cpu_per_node])
  # Result: 20 + 24 + 8 = 52

  # Total cluster memory
  total_memory_gb = sum([for pool in var.node_pools : pool.node_count * pool.memory_gb_per_node])
  # Result: 80 + 96 + 128 = 304
}

output "cluster_capacity" {
  value = "Total CPUs: ${local.total_cpus}, Total Memory: ${local.total_memory_gb}GB"
}
```

## Edge Cases

```hcl
# Empty list returns 0
> sum([])
0

# Negative numbers work as expected
> sum([10, -3, 5, -2])
10

# Mixed integers and floats
> sum([1, 2.5, 3])
6.5
```

## What sum Does Not Do

The `sum` function only handles addition. For other aggregations:

- **Average**: Use `sum(list) / length(list)`
- **Min/Max**: Use the `min` or `max` functions (they take separate arguments, not a list, so use `min(list...)`)
- **Product**: There is no built-in product function; use a `for` expression with locals

```hcl
locals {
  numbers = [10, 20, 30]
  average = sum(local.numbers) / length(local.numbers)
  # Result: 20
}
```

## Summary

The `sum` function is a simple but surprisingly useful tool in Terraform. It is the go-to for calculating totals from lists of numbers - whether for capacity planning, cost estimation, or validation logic. Combined with `for` expressions, it can aggregate virtually any numeric property from your infrastructure configuration. For more on working with numbers and collections in Terraform, check out our posts on [collection function chaining](https://oneuptime.com/blog/post/2026-02-23-how-to-chain-collection-functions-in-terraform/view) and [data transformation pipelines](https://oneuptime.com/blog/post/2026-02-23-how-to-use-collection-functions-for-data-transformation-pipelines/view).
