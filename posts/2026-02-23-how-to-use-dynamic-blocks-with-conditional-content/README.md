# How to Use Dynamic Blocks with Conditional Content

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, Conditional Logic, HCL, Infrastructure as Code

Description: Learn how to combine dynamic blocks with conditional expressions in Terraform to generate configuration blocks based on runtime conditions.

---

Dynamic blocks in Terraform generate repeated nested blocks from a collection. But what happens when you need the content of those blocks to change based on conditions? Maybe a field should only be set sometimes, or the entire block shape should differ depending on a variable. This post covers how to handle conditional content inside dynamic blocks.

## Conditional for_each - The Basics

The simplest form of conditional content is deciding whether a dynamic block appears at all. You do this by controlling the `for_each` argument:

```hcl
variable "enable_encryption" {
  type    = bool
  default = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "example" {
  bucket = aws_s3_bucket.main.id

  # Only create this rule block if encryption is enabled
  dynamic "rule" {
    for_each = var.enable_encryption ? [1] : []
    content {
      apply_server_side_encryption_by_default {
        sse_algorithm = "aws:kms"
      }
    }
  }
}
```

When `enable_encryption` is false, the empty list means no `rule` block is generated.

## Conditional Attributes Inside Dynamic Blocks

Sometimes you want the dynamic block to always appear, but certain attributes inside it should vary. Use standard Terraform conditional expressions within the `content` block:

```hcl
variable "ingress_rules" {
  type = list(object({
    port        = number
    protocol    = string
    cidr_blocks = list(string)
    ipv6_cidr_blocks = optional(list(string))
    description = optional(string)
  }))
}

resource "aws_security_group" "main" {
  name   = "conditional-content-sg"
  vpc_id = var.vpc_id

  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks

      # Only set ipv6_cidr_blocks if provided, otherwise null
      ipv6_cidr_blocks = ingress.value.ipv6_cidr_blocks != null ? ingress.value.ipv6_cidr_blocks : null

      # Provide a default description if none given
      description = ingress.value.description != null ? ingress.value.description : "Managed by Terraform"
    }
  }
}
```

Terraform treats `null` attribute values as "not set," which is exactly what we want for optional fields.

## Different Block Shapes Based on Conditions

A more advanced pattern is when the shape of a block changes depending on a condition. Consider an ALB listener that might do a redirect or forward to a target group:

```hcl
variable "listener_actions" {
  type = list(object({
    type               = string # "forward" or "redirect"
    target_group_arn   = optional(string)
    redirect_host      = optional(string)
    redirect_port      = optional(string)
    redirect_protocol  = optional(string)
    redirect_status    = optional(string)
  }))
}

resource "aws_lb_listener" "main" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = var.certificate_arn

  # Default action - using the first action in the list
  default_action {
    type             = var.listener_actions[0].type
    target_group_arn = var.listener_actions[0].type == "forward" ? var.listener_actions[0].target_group_arn : null

    # Conditional redirect block - only appears for redirect actions
    dynamic "redirect" {
      for_each = var.listener_actions[0].type == "redirect" ? [var.listener_actions[0]] : []
      content {
        host        = redirect.value.redirect_host
        port        = redirect.value.redirect_port
        protocol    = redirect.value.redirect_protocol
        status_code = redirect.value.redirect_status
      }
    }
  }
}
```

The redirect block only exists when the action type is "redirect". For "forward" actions, `target_group_arn` is set and the redirect block is absent.

## Combining Multiple Conditional Dynamic Blocks

You can have multiple dynamic blocks where only one is active at a time. This is useful for resources with mutually exclusive nested blocks:

```hcl
variable "notification_type" {
  description = "Type of notification: email, sms, or webhook"
  type        = string
  default     = "email"
}

variable "notification_config" {
  type = object({
    email_address   = optional(string)
    phone_number    = optional(string)
    webhook_url     = optional(string)
  })
}

resource "aws_sns_topic_subscription" "main" {
  topic_arn = aws_sns_topic.main.arn

  # Protocol depends on the notification type
  protocol = var.notification_type == "email" ? "email" : (
    var.notification_type == "sms" ? "sms" : "https"
  )

  # Endpoint depends on the notification type
  endpoint = var.notification_type == "email" ? var.notification_config.email_address : (
    var.notification_type == "sms" ? var.notification_config.phone_number : var.notification_config.webhook_url
  )
}
```

While this specific example does not need dynamic blocks (SNS subscription attributes are flat), the pattern of conditional branching is the same one you would use inside a dynamic block's content.

## Filtering Items in for_each

Another powerful pattern is filtering the collection passed to `for_each`:

```hcl
variable "all_rules" {
  type = list(object({
    name     = string
    enabled  = bool
    port     = number
    protocol = string
    cidrs    = list(string)
  }))
}

resource "aws_security_group" "filtered" {
  name   = "filtered-rules-sg"
  vpc_id = var.vpc_id

  # Only create ingress rules for items where enabled is true
  dynamic "ingress" {
    for_each = [
      for rule in var.all_rules : rule
      if rule.enabled  # Filter condition
    ]
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidrs
      description = ingress.value.name
    }
  }
}
```

The `for` expression with an `if` clause filters out disabled rules before the dynamic block processes them. This is cleaner than putting conditional logic inside the content block.

## Conditional Content with Lookup Maps

When conditions get complex, a map lookup can be cleaner than nested ternaries:

```hcl
locals {
  # Map environment to its configuration
  env_settings = {
    production = {
      instance_type = "r5.xlarge"
      multi_az      = true
      backup_retention = 30
    }
    staging = {
      instance_type = "r5.large"
      multi_az      = false
      backup_retention = 7
    }
    development = {
      instance_type = "t3.medium"
      multi_az      = false
      backup_retention = 1
    }
  }

  # Get settings for the current environment
  current_settings = local.env_settings[var.environment]
}

resource "aws_db_instance" "main" {
  engine               = "postgres"
  instance_class       = "db.${local.current_settings.instance_type}"
  multi_az             = local.current_settings.multi_az
  backup_retention_period = local.current_settings.backup_retention

  # Conditional parameter group settings based on environment
  dynamic "parameter" {
    for_each = var.environment == "production" ? var.production_db_params : var.default_db_params
    content {
      name  = parameter.value.name
      value = parameter.value.value
    }
  }
}
```

## Error Handling with try()

When working with optional nested data, `try()` prevents errors when accessing potentially missing attributes:

```hcl
dynamic "tag" {
  for_each = var.resource_tags
  content {
    key   = tag.value.key
    value = tag.value.value
    # Safely handle missing propagate_at_launch attribute
    propagate_at_launch = try(tag.value.propagate_at_launch, true)
  }
}
```

The `try()` function returns the first expression that does not produce an error, falling back to the second argument.

## Summary

Conditional content in dynamic blocks boils down to a few patterns: controlling whether blocks appear with conditional `for_each`, setting individual attributes conditionally inside `content`, filtering collections with `for` expressions, and using `try()` for safe attribute access. These patterns compose well together and let you build flexible, reusable Terraform configurations. For more on handling optional blocks, see our guide on [dynamic blocks with optional nested blocks](https://oneuptime.com/blog/post/2026-02-23-how-to-use-dynamic-blocks-with-optional-nested-blocks/view).
