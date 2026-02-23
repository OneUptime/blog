# How to Develop Terraform Modules with Best Practices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Best Practices, IaC, DevOps

Description: A practical guide to Terraform module development covering naming conventions, variable design, validation, documentation, testing, and publishing best practices.

---

Writing a Terraform module is easy. Writing a good one takes discipline. The difference between a module that only its author can use and one that the whole team adopts comes down to following a consistent set of practices around naming, variable design, documentation, and testing.

This guide covers the practices that separate throwaway modules from production-quality ones.

## Start with the Right Scope

The most common module mistake is making it too big or too small. A module that creates an entire environment (VPC + ECS + RDS + ElastiCache + everything else) is too tightly coupled. A module that creates a single tag is too granular to be useful.

Good module scope:

- One logical resource group (e.g., "an RDS instance with its parameter group, subnet group, and security group")
- Can be described in one sentence
- Has 5-15 input variables
- Creates 2-10 resources

If your module needs 40+ variables, it probably should be split into smaller modules.

## Standard Directory Structure

Every module should follow this layout:

```
modules/my-module/
  main.tf           # Primary resources
  variables.tf      # Input variables
  outputs.tf        # Output values
  versions.tf       # Terraform and provider version constraints
  README.md         # Documentation (auto-generate with terraform-docs)
  examples/
    basic/          # Minimal usage example
      main.tf
    complete/       # All features enabled
      main.tf
  tests/
    basic_test.go   # Terratest or native tests
```

Splitting into `main.tf`, `variables.tf`, and `outputs.tf` is not just convention. It lets people find things quickly. When someone wants to know what inputs your module takes, they go straight to `variables.tf`.

## Variable Design Principles

Variables are your module's API. Treat them with the same care you would treat a REST API endpoint.

### Use Descriptive Names

```hcl
# Bad - what does "size" mean?
variable "size" {
  type = string
}

# Good - clearly an instance type
variable "instance_type" {
  description = "EC2 instance type for the application servers"
  type        = string
  default     = "t3.medium"
}
```

### Add Validation Rules

```hcl
variable "environment" {
  description = "Deployment environment"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "environment must be dev, staging, or production"
  }
}

variable "instance_count" {
  description = "Number of instances to create"
  type        = number

  validation {
    condition     = var.instance_count > 0 && var.instance_count <= 20
    error_message = "instance_count must be between 1 and 20"
  }
}
```

### Use Optional Attributes with Defaults

Terraform 1.3+ supports `optional()` in object types, which lets you define complex variable types without requiring every field:

```hcl
variable "health_check" {
  description = "Health check configuration"
  type = object({
    path                = optional(string, "/health")
    interval            = optional(number, 30)
    healthy_threshold   = optional(number, 3)
    unhealthy_threshold = optional(number, 3)
  })
  default = {}
}
```

Callers can now pass `health_check = {}` and get all the defaults, or override just the fields they care about.

### Avoid Boolean Explosions

Do not create a boolean variable for every optional feature:

```hcl
# Bad - too many booleans to track
variable "enable_encryption" {}
variable "enable_logging" {}
variable "enable_monitoring" {}
variable "enable_backups" {}
variable "enable_multi_az" {}
```

Instead, group related settings or use a preset pattern:

```hcl
# Better - clear presets
variable "environment_tier" {
  description = "Environment tier: 'dev' (minimal), 'staging' (moderate), 'production' (full)"
  type        = string
  default     = "production"
}
```

## Output Design

Outputs should expose everything callers might need to reference from other modules:

```hcl
# Expose the ID - almost always needed
output "id" {
  description = "The ID of the resource"
  value       = aws_instance.this.id
}

# Expose the ARN - needed for IAM policies
output "arn" {
  description = "The ARN of the resource"
  value       = aws_instance.this.arn
}

# Expose connection info - needed by dependent resources
output "endpoint" {
  description = "Connection endpoint"
  value       = aws_instance.this.private_ip
}
```

Do not output sensitive values without marking them:

```hcl
output "password" {
  description = "Generated password"
  value       = random_password.this.result
  sensitive   = true
}
```

## Version Constraints

Always pin your provider versions and required Terraform version:

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0, < 6.0"
    }
  }
}
```

Use `>=` for the minimum version that supports the features you use, and `<` for the next major version to protect against breaking changes.

## Naming Conventions

Be consistent with resource naming inside your module:

```hcl
# Use "this" for the primary resource in a module
resource "aws_instance" "this" { ... }

# Use descriptive names for secondary resources
resource "aws_security_group" "instance" { ... }
resource "aws_iam_role" "execution" { ... }
```

The `this` convention signals "this is the main thing this module creates."

## Use Locals for Computed Values

Keep your resource blocks clean by moving computations into locals:

```hcl
locals {
  # Compute the full name with environment prefix
  full_name = "${var.environment}-${var.name}"

  # Merge default tags with user-provided tags
  tags = merge(
    {
      Environment = var.environment
      ManagedBy   = "terraform"
      Module      = "my-module"
    },
    var.tags
  )
}
```

## Handle Conditional Resources Properly

Use `count` or `for_each` to conditionally create resources:

```hcl
# Create a CloudWatch alarm only when monitoring is enabled
resource "aws_cloudwatch_metric_alarm" "cpu" {
  count = var.enable_monitoring ? 1 : 0

  alarm_name = "${var.name}-high-cpu"
  # ... rest of configuration
}
```

When referencing conditional resources in outputs, handle the empty case:

```hcl
output "alarm_arn" {
  description = "CloudWatch alarm ARN (null if monitoring is disabled)"
  value       = var.enable_monitoring ? aws_cloudwatch_metric_alarm.cpu[0].arn : null
}
```

## Write Examples

Every module should have at least two examples:

1. A basic example showing minimal usage
2. A complete example showing all features

```hcl
# examples/basic/main.tf
module "web_server" {
  source = "../../"

  name          = "web-server"
  instance_type = "t3.micro"
  subnet_id     = "subnet-abc123"
}
```

Examples serve as both documentation and test fixtures.

## Pre-commit Hooks

Use pre-commit hooks to enforce formatting and documentation:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.88.0
    hooks:
      - id: terraform_fmt
      - id: terraform_validate
      - id: terraform_docs
        args: ['--args=--lockfile=false']
      - id: terraform_tflint
```

This automatically formats code, validates syntax, and updates the README on every commit.

## Summary

Good Terraform modules follow predictable patterns: clear variable names with validation, sensible defaults, consistent naming, comprehensive outputs, and working examples. None of these practices are hard individually, but applying them consistently is what makes a module trustworthy.

For more on specific module patterns, see [how to create Terraform modules with optional features](https://oneuptime.com/blog/post/2026-02-23-terraform-modules-with-optional-features/view) and [how to document Terraform modules with README](https://oneuptime.com/blog/post/2026-02-23-document-terraform-modules-with-readme/view).
