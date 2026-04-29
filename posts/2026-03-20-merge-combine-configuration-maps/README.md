# How to Merge and Combine Configuration Maps in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Map, Merge, HCL, Infrastructure as Code

Description: Learn how to use OpenTofu's merge() function and related techniques to combine configuration maps, enabling layered, override-based configurations for different environments.

## Introduction

In OpenTofu, the `merge()` function combines multiple maps or objects into one, with later arguments taking precedence for duplicate keys. This pattern is essential for building layered configurations where base defaults are overridden per environment, region, or application.

## Basic merge()

The `merge()` function accepts any number of maps or objects and returns a single merged map or object:

```hcl
locals {
  base = {
    region       = "us-east-1"
    instance_type = "t3.micro"
    monitoring   = false
  }

  production_overrides = {
    instance_type = "m5.large"
    monitoring    = true
  }

  config = merge(local.base, local.production_overrides)
  # Result:
  # {
  #   region        = "us-east-1"
  #   instance_type = "m5.large"   <- overridden
  #   monitoring    = true          <- overridden
  # }
}
```

## Layered Tag Configuration

A common use case is merging tag maps:

```hcl
locals {
  global_tags = {
    ManagedBy   = "opentofu"
    Company     = "Acme Corp"
    CostCenter  = "engineering"
  }

  environment_tags = {
    dev  = { Environment = "development", AutoShutdown = "true" }
    prod = { Environment = "production", AutoShutdown = "false", Backup = "true" }
  }

  service_tags = {
    Service = "payment-api"
    Team    = "platform"
  }

  tags = merge(
    local.global_tags,
    local.environment_tags[var.environment],
    local.service_tags
  )
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  tags          = local.tags
}
```

## Environment-Specific Configuration Overrides

Build a complete environment configuration from defaults and overrides:

```hcl
variable "environment" {
  type    = string
  default = "dev"
}

locals {
  defaults = {
    vpc_cidr          = "10.0.0.0/16"
    enable_nat        = false
    db_instance_class = "db.t3.micro"
    db_storage_gb     = 20
    backup_retention  = 1
    multi_az          = false
  }

  env_overrides = {
    dev = {}
    staging = {
      db_instance_class = "db.t3.small"
    }
    prod = {
      enable_nat        = true
      db_instance_class = "db.r5.large"
      db_storage_gb     = 100
      backup_retention  = 7
      multi_az          = true
    }
  }

  config = merge(local.defaults, local.env_overrides[var.environment])
}
```

## Merging Variable Maps with Defaults

Allow users to override only specific settings:

```hcl
variable "extra_tags" {
  type    = map(string)
  default = {}
}

variable "container_env" {
  type    = map(string)
  default = {}
}

locals {
  default_container_env = {
    LOG_LEVEL    = "info"
    APP_ENV      = var.environment
    METRICS_PORT = "9090"
  }

  # User-provided env vars override defaults
  final_container_env = merge(local.default_container_env, var.container_env)
}

resource "aws_ecs_task_definition" "app" {
  family = "app"
  container_definitions = jsonencode([{
    name  = "app"
    image = var.app_image
    environment = [
      for k, v in local.final_container_env : {
        name  = k
        value = v
      }
    ]
  }])
}
```

## Merging Nested Maps Explicitly

`merge()` is shallow - it doesn't recursively merge nested maps. For nested maps, merge at the nested level explicitly:

```hcl
locals {
  base_config = {
    timeouts = {
      create = "10m"
      delete = "5m"
    }
  }

  config = merge(local.base_config, {
    # Merge the nested map explicitly because merge() is shallow
    timeouts = merge(local.base_config.timeouts, {
      update = "15m"
    })
  })
}
```

## Using merge() in a for Expression

Combine a common base with per-resource settings:

```hcl
variable "buckets" {
  type = map(object({
    versioning = optional(bool, false)
    lifecycle  = optional(number, 30)
  }))
}

locals {
  bucket_defaults = {
    versioning = false
    lifecycle  = 30
    encryption = "AES256"
  }

  buckets_with_defaults = {
    for name, cfg in var.buckets :
    name => merge(local.bucket_defaults, cfg)
  }
}
```

## Best Practices

- Place the most specific map last in `merge()` - later maps win on key conflicts.
- Use `merge()` at the `locals` level to keep resource blocks clean.
- Avoid deeply nested maps when possible; flatten config structures for easier merging.
- Document which keys can be overridden via input variables.
- Use `optional()` in object type constraints for attributes callers may omit, and provide defaults where appropriate.

## Conclusion

The `merge()` function is a foundational OpenTofu pattern for building layered, environment-aware configurations. Combined with `locals` and well-structured variables, it enables clean, DRY configurations that adapt to any environment without duplication.
