# How to Handle Large Variable Files in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, Configuration, Best Practice, Infrastructure as Code

Description: Learn how to organize and manage large variable files in OpenTofu using structured types, partial configurations, and variable composition patterns.

## Introduction

As OpenTofu configurations grow, variable files become unwieldy. A single `production.tfvars` file with hundreds of variables is hard to maintain and review. This guide covers patterns for organizing variables at scale.

## Using Structured Variable Types

Group related variables into objects instead of flat lists.

```hcl
# variables.tf

variable "database" {
  description = "Database configuration"
  type = object({
    instance_class     = string
    allocated_storage  = number
    engine_version     = string
    multi_az           = bool
    backup_retention   = number
    deletion_protection = bool
  })
}

variable "application" {
  description = "Application configuration"
  type = object({
    min_capacity   = number
    max_capacity   = number
    cpu_target     = number
    image_tag      = string
    health_path    = string
  })
}

variable "networking" {
  description = "Network configuration"
  type = object({
    vpc_cidr        = string
    az_count        = number
    enable_nat      = bool
    enable_flow_logs = bool
  })
}
```

## Variable Files per Concern

Split one large `.tfvars` into multiple focused files.

```text
environments/prod/
├── database.tfvars
├── application.tfvars
├── networking.tfvars
└── common.tfvars
```

```hcl
# environments/prod/database.tfvars
database = {
  instance_class     = "db.r6g.xlarge"
  allocated_storage  = 500
  engine_version     = "16.2"
  multi_az           = true
  backup_retention   = 14
  deletion_protection = true
}
```

```hcl
# environments/prod/application.tfvars
application = {
  min_capacity  = 2
  max_capacity  = 20
  cpu_target    = 70
  image_tag     = "v1.5.2"
  health_path   = "/health"
}
```

Apply with multiple `-var-file` flags:

```bash
tofu apply \
  -var-file="environments/prod/common.tfvars" \
  -var-file="environments/prod/database.tfvars" \
  -var-file="environments/prod/application.tfvars" \
  -var-file="environments/prod/networking.tfvars"
```

## Default and Override Pattern

```hcl
# defaults.auto.tfvars – sensible defaults for all environments
database = {
  instance_class     = "db.t3.medium"
  allocated_storage  = 20
  engine_version     = "16.2"
  multi_az           = false
  backup_retention   = 7
  deletion_protection = false
}
```

Later files override defaults, but map and object variables are replaced as whole values rather than merged attribute by attribute:

```hcl
# environments/prod/database.tfvars – restate the full object with production values
database = {
  instance_class     = "db.r6g.xlarge"
  allocated_storage  = 500
  engine_version     = "16.2"
  multi_az           = true
  backup_retention   = 14
  deletion_protection = true
}
```

## Variable Validation

Add constraints to catch misconfigured values early.

```hcl
variable "database" {
  type = object({
    instance_class    = string
    backup_retention  = number
  })

  validation {
    condition     = contains(["db.t3.micro", "db.t3.medium", "db.r6g.large", "db.r6g.xlarge"], var.database.instance_class)
    error_message = "database.instance_class must be one of: db.t3.micro, db.t3.medium, db.r6g.large, db.r6g.xlarge."
  }

  validation {
    condition     = var.database.backup_retention >= 1 && var.database.backup_retention <= 35
    error_message = "database.backup_retention must be between 1 and 35 days."
  }
}
```

## Using locals to Compute Derived Values

```hcl
# locals.tf – derive values from variables
locals {
  # Compute environment-specific names from base variables
  db_identifier    = "${var.app_name}-db-${var.environment}"
  cluster_name     = "${var.app_name}-cluster-${var.environment}"
  bucket_prefix    = "${var.app_name}-${var.environment}"

  # Derive bool flags from environment name
  is_production    = var.environment == "prod"
  enable_enhanced  = local.is_production
}
```

## Summary

Managing large variable files requires structured object types, concern-based file splitting, default-and-override patterns, and validation rules. These patterns keep variable files readable, maintainable, and consistent across environments while catching misconfiguration errors before they reach production.
