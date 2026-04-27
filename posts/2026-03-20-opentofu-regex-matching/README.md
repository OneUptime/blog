# How to Use Regular Expressions for String Matching in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Regex, Regexall, String Matching, Validation

Description: Learn how to use OpenTofu's regex, regexall, and can functions for pattern matching, string extraction, and input validation in infrastructure code.

## Overview

OpenTofu provides `regex()`, `regexall()`, and `can(regex(...))` for pattern matching in infrastructure code. These functions validate input formats, extract substrings, and conditionally create resources based on naming patterns.

## Step 1: Input Validation with regex

```hcl
# main.tf - Validate input variables with regex

variable "environment" {
  type = string
  validation {
    condition     = can(regex("^(dev|staging|production)$", var.environment))
    error_message = "Environment must be 'dev', 'staging', or 'production'."
  }
}

variable "aws_region" {
  type = string
  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]$", var.aws_region))
    error_message = "Invalid AWS region format. Expected format: us-east-1"
  }
}

variable "cidr_block" {
  type = string
  validation {
    condition     = can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$", var.cidr_block))
    error_message = "CIDR block must be in format: 10.0.0.0/16"
  }
}
```

## Step 2: Extract Substrings with regex

```hcl
# Extract components from structured strings
locals {
  # Extract account ID from ARN
  # arn:aws:iam::123456789012:role/MyRole
  role_arn = "arn:aws:iam::123456789012:role/MyRole"
  account_id = regex("arn:aws:iam::([0-9]{12}):", local.role_arn)[0]
  # Result: "123456789012"

  # Extract version from image tag (nginx:1.25.3)
  image_tag   = "nginx:1.25.3"
  image_name  = regex("^([^:]+):", local.image_tag)[0]  # "nginx"
  image_version = regex(":(.+)$", local.image_tag)[0]  # "1.25.3"

  # Extract environment from resource name (prod-app-server-01)
  resource_name = "prod-app-server-01"
  env_from_name = regex("^(dev|staging|prod)-", local.resource_name)[0]
  # Result: "prod"
}
```

## Step 3: Find All Matches with regexall

```hcl
locals {
  # Find all CIDR blocks in a text
  firewall_rules_text = "Allow from 10.0.0.0/8 and 192.168.0.0/16 to port 443"
  cidr_blocks = regexall("[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}/[0-9]{1,2}",
    local.firewall_rules_text)
  # Result: ["10.0.0.0/8", "192.168.0.0/16"]

  # Find all variable references in a template
  template_content = file("${path.module}/templates/app.conf")
  template_vars = regexall("\\$\\{([^}]+)\\}", local.template_content)
  # Result: list of variable names used in template
}
```

## Step 4: Conditional Resources Based on Name Pattern

```hcl
variable "resource_name" {
  type = string
}

locals {
  is_production = can(regex("^prod-", var.resource_name))
  is_database   = can(regex("-db-|-database-|-rds-", var.resource_name))
}

# Apply extra protections to production database resources
resource "aws_db_instance" "app" {
  identifier = var.resource_name

  # Enable deletion protection for production databases
  deletion_protection = local.is_production && local.is_database

  # Enable multi-AZ for production
  multi_az = local.is_production

  # Longer backup retention for production databases
  backup_retention_period = local.is_production ? 35 : 7
}
```

## Summary

OpenTofu's regex functions provide powerful string validation and extraction capabilities. `can(regex(...))` returns a boolean (never throws an error), making it ideal for `validation` blocks and conditional expressions. `regex()` returns captured groups and throws an error if no match is found, so wrap in `can()` when a match may not exist. `regexall()` returns all matches as a list, useful for extracting multiple values from a string. OpenTofu uses RE2 syntax (no lookaheads), which is a subset of standard regular expressions.
