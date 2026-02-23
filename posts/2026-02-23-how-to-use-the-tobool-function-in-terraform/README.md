# How to Use the tobool Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, DevOps, Terraform Functions, Type Conversion

Description: Learn how to use the tobool function in Terraform to convert string values into boolean types for feature flags, conditional logic, and configuration toggles.

---

Feature flags, conditional resource creation, and configuration toggles are staples of Terraform code. But when boolean values arrive as strings (from environment variables, parameter stores, or maps), you need a way to convert them properly. That is what `tobool` does.

## What is tobool?

The `tobool` function converts a string value to a boolean. It accepts `"true"` and `"false"` as valid inputs.

```hcl
# Convert string to boolean
> tobool("true")
true

> tobool("false")
false

# Already a boolean - returns as-is
> tobool(true)
true
```

The syntax:

```hcl
tobool(value)
```

## What Strings Are Valid?

Only two string values are accepted:

```hcl
# These work
> tobool("true")
true

> tobool("false")
false

# These do NOT work
# tobool("yes")     # Error!
# tobool("no")      # Error!
# tobool("1")       # Error!
# tobool("0")       # Error!
# tobool("TRUE")    # Error!
# tobool("True")    # Error!
# tobool("")        # Error!
```

This is strict by design. Terraform does not want ambiguous boolean conversions.

## Why Do You Need tobool?

The most common scenario is when boolean configuration comes from string sources:

1. **Environment variables** - Always strings in Terraform
2. **SSM Parameters / Secrets Manager** - Return string values
3. **Map lookups** - `map(string)` values are all strings
4. **Terraform Cloud workspace variables** - Can be strings
5. **Input from external data sources** - Often returns strings

## Converting Environment Variables

```hcl
# This variable is often set via TF_VAR_enable_monitoring="true"
variable "enable_monitoring" {
  type    = string
  default = "true"
}

locals {
  monitoring_enabled = tobool(var.enable_monitoring)
}

# Use the boolean for conditional resource creation
resource "aws_cloudwatch_metric_alarm" "cpu" {
  count = local.monitoring_enabled ? 1 : 0

  alarm_name          = "high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
}
```

## Feature Flags from Maps

A common pattern is storing feature flags in a map:

```hcl
variable "feature_flags" {
  type = map(string)
  default = {
    enable_ssl          = "true"
    enable_monitoring   = "true"
    enable_auto_scaling = "false"
    enable_cdn          = "true"
    enable_waf          = "false"
  }
}

locals {
  ssl_enabled     = tobool(var.feature_flags["enable_ssl"])
  cdn_enabled     = tobool(var.feature_flags["enable_cdn"])
  waf_enabled     = tobool(var.feature_flags["enable_waf"])
  scaling_enabled = tobool(var.feature_flags["enable_auto_scaling"])
}

# CDN distribution - only if enabled
resource "aws_cloudfront_distribution" "main" {
  count   = local.cdn_enabled ? 1 : 0
  enabled = true
  # ... configuration
}

# WAF - only if enabled
resource "aws_wafv2_web_acl" "main" {
  count = local.waf_enabled ? 1 : 0
  name  = "main-waf"
  scope = "REGIONAL"
  # ... configuration
}
```

## Reading from SSM Parameters

```hcl
data "aws_ssm_parameter" "maintenance_mode" {
  name = "/app/maintenance-mode"
}

locals {
  # SSM parameter value is always a string
  maintenance_mode = tobool(data.aws_ssm_parameter.maintenance_mode.value)
}

resource "aws_route53_health_check" "app" {
  count = local.maintenance_mode ? 0 : 1

  fqdn              = "app.example.com"
  port               = 443
  type               = "HTTPS"
  resource_path      = "/health"
  failure_threshold  = 3
  request_interval   = 30
}
```

## tobool with try for Safe Defaults

When you are not sure if the string value will be valid, use `try`:

```hcl
variable "optional_flag" {
  type    = string
  default = ""
}

locals {
  # Falls back to false if conversion fails
  flag_value = try(tobool(var.optional_flag), false)
}
```

## Validation with tobool

Use `tobool` in variable validation to ensure inputs are valid booleans:

```hcl
variable "debug_mode" {
  type        = string
  description = "Enable debug mode (true/false)"

  validation {
    condition     = can(tobool(var.debug_mode))
    error_message = "debug_mode must be 'true' or 'false'."
  }
}
```

## Conditional Resource Blocks with tobool

```hcl
variable "settings" {
  type = map(string)
  default = {
    create_vpc      = "true"
    create_nat      = "true"
    create_igw      = "true"
    enable_flow_log = "false"
  }
}

resource "aws_vpc" "main" {
  count      = tobool(var.settings["create_vpc"]) ? 1 : 0
  cidr_block = "10.0.0.0/16"

  tags = {
    Name = "main-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  count  = tobool(var.settings["create_igw"]) ? 1 : 0
  vpc_id = aws_vpc.main[0].id
}

resource "aws_nat_gateway" "main" {
  count         = tobool(var.settings["create_nat"]) ? 1 : 0
  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id
}

resource "aws_flow_log" "main" {
  count          = tobool(var.settings["enable_flow_log"]) ? 1 : 0
  vpc_id         = aws_vpc.main[0].id
  traffic_type   = "ALL"
  log_destination = aws_cloudwatch_log_group.flow_log[0].arn
  iam_role_arn   = aws_iam_role.flow_log[0].arn
}
```

## tobool in Dynamic Blocks

```hcl
variable "logging_config" {
  type = map(string)
  default = {
    enabled     = "true"
    bucket_name = "my-logs-bucket"
    prefix      = "lb-logs"
  }
}

resource "aws_lb" "main" {
  name               = "main-lb"
  internal           = false
  load_balancer_type = "application"
  subnets            = var.public_subnet_ids

  dynamic "access_logs" {
    for_each = tobool(var.logging_config["enabled"]) ? [1] : []
    content {
      bucket  = var.logging_config["bucket_name"]
      prefix  = var.logging_config["prefix"]
      enabled = true
    }
  }
}
```

## Working with External Data Sources

```hcl
data "external" "config" {
  program = ["python3", "${path.module}/scripts/get-config.py"]
}

locals {
  # External data sources always return map(string)
  feature_enabled = tobool(data.external.config.result["feature_enabled"])
  debug_mode      = tobool(data.external.config.result["debug_mode"])
}
```

## tobool vs Direct Boolean Comparison

Sometimes people compare strings to boolean string values instead of using `tobool`:

```hcl
# Less clean approach
locals {
  is_enabled = var.flag == "true"
}

# Cleaner approach using tobool
locals {
  is_enabled = tobool(var.flag)
}
```

The `tobool` approach is better because it will raise an error if the value is not a valid boolean string, catching typos like `"treu"` or `"True"` early.

## Combining tobool with Other Functions

```hcl
variable "env_flags" {
  type = map(string)
  default = {
    "dev.debug"     = "true"
    "dev.ssl"       = "false"
    "prod.debug"    = "false"
    "prod.ssl"      = "true"
  }
}

locals {
  env = "prod"

  # Look up environment-specific flags with safe defaults
  debug_enabled = tobool(lookup(var.env_flags, "${local.env}.debug", "false"))
  ssl_enabled   = tobool(lookup(var.env_flags, "${local.env}.ssl", "true"))
}
```

## Edge Cases

```hcl
# Already a boolean - no-op
> tobool(true)
true

> tobool(false)
false

# Only lowercase "true" and "false" strings work
# tobool("TRUE")   # Error
# tobool("True")   # Error
# tobool("FALSE")  # Error
# tobool("False")  # Error
```

## A Note on Variable Types

If you control the variable definition, it is usually better to declare the variable as `bool` type directly rather than using `tobool`:

```hcl
# Preferred - let Terraform handle the conversion
variable "enable_feature" {
  type    = bool
  default = true
}

# Only use tobool when you cannot control the input type
# (environment variables, data sources, map lookups, etc.)
```

## Summary

The `tobool` function converts string `"true"` and `"false"` values into actual boolean types. It is essential when working with configuration from string-based sources like environment variables, SSM parameters, and string maps. The function is strict - only lowercase `"true"` and `"false"` are accepted - which helps catch configuration errors early. Use it with `try` for safe conversions with fallback defaults, and combine it with `can` for input validation. For related type conversions, see the [tonumber function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-tonumber-function-in-terraform/view) and the [tostring function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-tostring-function-in-terraform/view).
