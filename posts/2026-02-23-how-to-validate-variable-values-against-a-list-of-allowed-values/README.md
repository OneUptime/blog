# How to Validate Variable Values Against a List of Allowed Values

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Validation, Variables, Infrastructure as Code

Description: Learn how to use Terraform variable validation with the contains function to restrict input values to a predefined list of allowed options and catch misconfigurations early.

---

One of the most common validation needs in Terraform is restricting a variable to a set of allowed values. You want the environment to be "dev", "staging", or "production" - nothing else. You want the instance type to be from an approved list. You want the region to be one your organization supports.

Terraform's `contains` function paired with variable validation makes this straightforward. This post covers every variation of the pattern, from simple string lists to validating maps and lists of objects.

## Basic List Validation with contains()

The `contains` function checks whether a value exists in a list. Combine it with a validation block to restrict what callers can pass.

```hcl
variable "environment" {
  type        = string
  description = "Deployment environment"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, production. Got: '${var.environment}'."
  }
}
```

If someone passes `environment = "prod"`, they get:

```
Error: Invalid value for variable

Environment must be one of: dev, staging, production. Got: 'prod'.
```

Clear and actionable. The user knows exactly what values are accepted.

## Defining the Allowed List as a Local

When the same allowed list is used across multiple variables or validations, define it in a local to avoid repetition.

```hcl
locals {
  allowed_environments = ["dev", "staging", "production"]
  allowed_regions      = ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"]
  allowed_instance_types = [
    "t3.micro", "t3.small", "t3.medium",
    "m5.large", "m5.xlarge", "m5.2xlarge",
    "r5.large", "r5.xlarge"
  ]
}

variable "environment" {
  type = string
  validation {
    condition     = contains(local.allowed_environments, var.environment)
    error_message = "Environment must be one of: ${join(", ", local.allowed_environments)}."
  }
}

variable "aws_region" {
  type = string
  validation {
    condition     = contains(local.allowed_regions, var.aws_region)
    error_message = "Region must be one of: ${join(", ", local.allowed_regions)}."
  }
}

variable "instance_type" {
  type = string
  validation {
    condition     = contains(local.allowed_instance_types, var.instance_type)
    error_message = "Instance type must be one of: ${join(", ", local.allowed_instance_types)}."
  }
}
```

The `join(", ", local.allowed_environments)` in the error message automatically lists all allowed values. When you add a new allowed value to the local, the error message updates too.

## Case-Insensitive Validation

Sometimes users type "Production" instead of "production". You can handle this with `lower()`:

```hcl
variable "environment" {
  type = string

  validation {
    condition     = contains(["dev", "staging", "production"], lower(var.environment))
    error_message = "Environment must be one of: dev, staging, production (case-insensitive). Got: '${var.environment}'."
  }
}
```

However, keep in mind that the variable value stays as the user typed it. If you want to normalize it, use a local:

```hcl
variable "environment" {
  type = string

  validation {
    condition     = contains(["dev", "staging", "production"], lower(var.environment))
    error_message = "Environment must be one of: dev, staging, production."
  }
}

locals {
  # Normalize to lowercase for consistent usage
  environment = lower(var.environment)
}
```

## Validating Number Variables Against Allowed Values

The `contains` function works with numbers too:

```hcl
variable "node_count" {
  type        = number
  description = "Number of nodes in the cluster"

  validation {
    condition     = contains([1, 3, 5, 7], var.node_count)
    error_message = "Node count must be an odd number for quorum: 1, 3, 5, or 7."
  }
}

variable "retention_days" {
  type        = number
  description = "Log retention in days"

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.retention_days)
    error_message = "Retention days must be a value supported by CloudWatch Logs. See AWS docs for allowed values."
  }
}
```

## Validating Each Element in a List Variable

When the variable itself is a list, you need to check each element:

```hcl
variable "availability_zones" {
  type        = list(string)
  description = "List of availability zones to use"

  validation {
    condition = alltrue([
      for az in var.availability_zones : can(regex("^[a-z]{2}-[a-z]+-[0-9]+[a-z]$", az))
    ])
    error_message = "Each availability zone must be a valid AZ name (e.g., us-east-1a, eu-west-1b)."
  }
}

variable "protocols" {
  type        = list(string)
  description = "Allowed protocols"

  validation {
    condition = alltrue([
      for p in var.protocols : contains(["HTTP", "HTTPS", "TCP", "UDP", "TLS"], p)
    ])
    error_message = "Each protocol must be one of: HTTP, HTTPS, TCP, UDP, TLS."
  }
}
```

The `alltrue` function returns `true` only if every element in the list is `true`. Combined with a `for` expression that checks each element against the allowed list, it validates the entire input.

## Validating Map Values Against Allowed Values

When you have a map variable, you can validate the values:

```hcl
variable "service_tiers" {
  type        = map(string)
  description = "Map of service names to their tier levels"
  # Example: { api = "standard", web = "premium", worker = "basic" }

  validation {
    condition = alltrue([
      for name, tier in var.service_tiers : contains(["basic", "standard", "premium"], tier)
    ])
    error_message = "Each service tier must be one of: basic, standard, premium."
  }
}
```

You can also validate the map keys:

```hcl
variable "team_permissions" {
  type        = map(string)
  description = "Map of team names to their permission levels"

  validation {
    condition = alltrue([
      for team, perm in var.team_permissions : contains(["read", "write", "admin"], perm)
    ])
    error_message = "Permission level must be one of: read, write, admin."
  }

  validation {
    condition = alltrue([
      for team, perm in var.team_permissions : can(regex("^[a-z][a-z0-9-]+$", team))
    ])
    error_message = "Team names must be lowercase alphanumeric with hyphens (e.g., backend-team, platform)."
  }
}
```

## Validating Objects with Nested Allowed Values

For complex object variables, validate individual fields against their allowed values:

```hcl
variable "database" {
  type = object({
    engine         = string
    engine_version = string
    instance_class = string
    storage_type   = string
  })

  validation {
    condition     = contains(["postgres", "mysql", "mariadb"], var.database.engine)
    error_message = "Database engine must be one of: postgres, mysql, mariadb. Got: '${var.database.engine}'."
  }

  validation {
    condition     = contains(["gp2", "gp3", "io1", "io2"], var.database.storage_type)
    error_message = "Storage type must be one of: gp2, gp3, io1, io2. Got: '${var.database.storage_type}'."
  }

  validation {
    condition     = can(regex("^db\\.", var.database.instance_class))
    error_message = "Instance class must start with 'db.' (e.g., db.t3.micro, db.r5.large)."
  }
}
```

## Cross-Field Validation with Allowed Combinations

Sometimes the allowed values for one field depend on another field:

```hcl
variable "database" {
  type = object({
    engine         = string
    engine_version = string
  })

  # Validate engine is allowed
  validation {
    condition     = contains(["postgres", "mysql"], var.database.engine)
    error_message = "Database engine must be postgres or mysql."
  }

  # Validate version is compatible with engine
  validation {
    condition = (
      (var.database.engine == "postgres" && contains(["14.9", "15.4", "16.1"], var.database.engine_version)) ||
      (var.database.engine == "mysql" && contains(["8.0.35", "8.0.36"], var.database.engine_version))
    )
    error_message = "Invalid engine version for ${var.database.engine}. Allowed versions - postgres: 14.9, 15.4, 16.1; mysql: 8.0.35, 8.0.36."
  }
}
```

## Using one() for Single-Element Validation

When you expect exactly one value from a filtered list, use `one()`:

```hcl
variable "log_level" {
  type = string

  validation {
    # Ensure the value matches exactly one of the allowed levels
    condition     = length([for level in ["DEBUG", "INFO", "WARN", "ERROR", "FATAL"] : level if level == var.log_level]) == 1
    error_message = "Log level must be one of: DEBUG, INFO, WARN, ERROR, FATAL. Got: '${var.log_level}'."
  }
}
```

Though for simple cases like this, `contains` is simpler and more readable.

## A Real-World Module Example

Here is how allowed-value validation looks in a production-ready module:

```hcl
# variables.tf for an ECS service module

variable "launch_type" {
  type        = string
  description = "ECS launch type"
  default     = "FARGATE"

  validation {
    condition     = contains(["FARGATE", "EC2", "EXTERNAL"], var.launch_type)
    error_message = "Launch type must be FARGATE, EC2, or EXTERNAL."
  }
}

variable "scheduling_strategy" {
  type        = string
  description = "ECS scheduling strategy"
  default     = "REPLICA"

  validation {
    condition     = contains(["REPLICA", "DAEMON"], var.scheduling_strategy)
    error_message = "Scheduling strategy must be REPLICA or DAEMON."
  }
}

variable "network_mode" {
  type        = string
  description = "Docker networking mode"
  default     = "awsvpc"

  validation {
    condition     = contains(["awsvpc", "bridge", "host", "none"], var.network_mode)
    error_message = "Network mode must be one of: awsvpc, bridge, host, none."
  }
}

variable "health_check_type" {
  type        = string
  description = "Health check type"
  default     = "ELB"

  validation {
    condition     = contains(["EC2", "ELB"], var.health_check_type)
    error_message = "Health check type must be EC2 or ELB."
  }
}
```

## Summary

Validating variables against a list of allowed values is one of the most practical things you can do to make your Terraform modules robust. Use `contains()` for simple string and number checks, `alltrue()` with `for` expressions for list and map validation, and cross-field conditions for dependent validations. Always include the allowed values in your error message so users do not have to go looking for them.

For more Terraform validation patterns, check out our post on [variable validation with regex](https://oneuptime.com/blog/post/2026-02-23-how-to-use-variable-validation-with-regex-in-terraform/view).
