# How to Use Variable Defaults with merge for Flexible Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Variables, Merge, Configuration, Infrastructure as Code

Description: Learn how to combine Terraform variable defaults with the merge function to create flexible configuration patterns where users only need to override the specific settings they want to change.

---

A common pattern in Terraform modules is providing sensible defaults while still letting callers customize specific settings. The `merge` function makes this possible - you define a full set of defaults in a local and merge caller-provided overrides on top. The result is a configuration where the caller only specifies what they want to change.

This post covers the merge-based defaults pattern with practical examples for different infrastructure scenarios.

## The Basic Pattern

Define defaults in a local, accept overrides through a variable, and merge them:

```hcl
variable "config_overrides" {
  description = "Override specific configuration values"
  type        = map(any)
  default     = {}
}

locals {
  # Complete set of defaults
  default_config = {
    instance_type     = "t3.micro"
    volume_size       = 20
    enable_monitoring = false
    enable_backups    = true
    backup_retention  = 7
  }

  # Merge: overrides take precedence over defaults
  config = merge(local.default_config, var.config_overrides)
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = local.config.instance_type
  monitoring    = local.config.enable_monitoring

  root_block_device {
    volume_size = local.config.volume_size
  }
}
```

The caller can override just what they need:

```hcl
# Override only instance_type and volume_size
config_overrides = {
  instance_type = "m5.large"
  volume_size   = 100
}
# enable_monitoring, enable_backups, and backup_retention keep their defaults
```

## Typed Object Defaults with optional()

For better type safety, use an object type with `optional()` attributes instead of `map(any)`:

```hcl
variable "config" {
  description = "Application configuration"
  type = object({
    instance_type     = optional(string, "t3.micro")
    volume_size       = optional(number, 20)
    enable_monitoring = optional(bool, false)
    enable_backups    = optional(bool, true)
    backup_retention  = optional(number, 7)
  })
  default = {}
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.config.instance_type
  monitoring    = var.config.enable_monitoring

  root_block_device {
    volume_size = var.config.volume_size
  }
}
```

This approach is cleaner because Terraform validates the types at plan time. If someone passes `volume_size = "big"`, they get a type error immediately.

## Merging Tags

Tags are the most common use case for merge. Define base tags in a local and let callers add their own:

```hcl
variable "extra_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

locals {
  base_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
    Module      = "networking"
  }

  # Caller's tags override base tags for matching keys
  common_tags = merge(local.base_tags, var.extra_tags)
}

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-vpc"
  })
}
```

The caller can add team-specific or cost-allocation tags:

```hcl
extra_tags = {
  CostCenter = "CC-12345"
  Team       = "platform"
  OnCall     = "platform-oncall@company.com"
}
```

## Environment-Specific Defaults with merge

Use merge to build environment-specific configurations from layered defaults:

```hcl
locals {
  # Base defaults for all environments
  base_config = {
    instance_type        = "t3.micro"
    min_capacity         = 1
    max_capacity         = 2
    enable_multi_az      = false
    enable_encryption    = true
    log_retention_days   = 30
    backup_retention     = 7
    deletion_protection  = false
  }

  # Environment-specific overrides
  env_configs = {
    dev = {
      # Mostly uses base defaults
    }
    staging = {
      instance_type      = "t3.small"
      min_capacity       = 2
      max_capacity       = 4
      log_retention_days = 90
    }
    production = {
      instance_type        = "m5.large"
      min_capacity         = 3
      max_capacity         = 10
      enable_multi_az      = true
      log_retention_days   = 365
      backup_retention     = 30
      deletion_protection  = true
    }
  }

  # Three-way merge: base -> environment -> user overrides
  config = merge(
    local.base_config,
    lookup(local.env_configs, var.environment, {}),
    var.config_overrides
  )
}
```

The merge order matters. Values from later arguments override earlier ones. So the chain is: base defaults, then environment-specific settings, then any explicit caller overrides.

## Merging Nested Objects

The `merge` function only works one level deep. For nested objects, you need to merge each level separately:

```hcl
locals {
  default_alb_config = {
    internal            = false
    idle_timeout        = 60
    deletion_protection = false
    access_logs = {
      enabled = false
      bucket  = ""
      prefix  = ""
    }
    stickiness = {
      enabled  = false
      type     = "lb_cookie"
      duration = 86400
    }
  }
}

variable "alb_overrides" {
  type    = any
  default = {}
}

locals {
  # Merge top-level fields
  alb_config = merge(local.default_alb_config, var.alb_overrides)

  # For nested objects, merge separately
  access_logs_config = merge(
    local.default_alb_config.access_logs,
    try(var.alb_overrides.access_logs, {})
  )

  stickiness_config = merge(
    local.default_alb_config.stickiness,
    try(var.alb_overrides.stickiness, {})
  )
}
```

The `try()` function handles the case where the caller does not provide the nested key at all.

## Merging Lists with concat

While `merge` is for maps, `concat` serves a similar purpose for lists:

```hcl
locals {
  # Default security group rules
  default_ingress_rules = [
    {
      port        = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTPS"
    }
  ]

  default_egress_rules = [
    {
      port        = 0
      protocol    = "-1"
      cidr_blocks = ["0.0.0.0/0"]
      description = "All outbound"
    }
  ]
}

variable "additional_ingress_rules" {
  type = list(object({
    port        = number
    protocol    = string
    cidr_blocks = list(string)
    description = string
  }))
  default = []
}

locals {
  # Combine default rules with additional rules
  ingress_rules = concat(local.default_ingress_rules, var.additional_ingress_rules)
  egress_rules  = local.default_egress_rules
}
```

## Per-Service Defaults with merge

When creating multiple services from a map, apply defaults to each one:

```hcl
variable "services" {
  type = map(any)
}

locals {
  service_defaults = {
    cpu           = 256
    memory        = 512
    replicas      = 1
    port          = 8080
    health_path   = "/health"
    public        = false
    protocol      = "HTTP"
    log_retention = 30
  }

  # Apply defaults to each service
  services = {
    for name, svc in var.services :
    name => merge(local.service_defaults, svc)
  }
}

resource "aws_ecs_task_definition" "this" {
  for_each = local.services

  family = "${var.project}-${each.key}"
  cpu    = each.value.cpu
  memory = each.value.memory
  # ...
}
```

Callers specify only the attributes they want to customize per service:

```hcl
services = {
  api = {
    image    = "myapp/api:latest"
    cpu      = 1024
    memory   = 2048
    port     = 8080
    public   = true
  }
  worker = {
    image = "myapp/worker:latest"
    # Uses all defaults: 256 CPU, 512 MB, 1 replica, etc.
  }
}
```

## Validation with Merged Values

Validate the final merged configuration, not just the overrides:

```hcl
variable "config" {
  type = object({
    min_capacity = optional(number, 1)
    max_capacity = optional(number, 4)
    target_cpu   = optional(number, 70)
  })
  default = {}

  validation {
    condition     = var.config.min_capacity <= var.config.max_capacity
    error_message = "min_capacity must be less than or equal to max_capacity."
  }

  validation {
    condition     = var.config.target_cpu >= 10 && var.config.target_cpu <= 90
    error_message = "target_cpu must be between 10 and 90."
  }
}
```

Because optional attributes have defaults, the validation runs against the complete merged object.

## When Not to Use merge

Merge adds indirection. For simple cases, explicit variables with defaults are clearer:

```hcl
# Clear and explicit - better for a few settings
variable "instance_type" {
  type    = string
  default = "t3.micro"
}

variable "volume_size" {
  type    = number
  default = 20
}

# Versus merge-based - better when there are many settings
variable "compute_config" {
  type = object({
    instance_type = optional(string, "t3.micro")
    volume_size   = optional(number, 20)
    # ... 10 more fields
  })
  default = {}
}
```

Use the merge pattern when you have many related settings that form a logical group. Use individual variables when you have just a few independent settings.

## Summary

The merge-with-defaults pattern gives your Terraform modules the flexibility of "configure everything" with the convenience of "configure nothing and get sensible behavior." Define comprehensive defaults in locals, accept overrides through variables, and merge them together. For maps, use `merge()`. For lists, use `concat()`. For nested structures, merge each level separately with `try()` to handle missing keys. This keeps your module interface clean while making it possible to customize every detail when needed.

For more on Terraform variable patterns, see our post on [choosing between variables and locals](https://oneuptime.com/blog/post/2026-02-23-how-to-choose-between-variables-and-locals-in-terraform/view).
