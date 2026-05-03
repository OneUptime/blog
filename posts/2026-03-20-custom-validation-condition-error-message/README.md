# How to Use Custom Validation with Condition and Error Message in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Validation, Variable, HCL, Infrastructure as Code, DevOps

Description: Learn how to write precise custom validation conditions and helpful error messages for OpenTofu variables to guide users toward valid configurations.

---

The `validation` block in OpenTofu uses two attributes: `condition` (a boolean expression) and `error_message` (the message shown when validation fails). Writing clear, actionable error messages is as important as the validation logic itself - good messages tell users exactly what went wrong and how to fix it.

---

## Anatomy of a Validation Block

```hcl
variable "my_var" {
  type = string

  validation {
    # condition: must evaluate to true (value is valid) or false (invalid)
    condition = <boolean expression using var.my_var>

    # error_message: shown when condition is false
    # Should be a non-empty string; OpenTofu recommends full sentences ending
    # with a period, exclamation mark, or question mark
    error_message = "Clear description of what's wrong and how to fix it."
  }
}
```

---

## Writing Good Error Messages

Compare vague vs actionable error messages:

```hcl
# BAD: vague error message

variable "region" {
  type = string
  validation {
    condition     = can(regex("^[a-z]+-[a-z]+-[0-9]+$", var.region))
    error_message = "Invalid region."  # What should I use instead?
  }
}

# GOOD: actionable error message
variable "region" {
  type = string
  validation {
    condition     = can(regex("^[a-z]+-[a-z]+-[0-9]+$", var.region))
    error_message = "region must be in the format 'us-east-1' (lowercase letters, hyphens, and digits). Got: '${var.region}'."
  }
}
```

Including the actual value in the error message helps users spot typos immediately.

---

## Include Valid Options in Error Messages

```hcl
variable "log_level" {
  type = string

  validation {
    condition     = contains(["DEBUG", "INFO", "WARN", "ERROR"], var.log_level)
    # List all valid options explicitly
    error_message = "log_level must be one of: DEBUG, INFO, WARN, ERROR. Got: '${var.log_level}'."
  }
}
```

---

## Using String Templates in Error Messages

```hcl
variable "instance_type" {
  type = string

  validation {
    condition = contains(
      ["t3.micro", "t3.small", "t3.medium", "m5.large"],
      var.instance_type
    )
    # Include the actual value and link to documentation
    error_message = <<-EOT
      '${var.instance_type}' is not an approved instance type.
      Approved types: t3.micro, t3.small, t3.medium, m5.large.
      See the team wiki for the approved instance type list.
    EOT
  }
}
```

---

## Complex Condition Expressions

```hcl
variable "backup_retention_days" {
  type = number

  validation {
    # Multiple conditions combined with &&
    condition = (
      var.backup_retention_days >= 1 &&
      var.backup_retention_days <= 365
    )
    error_message = "backup_retention_days must be between 1 and 365. Got: ${var.backup_retention_days}."
  }
}

variable "database_password" {
  type      = string
  sensitive = true  # hides value in plan output

  validation {
    # Check password length without revealing it in the error message
    condition     = length(var.database_password) >= 16
    # Don't include the sensitive value in the error message
    error_message = "database_password must be at least 16 characters long."
  }

  validation {
    # Check password complexity
    condition = (
      can(regex("[A-Z]", var.database_password)) &&  # has uppercase
      can(regex("[0-9]", var.database_password))       # has digit
    )
    error_message = "database_password must contain at least one uppercase letter and one digit."
  }
}
```

---

## Referencing Other Variables in Conditions

Note: As of OpenTofu 1.9, validation conditions can reference other variables, locals, and data sources in addition to `var.<name>` (the variable being validated). On older versions that only allowed self-references, use `precondition` blocks in resources for cross-variable checks.

```hcl
# Cross-variable validation directly in the variable block (OpenTofu 1.9+)
variable "instance_type" {
  type = string

  validation {
    condition     = var.environment == "production" ? var.instance_type != "t3.micro" : true
    error_message = "Production deployments cannot use t3.micro - use at least t3.small."
  }
}

# Equivalent check using a precondition on a resource
resource "aws_instance" "web" {
  # ...

  lifecycle {
    precondition {
      condition     = var.environment == "production" ? var.instance_type != "t3.micro" : true
      error_message = "Production deployments cannot use t3.micro - use at least t3.small."
    }
  }
}
```

---

## Summary

Effective validation combines a precise `condition` expression with a helpful `error_message`. Always include: what went wrong, the actual invalid value (unless sensitive), valid alternatives or the expected format, and optionally a reference to documentation. Use `can()` to safely test expressions that might error on invalid input, and keep conditions readable by breaking complex logic across multiple validation blocks.
