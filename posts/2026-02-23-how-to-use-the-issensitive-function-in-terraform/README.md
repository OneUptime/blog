# How to Use the issensitive Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Security, Sensitive Data, HCL, Infrastructure as Code

Description: Learn how to use Terraform's issensitive function to check whether a value is marked as sensitive, enabling dynamic security-aware configurations.

---

Terraform's sensitivity system automatically protects secret values from being displayed in plan output and logs. But what if you need to programmatically check whether a value is sensitive? The `issensitive` function lets you inspect the sensitivity status of any value, enabling you to build modules and configurations that behave differently based on whether their inputs contain secrets.

## What Does issensitive Do?

The `issensitive` function takes any value and returns `true` if it is marked as sensitive, or `false` if it is not.

```hcl
variable "public_value" {
  type    = string
  default = "hello"
}

variable "secret_value" {
  type      = string
  default   = "my-secret"
  sensitive = true
}

output "check_public" {
  value = issensitive(var.public_value)
  # Result: false
}

output "check_secret" {
  value = issensitive(var.secret_value)
  # Result: true
}
```

## Syntax

```hcl
issensitive(value)
```

Takes any value, returns a boolean (`true` or `false`).

## When Is This Useful?

The `issensitive` function is primarily useful in reusable modules that need to handle both sensitive and non-sensitive inputs gracefully. It lets module authors write defensive code that respects the sensitivity of values passed to them.

## Practical Examples

### Conditional Output Handling in Modules

A module that adjusts its output behavior based on input sensitivity:

```hcl
# In a reusable module (modules/config-store/main.tf)
variable "config_value" {
  description = "A configuration value that may or may not be sensitive"
  type        = string
}

variable "config_name" {
  description = "Name for this configuration"
  type        = string
}

# Store the value in SSM Parameter Store
resource "aws_ssm_parameter" "config" {
  name = "/app/${var.config_name}"

  # Use SecureString for sensitive values, String for non-sensitive
  type  = issensitive(var.config_value) ? "SecureString" : "String"
  value = var.config_value
}

output "parameter_type" {
  value = issensitive(var.config_value) ? "SecureString" : "String"
}

output "parameter_name" {
  value = aws_ssm_parameter.config.name
}
```

Usage:

```hcl
# Non-sensitive config stored as String
module "app_port" {
  source       = "./modules/config-store"
  config_name  = "app-port"
  config_value = "8080"
}

# Sensitive config stored as SecureString
module "api_key" {
  source       = "./modules/config-store"
  config_name  = "api-key"
  config_value = var.api_key  # marked as sensitive
}
```

### Logging and Debugging Helpers

Create a module that safely logs values based on their sensitivity:

```hcl
variable "values_to_log" {
  description = "Map of values to include in debug output"
  type        = map(any)
}

locals {
  # Create a safe debug output that masks sensitive values
  safe_debug = {
    for key, value in var.values_to_log :
    key => issensitive(value) ? "(sensitive)" : value
  }
}

output "debug_info" {
  value = local.safe_debug
  # Sensitive values show as "(sensitive)", others show their actual value
}
```

### Dynamic Resource Configuration

Choose resource settings based on value sensitivity:

```hcl
variable "connection_string" {
  description = "Database connection string"
  type        = string
}

locals {
  # Determine encryption requirements based on sensitivity
  needs_encryption = issensitive(var.connection_string)
}

resource "aws_ssm_parameter" "connection" {
  name  = "/app/db-connection"
  type  = local.needs_encryption ? "SecureString" : "String"
  value = var.connection_string

  # Only add KMS encryption for sensitive values
  key_id = local.needs_encryption ? var.kms_key_id : null

  tags = {
    Encrypted = tostring(local.needs_encryption)
  }
}
```

### Validation and Safety Checks

Ensure that certain inputs are properly marked as sensitive:

```hcl
variable "database_password" {
  type = string
}

# This check runs during planning
resource "null_resource" "sensitivity_check" {
  # Use a precondition to ensure the password is marked sensitive
  lifecycle {
    precondition {
      condition     = issensitive(var.database_password)
      error_message = "The database_password variable must be marked as sensitive. Add 'sensitive = true' to the variable definition."
    }
  }
}
```

### Building Audit Trails

Track which values in your configuration are sensitive for audit purposes:

```hcl
variable "app_config" {
  type = object({
    host     = string
    port     = number
    api_key  = string
    password = string
  })
}

locals {
  # Build a sensitivity audit map
  sensitivity_audit = {
    host     = issensitive(var.app_config.host)
    port     = issensitive(var.app_config.port)
    api_key  = issensitive(var.app_config.api_key)
    password = issensitive(var.app_config.password)
  }

  # Count sensitive fields
  sensitive_field_count = length([
    for field, is_sensitive in local.sensitivity_audit :
    field if is_sensitive
  ])
}

output "sensitivity_audit" {
  value = local.sensitivity_audit
  # Shows which fields are sensitive without revealing the values
}

output "sensitive_field_count" {
  value = local.sensitive_field_count
}
```

### Conditional Masking in Tags

When you want to include values in resource tags but mask sensitive ones:

```hcl
variable "metadata" {
  description = "Metadata to attach to resources"
  type        = map(string)
}

locals {
  # Create safe tags by masking sensitive values
  safe_tags = {
    for key, value in var.metadata :
    key => issensitive(value) ? "***" : nonsensitive(value)
  }
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.instance_type

  # Tags will show masked values for any sensitive inputs
  tags = local.safe_tags
}
```

### Generic Secret Detection Module

A module that categorizes inputs by sensitivity:

```hcl
variable "inputs" {
  description = "Map of configuration inputs"
  type        = map(any)
}

locals {
  # Categorize inputs
  sensitive_keys = [
    for key, value in var.inputs :
    key if issensitive(value)
  ]

  non_sensitive_keys = [
    for key, value in var.inputs :
    key if !issensitive(value)
  ]
}

output "sensitive_inputs" {
  value       = local.sensitive_keys
  description = "List of input keys that are marked as sensitive"
}

output "non_sensitive_inputs" {
  value       = local.non_sensitive_keys
  description = "List of input keys that are not sensitive"
}

output "summary" {
  value = {
    total         = length(var.inputs)
    sensitive     = length(local.sensitive_keys)
    non_sensitive = length(local.non_sensitive_keys)
  }
}
```

## How Sensitivity Propagation Works

Understanding when values become sensitive helps you use `issensitive` effectively:

```hcl
variable "secret" {
  type      = string
  sensitive = true
  default   = "hidden"
}

variable "public" {
  type    = string
  default = "visible"
}

locals {
  # Direct reference - sensitive
  direct = var.secret  # issensitive = true

  # Concatenation with sensitive value - sensitive
  concat = "${var.public}-${var.secret}"  # issensitive = true

  # Condition using sensitive value - sensitive
  cond = var.secret != "" ? "yes" : "no"  # issensitive = true

  # Independent value - not sensitive
  independent = var.public  # issensitive = false

  # Length of a sensitive value - sensitive
  len = length(var.secret)  # issensitive = true
}
```

This propagation behavior is why `nonsensitive` and `issensitive` exist - to handle cases where the propagation is overly conservative.

## Summary

The `issensitive` function enables security-aware Terraform modules and configurations. By checking whether a value is sensitive at runtime, you can automatically choose appropriate storage types (String vs SecureString), add encryption, mask values in tags, and build audit trails. While most Terraform users will not need it in simple configurations, it is invaluable for module authors building reusable, security-conscious infrastructure components. For removing sensitivity marking when safe to do so, see the [nonsensitive function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-nonsensitive-function-safely-in-terraform/view).
