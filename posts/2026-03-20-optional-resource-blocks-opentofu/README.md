# How to Create Optional Resource Blocks with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Optional, HCL, Module, Variable

Description: Learn how to create truly optional resource blocks in OpenTofu using optional() type constraints, null defaults, and count-based conditional creation patterns.

## Introduction

OpenTofu supports the `optional()` modifier for object type constraints (inherited from Terraform 1.3+), allowing object attributes to be omitted by callers. Combined with `count` and `dynamic` blocks, this enables rich optional configuration patterns in modules.

## Optional Object Attributes with optional()

```hcl
variable "database_config" {
  description = "Database configuration. All fields optional with defaults."
  type = object({
    enabled              = optional(bool, false)
    engine               = optional(string, "postgres")
    instance_class       = optional(string, "db.t3.micro")
    allocated_storage    = optional(number, 20)
    multi_az             = optional(bool, false)
    deletion_protection  = optional(bool, false)
    backup_retention     = optional(number, 7)
  })
  default = {}  # Empty object - all fields use their optional defaults
}

resource "aws_db_instance" "main" {
  # Only create the database if explicitly enabled
  count = var.database_config.enabled ? 1 : 0

  engine                 = var.database_config.engine
  instance_class         = var.database_config.instance_class
  allocated_storage      = var.database_config.allocated_storage
  multi_az               = var.database_config.multi_az
  deletion_protection    = var.database_config.deletion_protection
  backup_retention_period = var.database_config.backup_retention

  identifier = "app-database"
  username   = var.db_username
  password   = var.db_password
}
```

## Optional Nested Blocks via null Detection

Use `null` as a sentinel value to indicate "omit this block."

```hcl
variable "cdn_config" {
  description = "CloudFront CDN configuration. Set to null to skip CDN creation."
  type = object({
    enabled         = bool
    price_class     = string
    aliases         = list(string)
    certificate_arn = string
  })
  default = null  # null = no CDN
}

resource "aws_cloudfront_distribution" "app" {
  # Create CloudFront distribution only when cdn_config is provided
  count = var.cdn_config != null ? 1 : 0

  enabled     = var.cdn_config.enabled
  price_class = var.cdn_config.price_class
  aliases     = var.cdn_config.aliases

  origin {
    domain_name = aws_lb.app.dns_name
    origin_id   = "alb-origin"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "alb-origin"
    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
  }

  viewer_certificate {
    acm_certificate_arn = var.cdn_config.certificate_arn
    ssl_support_method  = "sni-only"
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }
}
```

## Optional Module Configuration with try()

Use `try()` to safely access potentially missing configuration.

```hcl
variable "observability" {
  type = object({
    metrics  = optional(object({ enabled = bool, namespace = string }))
    tracing  = optional(object({ enabled = bool, sample_rate = number }))
    logging  = optional(object({ enabled = bool, retention_days = number }))
  })
  default = {}
}

locals {
  # Safely extract optional nested configs with defaults
  metrics_enabled   = try(var.observability.metrics.enabled, false)
  tracing_enabled   = try(var.observability.tracing.enabled, false)
  logging_enabled   = try(var.observability.logging.enabled, true)
  log_retention     = try(var.observability.logging.retention_days, 14)
}

resource "aws_cloudwatch_log_group" "app" {
  count             = local.logging_enabled ? 1 : 0
  name              = "/app/logs"
  retention_in_days = local.log_retention
}
```

## Conclusion

Combining `optional()` type constraints with `count` and `try()` creates intuitive module interfaces where callers only need to specify what they want to customize. Sensible defaults fill in the rest, reducing boilerplate in calling configurations while keeping the module flexible.
