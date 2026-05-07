# How to Add Validation Rules to OpenTofu Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, Validation, HCL, Infrastructure as Code, DevOps, Best Practice

Description: Learn how to add validation blocks to OpenTofu variables to catch invalid values early with clear error messages.

---

Variable validation lets you define business rules for your variable values beyond just type checking. If a user passes an invalid value, OpenTofu shows a custom error message as soon as the value can be evaluated, typically during planning and before any infrastructure changes are attempted. This guide shows how to write effective validation rules.

---

## Basic Validation Block

```hcl
# variables.tf - variables with validation rules

variable "environment" {
  type        = string
  description = "Deployment environment"

  validation {
    # condition must evaluate to true for the value to be valid
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}
```

```bash
# Testing with an invalid value:

tofu plan -var="environment=test"

# Error output:
# │ Error: Invalid value for variable
# │
# │   on variables.tf line 3:
# │    3: variable "environment" {
# │
# │ Environment must be one of: development, staging, production.
```

---

## Common Validation Patterns

```hcl
# Validate string length
variable "app_name" {
  type = string

  validation {
    condition     = length(var.app_name) >= 3 && length(var.app_name) <= 32
    error_message = "app_name must be between 3 and 32 characters."
  }
}

# Validate AWS region code format
variable "aws_region" {
  type = string

  validation {
    condition     = can(regex("^[a-z]{2}(-[a-z]+)+-[0-9]$", var.aws_region))
    error_message = "aws_region must use a valid AWS region code format (e.g., us-east-1)."
  }
}

# Validate number range
variable "replica_count" {
  type = number

  validation {
    condition     = var.replica_count >= 1 && var.replica_count <= 50
    error_message = "replica_count must be between 1 and 50."
  }
}

# Validate IPv4 CIDR block format
variable "vpc_cidr" {
  type = string

  validation {
    condition     = can(cidrnetmask(var.vpc_cidr))
    error_message = "vpc_cidr must be a valid IPv4 CIDR block (e.g., 10.0.0.0/16)."
  }
}
```

---

## Multiple Validation Blocks

A single variable can have multiple validation blocks:

```hcl
variable "instance_type" {
  type = string

  # Rule 1: Must be a valid format
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*\\.[a-z0-9]+$", var.instance_type))
    error_message = "instance_type must be a valid EC2 instance type format (e.g., t3.micro)."
  }

  # Rule 2: Must be from the approved list
  validation {
    condition = contains(
      ["t3.micro", "t3.small", "t3.medium", "m5.large", "m5.xlarge"],
      var.instance_type
    )
    error_message = "instance_type must be from the approved list: t3.micro, t3.small, t3.medium, m5.large, m5.xlarge."
  }
}
```

---

## Validating Complex Types

```hcl
variable "tags" {
  type = map(string)

  validation {
    # Ensure required tags are present
    condition     = contains(keys(var.tags), "Environment") && contains(keys(var.tags), "Team")
    error_message = "tags must include 'Environment' and 'Team' keys."
  }

  validation {
    # Validate the Environment tag value
    condition = contains(
      ["development", "staging", "production"],
      lookup(var.tags, "Environment", "invalid")
    )
    error_message = "tags.Environment must be one of: development, staging, production."
  }
}
```

---

## Using can() for Safe Expression Testing

The `can()` function returns `true` if an expression evaluates successfully and `false` if it produces an error at evaluation time. Use it to validate values that would error on invalid input:

```hcl
variable "database_url" {
  type = string

  validation {
    # Check URL format without crashing on invalid format
    condition     = can(regex("^(postgresql|mysql)://", var.database_url))
    error_message = "database_url must start with postgresql:// or mysql://"
  }
}
```

---

## Summary

Variable validation blocks enforce business rules on input values with clear, user-friendly error messages. Use `contains()` for allowed values, `regex()` with `can()` for format validation, range checks for numbers, and multiple validation blocks for multi-rule enforcement. Input variable validation runs as soon as the value can be evaluated, typically during planning and before any infrastructure changes are attempted.
