# How to Use the min Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, min Function, Math, HCL, Infrastructure as Code, Numeric Functions

Description: Learn how to use the min function in Terraform to find the smallest number from a set of values and enforce upper limits in infrastructure configurations.

---

The `min` function is the counterpart to `max` - it returns the smallest number from a set of numeric arguments. While `max` is great for enforcing minimums, `min` shines when you need to enforce ceilings, stay within quotas, or find the bottleneck in a system.

## What Is the min Function?

The `min` function takes one or more numbers and returns the smallest one:

```hcl
# min(number1, number2, ...)
# Returns the smallest number
min(5, 12, 3)    # Returns: 3
min(1, 1, 1)     # Returns: 1
min(-5, -1, -3)  # Returns: -5
```

## Trying It Out in terraform console

```hcl
# Launch with: terraform console

# Basic usage
> min(10, 5, 8)
5

# Two values
> min(100, 200)
100

# Negative numbers
> min(-1, -10, -5)
-10

# Mixed positive and negative
> min(-50, 0, 100)
-50

# Single value
> min(42)
42

# Floating point
> min(1.5, 0.3, 2.1)
0.3

# Using the splat operator to expand a list
> min([100, 50, 75]...)
50
```

Like `max`, you need the `...` operator to expand a list into individual arguments.

## Enforcing Maximum Limits

The primary use of `min` is capping values at an upper limit:

```hcl
variable "desired_instances" {
  type    = number
  default = 100
}

locals {
  # Cap at 50 instances to stay within our account quota
  instance_count = min(var.desired_instances, 50)
}

resource "aws_autoscaling_group" "app" {
  name                = "app-asg"
  min_size            = 2
  max_size            = local.instance_count
  desired_capacity    = local.instance_count
  vpc_zone_identifier = var.subnet_ids

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }
}

output "capped_count" {
  value = "Requested ${var.desired_instances}, capped at ${local.instance_count}"
}
```

## Staying Within Provider Quotas

Cloud providers impose limits on various resources. The `min` function helps you stay within them:

```hcl
variable "requested_iops" {
  type    = number
  default = 20000
}

variable "storage_gb" {
  type    = number
  default = 500
}

locals {
  # gp3 IOPS limit: 16000, or 500 IOPS per GB (whichever is less)
  max_iops_by_type = 16000
  max_iops_by_size = var.storage_gb * 500

  # Take the smallest of: requested, type limit, size limit
  effective_iops = min(
    var.requested_iops,
    local.max_iops_by_type,
    local.max_iops_by_size,
  )
}

resource "aws_ebs_volume" "data" {
  availability_zone = "us-east-1a"
  size              = var.storage_gb
  type              = "gp3"
  iops              = local.effective_iops

  tags = {
    Name = "high-iops-volume"
  }
}

output "iops_info" {
  value = {
    requested = var.requested_iops
    effective = local.effective_iops
    limited_by = (
      local.effective_iops == var.requested_iops ? "none" :
      local.effective_iops == local.max_iops_by_type ? "volume_type" :
      "volume_size"
    )
  }
}
```

## Finding the Bottleneck

In distributed systems, the system is only as fast as its slowest component. The `min` function identifies bottlenecks:

```hcl
variable "component_throughputs" {
  type = map(number)
  default = {
    load_balancer = 10000  # requests per second
    web_tier      = 8000
    api_tier      = 5000
    database      = 3000
    cache         = 15000
  }
}

locals {
  # System throughput is limited by the slowest component
  system_throughput = min(values(var.component_throughputs)...)

  # Identify the bottleneck
  bottleneck = [
    for name, throughput in var.component_throughputs :
    name if throughput == local.system_throughput
  ][0]
}

output "capacity_analysis" {
  value = {
    system_throughput = local.system_throughput
    bottleneck        = local.bottleneck
  }
  # Output: { system_throughput = 3000, bottleneck = "database" }
}
```

## Timeout Configuration

When setting timeouts, `min` prevents excessively long waits:

```hcl
variable "user_timeout_seconds" {
  type    = number
  default = 600
}

locals {
  # Cap timeouts at reasonable maximums
  api_timeout       = min(var.user_timeout_seconds, 30)
  background_timeout = min(var.user_timeout_seconds, 300)
  deployment_timeout = min(var.user_timeout_seconds, 900)
}

resource "aws_lb_target_group" "api" {
  name     = "api-tg"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/health"
    timeout             = min(local.api_timeout, 10)
    interval            = 15
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}
```

## Clamping Values to a Range

Combine `min` and `max` to keep values within a valid range:

```hcl
variable "cpu_percentage" {
  type    = number
  default = 75
}

variable "memory_percentage" {
  type    = number
  default = 120  # Someone made a mistake
}

locals {
  # Clamp percentages to 0-100 range
  safe_cpu    = min(max(var.cpu_percentage, 0), 100)
  safe_memory = min(max(var.memory_percentage, 0), 100)
  # 120 -> max(120, 0) = 120 -> min(120, 100) = 100
}

resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = 10
  min_capacity       = 1
  resource_id        = "service/${var.cluster_name}/${var.service_name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = local.safe_cpu

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}
```

## Selecting the Smallest Sufficient Size

When choosing instance sizes, `min` helps you pick the smallest one that meets requirements:

```hcl
variable "required_memory_gb" {
  type    = number
  default = 12
}

locals {
  # Available instance memory sizes (in GB)
  available_sizes = [8, 16, 32, 64, 128]

  # Find sizes that meet the requirement
  sufficient_sizes = [
    for size in local.available_sizes :
    size if size >= var.required_memory_gb
  ]
  # Result: [16, 32, 64, 128]

  # Pick the smallest sufficient size
  optimal_size = min(local.sufficient_sizes...)
  # Result: 16
}

output "selected_size" {
  value = "${local.optimal_size} GB (smallest that fits ${var.required_memory_gb} GB requirement)"
}
```

## Cost Optimization

The `min` function is useful for cost-aware configurations:

```hcl
variable "reserved_instances" {
  type    = number
  default = 10
  description = "Number of reserved instances we have purchased"
}

variable "desired_instances" {
  type    = number
  default = 15
}

locals {
  # Use reserved instances first (cheaper)
  reserved_count  = min(var.desired_instances, var.reserved_instances)
  on_demand_count = max(var.desired_instances - var.reserved_instances, 0)
}

output "instance_mix" {
  value = {
    total     = var.desired_instances
    reserved  = local.reserved_count
    on_demand = local.on_demand_count
  }
  # Output: { total = 15, reserved = 10, on_demand = 5 }
}
```

## Limiting Concurrent Operations

When running parallel operations, `min` prevents overwhelming downstream systems:

```hcl
variable "total_deployments" {
  type    = number
  default = 20
}

variable "max_parallel" {
  type    = number
  default = 5
}

locals {
  # Never run more deployments in parallel than the total needed
  concurrent = min(var.total_deployments, var.max_parallel)

  # Calculate number of rounds needed
  rounds = ceil(var.total_deployments / local.concurrent)
}

output "deployment_plan" {
  value = {
    total       = var.total_deployments
    parallel    = local.concurrent
    rounds      = local.rounds
  }
  # Output: { total = 20, parallel = 5, rounds = 4 }
}
```

## Finding Minimum Across Dynamic Data

When working with module outputs or data sources that produce varying numbers:

```hcl
variable "cluster_nodes" {
  type = map(object({
    cpu_cores   = number
    memory_gb   = number
    disk_gb     = number
  }))
  default = {
    node1 = { cpu_cores = 4, memory_gb = 16, disk_gb = 100 }
    node2 = { cpu_cores = 8, memory_gb = 32, disk_gb = 200 }
    node3 = { cpu_cores = 4, memory_gb = 16, disk_gb = 150 }
  }
}

locals {
  # Find the minimum resources across all nodes
  # This represents the guaranteed minimum capacity per node
  min_cpu    = min([for n in var.cluster_nodes : n.cpu_cores]...)
  min_memory = min([for n in var.cluster_nodes : n.memory_gb]...)
  min_disk   = min([for n in var.cluster_nodes : n.disk_gb]...)
}

output "cluster_minimums" {
  value = {
    min_cpu_cores = local.min_cpu
    min_memory_gb = local.min_memory
    min_disk_gb   = local.min_disk
  }
}
```

## Summary

The `min` function returns the smallest value from its arguments, making it the go-to tool for enforcing upper limits, staying within quotas, and finding bottlenecks. Use `min(value, maximum)` to cap a value, combine it with `max(value, minimum)` for range clamping, and expand lists with `...` when finding minimums across dynamic data. Together with `max`, these two functions cover the vast majority of numeric constraint scenarios in Terraform.

For related functions, see our posts on the [max function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-max-function-in-terraform/view) and the [floor function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-floor-function-in-terraform/view).
