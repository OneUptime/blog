# How to Use the try Function in Terraform for Safe Access

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, DevOps, Terraform Functions, Error Handling

Description: Learn how to use the try function in Terraform to safely access nested values with fallback defaults, preventing errors in complex configurations.

---

Terraform configurations often deal with deeply nested data structures, optional values, and data that might not always be present. Without proper handling, a missing key or null value can crash your entire plan. The `try` function gives you a way to attempt an expression and fall back to an alternative value if it fails.

## What is the try Function?

The `try` function evaluates a series of expressions and returns the result of the first one that does not produce an error. If all expressions fail, Terraform raises the error from the last expression.

```hcl
# try(expression1, expression2, ..., fallback)
> try("hello", "fallback")
"hello"

> try(tonumber("not-a-number"), 0)
0
```

The syntax:

```hcl
try(expression, fallback_expression)
# or with multiple fallbacks
try(expression1, expression2, expression3)
```

## Why try Matters

Consider this common scenario - you receive a complex object from a module or data source, and some fields might not exist:

```hcl
# Without try - this crashes if "database" key does not exist
locals {
  db_port = var.config["database"]["port"]
}

# With try - safe access with a default
locals {
  db_port = try(var.config["database"]["port"], 5432)
}
```

## Safe Nested Access

The most common use case is safely accessing nested data structures:

```hcl
variable "app_config" {
  type    = any
  default = {
    web = {
      port     = 8080
      replicas = 3
    }
    api = {
      port = 9090
    }
  }
}

locals {
  # Safe access - "replicas" might not exist for all services
  web_replicas = try(var.app_config.web.replicas, 1)
  api_replicas = try(var.app_config.api.replicas, 1)
  # web_replicas = 3, api_replicas = 1 (default)

  # Deep nested access with multiple levels
  web_ssl_cert = try(var.app_config.web.ssl.certificate_arn, "")
  # Returns "" because web.ssl does not exist
}
```

## Multiple Fallback Expressions

You can chain multiple expressions, and `try` evaluates them in order:

```hcl
variable "config" {
  type    = any
  default = {}
}

locals {
  # Try the new config key first, then the legacy key, then a default
  port = try(
    var.config.service.port,        # New config format
    var.config.service_port,         # Legacy config format
    8080                             # Default value
  )
}
```

This is incredibly useful during configuration migrations where you need to support both old and new formats.

## Safe Type Conversions

```hcl
variable "user_input" {
  type    = string
  default = "not-a-number"
}

locals {
  # Safe number conversion with default
  parsed_number = try(tonumber(var.user_input), 0)

  # Safe boolean conversion with default
  parsed_bool = try(tobool(var.user_input), false)
}
```

## Working with Optional Module Outputs

When consuming module outputs that might not always be present:

```hcl
module "database" {
  source = "./modules/database"
  count  = var.create_database ? 1 : 0

  # ... configuration
}

locals {
  # Safely access the module output that might not exist
  db_endpoint = try(module.database[0].endpoint, "localhost")
  db_port     = try(module.database[0].port, 5432)
}

# Use the values safely
resource "aws_ssm_parameter" "db_endpoint" {
  name  = "/app/db-endpoint"
  type  = "String"
  value = local.db_endpoint
}
```

## Handling JSON Decoded Data

When you decode JSON, the structure might not always match expectations:

```hcl
variable "config_json" {
  type    = string
  default = "{\"database\": {\"host\": \"db.example.com\"}}"
}

locals {
  config = jsondecode(var.config_json)

  # Safely extract values from decoded JSON
  db_host     = try(local.config.database.host, "localhost")
  db_port     = try(local.config.database.port, 5432)
  db_name     = try(local.config.database.name, "myapp")
  db_ssl_mode = try(local.config.database.ssl.mode, "disable")
}
```

## Dynamic Provider Configuration

```hcl
variable "provider_config" {
  type    = any
  default = {}
}

locals {
  # Safely extract provider settings with sensible defaults
  aws_region  = try(var.provider_config.aws.region, "us-east-1")
  aws_profile = try(var.provider_config.aws.profile, "default")

  # Tagging configuration with defaults
  default_tags = {
    Environment = try(var.provider_config.tags.environment, "development")
    Team        = try(var.provider_config.tags.team, "platform")
    ManagedBy   = "terraform"
  }
}
```

## try with for Expressions

Use `try` inside `for` expressions to handle inconsistent data:

```hcl
variable "services" {
  type = list(any)
  default = [
    { name = "web", port = 80, health_path = "/health" },
    { name = "api", port = 8080 },
    { name = "worker" }
  ]
}

locals {
  # Normalize service configs with defaults for missing fields
  normalized_services = [
    for svc in var.services : {
      name        = svc.name
      port        = try(svc.port, 8080)
      health_path = try(svc.health_path, "/")
      replicas    = try(svc.replicas, 1)
    }
  ]
  # Result:
  # [
  #   { name = "web",    port = 80,   health_path = "/health", replicas = 1 },
  #   { name = "api",    port = 8080, health_path = "/",       replicas = 1 },
  #   { name = "worker", port = 8080, health_path = "/",       replicas = 1 },
  # ]
}
```

## try with Regex and Pattern Matching

```hcl
variable "input_string" {
  type    = string
  default = "not-matching"
}

locals {
  # Safely extract a pattern, with a default if it does not match
  extracted_number = try(regex("[0-9]+", var.input_string), "0")

  # Parse a version string safely
  version_string = "v2.5.1"
  major_version  = try(tonumber(regex("^v([0-9]+)", local.version_string)[0]), 0)
  # Result: 2
}
```

## Practical Pattern: Environment-Aware Defaults

```hcl
variable "environment" {
  type    = string
  default = "development"
}

variable "overrides" {
  type    = any
  default = {}
}

locals {
  env_defaults = {
    development = {
      instance_type = "t3.small"
      min_size      = 1
      max_size      = 2
    }
    production = {
      instance_type = "t3.large"
      min_size      = 3
      max_size      = 10
    }
  }

  # Use overrides if provided, otherwise fall back to env defaults, then global defaults
  instance_type = try(
    var.overrides.instance_type,
    local.env_defaults[var.environment].instance_type,
    "t3.medium"
  )

  min_size = try(
    var.overrides.min_size,
    local.env_defaults[var.environment].min_size,
    1
  )

  max_size = try(
    var.overrides.max_size,
    local.env_defaults[var.environment].max_size,
    3
  )
}
```

## try with Data Source Results

```hcl
# Data source that might fail
data "aws_ami" "custom" {
  count = 1

  most_recent = true
  owners      = ["self"]

  filter {
    name   = "name"
    values = ["my-custom-ami-*"]
  }
}

locals {
  # Use custom AMI if available, otherwise fall back to a known AMI
  ami_id = try(data.aws_ami.custom[0].id, var.fallback_ami_id)
}
```

## How try Differs from can

The `try` function returns a value. The `can` function returns a boolean. They serve different purposes:

```hcl
# try returns the value or a fallback
local.port = try(var.config.port, 8080)
# Returns: 8080 (if config.port does not exist)

# can returns true/false
local.has_port = can(var.config.port)
# Returns: false (if config.port does not exist)
```

Use `try` when you need the value. Use `can` when you need to check if something is valid (like in validations or conditions).

## When Not to Use try

Do not use `try` to hide legitimate errors. It should be used for **expected optional data**, not for silencing bugs:

```hcl
# Good - handling genuinely optional data
locals {
  port = try(var.overrides.port, 8080)
}

# Bad - hiding a potential bug
locals {
  # If this fails, you probably have a real problem
  instance_id = try(aws_instance.web.id, "")
}
```

## Edge Cases

```hcl
# All expressions fail - returns the last error
# try(tonumber("a"), tonumber("b"))
# Error: the value "b" cannot be converted to number

# null is a valid result (not an error)
> try(null, "fallback")
null  # null is returned, not "fallback"

# To handle null specifically, combine with coalesce
> coalesce(try(null, null), "fallback")
"fallback"
```

## Summary

The `try` function is one of the most important defensive programming tools in Terraform. It lets you safely navigate optional and nested data, handle configuration migrations, normalize inconsistent data structures, and provide sensible defaults. Use it whenever you access data that might not be present, but avoid using it to mask genuine errors in your configuration. For the boolean companion, see the [can function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-can-function-in-terraform-for-error-handling/view).
