# How to Use the max Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Max Function, Math, HCL, Infrastructure as Code, Numeric Functions

Description: Learn how to use the max function in Terraform to find the largest number from a set of values and enforce minimum thresholds in infrastructure configurations.

---

The `max` function in Terraform returns the largest number from a set of numeric arguments. It is one of those functions you will reach for constantly - every time you need to enforce a minimum value, pick the highest configuration, or find the peak across a set of numbers, `max` is the tool for the job.

## What Is the max Function?

The `max` function takes one or more numbers as arguments and returns the greatest one:

```hcl
# max(number1, number2, ...)
# Returns the largest number
max(5, 12, 3)  # Returns: 12
max(1, 1, 1)   # Returns: 1
max(-5, -1, -3) # Returns: -1
```

## Exploring in terraform console

```hcl
# Launch with: terraform console

# Basic usage
> max(1, 5, 3)
5

# Two values
> max(10, 20)
20

# Negative numbers
> max(-10, -5, -20)
-5

# Mixed positive and negative
> max(-100, 0, 50)
50

# Single value
> max(42)
42

# Floating point
> max(1.5, 2.3, 1.9)
2.3

# Using the splat operator with a list
> max([10, 20, 30]...)
30
```

Note that last example with the `...` operator. When you have a list of numbers, you need to expand it with `...` to pass the elements as individual arguments to `max`.

## Enforcing Minimum Values

The most common use of `max` is ensuring a value does not drop below a required minimum:

```hcl
variable "desired_instances" {
  type    = number
  default = 1
}

locals {
  # Ensure we always have at least 2 instances for high availability
  instance_count = max(var.desired_instances, 2)
}

resource "aws_autoscaling_group" "app" {
  name                = "app-asg"
  min_size            = local.instance_count
  max_size            = local.instance_count * 3
  desired_capacity    = local.instance_count
  vpc_zone_identifier = var.subnet_ids

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }
}

output "instance_count" {
  value = "Running ${local.instance_count} instances (minimum 2 for HA)"
}
```

Even if someone passes `desired_instances = 1`, the ASG will always have at least 2 instances.

## Setting Storage Minimums

Cloud providers often have minimum storage requirements. The `max` function enforces them:

```hcl
variable "requested_storage_gb" {
  type    = number
  default = 10
}

locals {
  # AWS RDS minimum storage is 20 GB for most engines
  db_storage = max(var.requested_storage_gb, 20)

  # EBS gp3 minimum is 1 GB, but let's enforce 10 GB as our minimum
  ebs_storage = max(var.requested_storage_gb, 10)
}

resource "aws_db_instance" "main" {
  identifier           = "main-db"
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = "db.t3.medium"
  allocated_storage    = local.db_storage
  storage_type         = "gp3"

  # ... other configuration
}

resource "aws_ebs_volume" "data" {
  availability_zone = "us-east-1a"
  size              = local.ebs_storage
  type              = "gp3"
}
```

## Choosing the Highest Requirement

When multiple components have different requirements, `max` picks the strictest one:

```hcl
variable "api_min_cpu" {
  type    = number
  default = 512  # 0.5 vCPU
}

variable "worker_min_cpu" {
  type    = number
  default = 1024  # 1 vCPU
}

variable "scheduler_min_cpu" {
  type    = number
  default = 256  # 0.25 vCPU
}

locals {
  # The container host needs enough CPU for the most demanding component
  host_cpu = max(var.api_min_cpu, var.worker_min_cpu, var.scheduler_min_cpu)
  # Result: 1024
}

resource "aws_ecs_task_definition" "app" {
  family                   = "app"
  requires_compatibilities = ["FARGATE"]
  cpu                      = local.host_cpu
  memory                   = 2048
  network_mode             = "awsvpc"

  # ... container definitions
}
```

## Finding Peak Values from Data

When analyzing data from external sources or computed values:

```hcl
variable "region_latencies_ms" {
  type = map(number)
  default = {
    us_east_1 = 15
    us_west_2 = 45
    eu_west_1 = 120
    ap_south_1 = 200
  }
}

locals {
  # Find the maximum latency across all regions
  max_latency = max(values(var.region_latencies_ms)...)

  # Set timeout based on worst-case latency plus buffer
  timeout_ms = max(local.max_latency * 3, 1000)  # At least 1 second
}

output "timeout_config" {
  value = {
    max_latency_ms = local.max_latency
    timeout_ms     = local.timeout_ms
  }
}
```

## Scaling Calculations with Floor Guarantees

When combining scaling calculations with minimum guarantees:

```hcl
variable "current_load" {
  type    = number
  default = 85  # percentage
}

variable "current_instances" {
  type    = number
  default = 5
}

locals {
  # Calculate target instances based on load
  # Target: keep average load at 70%
  raw_target = ceil(var.current_instances * (var.current_load / 70))

  # Never scale below current count (only scale up, separate process for scale down)
  # And always maintain at least 2 for redundancy
  target_instances = max(local.raw_target, var.current_instances, 2)
}

output "scaling_decision" {
  value = {
    current    = var.current_instances
    calculated = local.raw_target
    target     = local.target_instances
  }
}
```

## Using max with Dynamic Lists

When you have a dynamically generated list of numbers:

```hcl
variable "services" {
  type = map(object({
    replicas = number
    memory_mb = number
  }))
  default = {
    web     = { replicas = 3, memory_mb = 512 }
    api     = { replicas = 5, memory_mb = 1024 }
    worker  = { replicas = 2, memory_mb = 2048 }
    cache   = { replicas = 3, memory_mb = 4096 }
  }
}

locals {
  # Find the service with the most replicas
  max_replicas = max([for s in var.services : s.replicas]...)
  # Result: 5

  # Find the highest memory requirement
  max_memory = max([for s in var.services : s.memory_mb]...)
  # Result: 4096

  # Total replicas across all services
  total_replicas = sum([for s in var.services : s.replicas])
}

output "cluster_requirements" {
  value = {
    max_replicas_per_service = local.max_replicas
    max_memory_per_service   = local.max_memory
    total_replicas           = local.total_replicas
  }
}
```

## TTL and Timeout Configuration

When configuring TTLs and timeouts, `max` ensures reasonable minimums:

```hcl
variable "cache_ttl_seconds" {
  type    = number
  default = 30
}

variable "dns_ttl_seconds" {
  type    = number
  default = 10
}

locals {
  # Cache TTL should be at least 60 seconds to avoid thundering herd
  effective_cache_ttl = max(var.cache_ttl_seconds, 60)

  # DNS TTL should be at least 30 seconds
  effective_dns_ttl = max(var.dns_ttl_seconds, 30)

  # Health check interval should be at least 10 seconds
  health_check_interval = max(var.dns_ttl_seconds, 10)
}

resource "aws_route53_record" "app" {
  zone_id = var.zone_id
  name    = "app.example.com"
  type    = "A"
  ttl     = local.effective_dns_ttl

  records = var.app_ips
}
```

## max vs Validation Rules

You might wonder whether to use `max` or a validation rule to enforce minimums. The answer is: use both for different purposes:

```hcl
variable "instance_count" {
  type    = number
  default = 3

  # Validation: tell the user their input is wrong
  validation {
    condition     = var.instance_count >= 1
    error_message = "Instance count must be at least 1."
  }
}

locals {
  # max: silently enforce business rules on top of user input
  # Even if user passes 1, we need at least 2 for HA
  effective_count = max(var.instance_count, 2)
}
```

Validation is for catching mistakes in user input. The `max` function is for applying business rules that the user does not need to know about.

## Combining max with min for Clamping

Use `max` and `min` together to keep a value within a range:

```hcl
variable "requested_cpu_shares" {
  type    = number
  default = 500
}

locals {
  # Clamp CPU shares between 128 and 4096
  clamped_cpu = min(max(var.requested_cpu_shares, 128), 4096)
  # If input is 50 -> max(50, 128) = 128 -> min(128, 4096) = 128
  # If input is 500 -> max(500, 128) = 500 -> min(500, 4096) = 500
  # If input is 8000 -> max(8000, 128) = 8000 -> min(8000, 4096) = 4096
}

output "cpu_shares" {
  value = local.clamped_cpu
}
```

## Summary

The `max` function finds the largest value among its arguments. Its most important use in Terraform is enforcing minimum thresholds - `max(user_value, minimum)` guarantees the result is never below the minimum. It is also great for finding peak values across datasets, selecting the strictest requirement among multiple components, and combining with `ceil` or `floor` for robust capacity calculations. Remember to use the `...` operator when passing a list to `max`, and pair it with `min` when you need to clamp values to a range.

For related functions, see our posts on the [min function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-min-function-in-terraform/view) and the [ceil function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-ceil-function-in-terraform/view).
