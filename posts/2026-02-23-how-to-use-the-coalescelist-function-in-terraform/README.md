# How to Use the coalescelist Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, Terraform Functions, Collection Functions

Description: Learn how to use the coalescelist function in Terraform to return the first non-empty list from a series of lists, with practical examples and fallback patterns.

---

When working with Terraform modules and configurations, you often deal with list variables that might be empty. The `coalescelist` function solves this by returning the first non-empty list from a series of list arguments. Think of it as the list version of `coalesce` - instead of finding the first non-null scalar value, it finds the first non-empty list.

This post covers how `coalescelist` works, its syntax, and several practical examples to help you use it effectively in your Terraform projects.

## What is the coalescelist Function?

The `coalescelist` function takes any number of list arguments and returns the first one that is not empty. If all lists are empty, Terraform raises an error.

```hcl
# Returns the first non-empty list
coalescelist(list1, list2, list3, ...)
```

This function is particularly useful for providing default lists when optional list variables are left empty.

## Basic Usage in Terraform Console

Here are some examples to illustrate the basic behavior.

```hcl
# Returns the first non-empty list
> coalescelist([], ["a", "b"], ["c"])
["a", "b"]

# Returns the first list since it is not empty
> coalescelist(["x", "y"], ["a", "b"])
["x", "y"]

# Skips multiple empty lists
> coalescelist([], [], [], ["fallback"])
["fallback"]

# Works with lists of numbers
> coalescelist([], [1, 2, 3])
[1, 2, 3]

# Single non-empty list is returned as-is
> coalescelist(["only-option"])
["only-option"]
```

## Providing Default Security Group Rules

A common pattern is to allow users to specify custom security group rules, falling back to a set of defaults if they do not provide any.

```hcl
variable "custom_ingress_cidrs" {
  type        = list(string)
  default     = []
  description = "Custom CIDR blocks for ingress rules. If empty, defaults are used."
}

locals {
  default_ingress_cidrs = ["10.0.0.0/8", "172.16.0.0/12"]

  # Use custom CIDRs if provided, otherwise use defaults
  effective_ingress_cidrs = coalescelist(var.custom_ingress_cidrs, local.default_ingress_cidrs)
}

resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = aws_vpc.main.id

  dynamic "ingress" {
    for_each = local.effective_ingress_cidrs
    content {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = [ingress.value]
    }
  }
}
```

If the module consumer passes custom CIDR blocks, those are used. Otherwise, the default private network ranges are applied.

## Fallback Chains for Subnet Selection

You can chain multiple lists to create a priority-based selection system.

```hcl
variable "preferred_subnets" {
  type    = list(string)
  default = []
}

variable "secondary_subnets" {
  type    = list(string)
  default = []
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [aws_vpc.main.id]
  }
}

locals {
  # Try preferred subnets first, then secondary, then auto-discovered
  target_subnets = coalescelist(
    var.preferred_subnets,
    var.secondary_subnets,
    data.aws_subnets.default.ids
  )
}

resource "aws_lb" "app" {
  name               = "app-lb"
  internal           = false
  load_balancer_type = "application"
  subnets            = local.target_subnets
}
```

This pattern ensures the load balancer always has subnets to work with, even if the user does not explicitly provide any.

## Module Interface Design

When building reusable modules, `coalescelist` helps create flexible interfaces that work well with or without user input.

```hcl
# Module: database cluster

variable "availability_zones" {
  type        = list(string)
  default     = []
  description = "AZs for the database cluster. If empty, all available AZs are used."
}

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  # Use provided AZs or fall back to all available ones
  db_azs = coalescelist(var.availability_zones, data.aws_availability_zones.available.names)
}

resource "aws_rds_cluster" "main" {
  cluster_identifier   = "app-cluster"
  engine               = "aurora-postgresql"
  engine_version       = "15.4"
  master_username      = "admin"
  master_password      = var.master_password
  availability_zones   = slice(local.db_azs, 0, min(3, length(local.db_azs)))
  database_name        = "appdb"
}
```

The module works seamlessly whether the caller specifies availability zones or not.

## coalescelist vs Conditional Expressions

You can achieve similar results with conditional expressions, but `coalescelist` is often cleaner.

```hcl
# Using a conditional - works but verbose
local.subnets = length(var.custom_subnets) > 0 ? var.custom_subnets : var.default_subnets

# Using coalescelist - cleaner
local.subnets = coalescelist(var.custom_subnets, var.default_subnets)
```

The advantage becomes more obvious with multiple fallback levels.

```hcl
# Multiple fallbacks with conditionals - gets messy fast
local.subnets = (
  length(var.primary_subnets) > 0 ? var.primary_subnets :
  length(var.secondary_subnets) > 0 ? var.secondary_subnets :
  var.default_subnets
)

# Multiple fallbacks with coalescelist - clean and readable
local.subnets = coalescelist(
  var.primary_subnets,
  var.secondary_subnets,
  var.default_subnets
)
```

## Difference Between coalesce and coalescelist

These two functions serve similar purposes but for different types:

- `coalesce` works with individual scalar values (strings, numbers, booleans) and skips null and empty strings
- `coalescelist` works with lists and skips empty lists

```hcl
# coalesce for scalars
> coalesce("", "fallback")
"fallback"

# coalescelist for lists
> coalescelist([], ["fallback"])
["fallback"]
```

For more on `coalesce`, see [How to Use the coalesce Function in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-coalesce-function-in-terraform/view).

## Handling Tag Lists

Here is a practical example of using `coalescelist` for managing tag-based configurations.

```hcl
variable "custom_alarm_actions" {
  type    = list(string)
  default = []
}

variable "custom_ok_actions" {
  type    = list(string)
  default = []
}

locals {
  default_sns_topic = [aws_sns_topic.alerts.arn]

  # Use custom actions if provided, otherwise notify the default topic
  alarm_actions = coalescelist(var.custom_alarm_actions, local.default_sns_topic)
  ok_actions    = coalescelist(var.custom_ok_actions, local.default_sns_topic)
}

resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "high-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "CPU utilization exceeded 80% for 15 minutes"
  alarm_actions       = local.alarm_actions
  ok_actions          = local.ok_actions
}
```

## Error Handling

If all lists are empty, `coalescelist` throws an error. Always make sure your final fallback list contains at least one element.

```hcl
# This will cause an error
> coalescelist([], [])
# Error: all arguments to coalescelist are empty

# Always ensure the last argument is non-empty
> coalescelist([], [], ["safe-fallback"])
["safe-fallback"]
```

To handle cases where all lists might legitimately be empty, wrap it in a conditional.

```hcl
locals {
  # Safe version that allows an empty result
  result = length(var.list_a) > 0 || length(var.list_b) > 0 ? coalescelist(var.list_a, var.list_b) : []
}
```

## Real-World Scenario: ECS Task Placement

Here is a complete example using `coalescelist` for ECS service configuration.

```hcl
variable "placement_subnets" {
  type    = list(string)
  default = []
}

variable "capacity_providers" {
  type    = list(string)
  default = []
}

locals {
  default_capacity_providers = ["FARGATE", "FARGATE_SPOT"]
  default_subnets           = data.aws_subnets.private.ids

  effective_capacity_providers = coalescelist(
    var.capacity_providers,
    local.default_capacity_providers
  )

  effective_subnets = coalescelist(
    var.placement_subnets,
    local.default_subnets
  )
}

resource "aws_ecs_service" "app" {
  name            = "app-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 3

  dynamic "capacity_provider_strategy" {
    for_each = local.effective_capacity_providers
    content {
      capacity_provider = capacity_provider_strategy.value
      weight            = capacity_provider_strategy.value == "FARGATE_SPOT" ? 3 : 1
    }
  }

  network_configuration {
    subnets         = local.effective_subnets
    security_groups = [aws_security_group.app.id]
  }
}
```

## Summary

The `coalescelist` function is the go-to tool for providing default list values in Terraform. It keeps your configurations clean and your module interfaces flexible by handling empty list inputs gracefully.

Key takeaways:

- `coalescelist` returns the first non-empty list from its arguments
- All arguments must be lists of compatible types
- An error is raised if all lists are empty
- It is the list equivalent of `coalesce`
- Ideal for module interfaces with optional list parameters
- Chain multiple lists for priority-based fallback

Use `coalescelist` wherever you need to say "use this list if it has items, otherwise use that list."
