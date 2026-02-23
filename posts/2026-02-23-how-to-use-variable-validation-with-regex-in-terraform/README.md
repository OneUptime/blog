# How to Use Variable Validation with Regex in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Validation, Regex, Variables, Infrastructure as Code

Description: Learn how to use regular expressions in Terraform variable validation blocks to enforce naming conventions, format constraints, and input patterns before any resources are created.

---

Terraform's variable validation feature lets you check inputs before anything gets planned or applied. When combined with regular expressions, you can enforce naming conventions, validate formats like email addresses or CIDR blocks, and catch typos early. This post covers the `can(regex(...))` pattern and shows how to write effective regex validations for common infrastructure scenarios.

## The Basic Pattern

Variable validation uses a `validation` block inside a `variable` definition. For regex checks, the pattern is:

```hcl
variable "name" {
  type        = string
  description = "Resource name"

  validation {
    # can() returns true if the expression succeeds, false if it errors
    # regex() returns the match or throws an error if no match
    condition     = can(regex("^[a-z][a-z0-9-]*$", var.name))
    error_message = "Name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens."
  }
}
```

The `regex` function throws an error if the pattern does not match. Wrapping it in `can()` converts that error into a boolean `false`, which is what the `condition` field expects.

## Validating Naming Conventions

Most cloud providers have strict rules for resource names. Here are common patterns:

### S3 Bucket Names

S3 buckets must be 3-63 characters, lowercase letters, numbers, hyphens, and periods only. They cannot start or end with a hyphen.

```hcl
variable "bucket_name" {
  type        = string
  description = "S3 bucket name"

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$", var.bucket_name))
    error_message = "Bucket name must be 3-63 characters, lowercase alphanumeric, hyphens, and periods. Cannot start or end with a hyphen."
  }
}
```

### AWS Resource Tags

Tag keys and values have their own constraints:

```hcl
variable "project_name" {
  type        = string
  description = "Project name used in resource tags"

  validation {
    # Allow letters, numbers, spaces, hyphens, and underscores
    # Must start with a letter
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9 _-]{0,126}$", var.project_name))
    error_message = "Project name must start with a letter and be 1-127 characters. Allowed: letters, numbers, spaces, hyphens, underscores."
  }
}
```

### Kubernetes Resource Names

Kubernetes names must follow DNS subdomain naming rules:

```hcl
variable "k8s_namespace" {
  type        = string
  description = "Kubernetes namespace name"

  validation {
    # DNS label: lowercase alphanumeric and hyphens, 1-63 chars
    # Cannot start or end with a hyphen
    condition     = can(regex("^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$", var.k8s_namespace))
    error_message = "Namespace must be a valid DNS label: 1-63 lowercase alphanumeric characters or hyphens, cannot start or end with a hyphen."
  }
}
```

## Validating Format Patterns

### Email Addresses

```hcl
variable "alert_email" {
  type        = string
  description = "Email address for alerts"

  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.alert_email))
    error_message = "Must be a valid email address."
  }
}
```

Note the double backslash `\\` before the period. In HCL strings, a single backslash is an escape character, so you need `\\` to produce a literal `\` in the regex pattern.

### CIDR Blocks

```hcl
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"

  validation {
    # Match IPv4 CIDR notation
    condition     = can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$", var.vpc_cidr))
    error_message = "Must be a valid IPv4 CIDR block (e.g., 10.0.0.0/16)."
  }
}
```

For more thorough CIDR validation, combine regex with the `cidrhost` function:

```hcl
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"

  validation {
    # Check both format and validity
    condition     = can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$", var.vpc_cidr)) && can(cidrhost(var.vpc_cidr, 0))
    error_message = "Must be a valid IPv4 CIDR block (e.g., 10.0.0.0/16)."
  }
}
```

### AWS ARNs

```hcl
variable "kms_key_arn" {
  type        = string
  description = "KMS key ARN for encryption"

  validation {
    condition     = can(regex("^arn:aws:kms:[a-z0-9-]+:[0-9]{12}:key/[a-f0-9-]{36}$", var.kms_key_arn))
    error_message = "Must be a valid KMS key ARN (e.g., arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012)."
  }
}
```

### IAM Role ARNs

```hcl
variable "execution_role_arn" {
  type        = string
  description = "IAM role ARN for task execution"

  validation {
    condition     = can(regex("^arn:aws:iam::[0-9]{12}:role/.+$", var.execution_role_arn))
    error_message = "Must be a valid IAM role ARN (e.g., arn:aws:iam::123456789012:role/my-role)."
  }
}
```

## Validating Semantic Versioning

```hcl
variable "app_version" {
  type        = string
  description = "Application version in semantic versioning format"

  validation {
    # Match semver: MAJOR.MINOR.PATCH with optional pre-release suffix
    condition     = can(regex("^[0-9]+\\.[0-9]+\\.[0-9]+(-[a-zA-Z0-9.]+)?$", var.app_version))
    error_message = "Version must follow semantic versioning (e.g., 1.2.3 or 1.2.3-beta.1)."
  }
}
```

## Validating Docker Image References

```hcl
variable "container_image" {
  type        = string
  description = "Docker image reference"

  validation {
    # Match registry/repo:tag or repo:tag patterns
    condition     = can(regex("^[a-zA-Z0-9._/-]+:[a-zA-Z0-9._-]+$", var.container_image))
    error_message = "Must be a valid Docker image reference (e.g., nginx:latest or 123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:v1.0.0)."
  }
}
```

## Validating Environment-Specific Patterns

Sometimes you want to enforce that names follow a specific pattern that includes the environment:

```hcl
variable "environment" {
  type        = string
  description = "Deployment environment"

  validation {
    condition     = can(regex("^(dev|staging|production)$", var.environment))
    error_message = "Environment must be exactly 'dev', 'staging', or 'production'."
  }
}

variable "database_identifier" {
  type        = string
  description = "RDS instance identifier"

  validation {
    # Must follow naming convention: {project}-{env}-{purpose}
    condition     = can(regex("^[a-z]+-(?:dev|staging|production)-[a-z]+$", var.database_identifier))
    error_message = "Database identifier must follow the pattern: project-environment-purpose (e.g., myapp-dev-primary)."
  }
}
```

## Multiple Regex Validations on One Variable

You can have multiple validation blocks on a single variable. They all run, and all must pass.

```hcl
variable "password" {
  type        = string
  description = "Database master password"
  sensitive   = true

  # Check minimum length
  validation {
    condition     = length(var.password) >= 12
    error_message = "Password must be at least 12 characters."
  }

  # Check for uppercase letter
  validation {
    condition     = can(regex("[A-Z]", var.password))
    error_message = "Password must contain at least one uppercase letter."
  }

  # Check for lowercase letter
  validation {
    condition     = can(regex("[a-z]", var.password))
    error_message = "Password must contain at least one lowercase letter."
  }

  # Check for digit
  validation {
    condition     = can(regex("[0-9]", var.password))
    error_message = "Password must contain at least one digit."
  }

  # Check for special character
  validation {
    condition     = can(regex("[!@#$%^&*()_+=-]", var.password))
    error_message = "Password must contain at least one special character (!@#$%^&*()_+=-)."
  }
}
```

Breaking complex requirements into separate validation blocks gives the user a specific error message for whichever check fails, instead of a generic "password is invalid" message.

## Regex Tips for Terraform

Here are a few things to remember when writing regex in HCL:

1. **Double backslashes**: HCL strings require `\\` to produce a literal backslash. So `\d` in regex becomes `\\d` in HCL.

2. **Anchors**: Always use `^` and `$` to match the full string. Without them, `regex("abc", "xyzabcdef")` would match.

3. **Character classes**: `[a-z0-9-]` matches lowercase letters, digits, and hyphens. Put the hyphen last or first to avoid range issues.

4. **Non-capturing groups**: Use `(?:...)` instead of `(...)` if you just need grouping without capturing.

5. **The `can()` wrapper**: Always wrap `regex()` in `can()` for validation conditions. The `regex` function errors on no match; `can` turns that into `false`.

```hcl
# Common regex patterns for reference
locals {
  patterns = {
    ipv4         = "^([0-9]{1,3}\\.){3}[0-9]{1,3}$"
    ipv4_cidr    = "^([0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$"
    dns_label    = "^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$"
    aws_region   = "^[a-z]{2}-[a-z]+-[0-9]+$"
    aws_az       = "^[a-z]{2}-[a-z]+-[0-9]+[a-z]$"
    semver       = "^[0-9]+\\.[0-9]+\\.[0-9]+$"
    email        = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
    uuid         = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
  }
}
```

## Summary

Regex validation in Terraform catches bad input before it reaches your cloud provider. Use `can(regex(...))` in validation blocks to enforce naming conventions, format requirements, and structural patterns. Always anchor your patterns with `^` and `$`, use double backslashes for escape sequences, and split complex requirements into multiple validation blocks for better error messages. The few minutes you spend writing validation rules will save hours of debugging failed deployments.

For more on Terraform variable validation, see our guide on [Terraform variable validation](https://oneuptime.com/blog/post/2026-01-30-terraform-variable-validation/view).
