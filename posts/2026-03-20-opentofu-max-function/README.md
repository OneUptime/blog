# How to Use the max Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the max function in OpenTofu to return the largest value from a set of numbers for resource sizing and threshold enforcement.

## Introduction

The `max` function in OpenTofu returns the greatest value from a list of one or more numbers. It is commonly used to enforce minimum thresholds, prevent under-provisioning, and make resource sizing decisions based on multiple inputs.

## Syntax

```hcl
max(number, number, ...)
```

- Accepts one or more numeric arguments.
- Returns the largest among them.
- Also works with a list using the splat operator: `max(list...)`

## Basic Examples

```hcl
output "simple_max" {
  value = max(3, 1, 7, 2)  # Returns 7
}

output "two_values" {
  value = max(10, 20)  # Returns 20
}

output "negative_values" {
  value = max(-5, -3, -10)  # Returns -3
}
```

## Practical Use Cases

### Enforcing a Minimum Instance Count

```hcl
variable "calculated_instances" {
  type    = number
  default = 0
}

locals {
  # Always run at least 2 instances for HA
  instance_count = max(var.calculated_instances, 2)
}

resource "aws_autoscaling_group" "app" {
  desired_capacity    = local.instance_count
  min_size            = 2
  max_size            = local.instance_count * 2
  vpc_zone_identifier = var.subnet_ids

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }
}
```

### Setting a Minimum Disk Size

```hcl
variable "requested_disk_gb" {
  type    = number
  default = 5
}

locals {
  # Enforce a minimum of 20 GB for the OS + app
  disk_size_gb = max(var.requested_disk_gb, 20)
}

resource "aws_ebs_volume" "app" {
  availability_zone = "us-east-1a"
  size              = local.disk_size_gb

  tags = {
    Name = "app-disk"
  }
}
```

### Using max with a List

```hcl
variable "replica_counts" {
  type    = list(number)
  default = [1, 3, 2, 5, 4]
}

locals {
  # Find the maximum replica count across all services
  peak_replicas = max(var.replica_counts...)
}

output "peak_replicas" {
  value = local.peak_replicas  # Returns 5
}
```

### Combining max and ceil for Capacity

```hcl
variable "expected_tps" {
  type    = number
  default = 50
}

variable "tps_per_node" {
  type    = number
  default = 30
}

locals {
  # At least 2 nodes, or however many are needed
  node_count = max(ceil(var.expected_tps / var.tps_per_node), 2)
}

output "node_count" {
  value = local.node_count  # Returns 2 (ceil gives 2, max keeps 2)
}
```

## Step-by-Step Usage

1. Determine which numeric values you are comparing.
2. Call `max()` with those values or expand a list with `...`.
3. Assign the result to a local or use directly in a resource argument.
4. Test in `tofu console`:

```bash
tofu console

> max(5, 10, 3)
10
> max([1, 2, 3]...)
3
```

## Common Pitfalls

- Passing fewer than two arguments is valid (`max(5)` returns `5`) but usually a sign of a logic error.
- Passing string values will cause a type error; ensure all inputs are numbers.

## Conclusion

The `max` function is a versatile tool in OpenTofu for setting floors on resource sizes, enforcing minimum counts, and selecting the largest value from dynamic inputs. Combined with `ceil`, `min`, and variable inputs, it enables smart, safe resource sizing in your infrastructure definitions.
