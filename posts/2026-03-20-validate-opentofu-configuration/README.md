# How to Validate Your OpenTofu Configuration with tofu validate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Tofu validate, Configuration Validation, Infrastructure as Code, DevOps

Description: A guide to using tofu validate to check your OpenTofu configurations for syntax errors and logical issues before planning or applying.

## Introduction

`tofu validate` checks your configuration files for syntax errors, type mismatches, and logical issues without connecting to any remote services. It's fast and can catch errors early, making it ideal for pre-commit hooks and CI/CD validation stages.

## Basic Usage

```bash
# Validate the current directory

tofu validate

# Success output:
# Success! The configuration is valid.

# Error output:
# Error: Missing required argument
# │
# │   on main.tf line 10, in resource "aws_instance" "web":
# │   10:   ami = var.ami
# │
# │ The argument "ami" is required, but no definition was found.
```

## What validate Checks

- **Syntax errors**: Invalid HCL syntax
- **Type mismatches**: Wrong types for variables or resource attributes
- **Missing required arguments**: Resource arguments that are mandatory
- **Invalid references**: Referencing resources, variables, or outputs that don't exist
- **Unsupported arguments**: Arguments not recognized by the provider schema
- **Cycle detection**: Circular dependencies between resources

## Sample Configuration with Issues

```hcl
# main.tf with issues (before validation)
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# This resource has a missing required argument
resource "aws_instance" "web" {
  # ami is required but missing!
  instance_type = "t2.micro"
}

# This output references a resource that doesn't exist
output "bad_output" {
  value = aws_instance.nonexistent.id  # Error: reference to undefined resource
}
```

```bash
# Validate will catch these issues
tofu init
tofu validate

# Output:
# Error: Missing required argument
# Error: Reference to undeclared resource
```

## Validate with JSON Output

```bash
# Get validation results as JSON (useful for tooling)
tofu validate -json

# Success output:
# {
#   "format_version": "1.0",
#   "valid": true,
#   "error_count": 0,
#   "warning_count": 0,
#   "diagnostics": []
# }

# Error output:
# {
#   "valid": false,
#   "error_count": 2,
#   "diagnostics": [
#     {
#       "severity": "error",
#       "summary": "Missing required argument",
#       "detail": "...",
#       "range": { "filename": "main.tf", "start": {...} }
#     }
#   ]
# }
```

## Validate in CI/CD

```yaml
# .github/workflows/validate.yml
name: Validate Configuration

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: "1.9.0"

      - name: Initialize
        run: tofu init -backend=false  # No backend needed for validation

      - name: Format Check
        run: tofu fmt -check -recursive

      - name: Validate
        run: tofu validate

      - name: Validate JSON output
        run: |
          RESULT=$(tofu validate -json)
          echo "$RESULT" | jq .
          echo "$RESULT" | jq -e '.valid == true'
```

## Validate Without Backend

```bash
# Skip backend initialization for faster validation
tofu init -backend=false

# Now validate without remote state access
tofu validate
```

## Custom Validation in Variables

OpenTofu supports custom validation rules in variable blocks:

```hcl
variable "environment" {
  type        = string
  description = "Deployment environment"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "port" {
  type        = number
  description = "Application port number"

  validation {
    condition     = var.port >= 1024 && var.port <= 65535
    error_message = "Port must be between 1024 and 65535."
  }
}
```

```bash
# Custom validations are checked during plan/apply
tofu plan -var="environment=invalid"
# Error: Invalid value for variable
# │ Environment must be one of: dev, staging, prod.
```

## Makefile Example

```makefile
.PHONY: validate ci-check

validate:
	tofu init -backend=false
	tofu fmt -check -recursive
	tofu validate

ci-check: validate
	@echo "All validation checks passed!"
```

## Conclusion

`tofu validate` is a fast, lightweight tool for catching configuration errors early in the development cycle. Running validation as part of your pre-commit hooks and CI/CD pipeline prevents broken configurations from reaching production. Combined with `tofu fmt`, it forms a powerful static analysis layer for your infrastructure code.
