# How to Use the upper Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, String Functions, HCL, DevOps

Description: Learn how to use the upper function in Terraform to convert strings to uppercase, with practical examples for environment labels, constants, and resource configuration.

---

While lowercase strings dominate most cloud resource naming, there are plenty of situations where uppercase is required or preferred. Environment labels like "PRODUCTION", constant values in configuration files, certain API parameters, and display names often need to be uppercase. The `upper` function in Terraform converts all letters in a string to uppercase.

## What Does upper Do?

The `upper` function takes a string and returns it with all cased letters converted to uppercase.

```hcl
# Basic syntax
upper(string)
```

Like `lower`, it handles Unicode characters properly.

## Basic Examples

```hcl
# Simple conversion
> upper("hello")
"HELLO"

# Mixed case
> upper("Hello World")
"HELLO WORLD"

# Already uppercase - no change
> upper("HELLO")
"HELLO"

# Numbers and symbols unchanged
> upper("hello-123_world")
"HELLO-123_WORLD"

# Empty string
> upper("")
""
```

## Environment Labels

A common pattern is using uppercase for environment identifiers in tags and labels.

```hcl
variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"

  tags = {
    # Uppercase environment for visibility in the AWS console
    Environment = upper(var.environment)
    # Result: "PRODUCTION"
    Name = "app-server"
  }
}
```

Uppercase tags stand out in the AWS console and make it easy to spot environment misconfigurations at a glance.

## Generating Constant-Style Names

When you need to produce environment variable names or constant identifiers, uppercase with underscores is the convention.

```hcl
variable "service_name" {
  default = "payment-service"
}

variable "config_keys" {
  default = ["database-url", "api-key", "log-level", "max-retries"]
}

locals {
  # Convert config keys to environment variable style: uppercase with underscores
  env_var_names = [
    for key in var.config_keys :
    upper(replace(key, "-", "_"))
  ]
  # Result: ["DATABASE_URL", "API_KEY", "LOG_LEVEL", "MAX_RETRIES"]

  # Prefix with service name
  prefixed_env_vars = [
    for key in var.config_keys :
    upper(replace("${var.service_name}_${key}", "-", "_"))
  ]
  # Result: ["PAYMENT_SERVICE_DATABASE_URL", "PAYMENT_SERVICE_API_KEY", ...]
}
```

## AWS Resource Properties

Some AWS resource properties expect uppercase values.

```hcl
variable "log_level" {
  description = "CloudWatch log level"
  type        = string
  default     = "info"
}

resource "aws_lambda_function" "processor" {
  function_name = "data-processor"
  runtime       = "python3.11"
  handler       = "handler.main"
  role          = aws_iam_role.lambda.arn
  filename      = "lambda.zip"

  environment {
    variables = {
      # Some services expect uppercase log levels
      LOG_LEVEL = upper(var.log_level)
      # Result: "INFO"
    }
  }
}
```

## Case-Insensitive Validation

Use `upper` to normalize input before comparing against expected values.

```hcl
variable "storage_class" {
  description = "S3 storage class"
  type        = string
  default     = "standard"

  validation {
    condition = contains(
      ["STANDARD", "STANDARD_IA", "GLACIER", "DEEP_ARCHIVE", "INTELLIGENT_TIERING"],
      upper(var.storage_class)
    )
    error_message = "Invalid storage class. Must be one of: STANDARD, STANDARD_IA, GLACIER, DEEP_ARCHIVE, INTELLIGENT_TIERING."
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    id     = "archive"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = upper(var.storage_class)
    }
  }
}
```

## Building Header Strings

When generating configuration files that use uppercase headers.

```hcl
variable "sections" {
  type = list(object({
    name    = string
    content = string
  }))
  default = [
    { name = "general", content = "setting1 = true" },
    { name = "logging", content = "level = info" },
    { name = "security", content = "auth = enabled" }
  ]
}

locals {
  config_file = join("\n\n", [
    for section in var.sections :
    "[${upper(section.name)}]\n${section.content}"
  ])
  # Result:
  # [GENERAL]
  # setting1 = true
  #
  # [LOGGING]
  # level = info
  #
  # [SECURITY]
  # auth = enabled
}
```

## Combining upper with Conditional Logic

Drive resource configuration based on uppercased input values.

```hcl
variable "tier" {
  description = "Service tier"
  type        = string
  default     = "standard"
}

locals {
  tier_upper = upper(var.tier)

  # Map tier to instance specifications
  instance_config = {
    "BASIC"      = { type = "t3.micro",   storage = 20  }
    "STANDARD"   = { type = "t3.medium",  storage = 50  }
    "PREMIUM"    = { type = "m5.large",   storage = 100 }
    "ENTERPRISE" = { type = "m5.xlarge",  storage = 500 }
  }

  selected_config = local.instance_config[local.tier_upper]
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = local.selected_config.type

  root_block_device {
    volume_size = local.selected_config.storage
  }

  tags = {
    Tier = local.tier_upper
  }
}
```

## Generating SQL-Style Identifiers

When you need to output SQL or similar languages where keywords are conventionally uppercase.

```hcl
variable "table_columns" {
  type = list(object({
    name = string
    type = string
  }))
  default = [
    { name = "id",         type = "integer" },
    { name = "name",       type = "varchar(255)" },
    { name = "created_at", type = "timestamp" }
  ]
}

locals {
  create_table = join("\n", concat(
    ["CREATE TABLE users ("],
    [for i, col in var.table_columns :
      "  ${col.name} ${upper(col.type)}${i < length(var.table_columns) - 1 ? "," : ""}"
    ],
    [");"]
  ))
  # Result:
  # CREATE TABLE users (
  #   id INTEGER,
  #   name VARCHAR(255),
  #   created_at TIMESTAMP
  # );
}
```

## HTTP Method Normalization

Ensure HTTP methods are uppercase when configuring API gateways.

```hcl
variable "api_routes" {
  type = list(object({
    method = string
    path   = string
    target = string
  }))
  default = [
    { method = "get",    path = "/users",    target = "users-service" },
    { method = "post",   path = "/users",    target = "users-service" },
    { method = "get",    path = "/orders",   target = "orders-service" },
    { method = "delete", path = "/orders/*", target = "orders-service" }
  ]
}

resource "aws_apigatewayv2_route" "routes" {
  for_each = {
    for route in var.api_routes :
    "${upper(route.method)}-${route.path}" => route
  }

  api_id    = aws_apigatewayv2_api.main.id
  route_key = "${upper(each.value.method)} ${each.value.path}"
  target    = "integrations/${aws_apigatewayv2_integration.main[each.value.target].id}"
}
```

## upper in Output Formatting

Make outputs more readable with consistent casing.

```hcl
output "deployment_summary" {
  value = <<-EOT
    Deployment Complete
    ===================
    Environment: ${upper(var.environment)}
    Region:      ${upper(var.region)}
    Status:      ${upper("active")}
    Instances:   ${length(aws_instance.app)}
  EOT
}
```

## upper vs lower vs title

Quick comparison of all three casing functions.

```hcl
locals {
  text = "hello World"

  up    = upper(local.text)   # "HELLO WORLD"
  down  = lower(local.text)   # "hello world"
  title = title(local.text)   # "Hello World"
}
```

Use `upper` for constants, environment variables, headers, and anywhere the convention calls for all-caps. Use [lower](https://oneuptime.com/blog/post/2026-02-23-how-to-use-lower-function-in-terraform/view) for resource names and identifiers. Use [title](https://oneuptime.com/blog/post/2026-02-23-how-to-use-title-function-in-terraform/view) for display text.

## Summary

The `upper` function is straightforward but important for maintaining conventions in your Terraform configurations. Whether you are normalizing environment labels, generating environment variable names, formatting HTTP methods, or producing configuration files with uppercase headers, `upper` ensures consistency. Pair it with `replace` to convert kebab-case to SCREAMING_SNAKE_CASE, or with `lower` for case-insensitive comparisons.
