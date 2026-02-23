# How to Mark Variables as Nullable in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Variables, HCL, Infrastructure as Code, Configuration

Description: Learn how to use the nullable argument on Terraform variables to control whether a variable can accept null values and how this affects default value behavior.

---

Terraform variables have a lesser-known argument called `nullable` that controls whether a variable can accept `null` as a valid value. This might sound like a minor detail, but it has real implications for how your modules behave, especially when you are building reusable modules where callers might intentionally pass `null` to opt out of a feature.

This post explains what `nullable` does, when you would want to change it from its default, and how it interacts with default values.

## The Default Behavior

By default, every Terraform variable has `nullable = true`. This means the caller can explicitly set the variable to `null`, and Terraform will accept it. When a variable is set to `null` and it has a default value, Terraform uses the default. When there is no default, the variable simply holds `null`.

```hcl
# variables.tf

# By default, nullable is true.
# If someone passes null, Terraform uses the default.
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
  # nullable = true (this is the implicit default)
}
```

With this variable, the following are all valid:

```hcl
# Explicitly providing a value
module "app" {
  source        = "./modules/app"
  instance_type = "t3.large"
}

# Explicitly passing null - Terraform falls back to default "t3.micro"
module "app" {
  source        = "./modules/app"
  instance_type = null
}

# Not providing it at all - Terraform uses default "t3.micro"
module "app" {
  source = "./modules/app"
}
```

In both the second and third cases, `var.instance_type` evaluates to `"t3.micro"`.

## Setting nullable = false

When you set `nullable = false`, Terraform will not accept `null` as a value for that variable. If someone tries to pass `null`, Terraform raises an error.

```hcl
# variables.tf

variable "environment" {
  description = "Deployment environment name"
  type        = string
  nullable    = false
  default     = "dev"
}
```

With `nullable = false`, attempting to pass `null` produces an error:

```
Error: Invalid value for variable

The given value is not suitable for variable "environment":
required variable may not be set to null.
```

This is useful when your module logic assumes the variable always has a real value and would break if it received `null`.

## When nullable Matters

The `nullable` flag becomes important in a few specific scenarios.

### Scenario 1: Conditional Resource Creation

A common Terraform pattern uses `null` to indicate "do not set this attribute." But if you have a variable where `null` should trigger a default instead of being passed through, `nullable` behavior is relevant.

```hcl
# With nullable = true (the default), null passes through
variable "custom_domain" {
  description = "Custom domain for the CloudFront distribution"
  type        = string
  default     = null
  # nullable = true is implicit
}

resource "aws_cloudfront_distribution" "cdn" {
  # When custom_domain is null, this block is skipped
  dynamic "viewer_certificate" {
    for_each = var.custom_domain != null ? [1] : []
    content {
      acm_certificate_arn = aws_acm_certificate.cert[0].arn
      ssl_support_method  = "sni-only"
    }
  }

  # Other configuration...
  enabled             = true
  default_root_object = "index.html"

  origin {
    domain_name = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id   = "s3-origin"
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-origin"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.custom_domain == null
  }
}
```

Here, `null` is a meaningful value that means "no custom domain." You want `nullable = true` (the default) so callers can explicitly pass `null`.

### Scenario 2: Protecting Module Internals

When you build a module where a variable must always have a concrete value, set `nullable = false` to prevent unexpected nulls.

```hcl
# modules/vpc/variables.tf

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  nullable    = false
  # No default - the caller must provide a real value

  validation {
    condition     = can(cidrnetmask(var.vpc_cidr))
    error_message = "Must be a valid CIDR block."
  }
}

variable "name_prefix" {
  description = "Prefix for all resource names"
  type        = string
  nullable    = false
  # No default - the caller must provide this
}
```

Without `nullable = false`, a caller could do this:

```hcl
module "vpc" {
  source     = "./modules/vpc"
  vpc_cidr   = null  # This would be accepted!
  name_prefix = null
}
```

That would cause confusing downstream errors when Terraform tries to use `null` in a `cidrsubnet()` call or string interpolation. With `nullable = false`, the error message is clear and immediate.

### Scenario 3: Optional Feature Flags with Safe Defaults

```hcl
variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 30
  nullable    = false
}
```

By setting `nullable = false` here, you guarantee that even if someone writes `log_retention_days = null` in their tfvars file or module call, Terraform will reject it rather than silently passing `null` downstream.

## How nullable Interacts with Defaults

The interaction between `nullable` and `default` can be subtle. Here is a breakdown:

| nullable | default | Caller passes null | Result |
|----------|---------|-------------------|--------|
| true (default) | set | yes | Uses the default value |
| true (default) | not set | yes | Variable is null |
| false | set | yes | Error |
| false | not set | yes | Error |

```hcl
# Example: nullable = true with a default
variable "tags" {
  type     = map(string)
  default  = {}
  nullable = true
}
# Passing null results in {} (the default)

# Example: nullable = false with a default
variable "region" {
  type     = string
  default  = "us-east-1"
  nullable = false
}
# Passing null results in an error
```

## Using nullable with Complex Types

The `nullable` flag works with all variable types, including complex ones.

```hcl
# A list variable that must not be null
variable "availability_zones" {
  description = "List of AZs to use for resources"
  type        = list(string)
  nullable    = false
  default     = ["us-east-1a", "us-east-1b"]
}

# A map variable that can be null to indicate
# "do not create these resources"
variable "notification_config" {
  description = "SNS notification settings, or null to disable"
  type = object({
    topic_arn   = string
    protocol    = string
    endpoint    = string
  })
  default  = null
  nullable = true
}

# Usage in resources
resource "aws_sns_topic_subscription" "notifications" {
  count = var.notification_config != null ? 1 : 0

  topic_arn = var.notification_config.topic_arn
  protocol  = var.notification_config.protocol
  endpoint  = var.notification_config.endpoint
}
```

## A Practical Module Example

Here is a complete module that uses `nullable` thoughtfully:

```hcl
# modules/web-app/variables.tf

# Required variables - must not be null
variable "app_name" {
  description = "Name of the application"
  type        = string
  nullable    = false
}

variable "container_image" {
  description = "Docker image for the application"
  type        = string
  nullable    = false
}

# Optional variables with safe defaults - also not nullable
variable "container_port" {
  description = "Port the container listens on"
  type        = number
  default     = 8080
  nullable    = false
}

variable "cpu" {
  description = "CPU units for the ECS task"
  type        = number
  default     = 256
  nullable    = false
}

variable "memory" {
  description = "Memory in MB for the ECS task"
  type        = number
  default     = 512
  nullable    = false
}

# Optional variables where null means "disabled"
variable "custom_domain" {
  description = "Custom domain name, or null to skip"
  type        = string
  default     = null
  # nullable = true (implicit, and desired here)
}

variable "alarm_sns_topic_arn" {
  description = "SNS topic for CloudWatch alarms, or null to skip alarms"
  type        = string
  default     = null
  # nullable = true (implicit, and desired here)
}
```

```hcl
# modules/web-app/main.tf

resource "aws_ecs_service" "app" {
  name            = var.app_name
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [aws_security_group.app.id]
    assign_public_ip = false
  }
}

# Only created when custom_domain is provided
resource "aws_route53_record" "app" {
  count   = var.custom_domain != null ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = var.custom_domain
  type    = "A"

  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }
}

# Only created when alarm topic is provided
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  count = var.alarm_sns_topic_arn != null ? 1 : 0

  alarm_name          = "${var.app_name}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80

  alarm_actions = [var.alarm_sns_topic_arn]
}
```

## Best Practices

1. **Use `nullable = false` for required inputs.** If your module cannot function with a `null` value, make that explicit.

2. **Use `nullable = true` (the default) for optional features.** When `null` means "skip this feature," leave the default nullable behavior and use `default = null`.

3. **Document the meaning of null.** When a variable accepts `null`, explain what happens in that case in the description.

4. **Combine with validation.** Even with `nullable = false`, add validation rules to catch other kinds of bad input.

```hcl
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  nullable    = false

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}
```

## Wrapping Up

The `nullable` argument gives you fine-grained control over whether your Terraform variables can accept `null`. By default, all variables are nullable, which means callers can pass `null` and Terraform will fall back to the default value (if one exists). Setting `nullable = false` is a defensive practice that prevents confusing errors deeper in your configuration and makes your module's contract clearer. Use it for any variable where `null` does not make sense as an input.

For more on structuring your Terraform variables effectively, check out our post on [Terraform variables and outputs](https://oneuptime.com/blog/post/2026-01-26-terraform-variables-outputs/view).
