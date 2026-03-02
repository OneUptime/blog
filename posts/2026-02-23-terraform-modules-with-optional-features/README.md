# How to Create Terraform Modules with Optional Features

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Optional Features, IaC, Design Pattern

Description: Learn how to design Terraform modules with optional features using conditional resources, dynamic blocks, and optional variable attributes for maximum flexibility.

---

Not every deployment needs every feature. A development environment does not need multi-AZ databases, auto-scaling, or WAF rules. But a production environment needs all of them. If you build a module that always creates everything, developers complain about cost and complexity. If you build a minimal module, it is useless for production.

The solution is a module with optional features that callers can enable or disable based on their needs.

## The Core Pattern: Conditional Resources

The simplest way to make a feature optional is with `count`:

```hcl
variable "enable_monitoring" {
  description = "Enable CloudWatch monitoring"
  type        = bool
  default     = true
}

# Only created when monitoring is enabled
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  count = var.enable_monitoring ? 1 : 0

  alarm_name = "${var.name}-cpu-high"
  # ... configuration
}

resource "aws_cloudwatch_metric_alarm" "memory_high" {
  count = var.enable_monitoring ? 1 : 0

  alarm_name = "${var.name}-memory-high"
  # ... configuration
}
```

When `enable_monitoring` is `false`, neither alarm gets created. No cost, no clutter.

## Handling Outputs for Optional Resources

Optional resources complicate outputs because the resource might not exist:

```hcl
# This will fail when count is 0
# output "alarm_arn" {
#   value = aws_cloudwatch_metric_alarm.cpu_high.arn
# }

# Handle the optional case
output "alarm_arn" {
  description = "CPU alarm ARN (null if monitoring is disabled)"
  value       = var.enable_monitoring ? aws_cloudwatch_metric_alarm.cpu_high[0].arn : null
}
```

For lists of optional resources:

```hcl
output "alarm_arns" {
  description = "List of alarm ARNs"
  value       = aws_cloudwatch_metric_alarm.cpu_high[*].arn
}
```

The splat expression `[*]` returns an empty list when count is 0, which is clean and does not require a conditional.

## Using Dynamic Blocks for Optional Configuration

Some features are not separate resources but optional blocks within a resource. Use `dynamic` blocks for these:

```hcl
variable "vpc_config" {
  description = "VPC configuration. Set to null to run outside VPC."
  type = object({
    subnet_ids         = list(string)
    security_group_ids = list(string)
  })
  default = null
}

resource "aws_lambda_function" "this" {
  function_name = var.name
  # ... other configuration

  # VPC config is only added when vpc_config is provided
  dynamic "vpc_config" {
    for_each = var.vpc_config != null ? [var.vpc_config] : []

    content {
      subnet_ids         = vpc_config.value.subnet_ids
      security_group_ids = vpc_config.value.security_group_ids
    }
  }
}
```

## Optional Object Attributes

Terraform 1.3 introduced `optional()` for object type variables. This is incredibly useful for complex optional configurations:

```hcl
variable "database" {
  description = "Database configuration"
  type = object({
    engine         = string
    instance_class = string
    storage_gb     = optional(number, 20)
    multi_az       = optional(bool, false)
    backup_retention = optional(number, 7)

    # Optional read replica configuration
    read_replica = optional(object({
      instance_class = string
      count          = optional(number, 1)
    }), null)

    # Optional encryption
    encryption = optional(object({
      kms_key_id = string
    }), null)
  })
}
```

Callers only specify what they need:

```hcl
# Minimal - just engine and instance class
module "db" {
  source = "./modules/database"

  database = {
    engine         = "postgres"
    instance_class = "db.t3.micro"
  }
}

# Full featured
module "db_prod" {
  source = "./modules/database"

  database = {
    engine           = "postgres"
    instance_class   = "db.r6g.xlarge"
    storage_gb       = 500
    multi_az         = true
    backup_retention = 30

    read_replica = {
      instance_class = "db.r6g.large"
      count          = 2
    }

    encryption = {
      kms_key_id = aws_kms_key.db.arn
    }
  }
}
```

## Environment Presets Pattern

Instead of exposing every boolean flag, provide presets:

```hcl
variable "tier" {
  description = "Environment tier: minimal, standard, or hardened"
  type        = string
  default     = "standard"

  validation {
    condition     = contains(["minimal", "standard", "hardened"], var.tier)
    error_message = "tier must be minimal, standard, or hardened"
  }
}

locals {
  presets = {
    minimal = {
      multi_az           = false
      backup_retention   = 1
      enable_monitoring  = false
      enable_encryption  = false
      deletion_protection = false
    }
    standard = {
      multi_az           = false
      backup_retention   = 7
      enable_monitoring  = true
      enable_encryption  = true
      deletion_protection = false
    }
    hardened = {
      multi_az           = true
      backup_retention   = 35
      enable_monitoring  = true
      enable_encryption  = true
      deletion_protection = true
    }
  }

  # Use the preset, but allow individual overrides
  config = merge(local.presets[var.tier], {
    multi_az           = var.multi_az != null ? var.multi_az : local.presets[var.tier].multi_az
    backup_retention   = var.backup_retention != null ? var.backup_retention : local.presets[var.tier].backup_retention
  })
}
```

This gives callers a one-variable way to set many defaults while still allowing fine-grained overrides.

## Grouping Related Optional Features

When multiple resources belong to a single optional feature, group them:

```hcl
variable "enable_cdn" {
  description = "Enable CloudFront distribution in front of the application"
  type        = bool
  default     = false
}

# All CDN-related resources are gated on the same variable
resource "aws_cloudfront_distribution" "this" {
  count = var.enable_cdn ? 1 : 0
  # ...
}

resource "aws_cloudfront_origin_access_control" "this" {
  count = var.enable_cdn ? 1 : 0
  # ...
}

resource "aws_route53_record" "cdn" {
  count = var.enable_cdn ? 1 : 0
  # ...
}
```

Callers flip one switch and get the entire CDN setup.

## Whole-Module Optionality

Sometimes you want to make an entire module call optional:

```hcl
variable "create" {
  description = "Whether to create any resources in this module"
  type        = bool
  default     = true
}

resource "aws_instance" "this" {
  count = var.create ? 1 : 0
  # ...
}

resource "aws_security_group" "this" {
  count = var.create ? 1 : 0
  # ...
}
```

This pattern is used in many community modules. It lets callers conditionally include a module without wrapping it in a conditional expression (which Terraform does not support at the module level without `count` or `for_each`).

As of Terraform 1.5+, you can also use `count` and `for_each` directly on module blocks:

```hcl
module "monitoring" {
  source = "./modules/monitoring"
  count  = var.enable_monitoring ? 1 : 0

  name       = var.name
  cluster_id = module.ecs.cluster_id
}
```

## Avoiding Feature Creep

Optional features are powerful but addictive. Every time someone says "can the module also do X?", you add another flag. Eventually your module has 50 variables and supports 15 optional features.

Set a limit. If a feature does not fit the module's core purpose, it belongs in a separate module. A VPC module should not also manage CloudFront distributions just because someone wanted it to be optional.

For more module design patterns, see [how to create Terraform modules with feature flags](https://oneuptime.com/blog/post/2026-02-23-terraform-modules-with-feature-flags/view) and [how to develop Terraform modules with best practices](https://oneuptime.com/blog/post/2026-02-23-develop-terraform-modules-with-best-practices/view).
