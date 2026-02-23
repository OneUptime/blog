# How to Use Locals with Conditional Logic in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Locals, Conditional Logic, Infrastructure as Code

Description: Learn how to use Terraform locals with conditional expressions, ternary operators, and map lookups to build flexible infrastructure configurations that adapt to different environments.

---

Conditional logic is everywhere in Terraform. You need different instance sizes for production and development. You need to enable features in some environments but not others. You need to choose between resource configurations based on input variables. Locals give you a clean way to express all of this without cluttering your resource blocks.

This post covers the patterns for using conditional logic in Terraform locals, from simple ternary expressions to complex multi-condition lookups.

## The Ternary Operator in Locals

The most basic conditional in Terraform is the ternary operator: `condition ? true_value : false_value`. Putting it in a local gives it a descriptive name.

```hcl
variable "environment" {
  type    = string
  default = "dev"
}

locals {
  # Simple boolean conditional
  is_production = var.environment == "production"

  # Ternary to select a value
  instance_type = local.is_production ? "m5.xlarge" : "t3.micro"

  # Ternary for enabling/disabling features
  enable_multi_az    = local.is_production ? true : false
  enable_monitoring  = local.is_production ? true : false
  deletion_protection = local.is_production ? true : false

  # Ternary for numeric values
  min_capacity = local.is_production ? 3 : 1
  max_capacity = local.is_production ? 10 : 2
}

resource "aws_rds_instance" "main" {
  identifier     = "${var.project}-${var.environment}-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.${local.instance_type}"
  multi_az       = local.enable_multi_az

  deletion_protection = local.deletion_protection
}
```

Notice how `is_production` is computed once and then reused in multiple places. If the condition for "what counts as production" changes, you update one line.

## Map Lookups Instead of Nested Ternaries

When you have more than two options, nested ternaries get ugly fast. Use a map lookup instead.

```hcl
# Bad - nested ternaries are hard to read
locals {
  instance_type = var.environment == "production" ? "m5.xlarge" : (var.environment == "staging" ? "m5.large" : (var.environment == "qa" ? "t3.large" : "t3.micro"))
}

# Good - map lookup is clear and extensible
locals {
  instance_types = {
    production = "m5.xlarge"
    staging    = "m5.large"
    qa         = "t3.large"
    dev        = "t3.micro"
  }

  # Look up the value, with a fallback default
  instance_type = lookup(local.instance_types, var.environment, "t3.micro")
}
```

The `lookup` function returns the value for the given key, or the default (third argument) if the key does not exist. This makes your code safe against unexpected environment names.

## Conditional Feature Flags

A common pattern is to use locals as feature flags that control whether certain resources or configurations are included.

```hcl
variable "environment" {
  type = string
}

variable "enable_waf" {
  type    = bool
  default = null  # null means "auto-decide based on environment"
}

locals {
  # If the user explicitly set enable_waf, use that value.
  # Otherwise, enable WAF in production and staging only.
  enable_waf = coalesce(
    var.enable_waf,
    contains(["production", "staging"], var.environment)
  )

  # Enable VPN only in production
  enable_vpn = var.environment == "production"

  # Enable detailed monitoring in production and staging
  enable_detailed_monitoring = contains(["production", "staging"], var.environment)

  # Enable debug logging only in dev
  log_level = var.environment == "dev" ? "DEBUG" : "INFO"
}

# Conditionally create WAF resources
resource "aws_wafv2_web_acl" "main" {
  count = local.enable_waf ? 1 : 0

  name  = "${var.project}-${var.environment}-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project}-waf"
    sampled_requests_enabled   = true
  }
}
```

The `count = local.enable_waf ? 1 : 0` pattern creates the resource when the flag is true and skips it when false.

## Conditional Map Merging

Sometimes you want to include extra configuration only under certain conditions. Conditional map merging handles this nicely.

```hcl
locals {
  # Base configuration that always applies
  base_config = {
    engine         = "postgres"
    engine_version = "15.4"
    port           = 5432
  }

  # Production-specific settings
  production_config = local.is_production ? {
    multi_az                = true
    backup_retention_period = 30
    deletion_protection     = true
    storage_encrypted       = true
    performance_insights    = true
  } : {}

  # Development-specific settings
  dev_config = var.environment == "dev" ? {
    skip_final_snapshot = true
    apply_immediately   = true
  } : {}

  # Merge everything together
  db_config = merge(
    local.base_config,
    local.production_config,
    local.dev_config
  )
}
```

When `is_production` is false, `production_config` is an empty map, so the merge effectively skips those settings.

## Conditional List Construction

You can build lists conditionally using `concat` and ternary operators:

```hcl
locals {
  # Base security group rules
  base_ingress_rules = [
    {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTPS"
    }
  ]

  # Only add SSH access in non-production environments
  ssh_rules = var.environment != "production" ? [
    {
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = [var.vpn_cidr]
      description = "SSH from VPN"
    }
  ] : []

  # Only add debug port in dev
  debug_rules = var.environment == "dev" ? [
    {
      from_port   = 9090
      to_port     = 9090
      protocol    = "tcp"
      cidr_blocks = [var.office_cidr]
      description = "Debug port"
    }
  ] : []

  # Combine all applicable rules
  ingress_rules = concat(
    local.base_ingress_rules,
    local.ssh_rules,
    local.debug_rules
  )
}
```

## Using try() for Safe Conditional Access

The `try` function lets you attempt an expression and fall back to a default if it fails. This is useful for conditional access to nested structures.

```hcl
variable "overrides" {
  type    = any
  default = {}
}

locals {
  # Safely access nested values that may not exist
  custom_instance_type = try(var.overrides.compute.instance_type, null)
  custom_disk_size     = try(var.overrides.compute.disk_size_gb, null)

  # Use override if provided, otherwise compute from environment
  instance_type = coalesce(
    local.custom_instance_type,
    lookup(local.instance_types, var.environment, "t3.micro")
  )

  disk_size = coalesce(
    local.custom_disk_size,
    local.is_production ? 100 : 20
  )
}
```

The `coalesce` function returns the first non-null value from its arguments, which pairs well with `try` for optional overrides.

## Complex Multi-Condition Logic

For complex decisions that depend on multiple inputs, locals let you build up the logic step by step.

```hcl
variable "environment" {
  type = string
}

variable "region" {
  type = string
}

variable "compliance_level" {
  type    = string
  default = "standard"  # "standard" or "hipaa" or "pci"
}

locals {
  is_production = var.environment == "production"
  is_us_region  = startswith(var.region, "us-")
  is_compliant  = contains(["hipaa", "pci"], var.compliance_level)

  # Encryption is required if production, or compliant, or in US region
  require_encryption = local.is_production || local.is_compliant || local.is_us_region

  # KMS key type depends on compliance level
  kms_key_spec = local.is_compliant ? "SYMMETRIC_DEFAULT" : "SYMMETRIC_DEFAULT"

  # Backup retention depends on both environment and compliance
  backup_retention_days = (
    local.is_compliant ? 365 :
    local.is_production ? 30 :
    7
  )

  # Log retention follows similar logic
  log_retention_days = (
    local.is_compliant ? 2555 :  # 7 years
    local.is_production ? 365 :
    30
  )

  # VPC flow logs required for compliant and production environments
  enable_flow_logs = local.is_production || local.is_compliant
}
```

Note the multi-line ternary pattern using parentheses. Each line reads like "if compliant then X, else if production then Y, else Z." This is cleaner than nesting ternaries on a single line.

## Conditional Resource Configuration Objects

For resources with many conditional fields, you can compute the entire configuration object in a local:

```hcl
locals {
  # Build the complete ECS service config based on environment
  ecs_config = {
    desired_count = local.is_production ? 3 : 1

    deployment_configuration = {
      maximum_percent         = local.is_production ? 200 : 100
      minimum_healthy_percent = local.is_production ? 100 : 0
    }

    capacity_provider = local.is_production ? "FARGATE" : "FARGATE_SPOT"

    enable_execute_command = !local.is_production

    health_check_grace_period = local.is_production ? 120 : 30
  }
}

resource "aws_ecs_service" "app" {
  name            = "${var.project}-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = local.ecs_config.desired_count

  capacity_provider_strategy {
    capacity_provider = local.ecs_config.capacity_provider
    weight            = 1
  }

  deployment_maximum_percent         = local.ecs_config.deployment_configuration.maximum_percent
  deployment_minimum_healthy_percent = local.ecs_config.deployment_configuration.minimum_healthy_percent

  enable_execute_command    = local.ecs_config.enable_execute_command
  health_check_grace_period_seconds = local.ecs_config.health_check_grace_period
}
```

## Summary

Conditional logic in locals gives you a centralized, testable place to make decisions about your infrastructure configuration. Start with simple ternaries for two-option choices, graduate to map lookups for multi-option scenarios, and use `merge` and `concat` for conditionally building complex objects and lists. The key benefit is that your resource blocks stay focused on describing infrastructure while locals handle the decision-making.

For more patterns with locals, check out our post on [simplifying complex expressions with locals](https://oneuptime.com/blog/post/2026-02-23-how-to-use-locals-to-simplify-complex-expressions/view).
