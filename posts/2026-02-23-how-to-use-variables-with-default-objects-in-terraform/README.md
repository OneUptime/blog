# How to Use Variables with Default Objects in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Variables, Objects, Defaults, Configuration

Description: Learn how to set default values for object variables in Terraform, including strategies for partial overrides, merging defaults, and building user-friendly module interfaces.

---

Setting good default values on object variables is one of the most practical things you can do to make your Terraform modules easier to use. A well-chosen default means callers only need to override the values that differ from the common case, rather than specifying every single attribute. But default objects in Terraform have some behaviors that are not immediately obvious, and understanding them will help you avoid surprises.

This post covers how defaults work with object variables, strategies for partial overrides, and patterns for building configurations where callers do the minimum amount of work.

## Basic Default Objects

The simplest form is providing a complete default value for an object variable:

```hcl
variable "instance_config" {
  description = "EC2 instance configuration"
  type = object({
    instance_type = string
    disk_size_gb  = number
    monitoring    = bool
    tenancy       = string
  })
  default = {
    instance_type = "t3.micro"
    disk_size_gb  = 20
    monitoring    = false
    tenancy       = "default"
  }
}
```

When the caller does not provide this variable at all, Terraform uses the entire default object. The caller can then use the module without specifying `instance_config`:

```hcl
# Uses all defaults
module "web" {
  source = "./modules/web"
  # instance_config not specified - all defaults apply
}
```

## The All-or-Nothing Problem

Without `optional()`, providing the variable means providing the complete object. You cannot just override one attribute:

```hcl
# This fails - missing monitoring and tenancy
module "web" {
  source = "./modules/web"

  instance_config = {
    instance_type = "t3.large"
    disk_size_gb  = 100
  }
}
# Error: attribute "monitoring" is required
```

You must provide all attributes, even if you only want to change one:

```hcl
# This works but is verbose
module "web" {
  source = "./modules/web"

  instance_config = {
    instance_type = "t3.large"
    disk_size_gb  = 100
    monitoring    = false    # Same as default
    tenancy       = "default" # Same as default
  }
}
```

## Solving It with optional()

The `optional()` modifier is the modern solution. Each attribute gets its own default:

```hcl
variable "instance_config" {
  description = "EC2 instance configuration"
  type = object({
    instance_type = optional(string, "t3.micro")
    disk_size_gb  = optional(number, 20)
    monitoring    = optional(bool, false)
    tenancy       = optional(string, "default")
  })
  default = {}  # Empty object - all attributes use their own defaults
}
```

Now callers only specify what they want to change:

```hcl
# Override just instance_type - everything else uses defaults
module "web" {
  source = "./modules/web"

  instance_config = {
    instance_type = "t3.large"
  }
}
# disk_size_gb = 20, monitoring = false, tenancy = "default"
```

## The merge() Pattern for Older Terraform

Before `optional()` was available (Terraform < 1.3), teams used `merge()` in locals to achieve partial overrides:

```hcl
variable "instance_config" {
  description = "Instance configuration overrides"
  type        = map(any)
  default     = {}
}

locals {
  # Define defaults
  instance_defaults = {
    instance_type = "t3.micro"
    disk_size_gb  = 20
    monitoring    = false
    tenancy       = "default"
  }

  # Merge caller's values over defaults
  instance_config = merge(local.instance_defaults, var.instance_config)
}
```

This works but loses type safety since the variable is `map(any)`. The `optional()` approach is better.

## Default Objects for Environment Profiles

A powerful pattern is defining environment profiles as default objects:

```hcl
variable "environment" {
  description = "Target environment"
  type        = string
  default     = "dev"
}

locals {
  # Pre-defined environment profiles
  environment_profiles = {
    dev = {
      instance_type  = "t3.micro"
      instance_count = 1
      multi_az       = false
      storage_gb     = 20
      monitoring     = false
    }
    staging = {
      instance_type  = "t3.small"
      instance_count = 2
      multi_az       = false
      storage_gb     = 50
      monitoring     = true
    }
    production = {
      instance_type  = "t3.large"
      instance_count = 3
      multi_az       = true
      storage_gb     = 200
      monitoring     = true
    }
  }

  # Select the profile for the current environment
  profile = local.environment_profiles[var.environment]
}
```

Then use these profiles with optional override capabilities:

```hcl
variable "config_overrides" {
  description = "Override specific configuration values"
  type = object({
    instance_type  = optional(string)
    instance_count = optional(number)
    multi_az       = optional(bool)
    storage_gb     = optional(number)
    monitoring     = optional(bool)
  })
  default = {}
}

locals {
  # Apply overrides on top of the environment profile
  config = {
    instance_type  = coalesce(var.config_overrides.instance_type, local.profile.instance_type)
    instance_count = coalesce(var.config_overrides.instance_count, local.profile.instance_count)
    multi_az       = var.config_overrides.multi_az != null ? var.config_overrides.multi_az : local.profile.multi_az
    storage_gb     = coalesce(var.config_overrides.storage_gb, local.profile.storage_gb)
    monitoring     = var.config_overrides.monitoring != null ? var.config_overrides.monitoring : local.profile.monitoring
  }
}
```

```hcl
# Use production profile but with more instances
module "app" {
  source      = "./modules/app"
  environment = "production"

  config_overrides = {
    instance_count = 10
  }
}
```

Note: We use a ternary for boolean values because `coalesce()` considers `false` to be empty.

## Nested Default Objects

When objects contain other objects, defaults cascade:

```hcl
variable "app_config" {
  type = object({
    name = string

    compute = optional(object({
      cpu    = optional(number, 256)
      memory = optional(number, 512)
    }), {})

    networking = optional(object({
      port          = optional(number, 8080)
      protocol      = optional(string, "HTTP")
      enable_https  = optional(bool, true)
    }), {})

    logging = optional(object({
      level    = optional(string, "info")
      format   = optional(string, "json")
      dest     = optional(string, "cloudwatch")
    }), {})
  })
}
```

The important detail is the `{}` default on each nested `optional(object(...), {})`. This ensures the nested object exists (not `null`) and that all its `optional()` attributes get their defaults.

```hcl
# Minimal usage - just a name
app_config = {
  name = "my-app"
}
# compute.cpu = 256, compute.memory = 512
# networking.port = 8080, networking.enable_https = true
# logging.level = "info", logging.format = "json"
```

```hcl
# Override only networking
app_config = {
  name = "my-app"
  networking = {
    port = 3000
  }
}
# networking.port = 3000, networking.protocol = "HTTP" (default)
```

## Default Objects in Module Design

When designing a module, think about your defaults from the caller's perspective:

```hcl
# modules/rds/variables.tf

variable "database" {
  description = <<-EOT
    Database configuration. Only 'name' is required.
    All other attributes have sensible defaults for development.
    Override attributes as needed for staging and production.
  EOT

  type = object({
    # Required
    name = string

    # Engine settings
    engine         = optional(string, "postgres")
    engine_version = optional(string, "15.4")

    # Sizing - defaults suitable for development
    instance_class = optional(string, "db.t3.micro")
    storage_gb     = optional(number, 20)
    max_storage_gb = optional(number, 100)

    # Availability - conservative defaults
    multi_az = optional(bool, false)

    # Backup - reasonable defaults
    backup_retention_days = optional(number, 7)
    backup_window         = optional(string, "03:00-04:00")
    maintenance_window    = optional(string, "sun:04:00-sun:05:00")

    # Security
    storage_encrypted    = optional(bool, true)
    deletion_protection  = optional(bool, false)
    skip_final_snapshot  = optional(bool, true)

    # Parameters
    parameters = optional(map(string), {})
  })
}
```

This design lets callers start simple and add complexity as needed:

```hcl
# Development - minimal config
module "db" {
  source = "./modules/rds"
  database = {
    name = "myapp"
  }
}

# Production - customize what matters
module "db" {
  source = "./modules/rds"
  database = {
    name               = "myapp"
    instance_class     = "db.r6g.xlarge"
    storage_gb         = 500
    multi_az           = true
    backup_retention_days = 35
    deletion_protection   = true
    skip_final_snapshot   = false
  }
}
```

## Validation with Default Objects

You can validate the final resolved values including defaults:

```hcl
variable "config" {
  type = object({
    min_instances = optional(number, 1)
    max_instances = optional(number, 10)
    instance_type = optional(string, "t3.micro")
  })
  default = {}

  validation {
    condition     = var.config.min_instances <= var.config.max_instances
    error_message = "min_instances must be less than or equal to max_instances."
  }

  validation {
    condition     = var.config.min_instances >= 1
    error_message = "min_instances must be at least 1."
  }
}
```

## Wrapping Up

Default objects in Terraform set the baseline for your configurations. Combined with `optional()` attributes, they let you build module interfaces where callers only specify what differs from the common case. The key patterns are: use `optional(type, default_value)` for attributes with sensible defaults, use `optional(type)` (defaulting to `null`) for truly optional features, and remember to provide `{}` as the parent default for nested optional objects so the child defaults kick in. Well-designed defaults make the difference between a module that is a pleasure to use and one that requires a page of boilerplate for every call.

For more on object variable design, see our posts on [optional attributes](https://oneuptime.com/blog/post/2026-02-23-how-to-use-optional-attributes-in-object-variables-in-terraform/view) and [nested objects](https://oneuptime.com/blog/post/2026-02-23-how-to-use-nested-object-variables-in-terraform/view).
