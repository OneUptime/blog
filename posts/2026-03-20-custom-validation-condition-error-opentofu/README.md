# How to Use Custom Validation with Condition and Error Message in OpenTofu (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, Validation, Custom Conditions, Infrastructure as Code, DevOps

Description: A deep dive into writing effective custom validation conditions and error messages in OpenTofu variables.

## Introduction

Custom validation in OpenTofu allows you to define arbitrary conditions that variable values must satisfy. Well-written conditions with clear error messages make your configurations more robust and user-friendly. This guide covers advanced patterns for writing effective validations.

## Validation Block Structure

```hcl
variable "example" {
  type = string

  validation {
    # condition: boolean expression using var.<name>
    # Must evaluate to true for the value to be valid
    condition = <boolean_expression>

    # error_message: shown when condition is false
    # Must be a complete sentence ending with period, question mark, or exclamation
    error_message = "The value is invalid because..."
  }
}
```

## Writing Good Error Messages

```hcl
variable "environment" {
  type = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)

    # BAD: Too vague
    # error_message = "Invalid environment."

    # GOOD: Explains what's wrong and shows valid options
    error_message = "The environment variable must be one of 'dev', 'staging', or 'prod'. Got '${var.environment}'."
  }
}
```

## Using can() for Format Validation

```hcl
variable "aws_account_id" {
  type        = string
  description = "AWS account ID (12-digit number)"

  validation {
    condition     = can(regex("^\\d{12}$", var.aws_account_id))
    error_message = "AWS account ID must be exactly 12 digits. Example: '123456789012'. Got '${var.aws_account_id}'."
  }
}

variable "arn" {
  type        = string
  description = "AWS ARN"

  validation {
    condition     = can(regex("^arn:aws:", var.arn))
    error_message = "Value must be a valid AWS ARN starting with 'arn:aws:'. Example: 'arn:aws:iam::123456789012:role/MyRole'."
  }
}
```

## Complex Multi-Condition Validations

```hcl
variable "instance_type" {
  type        = string
  description = "EC2 instance type"

  validation {
    condition = anytrue([
      can(regex("^t3\\.", var.instance_type)),
      can(regex("^t4g\\.", var.instance_type)),
      can(regex("^m5\\.", var.instance_type)),
    ])
    error_message = "Instance type must be from the t3, t4g, or m5 family. Got '${var.instance_type}'."
  }
}

variable "retention_days" {
  type = number

  validation {
    condition = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, 3653], var.retention_days)
    error_message = "Log retention must be one of the CloudWatch valid values: 1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, or 3653 days."
  }
}
```

## Validating Dependent Conditions

```hcl
variable "enable_encryption" {
  type    = bool
  default = true
}

variable "kms_key_id" {
  type    = string
  default = null

  # Validate that kms_key_id is provided when encryption is enabled
  # Note: as of OpenTofu 1.9, validations can reference other variables, locals,
  # and data sources in addition to the current variable
  validation {
    condition     = var.kms_key_id == null || can(regex("^arn:aws:kms:", var.kms_key_id))
    error_message = "kms_key_id must be a valid KMS key ARN (starting with 'arn:aws:kms:') or null."
  }
}
```

## Validating JSON and Encoded Strings

```hcl
variable "policy_json" {
  type        = string
  description = "IAM policy document in JSON format"

  validation {
    condition     = can(jsondecode(var.policy_json))
    error_message = "policy_json must be valid JSON. Please validate your JSON syntax."
  }

  validation {
    condition = (
      can(jsondecode(var.policy_json)) &&
      contains(keys(jsondecode(var.policy_json)), "Statement")
    )
    error_message = "policy_json must be a valid IAM policy with a 'Statement' key."
  }
}
```

## Using alltrue() and anytrue()

```hcl
variable "tags" {
  type = map(string)

  validation {
    # Require certain tags to be present
    condition = alltrue([
      contains(keys(var.tags), "Environment"),
      contains(keys(var.tags), "Owner"),
      contains(keys(var.tags), "Project"),
    ])
    error_message = "Tags must include 'Environment', 'Owner', and 'Project' keys."
  }

  validation {
    # All tag values must be non-empty
    condition = alltrue([
      for v in values(var.tags) : length(trimspace(v)) > 0
    ])
    error_message = "Tag values must not be empty or whitespace-only."
  }
}
```

## Conclusion

Custom validation conditions turn your OpenTofu variables into a self-documenting contract. Good validations use clear, actionable error messages that tell users exactly what's wrong and how to fix it. Use `can()` for format checks, `contains()` for enumeration validation, `alltrue()`/`anytrue()` for collection validation, and include the invalid value in the error message with interpolation for maximum clarity.
