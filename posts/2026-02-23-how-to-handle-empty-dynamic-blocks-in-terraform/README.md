# How to Handle Empty Dynamic Blocks in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, Empty Blocks, HCL, Troubleshooting, Infrastructure as Code

Description: Learn how to handle situations where dynamic blocks produce zero blocks in Terraform, including required blocks, defaults, and provider-specific behaviors.

---

A dynamic block with an empty `for_each` collection produces no blocks at all. Most of the time, this is exactly what you want - it is how you make nested blocks optional. But sometimes an empty dynamic block causes problems, either because the provider requires at least one block or because the absence of a block changes behavior in unexpected ways.

## How Empty Dynamic Blocks Work

When the `for_each` argument evaluates to an empty collection, the dynamic block generates zero nested blocks:

```hcl
variable "rules" {
  type    = list(object({ port = number }))
  default = []  # Empty list
}

resource "aws_security_group" "example" {
  name   = "example"
  vpc_id = var.vpc_id

  # This produces zero ingress blocks when var.rules is empty
  dynamic "ingress" {
    for_each = var.rules
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }
}
```

For security groups, this is fine - a security group can exist without any ingress rules. But not all resources are this forgiving.

## Problem 1 - Provider Requires at Least One Block

Some resources require at least one instance of a nested block. If your dynamic block might be empty, you need a fallback:

```hcl
# aws_lb_listener requires exactly one default_action block
# The default_action cannot be dynamic because it must always exist

# But within the action, sub-blocks might be optional
resource "aws_lb_listener" "main" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"

  # default_action is required - always present
  default_action {
    type             = var.default_action_type
    target_group_arn = var.default_action_type == "forward" ? var.target_group_arn : null

    # But redirect is optional within it
    dynamic "redirect" {
      for_each = var.default_action_type == "redirect" ? [1] : []
      content {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  }
}
```

## Problem 2 - Default Behavior Changes When Block Is Absent

Sometimes the absence of a block triggers different default behavior than an empty block:

```hcl
# For aws_s3_bucket, the absence of lifecycle_rule means no lifecycle management.
# For aws_lambda_function, the absence of environment means no env vars.
# For aws_cloudfront_distribution, the absence of logging_config means no logging.

# This is usually desired behavior, but be aware of it.

# Example: Lambda rejects environment { variables = {} }
# So we must omit the block entirely when there are no env vars

variable "lambda_env_vars" {
  type    = map(string)
  default = {}
}

resource "aws_lambda_function" "main" {
  function_name = "example"
  runtime       = "python3.12"
  handler       = "main.handler"
  role          = aws_iam_role.lambda.arn
  filename      = "lambda.zip"

  # Empty map means no environment block at all
  dynamic "environment" {
    for_each = length(var.lambda_env_vars) > 0 ? [1] : []
    content {
      variables = var.lambda_env_vars
    }
  }
}
```

## Pattern - Providing Defaults for Empty Collections

When a block must always exist, provide a default:

```hcl
variable "tags" {
  description = "Tags for the ASG"
  type = list(object({
    key                 = string
    value               = string
    propagate_at_launch = bool
  }))
  default = []
}

locals {
  # Ensure there is always at least a Name tag
  asg_tags = length(var.tags) > 0 ? var.tags : [
    {
      key                 = "Name"
      value               = var.name
      propagate_at_launch = true
    }
  ]
}

resource "aws_autoscaling_group" "main" {
  name                = var.name
  min_size            = 1
  max_size            = 3
  vpc_zone_identifier = var.subnet_ids

  launch_template {
    id      = aws_launch_template.main.id
    version = "$Latest"
  }

  dynamic "tag" {
    for_each = local.asg_tags
    content {
      key                 = tag.value.key
      value               = tag.value.value
      propagate_at_launch = tag.value.propagate_at_launch
    }
  }
}
```

## Pattern - Conditional Block Generation with Validation

Validate that required blocks will not be empty:

```hcl
variable "target_groups" {
  description = "At least one target group is required"
  type = list(object({
    name     = string
    port     = number
    protocol = string
  }))

  validation {
    condition     = length(var.target_groups) > 0
    error_message = "At least one target group must be specified."
  }
}
```

This catches the problem at variable assignment time, before Terraform tries to create a resource with missing required blocks.

## Pattern - Merging with Mandatory Blocks

When some blocks are always required and others are optional:

```hcl
variable "ingress_rules" {
  type    = list(object({ port = number, cidrs = list(string) }))
  default = []
}

locals {
  # Mandatory rules that always exist
  mandatory_ingress = [
    {
      port  = 443
      cidrs = var.internal_cidrs
      description = "Internal HTTPS"
    }
  ]

  # Combine mandatory with user-specified rules
  all_ingress_rules = concat(local.mandatory_ingress, [
    for rule in var.ingress_rules : {
      port        = rule.port
      cidrs       = rule.cidrs
      description = "Custom rule for port ${rule.port}"
    }
  ])
}

resource "aws_security_group" "main" {
  name   = "always-has-rules"
  vpc_id = var.vpc_id

  # This will always produce at least one block
  dynamic "ingress" {
    for_each = local.all_ingress_rules
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = "tcp"
      cidr_blocks = ingress.value.cidrs
      description = ingress.value.description
    }
  }
}
```

## Pattern - Empty Dynamic Block with Explicit Null

Some providers treat an absent block differently from an explicitly empty one. When you need "no blocks" behavior, make sure you are actually passing an empty collection:

```hcl
# Explicit empty list - no egress rules
variable "egress_rules" {
  type    = list(object({ port = number, cidrs = list(string) }))
  default = []
}

# Null means "use provider defaults" for some resources
variable "custom_settings" {
  type    = list(object({ key = string, value = string }))
  default = null  # null is different from [] !
}

locals {
  # Convert null to empty list for consistent handling
  settings = coalesce(var.custom_settings, [])
}
```

## Testing for Empty Dynamic Blocks

Add assertions or preconditions to verify the block count:

```hcl
# Terraform 1.2+ supports preconditions
resource "aws_lb_target_group" "main" {
  for_each = var.target_groups

  name     = each.key
  port     = each.value.port
  protocol = each.value.protocol
  vpc_id   = var.vpc_id

  dynamic "health_check" {
    for_each = each.value.health_check != null ? [each.value.health_check] : []
    content {
      path     = health_check.value.path
      port     = health_check.value.port
      protocol = health_check.value.protocol
      matcher  = health_check.value.matcher
    }
  }

  lifecycle {
    precondition {
      condition     = each.value.health_check != null
      error_message = "Health check configuration is required for target group ${each.key}."
    }
  }
}
```

## Common Resources and Their Empty Block Behavior

Here is a quick reference for how common AWS resources handle absent blocks:

```hcl
# aws_security_group:
#   ingress/egress: Optional. Empty means no rules.

# aws_lb_listener:
#   default_action: Required. Must have exactly one.

# aws_lambda_function:
#   environment: Optional. Empty variables map causes an error.
#   Use dynamic block to omit entirely.

# aws_cloudfront_distribution:
#   origin: Required. Must have at least one.
#   cache_behavior: Optional.
#   custom_error_response: Optional.
#   logging_config: Optional.

# aws_ecs_task_definition:
#   volume: Optional.
#   placement_constraints: Optional.

# aws_db_parameter_group:
#   parameter: Optional. Empty means all defaults.

# aws_s3_bucket_lifecycle_configuration:
#   rule: Required. Must have at least one.
```

## Summary

Empty dynamic blocks are a feature, not a bug - they let you conditionally include nested blocks. But you need to know when emptiness causes problems. The main strategies are: validate that required blocks will not be empty, provide mandatory defaults that get merged with optional user input, and understand provider-specific behavior around absent vs empty blocks. For more on optional block patterns, see [how to use dynamic blocks with optional nested blocks](https://oneuptime.com/blog/post/2026-02-23-how-to-use-dynamic-blocks-with-optional-nested-blocks/view).
