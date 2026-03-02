# How to Create Terraform Modules with Feature Flags

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Feature Flags, IaC, Design Pattern

Description: Learn how to implement feature flags in Terraform modules for toggling infrastructure capabilities, gradual rollouts, and environment-specific configurations.

---

Feature flags in application code let you toggle functionality without deploying new code. The same concept applies to Terraform modules. A feature flag in a module lets callers turn infrastructure capabilities on or off, control rollout of new features, and configure different infrastructure profiles for different environments.

This goes beyond simple boolean variables. A good feature flag system in Terraform handles interdependencies between features, validates that flag combinations are valid, and provides sensible defaults.

## Simple Feature Flags

The basic pattern is a boolean variable that gates resource creation:

```hcl
variable "features" {
  description = "Feature flags for the module"
  type = object({
    enable_waf        = optional(bool, false)
    enable_cdn        = optional(bool, false)
    enable_monitoring = optional(bool, true)
    enable_backups    = optional(bool, true)
    enable_autoscaling = optional(bool, false)
  })
  default = {}
}
```

Using a single `features` object instead of separate variables has advantages. It is immediately clear which variables are feature flags versus configuration values, and the object has a clear default that represents the baseline behavior.

```hcl
# Usage - callers pick exactly what they need
module "api_service" {
  source = "./modules/app-service"

  name = "api"
  # ... other config

  features = {
    enable_waf         = true
    enable_cdn         = true
    enable_monitoring  = true
    enable_autoscaling = true
  }
}
```

## Implementing Feature-Gated Resources

Each feature flag controls a set of resources:

```hcl
# WAF resources - only created when WAF is enabled
resource "aws_wafv2_web_acl" "this" {
  count = var.features.enable_waf ? 1 : 0

  name  = "${var.name}-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Rate limiting rule
  rule {
    name     = "rate-limit"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.name}-rate-limit"
    }
  }

  visibility_config {
    sampled_requests_enabled   = true
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.name}-waf"
  }
}

# Associate WAF with ALB
resource "aws_wafv2_web_acl_association" "this" {
  count = var.features.enable_waf ? 1 : 0

  resource_arn = aws_lb.this.arn
  web_acl_arn  = aws_wafv2_web_acl.this[0].arn
}
```

## Feature Dependencies

Some features depend on other features. Auto-scaling requires monitoring to function properly. CDN requires DNS. Handle these dependencies with validation:

```hcl
variable "features" {
  type = object({
    enable_monitoring  = optional(bool, true)
    enable_autoscaling = optional(bool, false)
    enable_cdn         = optional(bool, false)
    enable_dns         = optional(bool, false)
  })
  default = {}

  # Validate that feature dependencies are met
  validation {
    condition = !(var.features.enable_autoscaling && !var.features.enable_monitoring)
    error_message = "Auto-scaling requires monitoring to be enabled."
  }

  validation {
    condition = !(var.features.enable_cdn && !var.features.enable_dns)
    error_message = "CDN requires DNS to be enabled for custom domains."
  }
}
```

This gives callers clear error messages instead of cryptic Terraform failures.

## Feature Flag Presets

For common combinations, provide preset profiles:

```hcl
variable "feature_profile" {
  description = "Predefined feature profiles: development, staging, production"
  type        = string
  default     = null

  validation {
    condition     = var.feature_profile == null || contains(["development", "staging", "production"], var.feature_profile)
    error_message = "feature_profile must be development, staging, or production"
  }
}

locals {
  # Predefined feature profiles
  feature_profiles = {
    development = {
      enable_waf         = false
      enable_cdn         = false
      enable_monitoring  = false
      enable_backups     = false
      enable_autoscaling = false
    }
    staging = {
      enable_waf         = true
      enable_cdn         = false
      enable_monitoring  = true
      enable_backups     = true
      enable_autoscaling = false
    }
    production = {
      enable_waf         = true
      enable_cdn         = true
      enable_monitoring  = true
      enable_backups     = true
      enable_autoscaling = true
    }
  }

  # Use profile if specified, otherwise use individual feature flags
  effective_features = var.feature_profile != null ? local.feature_profiles[var.feature_profile] : var.features
}
```

Callers can choose a profile for simplicity or set individual flags for customization:

```hcl
# Simple: use a profile
module "api" {
  source          = "./modules/app-service"
  name            = "api"
  feature_profile = "production"
}

# Custom: pick individual features
module "internal_tool" {
  source = "./modules/app-service"
  name   = "admin-panel"

  features = {
    enable_monitoring = true
    enable_backups    = true
    # Everything else stays at default (false)
  }
}
```

## Gradual Feature Rollout

Feature flags are useful for rolling out new infrastructure capabilities gradually. Suppose you are adding a new caching layer to your service module:

```hcl
variable "features" {
  type = object({
    # Existing features
    enable_monitoring = optional(bool, true)

    # New feature - default to false initially
    enable_redis_cache = optional(bool, false)
  })
  default = {}
}

# Redis cluster - new feature being rolled out
resource "aws_elasticache_replication_group" "cache" {
  count = var.features.enable_redis_cache ? 1 : 0

  replication_group_id = "${var.name}-cache"
  description          = "Redis cache for ${var.name}"
  node_type            = "cache.t3.micro"
  num_cache_clusters   = 2

  # ... configuration
}
```

You start by enabling it for one non-critical service:

```hcl
module "search_service" {
  source = "./modules/app-service"
  name   = "search"

  features = {
    enable_redis_cache = true  # Testing the new cache
  }
}
```

Once validated, you enable it more broadly by changing the default to `true` in a new module version.

## Feature Flags for Configuration Variants

Feature flags can also control how resources are configured, not just whether they exist:

```hcl
variable "features" {
  type = object({
    enable_enhanced_networking = optional(bool, false)
    enable_spot_instances      = optional(bool, false)
  })
  default = {}
}

resource "aws_launch_template" "this" {
  name_prefix = "${var.name}-"
  image_id    = var.ami_id

  # Different network interface config based on feature flag
  network_interfaces {
    associate_public_ip_address = false
    security_groups             = var.security_group_ids

    # Enhanced networking uses a different interface type
    interface_type = var.features.enable_enhanced_networking ? "efa" : null
  }

  # Spot configuration only when enabled
  dynamic "instance_market_options" {
    for_each = var.features.enable_spot_instances ? [1] : []

    content {
      market_type = "spot"

      spot_options {
        max_price          = var.spot_max_price
        spot_instance_type = "one-time"
      }
    }
  }
}
```

## Documenting Feature Flags

Document each feature flag clearly in your README:

```markdown
## Feature Flags

| Flag | Default | Description | Dependencies |
|------|---------|-------------|--------------|
| enable_waf | false | Creates a WAF web ACL with rate limiting | None |
| enable_cdn | false | Creates a CloudFront distribution | enable_dns |
| enable_monitoring | true | Creates CloudWatch alarms and dashboards | None |
| enable_autoscaling | false | Enables ECS service auto-scaling | enable_monitoring |
| enable_backups | true | Enables automated backups | None |
```

Feature flags make your modules flexible without making them complicated. The caller sees a simple list of capabilities they can toggle, while the module handles all the complexity of conditional resource creation and configuration.

For the broader picture on optional infrastructure, see [how to create Terraform modules with optional features](https://oneuptime.com/blog/post/2026-02-23-terraform-modules-with-optional-features/view).
