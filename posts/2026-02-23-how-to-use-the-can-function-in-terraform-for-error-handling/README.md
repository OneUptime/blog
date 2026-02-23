# How to Use the can Function in Terraform for Error Handling

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, DevOps, Terraform Functions, Error Handling

Description: Learn how to use the can function in Terraform to test expressions for errors without crashing, enabling robust input validation and conditional logic.

---

Input validation is critical in Terraform, especially when writing reusable modules that accept complex variables. You need to verify that values match expected formats, types, and constraints without crashing the plan if they do not. The `can` function lets you test whether an expression would succeed, returning `true` or `false` instead of raising an error.

## What is the can Function?

The `can` function evaluates an expression and returns `true` if it succeeds or `false` if it produces an error. It never raises an error itself.

```hcl
# Test if an expression is valid
> can(tonumber("42"))
true

> can(tonumber("not-a-number"))
false
```

The syntax:

```hcl
can(expression)
```

## The Primary Use Case: Variable Validation

The `can` function was designed primarily for use in `validation` blocks:

```hcl
variable "ami_id" {
  type        = string
  description = "The AMI ID to use"

  validation {
    condition     = can(regex("^ami-[a-f0-9]{8,17}$", var.ami_id))
    error_message = "The AMI ID must match the format ami-xxxxxxxxx."
  }
}

variable "cidr_block" {
  type        = string
  description = "CIDR block for the VPC"

  validation {
    condition     = can(cidrhost(var.cidr_block, 0))
    error_message = "Must be a valid CIDR block (e.g., 10.0.0.0/16)."
  }
}
```

Without `can`, an invalid regex match or CIDR calculation would crash the plan. With `can`, it just returns `false`, which triggers the custom error message.

## Validating Number Formats

```hcl
variable "port" {
  type        = string
  description = "Port number as a string"

  validation {
    condition     = can(tonumber(var.port))
    error_message = "Port must be a valid number."
  }

  validation {
    condition     = can(tonumber(var.port)) && tonumber(var.port) >= 1 && tonumber(var.port) <= 65535
    error_message = "Port must be between 1 and 65535."
  }
}
```

## Validating Complex Formats

### Email validation
```hcl
variable "alert_email" {
  type = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.alert_email))
    error_message = "Must be a valid email address."
  }
}
```

### Hostname validation
```hcl
variable "hostname" {
  type = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$", var.hostname))
    error_message = "Must be a valid hostname."
  }
}
```

### AWS ARN validation
```hcl
variable "kms_key_arn" {
  type = string

  validation {
    condition     = can(regex("^arn:aws:kms:[a-z0-9-]+:[0-9]{12}:key/[a-f0-9-]+$", var.kms_key_arn))
    error_message = "Must be a valid KMS key ARN."
  }
}
```

## Using can for Conditional Logic

Beyond validation, `can` is useful for conditional logic based on data availability:

```hcl
variable "config" {
  type    = any
  default = {
    database = {
      host = "db.example.com"
    }
  }
}

locals {
  # Check if specific configuration paths exist
  has_database   = can(var.config.database)
  has_db_ssl     = can(var.config.database.ssl)
  has_cache      = can(var.config.cache)

  # Use the checks for conditional resource creation
  create_db    = local.has_database
  enable_ssl   = local.has_db_ssl
  create_cache = local.has_cache
}

resource "aws_db_instance" "main" {
  count = local.create_db ? 1 : 0
  # ... configuration
}
```

## Checking Map Key Existence

```hcl
variable "settings" {
  type = map(string)
  default = {
    region = "us-east-1"
    env    = "production"
  }
}

locals {
  # Check if a key exists in the map
  has_custom_domain = can(var.settings["custom_domain"])
  has_backup_region = can(var.settings["backup_region"])

  # Different than checking for empty string
  custom_domain = local.has_custom_domain ? var.settings["custom_domain"] : "default.example.com"
}
```

## Validating List Contents

```hcl
variable "availability_zones" {
  type = list(string)

  validation {
    condition = alltrue([
      for az in var.availability_zones : can(regex("^[a-z]+-[a-z]+-[0-9][a-z]$", az))
    ])
    error_message = "All availability zones must match the format like us-east-1a."
  }
}
```

## Validating Maps

```hcl
variable "tags" {
  type = map(string)

  validation {
    condition = alltrue([
      for key, value in var.tags : can(regex("^[A-Z][a-zA-Z]+$", key))
    ])
    error_message = "Tag keys must be PascalCase (start with uppercase letter)."
  }
}
```

## can with Type Checking

Test if a value can be converted to a specific type:

```hcl
variable "flexible_input" {
  type = any
}

locals {
  # Determine the type of the input
  is_string  = can(tostring(var.flexible_input))
  is_number  = can(tonumber(var.flexible_input))
  is_bool    = can(tobool(var.flexible_input))
  is_list    = can(tolist(var.flexible_input))
  is_map     = can(length(var.flexible_input)) && !can(tolist(var.flexible_input))
}
```

## Validating Object Structures

Ensure that objects have required fields:

```hcl
variable "service_config" {
  type = any
  description = "Service configuration object"

  validation {
    condition = alltrue([
      can(var.service_config.name),
      can(var.service_config.port),
      can(var.service_config.image),
    ])
    error_message = "service_config must have name, port, and image fields."
  }
}
```

## can vs try

The difference is simple:
- `can` returns a boolean - use it for conditions and validations
- `try` returns a value - use it for getting values with fallbacks

```hcl
# can - for checking
locals {
  has_port = can(var.config.port)
  # Returns: true or false
}

# try - for getting values
locals {
  port = try(var.config.port, 8080)
  # Returns: the port value or 8080
}
```

They are often used together:

```hcl
locals {
  # Use can to decide, try to get the value
  database_config = can(var.config.database) ? {
    host = try(var.config.database.host, "localhost")
    port = try(var.config.database.port, 5432)
    name = try(var.config.database.name, "myapp")
  } : {
    host = "localhost"
    port = 5432
    name = "myapp"
  }
}
```

## Practical Pattern: Validating CIDR Blocks

```hcl
variable "vpc_cidr" {
  type = string

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "Must be a valid CIDR notation (e.g., 10.0.0.0/16)."
  }

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0)) && tonumber(split("/", var.vpc_cidr)[1]) >= 16 && tonumber(split("/", var.vpc_cidr)[1]) <= 24
    error_message = "CIDR prefix must be between /16 and /24."
  }
}

variable "subnet_cidrs" {
  type = list(string)

  validation {
    condition     = alltrue([for cidr in var.subnet_cidrs : can(cidrhost(cidr, 0))])
    error_message = "All subnet CIDRs must be valid CIDR notation."
  }
}
```

## Validating JSON Strings

```hcl
variable "policy_json" {
  type        = string
  description = "IAM policy document as JSON"

  validation {
    condition     = can(jsondecode(var.policy_json))
    error_message = "Must be valid JSON."
  }
}
```

## Validating Enum-Like Values

```hcl
variable "environment" {
  type = string

  validation {
    condition     = can(index(["development", "staging", "production"], var.environment))
    error_message = "Environment must be one of: development, staging, production."
  }
}

# Or more readably with contains
variable "log_level" {
  type = string

  validation {
    condition     = contains(["debug", "info", "warn", "error"], var.log_level)
    error_message = "Log level must be one of: debug, info, warn, error."
  }
}
```

## Chaining can Checks

```hcl
variable "config" {
  type = any

  validation {
    condition = (
      can(var.config.name) &&
      can(var.config.port) &&
      can(tonumber(var.config.port)) &&
      tonumber(var.config.port) > 0 &&
      tonumber(var.config.port) <= 65535
    )
    error_message = "Config must have a name and a valid port number (1-65535)."
  }
}
```

## Edge Cases

```hcl
# can with null - null is valid, not an error
> can(null)
true

# can with a valid expression
> can(1 + 1)
true

# can catches type errors
> can(1 + "hello")
false

# can catches index errors
> can(["a", "b"][5])
false
```

## Summary

The `can` function is Terraform's primary tool for non-destructive error checking. Its main role is in `validation` blocks for variable constraints, but it is equally valuable for checking data availability, testing type compatibility, and building conditional logic around optional configuration. Think of `can` as the "question" and `try` as the "answer" - use `can` to ask "will this work?" and `try` to say "do this, or else do that." For the value-returning companion, see the [try function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-try-function-in-terraform-for-safe-access/view).
