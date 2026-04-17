# How to Use Workspace-Specific Variable Values in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Workspaces

Description: Learn multiple patterns for providing workspace-specific variable values in OpenTofu, including variable files, locals maps, and conditional expressions.

## Introduction

When using workspaces for environment isolation, you need different variable values per workspace. OpenTofu provides several patterns for workspace-specific variables: separate `.tfvars` files, locals maps keyed by workspace name, and conditional expressions. This guide covers each approach.

## Pattern 1: Separate .tfvars Files (Most Common)

Maintain a `.tfvars` file per environment:

```bash
# File structure

project/
├── main.tf
├── variables.tf
├── backend.tf
├── development.tfvars
├── staging.tfvars
└── production.tfvars
```

```hcl
# development.tfvars
instance_type      = "t3.micro"
instance_count     = 1
enable_monitoring  = false
db_multi_az        = false
alert_email        = "dev-alerts@example.com"
```

```hcl
# production.tfvars
instance_type      = "t3.large"
instance_count     = 5
enable_monitoring  = true
db_multi_az        = true
alert_email        = "prod-alerts@example.com"
```

```bash
# Deploy to the matching environment
tofu workspace select production
tofu apply -var-file=production.tfvars
```

## Pattern 2: Locals Map (Self-Contained)

Store all environment configs in a locals block - no separate files needed:

```hcl
# locals.tf
locals {
  env_config = {
    development = {
      instance_type      = "t3.micro"
      instance_count     = 1
      enable_monitoring  = false
      db_instance_class  = "db.t3.micro"
      min_capacity       = 1
      max_capacity       = 2
    }
    staging = {
      instance_type      = "t3.small"
      instance_count     = 2
      enable_monitoring  = true
      db_instance_class  = "db.t3.small"
      min_capacity       = 1
      max_capacity       = 4
    }
    production = {
      instance_type      = "t3.large"
      instance_count     = 5
      enable_monitoring  = true
      db_instance_class  = "db.r5.large"
      min_capacity       = 3
      max_capacity       = 10
    }
  }

  # Get current workspace config
  config = local.env_config[terraform.workspace]
}

# Use the config
resource "aws_instance" "app" {
  count         = local.config.instance_count
  ami           = data.aws_ami.ubuntu.id
  instance_type = local.config.instance_type
}

resource "aws_db_instance" "main" {
  instance_class = local.config.db_instance_class
  multi_az       = terraform.workspace == "production"
}
```

## Pattern 3: Lookup with Defaults

Use `lookup()` for safe access with fallback values:

```hcl
locals {
  # Workspace-specific overrides with a default
  instance_types = {
    production  = "t3.large"
    staging     = "t3.small"
  }

  # Falls back to "t3.micro" for development and default workspaces
  instance_type = lookup(local.instance_types, terraform.workspace, "t3.micro")
}
```

## Pattern 4: try() for Optional Overrides

```hcl
locals {
  # Base configuration
  base_config = {
    instance_type    = "t3.micro"
    instance_count   = 1
    monitoring       = false
  }

  # Environment-specific overrides
  overrides = {
    production = {
      instance_type  = "t3.large"
      instance_count = 5
      monitoring     = true
    }
  }

  # Merge base with overrides (if override exists)
  config = try(
    merge(local.base_config, local.overrides[terraform.workspace]),
    local.base_config
  )
}
```

## Pattern 5: Conditional Variables

For binary differences between environments:

```hcl
locals {
  is_production  = terraform.workspace == "production"
  is_staging     = terraform.workspace == "staging"
  is_development = terraform.workspace == "development"
}

resource "aws_db_instance" "main" {
  instance_class      = local.is_production ? "db.r5.large" : "db.t3.micro"
  multi_az            = local.is_production
  deletion_protection = local.is_production
  backup_retention_period = local.is_production ? 30 : 7
}
```

## Workspace Variable Validation

Validate that the workspace name is one of your expected values:

```hcl
locals {
  valid_workspaces = ["development", "staging", "production"]

  # This will fail during plan if workspace is not in the list
  workspace_check = contains(local.valid_workspaces, terraform.workspace) ? (
    terraform.workspace
  ) : tobool("ERROR: Invalid workspace '${terraform.workspace}'. Must be one of: ${join(", ", local.valid_workspaces)}")
}
```

## Using check Blocks for Workspace Validation

```hcl
check "valid_workspace" {
  assert {
    condition     = contains(["development", "staging", "production"], terraform.workspace)
    error_message = "Workspace must be development, staging, or production. Got: ${terraform.workspace}"
  }
}
```

## Conclusion

Workspace-specific variables in OpenTofu can be managed through several patterns, each with trade-offs. Separate `.tfvars` files are the most explicit and easiest to audit. Locals maps keep all configuration in one place but can become large. Conditional expressions work well for binary differences. Choose the pattern that best fits your team's size, the complexity of your environment differences, and your preference for file-based versus code-based configuration.
