# How to Choose Between Variables and Locals in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Variables, Locals, Best Practices, Infrastructure as Code

Description: Understand when to use Terraform input variables versus local values, with clear guidelines and practical examples that help you structure your configurations correctly.

---

Terraform gives you two ways to name values inside a module: input variables and locals. They look similar on the surface - both hold values you reference in resource blocks. But they serve fundamentally different purposes, and choosing wrong leads to modules that are either too rigid or too messy.

This post gives you clear guidelines for when to use each, with examples that show the right choice in common scenarios.

## The Core Difference

**Input variables** are values that come from outside the module. The caller provides them. They are the module's public interface.

**Locals** are values computed inside the module. The caller never sees them. They are the module's internal implementation details.

```hcl
# Variable - the caller sets this
variable "environment" {
  description = "Deployment environment"
  type        = string
}

# Local - computed internally from the variable
locals {
  is_production = var.environment == "production"
  name_prefix   = "myapp-${var.environment}"
}
```

The caller writes `environment = "production"` but never directly interacts with `is_production` or `name_prefix`.

## When to Use Variables

Use a variable when the value must be configurable by the caller. Here are the specific scenarios:

### Values That Change Between Deployments

```hcl
# Different callers deploy to different regions
variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

# Different callers use different instance sizes
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

# Different callers have different VPCs
variable "vpc_id" {
  description = "VPC to deploy into"
  type        = string
}
```

### Values That Are Part of the Module's Contract

If a module is meant to be reusable, variables define what the caller can customize.

```hcl
# A reusable ECS service module
variable "service_name" {
  description = "Name of the ECS service"
  type        = string
}

variable "container_image" {
  description = "Docker image to deploy"
  type        = string
}

variable "container_port" {
  description = "Port the container listens on"
  type        = number
}

variable "desired_count" {
  description = "Number of tasks to run"
  type        = number
  default     = 1
}
```

### Values You Want to Validate

Variables support validation blocks. Locals do not.

```hcl
variable "environment" {
  description = "Deployment environment"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}
```

If you need to catch bad input early, it has to be a variable.

## When to Use Locals

Use a local when the value is derived from other values and does not need to be set by the caller.

### Computed Names and Prefixes

```hcl
locals {
  # Derived from variables - the caller should not set these directly
  name_prefix    = "${var.project}-${var.environment}"
  log_group_name = "/ecs/${local.name_prefix}/app"
  bucket_name    = "${local.name_prefix}-artifacts"
}
```

If you made `name_prefix` a variable, callers could set it to something that does not match the project and environment, breaking your naming convention.

### Environment-Based Decisions

```hcl
locals {
  # Internal logic that callers should not override
  is_production   = var.environment == "production"
  enable_multi_az = local.is_production
  instance_type   = local.is_production ? "m5.xlarge" : "t3.micro"
  min_capacity    = local.is_production ? 3 : 1
}
```

These decisions are part of the module's internal behavior. Exposing them as variables would let callers break the module's assumptions (like running a "production" environment with a single instance and no multi-AZ).

### Shared Tags and Metadata

```hcl
locals {
  common_tags = {
    Environment = var.environment
    Project     = var.project
    ManagedBy   = "terraform"
    Module      = "networking"
  }
}
```

Tags are an internal concern. The caller provides the project name and environment through variables; the module decides how to format them into tags.

### Transformed Data

```hcl
variable "subnet_configs" {
  type = map(object({
    cidr        = string
    public      = bool
    az_index    = number
  }))
}

locals {
  # Transform the input into separate collections for different resource types
  public_subnets = {
    for name, config in var.subnet_configs : name => config
    if config.public
  }

  private_subnets = {
    for name, config in var.subnet_configs : name => config
    if !config.public
  }

  # The caller provides the raw data; the module computes the filtered views
}
```

## Common Mistakes

### Mistake 1: Using a Variable for a Computed Value

```hcl
# Wrong - this should be a local
variable "name_prefix" {
  description = "Resource name prefix"
  type        = string
  default     = "myapp-dev"
}

# Right - compute it from the actual inputs
locals {
  name_prefix = "${var.project}-${var.environment}"
}
```

The problem with the variable version: the caller could set `name_prefix = "myapp-dev"` while setting `environment = "production"`, creating a mismatch.

### Mistake 2: Using a Local for a Configurable Value

```hcl
# Wrong - this should be a variable
locals {
  instance_type = "t3.micro"
}

# Right - let the caller choose
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}
```

With the local version, the only way to change the instance type is to edit the module code. With the variable, callers pass the value they need.

### Mistake 3: Exposing Internal Logic as Variables

```hcl
# Wrong - too many knobs for the caller
variable "enable_multi_az" {
  type    = bool
  default = false
}

variable "backup_retention" {
  type    = number
  default = 7
}

variable "enable_encryption" {
  type    = bool
  default = false
}

# Better - derive from a single environment variable
variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Must be dev, staging, or production."
  }
}

locals {
  is_production     = var.environment == "production"
  enable_multi_az   = local.is_production
  backup_retention  = local.is_production ? 30 : 7
  enable_encryption = local.is_production
}
```

The first version gives callers too many ways to misconfigure things. The second version lets the module make correct decisions based on a single input.

## The Decision Flowchart

Ask these questions in order:

1. **Does the caller need to set this value?** If yes, use a variable.
2. **Can this value be computed from other inputs?** If yes, use a local.
3. **Should the caller be able to override the computed value?** If yes, use a variable with a computed default (or a variable + local pattern).
4. **Is this value only used internally?** If yes, use a local.

## The Variable-Plus-Local Pattern

Sometimes you want to compute a default but still allow overrides. Use a variable with a `null` default and a local that fills in the computed value.

```hcl
variable "instance_type" {
  description = "EC2 instance type (auto-selected based on environment if not specified)"
  type        = string
  default     = null
}

locals {
  # Auto-select based on environment if not explicitly set
  computed_instance_type = var.environment == "production" ? "m5.xlarge" : "t3.micro"

  # Use the explicit value if provided, otherwise use the computed one
  instance_type = coalesce(var.instance_type, local.computed_instance_type)
}

resource "aws_instance" "app" {
  instance_type = local.instance_type
  # ...
}
```

This gives callers the option to override while providing a sensible default based on the environment.

## Summary

The guideline is simple: variables are for inputs, locals are for computations. If a value needs to come from outside the module, make it a variable. If a value is derived from other values inside the module, make it a local. When in doubt, start with a local. You can always promote it to a variable later if callers need to customize it. Going the other direction - demoting a variable to a local - is a breaking change for existing callers.

For more on this topic, see our guide on [Terraform local values and variables](https://oneuptime.com/blog/post/2026-02-12-terraform-local-values-and-variables/view).
