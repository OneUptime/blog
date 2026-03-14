# How to Use the try Function to Handle Optional Attributes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Try Function, Error Handling, HCL, Infrastructure as Code, Optional Attributes

Description: Learn how to use the try function in Terraform to safely handle optional attributes and avoid errors when accessing nested values that might not exist.

---

If you have ever worked with complex data structures in Terraform, you know the frustration of running into errors because an attribute does not exist. Maybe a module consumer did not pass in a certain optional field, or a data source returned an object with missing keys. The `try` function is your safety net for exactly these situations.

## What Is the try Function?

The `try` function evaluates one or more expressions and returns the result of the first one that does not produce an error. If all expressions fail, Terraform raises an error. The basic syntax looks like this:

```hcl
# try(expression1, expression2, ..., fallback_value)
# Returns the first expression that succeeds
try(expression, fallback)
```

This is fundamentally different from using `lookup` or conditional expressions. The `try` function catches any error that occurs during expression evaluation, not just missing map keys.

## Basic Usage

Let's start with a straightforward example. Suppose you have a variable that is an object with optional attributes:

```hcl
variable "config" {
  type = object({
    name    = string
    # tags might not always be provided
    tags    = optional(map(string))
  })
  default = {
    name = "my-resource"
  }
}

# Without try, accessing config.tags.environment would fail
# if tags is null or if the "environment" key is missing
output "environment_tag" {
  # try will return "unknown" if anything goes wrong
  value = try(var.config.tags["environment"], "unknown")
}
```

When you run `terraform plan`, if `tags` is null or does not contain the `environment` key, the output will simply be `"unknown"` instead of throwing an error.

## Testing in terraform console

You can experiment with `try` in the Terraform console to understand its behavior:

```hcl
# Start with: terraform console

# Simple fallback when accessing a missing attribute
> try({a = "hello"}.b, "default")
"default"

# First expression succeeds, so fallback is never evaluated
> try({a = "hello"}.a, "default")
"hello"

# Multiple fallback levels
> try({}.a, {}.b, "final-fallback")
"final-fallback"

# Works with nested access
> try({a = {b = "deep"}}.a.b, "not-found")
"deep"

> try({a = {}}.a.b, "not-found")
"not-found"
```

## Handling Optional Nested Objects

One of the most common use cases for `try` is dealing with deeply nested configuration objects. Consider a module that accepts an optional monitoring configuration:

```hcl
variable "settings" {
  type = any
  default = {}
}

locals {
  # Each of these safely extracts a nested value
  # with a sensible default if the path does not exist
  enable_monitoring = try(var.settings.monitoring.enabled, false)
  alert_email       = try(var.settings.monitoring.alerts.email, "ops@example.com")
  retention_days    = try(var.settings.monitoring.retention_days, 30)
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/app/logs"
  retention_in_days = local.retention_days

  tags = {
    monitoring = local.enable_monitoring ? "enabled" : "disabled"
  }
}
```

In this setup, a consumer of the module can pass in as much or as little configuration as they want:

```hcl
# Minimal usage - all defaults apply
module "app" {
  source   = "./modules/app"
  settings = {}
}

# Partial configuration - only override what you need
module "app_with_monitoring" {
  source = "./modules/app"
  settings = {
    monitoring = {
      enabled = true
      retention_days = 90
      # alerts block is still optional
    }
  }
}
```

## Using try with for_each and Dynamic Data

The `try` function pairs well with `for_each` when iterating over data that might have inconsistent shapes:

```hcl
variable "services" {
  type = list(any)
  default = [
    {
      name = "web"
      port = 80
      health_check = {
        path = "/health"
        interval = 30
      }
    },
    {
      name = "api"
      port = 8080
      # This service has no health_check block
    }
  ]
}

resource "aws_lb_target_group" "service" {
  for_each = { for s in var.services : s.name => s }

  name     = each.value.name
  port     = each.value.port
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  # Safely handle the optional health_check block
  health_check {
    path     = try(each.value.health_check.path, "/")
    interval = try(each.value.health_check.interval, 60)
    timeout  = try(each.value.health_check.timeout, 5)
  }
}
```

Without `try`, the second service definition (which lacks a `health_check` block) would cause Terraform to throw an error during evaluation.

## try vs lookup vs Conditional Expressions

You might wonder when to use `try` instead of `lookup` or ternary expressions. Here is a quick comparison:

```hcl
variable "tags" {
  type    = map(string)
  default = {}
}

locals {
  # Using lookup - only works for single-level map key access
  env_lookup = lookup(var.tags, "environment", "dev")

  # Using conditional with contains - verbose and only works for maps
  env_conditional = contains(keys(var.tags), "environment") ? var.tags["environment"] : "dev"

  # Using try - works for ANY expression that might fail
  env_try = try(var.tags["environment"], "dev")
}
```

The `lookup` function works fine for simple map lookups, but `try` handles situations that `lookup` cannot, such as nested attribute access, type conversion errors, and index out-of-bounds errors.

## Multiple Expressions as a Chain

The `try` function accepts more than two arguments. You can chain multiple expressions together, and Terraform evaluates them in order:

```hcl
variable "input" {
  type    = any
  default = null
}

locals {
  # Try multiple paths to find a value
  # First: check if input is a string directly
  # Second: check if input is an object with a "value" key
  # Third: fall back to a default
  resolved = try(
    tostring(var.input),
    var.input.value,
    "default-value"
  )
}
```

This pattern is useful when building modules that need to accept multiple input formats for backward compatibility.

## Validating with try in Custom Validation Rules

You can combine `try` with custom validation rules to check if a variable has the expected structure:

```hcl
variable "database_config" {
  type = any

  validation {
    # Use can() instead of try() for validation conditions
    # can() returns true/false instead of the actual value
    condition = can(var.database_config.host) && can(var.database_config.port)
    error_message = "The database_config must include 'host' and 'port' attributes."
  }
}

locals {
  # After validation, safely extract optional fields
  db_host     = var.database_config.host
  db_port     = var.database_config.port
  db_name     = try(var.database_config.name, "mydb")
  db_ssl_mode = try(var.database_config.ssl_mode, "require")
}
```

Note the use of `can()` in the validation block. The `can` function is closely related to `try` - it evaluates an expression and returns `true` if it succeeds or `false` if it fails. It is the boolean counterpart to `try`.

## Common Pitfalls

There are a few things to watch out for when using `try`:

```hcl
# Pitfall 1: try does NOT catch errors in resource configuration
# It only works during expression evaluation
resource "aws_instance" "example" {
  ami           = "ami-12345"
  instance_type = try(var.instance_type, "t3.micro")
  # If the AMI does not exist, try cannot help - that is a provider error
}

# Pitfall 2: Do not use try to hide real bugs
# Bad - this silently swallows configuration errors
locals {
  config = try(jsondecode(var.json_config), {})
}

# Better - validate first, then use try for optional fields
locals {
  parsed_config = jsondecode(var.json_config)  # Let this fail loudly if JSON is invalid
  optional_field = try(local.parsed_config.optional_field, "default")
}
```

## Practical Example - Multi-Cloud Module

Here is a more complete example that shows `try` used in a module that handles multiple cloud provider configurations:

```hcl
variable "cloud_config" {
  type        = any
  description = "Cloud provider configuration with optional provider-specific settings"
}

locals {
  # Common settings with defaults
  region       = try(var.cloud_config.region, "us-east-1")
  environment  = try(var.cloud_config.environment, "dev")

  # AWS-specific settings (optional)
  aws_profile  = try(var.cloud_config.aws.profile, "default")
  aws_role_arn = try(var.cloud_config.aws.assume_role_arn, null)

  # GCP-specific settings (optional)
  gcp_project  = try(var.cloud_config.gcp.project_id, null)
  gcp_zone     = try(var.cloud_config.gcp.zone, "${local.region}-a")
}

output "resolved_config" {
  value = {
    region      = local.region
    environment = local.environment
    aws = {
      profile  = local.aws_profile
      role_arn = local.aws_role_arn
    }
    gcp = local.gcp_project != null ? {
      project = local.gcp_project
      zone    = local.gcp_zone
    } : null
  }
}
```

## Summary

The `try` function is one of the most useful tools in the Terraform toolbox for building flexible, resilient configurations. It lets you gracefully handle missing or optional attributes without writing verbose conditional logic. Use it when dealing with optional nested objects, inconsistent data structures, or when building modules that need to accept varied input shapes. Pair it with `can()` for validation rules, and remember that it only catches expression evaluation errors, not provider-level failures.

For more Terraform tips, check out our other posts on [Terraform functions](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-compact-function-to-remove-empty-strings/view) and [infrastructure best practices](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-distinct-function-to-deduplicate-lists/view).
