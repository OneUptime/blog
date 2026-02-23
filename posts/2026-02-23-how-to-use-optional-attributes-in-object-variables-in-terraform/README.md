# How to Use Optional Attributes in Object Variables in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Variables, Objects, Optional, HCL

Description: Learn how to use the optional() modifier in Terraform object variables to make specific attributes optional with default values, reducing boilerplate for module users.

---

One of the biggest usability problems with Terraform object variables is that every attribute is required by default. If you define an object with ten attributes, the caller must provide all ten - even if most of them have sensible defaults. The `optional()` type modifier solves this problem by letting you mark specific attributes as optional and providing default values for them when the caller does not supply them.

This feature, stabilized in Terraform 1.3, is a game-changer for building user-friendly modules.

## The Problem Without optional()

Without `optional()`, object variables force callers to provide everything:

```hcl
variable "server_config" {
  type = object({
    instance_type = string
    disk_size_gb  = number
    monitoring    = bool
    ebs_optimized = bool
    tenancy       = string
  })
}
```

The caller must provide all five attributes:

```hcl
# This works
server_config = {
  instance_type = "t3.large"
  disk_size_gb  = 100
  monitoring    = true
  ebs_optimized = true
  tenancy       = "default"
}

# This fails - missing tenancy and ebs_optimized
server_config = {
  instance_type = "t3.large"
  disk_size_gb  = 100
  monitoring    = true
}
```

You could add a `default` for the entire variable, but then callers who provide the variable must still supply all attributes.

## The optional() Modifier

The `optional()` modifier wraps a type to make that attribute optional. It takes one or two arguments: the type, and optionally a default value.

```hcl
variable "server_config" {
  type = object({
    instance_type = string                       # Required
    disk_size_gb  = optional(number, 50)         # Optional, defaults to 50
    monitoring    = optional(bool, true)          # Optional, defaults to true
    ebs_optimized = optional(bool, true)          # Optional, defaults to true
    tenancy       = optional(string, "default")   # Optional, defaults to "default"
  })
}
```

Now callers only need to provide `instance_type`:

```hcl
# This works! All optional attributes get their defaults.
server_config = {
  instance_type = "t3.large"
}

# This also works - override just what you need
server_config = {
  instance_type = "t3.large"
  disk_size_gb  = 200
  monitoring    = false
}
```

## optional() Without a Default

If you call `optional()` with just the type (no second argument), the default is `null`:

```hcl
variable "server_config" {
  type = object({
    instance_type = string
    custom_ami    = optional(string)  # Defaults to null if not provided
  })
}
```

```hcl
# When custom_ami is not provided, var.server_config.custom_ami is null
server_config = {
  instance_type = "t3.large"
}
```

This is useful for truly optional settings where `null` signals "do not configure this":

```hcl
resource "aws_instance" "main" {
  ami           = coalesce(var.server_config.custom_ami, data.aws_ami.default.id)
  instance_type = var.server_config.instance_type
}
```

## Real-World Module Interface

Here is a practical example of a module that uses `optional()` heavily to provide a clean, minimal interface while supporting advanced customization:

```hcl
# modules/web-app/variables.tf

variable "app" {
  description = "Web application configuration"
  type = object({
    # Required - no sensible default
    name  = string
    image = string

    # Optional with sensible defaults
    port          = optional(number, 8080)
    replicas      = optional(number, 2)
    cpu           = optional(number, 256)
    memory        = optional(number, 512)
    protocol      = optional(string, "HTTP")
    enable_https  = optional(bool, true)

    # Health check with nested optional object
    health_check = optional(object({
      path                = optional(string, "/health")
      interval            = optional(number, 30)
      timeout             = optional(number, 5)
      healthy_threshold   = optional(number, 3)
      unhealthy_threshold = optional(number, 3)
    }), {})  # Default to empty object, which triggers nested defaults

    # Auto-scaling configuration
    autoscaling = optional(object({
      min_capacity    = optional(number, 1)
      max_capacity    = optional(number, 10)
      target_cpu      = optional(number, 70)
      scale_in_cooldown  = optional(number, 300)
      scale_out_cooldown = optional(number, 60)
    }))  # Default null means autoscaling is disabled

    # Environment variables
    env_vars = optional(map(string), {})

    # Additional tags
    tags = optional(map(string), {})
  })
}
```

With this definition, a minimal call looks like this:

```hcl
# Minimal - just name and image
module "api" {
  source = "./modules/web-app"

  app = {
    name  = "api"
    image = "myapp/api:v2.1.0"
  }
}
```

And a fully customized call:

```hcl
# Fully customized
module "api" {
  source = "./modules/web-app"

  app = {
    name     = "api"
    image    = "myapp/api:v2.1.0"
    port     = 3000
    replicas = 4
    cpu      = 1024
    memory   = 2048

    health_check = {
      path     = "/api/health"
      interval = 15
      timeout  = 3
    }

    autoscaling = {
      min_capacity = 2
      max_capacity = 20
      target_cpu   = 60
    }

    env_vars = {
      LOG_LEVEL = "debug"
      DB_POOL   = "20"
    }

    tags = {
      Team = "backend"
    }
  }
}
```

## Nested Optional Objects

When you have optional nested objects, you need to think about what happens when the entire nested object is omitted:

```hcl
variable "config" {
  type = object({
    name = string

    # When logging is null, logging is disabled
    logging = optional(object({
      level     = optional(string, "info")
      format    = optional(string, "json")
      dest      = optional(string, "stdout")
    }))

    # When monitoring is null, monitoring is disabled
    monitoring = optional(object({
      enabled       = optional(bool, true)
      interval_secs = optional(number, 60)
      endpoints     = optional(list(string), [])
    }))
  })
}
```

Using this in your resources:

```hcl
locals {
  # Check if optional sections were provided
  logging_enabled    = var.config.logging != null
  monitoring_enabled = var.config.monitoring != null
}

resource "aws_cloudwatch_log_group" "app" {
  count = local.logging_enabled ? 1 : 0
  name  = "/app/${var.config.name}"
}
```

## optional() with Maps of Objects

The `optional()` modifier works inside map values too:

```hcl
variable "databases" {
  description = "Database configurations"
  type = map(object({
    engine         = string
    instance_class = optional(string, "db.t3.medium")
    storage_gb     = optional(number, 20)
    multi_az       = optional(bool, false)
    backup_days    = optional(number, 7)
    parameters     = optional(map(string), {})
  }))
}
```

```hcl
# Only specify what differs from defaults
databases = {
  users = {
    engine = "postgres"
    # Uses defaults for everything else
  }
  analytics = {
    engine         = "postgres"
    instance_class = "db.r6g.xlarge"
    storage_gb     = 500
    multi_az       = true
    backup_days    = 30
  }
}
```

## optional() with Lists of Objects

```hcl
variable "services" {
  type = list(object({
    name     = string
    port     = number
    replicas = optional(number, 1)
    cpu      = optional(number, 256)
    memory   = optional(number, 512)
    env_vars = optional(map(string), {})
  }))
  default = []
}
```

```hcl
services = [
  {
    name = "api"
    port = 8080
    # replicas, cpu, memory, env_vars all get defaults
  },
  {
    name     = "worker"
    port     = 9090
    replicas = 3
    cpu      = 1024
    memory   = 2048
  },
]
```

## Default Object Gotcha

When using `optional()` with a nested object that has its own optional attributes, you need to provide a default value for the parent to trigger the child defaults:

```hcl
variable "config" {
  type = object({
    # This default of {} triggers the nested optional defaults
    health_check = optional(object({
      path     = optional(string, "/health")
      interval = optional(number, 30)
    }), {})  # The {} here is important!
  })
}
```

Without the `{}` default, the entire `health_check` would be `null` when not provided, and you would not get the nested defaults.

```hcl
# With default = {}:
config = { }
# var.config.health_check.path = "/health"
# var.config.health_check.interval = 30

# With default = null (or no default):
config = { }
# var.config.health_check = null
# var.config.health_check.path would error!
```

## Validation with Optional Attributes

You can validate optional attributes, but remember they might have their default value:

```hcl
variable "server" {
  type = object({
    instance_type = string
    disk_size_gb  = optional(number, 50)
    tenancy       = optional(string, "default")
  })

  validation {
    condition     = var.server.disk_size_gb >= 20
    error_message = "Disk size must be at least 20 GB."
  }

  validation {
    condition     = contains(["default", "dedicated", "host"], var.server.tenancy)
    error_message = "Tenancy must be default, dedicated, or host."
  }
}
```

## Wrapping Up

The `optional()` modifier transforms how you design Terraform module interfaces. Instead of forcing callers to provide every attribute or using a single `default` for the entire object, you can mark individual attributes as optional with sensible defaults. This leads to modules that are both easy to use for simple cases and fully customizable for advanced ones. It is one of the most impactful features added to Terraform's type system, and if you are building reusable modules, you should be using it.

For more on structuring object variables, see our posts on [object variables](https://oneuptime.com/blog/post/2026-02-23-how-to-use-variables-of-type-object-in-terraform/view) and [nested object variables](https://oneuptime.com/blog/post/2026-02-23-how-to-use-nested-object-variables-in-terraform/view).
