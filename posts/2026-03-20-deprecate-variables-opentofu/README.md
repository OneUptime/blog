# How to Deprecate Variables in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, Deprecation, Module Development, Infrastructure as Code, DevOps

Description: A guide to deprecating OpenTofu variables using the deprecated attribute to communicate breaking changes to module users.

## Introduction

When maintaining OpenTofu modules, you sometimes need to rename variables, merge them into a new structure, or remove them entirely. The `deprecated` attribute (introduced experimentally in OpenTofu 1.10 and stable in 1.11+) allows you to mark variables as deprecated with a message explaining what users should do instead.

## The deprecated Attribute

```hcl
variable "old_instance_type" {
  type        = string
  default     = null

  # Mark as deprecated with migration guidance
  deprecated = "Use 'server_config.instance_type' instead. This variable will be removed in v2.0."
}

variable "server_config" {
  type = object({
    instance_type = string
    disk_size_gb  = number
  })
  default = {
    instance_type = "t3.micro"
    disk_size_gb  = 20
  }
}
```

## Deprecation Warning Output

When a caller passes a deprecated module variable, OpenTofu shows a warning:

```bash
tofu plan

# Warning: Variable marked as deprecated by the module author

#
#   on main.tf line 3, in module "compute":
#    3:   old_instance_type = "t3.small"
#
# Variable "old_instance_type" is marked as deprecated with the
# following message:
# Use 'server_config.instance_type' instead. This variable will be
# removed in v2.0.
```

## Module Variable Deprecation Pattern

```hcl
# modules/compute/variables.tf

# OLD - deprecated variable
variable "instance_type" {
  type       = string
  default    = null
  deprecated = <<-EOT
    The 'instance_type' variable is deprecated.
    Use 'server' object instead:
      server = {
        instance_type = "t3.micro"
        count         = 2
        disk_gb       = 20
      }
    This variable will be removed in module version 3.0.
  EOT
}

# NEW - replacement variable
variable "server" {
  type = object({
    instance_type = optional(string)
    count         = optional(number, 1)
    disk_gb       = optional(number, 20)
  })
  default = {}
}
```

## Backward Compatibility with Deprecated Variables

```hcl
# modules/compute/main.tf

# Support both old and new variable patterns
locals {
  # Use new variable if set, fall back to deprecated variable
  effective_instance_type = (
    var.server.instance_type != null
    ? var.server.instance_type
    : coalesce(var.instance_type, "t3.micro")
  )
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = local.effective_instance_type
  count         = var.server.count

  root_block_device {
    volume_size = var.server.disk_gb
  }
}
```

## Migration Guide in Deprecation Message

```hcl
variable "database_password" {
  type       = string
  default    = null
  sensitive  = true
  deprecated = <<-EOT
    The 'database_password' input variable is deprecated.

    Migration guide:
    1. Store your password in AWS Secrets Manager
    2. Reference it using the 'database_secret_arn' variable
    3. The module will retrieve the password automatically

    Old usage:
      database_password = "my-password"

    New usage:
      database_secret_arn = "arn:aws:secretsmanager:us-east-1:123:secret:prod/db"

    Breaking change in module version 4.0.0.
  EOT
}

variable "database_secret_arn" {
  type        = string
  description = "ARN of the Secrets Manager secret containing the database password"
  default     = null
}
```

## Versioned Module with Deprecations

```hcl
# version.tf in your module
terraform {
  required_version = ">= 1.10.0"  # Required for deprecated attribute support
}

# CHANGELOG.md entries to accompany deprecations
# ## [2.0.0] - Upcoming
# ### Removed
# - Variable `old_instance_type` (deprecated since 1.5.0)
#
# ## [1.5.0] - 2026-01-01
# ### Deprecated
# - Variable `old_instance_type` - use `server.instance_type` instead
```

## Conclusion

The `deprecated` attribute in OpenTofu variables provides a clean, standardized way to communicate breaking changes to module users. By including clear migration instructions in the deprecation message, users know exactly how to update their code before the variable is removed. This is essential for maintaining backward compatibility while evolving module interfaces over time. Always pair deprecation warnings with a concrete timeline and migration guide.
