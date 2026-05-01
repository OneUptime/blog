# How to Use the enabled Meta-Argument Introduced in OpenTofu 1.11

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Enabled Meta-Argument, OpenTofu 1.11, Conditional, Infrastructure as Code

Description: Learn how to use the enabled meta-argument introduced in OpenTofu 1.11 as a cleaner alternative to count = 0 for conditionally disabling resources.

## Introduction

OpenTofu 1.11 introduced the `enabled` meta-argument as a first-class way to conditionally disable a resource or module. Previously, the idiomatic pattern was `count = var.create_resource ? 1 : 0`, which works but produces indexed resource addresses and requires awkward `[0]` references throughout the code. The `enabled` meta-argument provides the same capability with cleaner syntax.

## Basic Usage

Use `enabled` to conditionally create a resource.

```hcl
variable "enable_waf" {
  type    = bool
  default = true
}

resource "aws_wafv2_web_acl" "main" {
  name  = "myapp-waf"
  scope = "REGIONAL"

  lifecycle {
    enabled = var.enable_waf
  }

  default_action {
    allow {}
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "myapp-waf"
    sampled_requests_enabled   = true
  }
}
```

## Comparing enabled vs count

The `enabled` meta-argument avoids index-based resource addresses.

```hcl
# Old pattern with count

resource "aws_cloudwatch_log_group" "app_old" {
  count = var.enable_logging ? 1 : 0
  name  = "/myapp/application"
}

# Reference requires [0] index
output "log_group_arn_old" {
  value = var.enable_logging ? aws_cloudwatch_log_group.app_old[0].arn : null
}

# New pattern with enabled
resource "aws_cloudwatch_log_group" "app" {
  name = "/myapp/application"

  lifecycle {
    enabled = var.enable_logging
  }
}

# Reference is clean - no index needed
output "log_group_arn" {
  value = aws_cloudwatch_log_group.app != null ? aws_cloudwatch_log_group.app.arn : null
}
```

## Using enabled on Modules

Conditionally enable an entire module.

```hcl
variable "enable_monitoring" {
  type    = bool
  default = true
}

module "prometheus" {
  source = "./modules/prometheus"

  cluster_name = var.cluster_name
  namespace    = "monitoring"

  lifecycle {
    enabled = var.enable_monitoring
  }
}
```

## Environment-Based Enabling

Enable resources based on the target environment.

```hcl
variable "environment" {
  type = string
}

resource "aws_shield_protection" "main" {
  # Only enable DDoS protection in production (it costs $3000/month)
  name         = "myapp-shield"
  resource_arn = aws_lb.main.arn

  lifecycle {
    enabled = var.environment == "prod"
  }
}

resource "aws_backup_plan" "daily" {
  # Enable backups in prod and staging, skip in dev
  name = "myapp-${var.environment}-backup"

  lifecycle {
    enabled = contains(["prod", "staging"], var.environment)
  }

  rule {
    rule_name         = "daily"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 2 * * ? *)"
  }
}
```

## Feature Flag Pattern

Use a map of feature flags to enable or disable multiple resources.

```hcl
variable "features" {
  type = object({
    waf              = bool
    shield           = bool
    enhanced_logging = bool
    backup           = bool
  })
  default = {
    waf              = true
    shield           = false
    enhanced_logging = true
    backup           = true
  }
}

resource "aws_wafv2_web_acl" "main" {
  lifecycle {
    enabled = var.features.waf
  }
  # ...
}

resource "aws_cloudwatch_log_group" "enhanced" {
  name              = "/myapp/enhanced"
  retention_in_days = 90

  lifecycle {
    enabled = var.features.enhanced_logging
  }
}
```

## Summary

The `enabled` meta-argument in OpenTofu 1.11 is a cleaner way to conditionally create resources and modules compared to `count = condition ? 1 : 0`. It preserves simple resource addresses without the `[0]` suffix, making outputs and references throughout your configuration easier to read. Migrate new conditional resources to use `enabled`; existing `count`-based patterns continue to work as before.
