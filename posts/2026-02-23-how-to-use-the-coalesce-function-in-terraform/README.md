# How to Use the coalesce Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, Terraform Functions, Type Conversion Functions

Description: Learn how to use the coalesce function in Terraform to return the first non-null and non-empty argument, with practical examples for default values and fallback logic.

---

Handling null values and empty strings is a common challenge in Terraform configurations, especially when working with optional variables and module inputs. The `coalesce` function provides a clean way to define fallback values by returning the first argument that is not null or empty. This post covers the function's behavior, syntax, and practical applications.

## What is the coalesce Function?

The `coalesce` function takes any number of arguments and returns the first one that is not null and not an empty string. It is similar to the COALESCE function found in SQL databases.

```hcl
# Returns the first non-null, non-empty argument
coalesce(val1, val2, val3, ...)
```

If all arguments are null or empty strings, Terraform returns an error.

## Basic Usage in Terraform Console

Let us start with some straightforward examples.

```hcl
# Returns the first non-null, non-empty value
> coalesce("", "hello", "world")
"hello"

# Returns the first argument since it is not null or empty
> coalesce("first", "second")
"first"

# Skips null values
> coalesce(null, null, "fallback")
"fallback"

# Skips empty strings
> coalesce("", "", "default")
"default"

# Works with numbers too
> coalesce(null, 0, 42)
0

# Note: 0 is not considered empty for numbers
> coalesce(0, 42)
0
```

An important detail: `coalesce` considers empty strings (`""`) as "empty" and skips them, but it does not skip `0` or `false`. Only null and empty strings are treated as non-values.

## Setting Default Values for Optional Variables

The most common use of `coalesce` is providing default values for variables that might be null or empty.

```hcl
variable "instance_name" {
  type    = string
  default = ""
}

variable "environment" {
  type    = string
  default = null
}

locals {
  # Use the provided name, or fall back to a generated one
  effective_name = coalesce(var.instance_name, "web-server-default")

  # Use the provided environment, or fall back to "dev"
  effective_env = coalesce(var.environment, "dev")
}

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    Name        = local.effective_name
    Environment = local.effective_env
  }
}
```

If `instance_name` is left as an empty string or `environment` is left as null, the fallback values kick in automatically.

## Building Fallback Chains

You can chain multiple fallback values to create a priority system.

```hcl
variable "custom_domain" {
  type    = string
  default = ""
}

variable "subdomain" {
  type    = string
  default = ""
}

variable "project_name" {
  type    = string
  default = "myapp"
}

locals {
  # Try custom domain first, then subdomain-based, then project-based
  domain = coalesce(
    var.custom_domain,
    var.subdomain != "" ? "${var.subdomain}.example.com" : "",
    "${var.project_name}.default.example.com"
  )
}

output "final_domain" {
  value = local.domain
}
```

This pattern creates a clear priority chain: custom domain takes precedence, followed by the subdomain variant, with a project-based domain as the final fallback.

## Using coalesce with Module Inputs

When writing reusable modules, `coalesce` helps handle optional parameters gracefully.

```hcl
# In a module's variables.tf
variable "log_group_name" {
  type    = string
  default = ""
  description = "Custom CloudWatch log group name. If empty, a name is generated."
}

variable "prefix" {
  type    = string
  default = ""
}

# In the module's main.tf
locals {
  log_group_name = coalesce(
    var.log_group_name,
    var.prefix != "" ? "/aws/lambda/${var.prefix}-function" : "",
    "/aws/lambda/default-function"
  )
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = local.log_group_name
  retention_in_days = 30
}
```

Module consumers can optionally provide a log group name. If they do not, the module generates one intelligently.

## coalesce vs Conditional Expressions

You might wonder when to use `coalesce` versus a standard conditional expression. Here is the comparison.

```hcl
# Using a conditional expression
local.name = var.custom_name != "" ? var.custom_name : "default-name"

# Using coalesce - cleaner for simple fallbacks
local.name = coalesce(var.custom_name, "default-name")
```

For simple fallbacks, `coalesce` is more concise. However, when you need custom logic for what counts as "empty" (like checking if a number is zero), conditional expressions give you more control.

```hcl
# coalesce does NOT skip zero - it only skips null and ""
> coalesce(0, 42)
0

# If you want to treat 0 as empty, use a conditional instead
local.port = var.custom_port != 0 ? var.custom_port : 8080
```

## coalesce vs coalescelist

While `coalesce` works with individual values, `coalescelist` works with lists. Use `coalesce` for scalar values and `coalescelist` for list values.

```hcl
# coalesce for scalar values
> coalesce("", "fallback")
"fallback"

# coalescelist for lists
> coalescelist([], ["default"])
["default"]
```

For more details on `coalescelist`, see [How to Use the coalescelist Function in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-coalescelist-function-in-terraform/view).

## Handling Multiple Resource Configurations

Here is a practical example of using `coalesce` to build a flexible resource configuration.

```hcl
variable "db_config" {
  type = object({
    engine         = optional(string)
    engine_version = optional(string)
    instance_class = optional(string)
    storage_gb     = optional(number)
  })
  default = {}
}

locals {
  db_engine         = coalesce(var.db_config.engine, "postgres")
  db_engine_version = coalesce(var.db_config.engine_version, "15.4")
  db_instance_class = coalesce(var.db_config.instance_class, "db.t3.medium")
  db_storage_gb     = coalesce(var.db_config.storage_gb, 50)
}

resource "aws_db_instance" "main" {
  engine            = local.db_engine
  engine_version    = local.db_engine_version
  instance_class    = local.db_instance_class
  allocated_storage = local.db_storage_gb
  identifier        = "app-database"
  username          = "admin"
  password          = var.db_password
}
```

Every field in the database configuration has a sensible default, but the caller can override any of them individually.

## Error Behavior

If all arguments are null or empty strings, `coalesce` produces an error.

```hcl
# This will cause an error
> coalesce(null, "", null)
# Error: all arguments to coalesce must not be null or empty

# Always ensure at least one argument is guaranteed to have a value
> coalesce(null, "", "guaranteed-value")
"guaranteed-value"
```

Make sure your last argument in a `coalesce` chain is always a hard-coded default or a value you know will not be null.

## Real-World Scenario: Tag Management

Tags are a perfect use case for `coalesce` because they often have optional overrides with sensible defaults.

```hcl
variable "custom_tags" {
  type    = map(string)
  default = {}
}

variable "team_name" {
  type    = string
  default = ""
}

variable "cost_center" {
  type    = string
  default = ""
}

locals {
  default_tags = {
    ManagedBy  = "terraform"
    Team       = coalesce(var.team_name, "platform")
    CostCenter = coalesce(var.cost_center, "engineering")
    Project    = coalesce(lookup(var.custom_tags, "Project", ""), "default-project")
  }

  # Merge custom tags over defaults
  final_tags = merge(local.default_tags, var.custom_tags)
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags       = local.final_tags
}
```

## Summary

The `coalesce` function is a simple but essential tool for handling null values and empty strings in Terraform. It is most useful for setting default values, building fallback chains, and writing clean module interfaces.

Key takeaways:

- `coalesce` returns the first argument that is not null and not an empty string
- It works with strings, numbers, and booleans
- Zero and false are not considered empty
- All arguments must be of compatible types
- If all arguments are null or empty, an error is raised
- Use `coalescelist` for the list equivalent

Keep `coalesce` in your Terraform toolkit for any situation where you need a "first available value" pattern.
