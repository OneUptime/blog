# How to Use the merge Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, Terraform Functions, Collection Functions

Description: Learn how to use the merge function in Terraform to combine multiple maps into one, with practical examples for tag management, configuration layering, and defaults.

---

Managing configuration data in Terraform often involves combining maps from multiple sources - default settings, environment overrides, user customizations, and module inputs. The `merge` function takes two or more maps and combines them into a single map. When keys overlap, later maps take precedence, making it perfect for implementing configuration layering with defaults and overrides.

This guide covers the `merge` function's behavior, its use in tag management, configuration layering, and other practical patterns.

## What is the merge Function?

The `merge` function combines multiple maps into a single map. If the same key appears in more than one input map, the value from the last map wins.

```hcl
# Combines maps, later values override earlier ones for duplicate keys
merge(map1, map2, ...)
```

You can pass any number of maps to `merge`.

## Basic Usage in Terraform Console

```hcl
# Merge two maps with no overlapping keys
> merge({a = 1, b = 2}, {c = 3, d = 4})
{
  "a" = 1
  "b" = 2
  "c" = 3
  "d" = 4
}

# Overlapping keys - later value wins
> merge({a = 1, b = 2}, {b = 99, c = 3})
{
  "a" = 1
  "b" = 99
  "c" = 3
}

# Three maps
> merge({a = 1}, {b = 2}, {c = 3})
{
  "a" = 1
  "b" = 2
  "c" = 3
}

# Empty map has no effect
> merge({a = 1}, {})
{
  "a" = 1
}

# Override chain: last value for each key wins
> merge({env = "dev"}, {env = "staging"}, {env = "production"})
{
  "env" = "production"
}
```

## Tag Management - The Most Common Use Case

Tag management is where `merge` gets used the most. You typically have default tags that apply to every resource, and then specific tags that vary per resource or environment.

```hcl
variable "environment" {
  type    = string
  default = "dev"
}

variable "extra_tags" {
  type    = map(string)
  default = {}
}

locals {
  # Default tags applied to everything
  default_tags = {
    ManagedBy   = "terraform"
    Project     = "webapp"
    Environment = var.environment
  }

  # Resource-specific tags
  instance_tags = {
    Role = "webserver"
    OS   = "amazon-linux-2"
  }
}

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  # Merge default tags, resource tags, and any extra tags
  # Extra tags can override defaults if needed
  tags = merge(local.default_tags, local.instance_tags, var.extra_tags)
}
```

If `extra_tags` includes `Environment = "production"`, it will override the default `Environment` tag. This layered approach gives you flexibility while ensuring all resources have baseline tags.

## Configuration Layering with Defaults

A powerful pattern is building configuration objects from multiple layers of defaults and overrides.

```hcl
locals {
  # Base defaults for all environments
  base_config = {
    instance_type     = "t3.micro"
    instance_count    = 1
    monitoring        = false
    backup_retention  = 7
    multi_az          = false
  }

  # Environment-specific overrides
  env_overrides = {
    dev = {}
    staging = {
      instance_type  = "t3.medium"
      instance_count = 2
      monitoring     = true
    }
    production = {
      instance_type    = "m5.large"
      instance_count   = 3
      monitoring       = true
      backup_retention = 30
      multi_az         = true
    }
  }
}

variable "environment" {
  type    = string
  default = "dev"
}

locals {
  # Merge base with environment-specific overrides
  config = merge(
    local.base_config,
    lookup(local.env_overrides, var.environment, {})
  )
}

resource "aws_instance" "app" {
  count         = local.config.instance_count
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = local.config.instance_type

  monitoring = local.config.monitoring

  tags = {
    Name        = "app-${var.environment}-${count.index + 1}"
    Environment = var.environment
  }
}
```

## Module Interface Design

When building reusable modules, `merge` helps create flexible interfaces where callers can selectively override defaults.

```hcl
# Module variables
variable "additional_tags" {
  type    = map(string)
  default = {}
}

variable "custom_settings" {
  type    = map(string)
  default = {}
}

locals {
  module_tags = {
    Module  = "vpc"
    Version = "2.1.0"
  }

  # Caller's tags merge on top of module tags
  all_tags = merge(local.module_tags, var.additional_tags)

  default_settings = {
    enable_dns_support   = "true"
    enable_dns_hostnames = "true"
    instance_tenancy     = "default"
  }

  # Caller can override any setting
  settings = merge(local.default_settings, var.custom_settings)
}

resource "aws_vpc" "main" {
  cidr_block           = var.cidr_block
  enable_dns_support   = local.settings["enable_dns_support"] == "true"
  enable_dns_hostnames = local.settings["enable_dns_hostnames"] == "true"
  instance_tenancy     = local.settings["instance_tenancy"]

  tags = local.all_tags
}
```

## Merging Multiple Sources

Real-world configurations often pull tags and settings from many sources.

```hcl
variable "org_tags" {
  type    = map(string)
  default = {
    Organization = "acme-corp"
    CostCenter   = "engineering"
  }
}

variable "team_tags" {
  type    = map(string)
  default = {
    Team      = "platform"
    SlackChannel = "platform-alerts"
  }
}

variable "service_tags" {
  type    = map(string)
  default = {
    Service = "payment-api"
    Tier    = "critical"
  }
}

variable "override_tags" {
  type    = map(string)
  default = {}
}

locals {
  # Build tags from most general to most specific
  # Each layer can override the previous one
  final_tags = merge(
    var.org_tags,       # Organization-wide tags
    var.team_tags,      # Team-specific tags
    var.service_tags,   # Service-specific tags
    var.override_tags,  # Manual overrides (highest priority)
  )
}
```

## merge vs Object Spread

In some other tools, you might use spread operators. In Terraform, `merge` serves that purpose.

```hcl
# There is no spread operator in Terraform
# merge IS the equivalent
locals {
  base    = { a = 1, b = 2 }
  overlay = { b = 99, c = 3 }

  combined = merge(local.base, local.overlay)
  # { a = 1, b = 99, c = 3 }
}
```

## Conditional Merging

You can conditionally include maps in a merge chain.

```hcl
variable "enable_monitoring" {
  type    = bool
  default = false
}

variable "enable_encryption" {
  type    = bool
  default = true
}

locals {
  base_config = {
    instance_type = "t3.micro"
    volume_size   = 50
  }

  monitoring_config = {
    monitoring_enabled = true
    metrics_port       = 9090
  }

  encryption_config = {
    encrypted      = true
    kms_key_id     = "alias/app-key"
  }

  # Conditionally merge based on feature flags
  final_config = merge(
    local.base_config,
    var.enable_monitoring ? local.monitoring_config : {},
    var.enable_encryption ? local.encryption_config : {},
  )
}
```

Using an empty map `{}` as the conditional false value effectively skips that layer in the merge.

## Dynamic Map Construction with merge

You can use `merge` inside loops to accumulate map entries.

```hcl
variable "services" {
  type = list(object({
    name = string
    port = number
  }))
  default = [
    { name = "api", port = 8080 },
    { name = "web", port = 80 },
    { name = "admin", port = 8081 },
  ]
}

locals {
  # Build a port map from the service list
  # This is cleaner with a for expression, but shows merge in action
  port_map = merge([
    for svc in var.services : {
      (svc.name) = svc.port
    }
  ]...)
  # Result: { api = 8080, web = 80, admin = 8081 }
}
```

Note the `...` (expansion) operator, which spreads a list of maps as individual arguments to `merge`.

## Edge Cases

- **Empty maps are no-ops**: Merging with `{}` does nothing.
- **All maps must have compatible value types**: If you merge `{a = "string"}` with `{a = 5}`, Terraform will attempt type unification and may error.
- **Key ordering**: The result map's keys are sorted alphabetically, regardless of input order.
- **Not recursive**: `merge` does not deep-merge nested maps. It replaces the entire value for a key.

```hcl
# merge is NOT recursive/deep merge
> merge({a = {x = 1, y = 2}}, {a = {y = 99}})
{
  "a" = {
    "y" = 99
  }
}
# Note: x is lost because the entire "a" value was replaced
```

If you need deep merging of nested maps, you will need to write custom logic.

## Summary

The `merge` function is fundamental to Terraform configuration management. It enables clean patterns for tag layering, default/override configurations, and flexible module interfaces.

Key takeaways:

- `merge` combines maps, with later values overriding earlier ones for duplicate keys
- Essential for tag management with layered defaults
- Use empty maps `{}` for conditional merging
- Not recursive - nested maps are replaced entirely, not deep-merged
- Use the `...` expansion operator to merge a list of maps
- All input maps must have compatible value types

Every Terraform project that uses tags or configuration layering benefits from `merge`. Master it early.
