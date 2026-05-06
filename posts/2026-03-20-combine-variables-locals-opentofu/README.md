# How to Combine Variables and Locals Effectively in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, Local, Best Practice, Infrastructure as Code, DevOps

Description: A guide to combining OpenTofu variables and locals effectively to create clean, readable, and maintainable configurations.

## Introduction

Variables and locals serve different purposes: variables receive input from outside the configuration, while locals compute values from variables and other inputs. Combining them effectively creates configurations that are both flexible and readable.

## The Pattern: Variables for Input, Locals for Computation

```hcl
# variables.tf - INPUTS from outside

variable "environment" {
  type = string
}

variable "project_name" {
  type = string
}

variable "instance_type_override" {
  type    = string
  default = null
}

# locals.tf - COMPUTED from inputs
locals {
  # Compute from single variable
  is_production = var.environment == "prod"

  # Compute naming from multiple variables
  name_prefix = "${var.project_name}-${var.environment}"

  # Apply business logic to compute a value
  instance_type = coalesce(
    var.instance_type_override,
    local.is_production ? "t3.large" : "t3.micro"
  )

  # Aggregate variables into structured data
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "OpenTofu"
  }
}
```

## Pattern: Environment-Based Defaults via Locals

```hcl
# variables.tf
variable "environment" {
  type = string
}

variable "instance_count" {
  type    = number
  default = null  # Optional - will use local defaults
}

variable "db_instance_class" {
  type    = string
  default = null  # Optional
}

# locals.tf
locals {
  # Environment-specific defaults
  env_defaults = {
    dev = {
      instance_count    = 1
      db_instance_class = "db.t3.micro"
      multi_az          = false
    }
    staging = {
      instance_count    = 2
      db_instance_class = "db.t3.small"
      multi_az          = true
    }
    prod = {
      instance_count    = 4
      db_instance_class = "db.r5.large"
      multi_az          = true
    }
  }

  # Use variable override if provided, otherwise use environment default
  effective_count    = coalesce(var.instance_count, local.env_defaults[var.environment].instance_count)
  effective_db_class = coalesce(var.db_instance_class, local.env_defaults[var.environment].db_instance_class)
  multi_az           = local.env_defaults[var.environment].multi_az
}
```

## Pattern: Merging Variable Data with Computed Data

```hcl
# variables.tf
variable "extra_tags" {
  type    = map(string)
  default = {}
}

variable "environment" {
  type = string
}

variable "project_name" {
  type = string
}

variable "team_name" {
  type = string
}

# locals.tf
locals {
  # Combine user-provided tags with always-required tags
  all_tags = merge(
    # User-provided additional tags (variable)
    var.extra_tags,

    # Required tags (computed) override conflicting user-provided values
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "OpenTofu"
    },

    # Override priority - computed values take precedence
    {
      Owner = var.team_name
    }
  )
}
```

## Pattern: Building Complex Structures from Simple Variables

```hcl
# variables.tf - Simple, primitive inputs
variable "enable_ssl" {
  type    = bool
  default = false
}

variable "ssl_cert_arn" {
  type    = string
  default = null
}

variable "http_port" {
  type    = number
  default = 80
}

variable "https_port" {
  type    = number
  default = 443
}

# locals.tf - Complex structure computed from simple variables
locals {
  enable_https = var.enable_ssl && var.ssl_cert_arn != null

  # Build listener configurations
  listeners = concat(
    # Always add HTTP listener
    [{
      port     = var.http_port
      protocol = "HTTP"
      action = {
        type             = local.enable_https ? "redirect" : "forward"
        redirect         = local.enable_https ? { port = tostring(var.https_port), protocol = "HTTPS", status_code = "HTTP_301" } : null
        target_group_arn = local.enable_https ? null : aws_lb_target_group.main.arn
      }
    }],
    # Conditionally add HTTPS listener
    local.enable_https ? [{
      port            = var.https_port
      protocol        = "HTTPS"
      certificate_arn = var.ssl_cert_arn
      action = {
        type             = "forward"
        target_group_arn = aws_lb_target_group.main.arn
        redirect         = null
      }
    }] : []
  )
}
```

## Real-World Example

```hcl
# variables.tf
variable "environment" { type = string }
variable "project"     { type = string }
variable "aws_region"  { type = string; default = "us-east-1" }
variable "extra_tags"  { type = map(string); default = {} }

# locals.tf
locals {
  name_prefix   = "${var.project}-${var.environment}"
  is_production = var.environment == "prod"

  common_tags = merge(
    {
      Environment = var.environment
      Project     = var.project
      Region      = var.aws_region
      ManagedBy   = "OpenTofu"
    },
    var.extra_tags
  )

  # Computed sizing based on environment
  web_count      = local.is_production ? 3 : 1
  db_size        = local.is_production ? "db.r5.large" : "db.t3.micro"
  cache_size     = local.is_production ? "cache.r6g.large" : "cache.t3.micro"
}
```

## Conclusion

The separation between variables (inputs) and locals (computations) creates a clear architecture: users configure what they need via variables, and the module uses locals to derive all the computed values needed for resources. This pattern reduces cognitive load for module consumers (fewer required inputs), while keeping all business logic in one place (locals) where it's easy to maintain and understand.
