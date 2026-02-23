# How to Use Variable Validation with Custom Error Messages

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Validation, Variables, Error Handling, Infrastructure as Code

Description: Learn how to write clear, actionable custom error messages for Terraform variable validation blocks that help users fix configuration problems quickly.

---

Terraform variable validation catches configuration errors before anything gets deployed. But a validation rule is only as useful as its error message. A vague message like "invalid value" forces the user to read the source code to figure out what went wrong. A good error message tells the user exactly what is wrong and how to fix it.

This post covers how to write effective custom error messages for Terraform variable validation, with patterns you can apply to your own modules.

## How Validation Error Messages Work

Each validation block has two fields: `condition` (a boolean expression) and `error_message` (a string). When the condition evaluates to `false`, Terraform displays the error message and stops.

```hcl
variable "environment" {
  type        = string
  description = "Deployment environment"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, production. Got: ${var.environment}"
  }
}
```

When someone passes `environment = "prod"`, they see:

```
Error: Invalid value for variable

  on variables.tf line 1:
   1: variable "environment" {

Environment must be one of: dev, staging, production. Got: prod
```

The user immediately knows what they passed and what was expected.

## Principles of Good Error Messages

### 1. State What Is Expected

Do not just say what is wrong. Say what is right.

```hcl
# Bad - tells the user what went wrong but not what to do
variable "instance_type" {
  type = string
  validation {
    condition     = can(regex("^[a-z][a-z0-9]+\\.[a-z0-9]+$", var.instance_type))
    error_message = "Invalid instance type format."
  }
}

# Good - tells the user exactly what format to use
variable "instance_type" {
  type = string
  validation {
    condition     = can(regex("^[a-z][a-z0-9]+\\.[a-z0-9]+$", var.instance_type))
    error_message = "Instance type must follow the format 'family.size' (e.g., t3.micro, m5.xlarge, r6g.large)."
  }
}
```

### 2. Include Examples

Examples remove ambiguity. Users can pattern-match from examples faster than they can parse a description of the expected format.

```hcl
variable "cidr_block" {
  type = string

  validation {
    condition     = can(cidrhost(var.cidr_block, 0))
    error_message = "Must be a valid CIDR block. Examples: 10.0.0.0/16, 172.16.0.0/12, 192.168.1.0/24."
  }
}
```

### 3. Include the Actual Value

When possible, show the user what they passed so they can spot the mistake.

```hcl
variable "aws_region" {
  type = string

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]+$", var.aws_region))
    error_message = "AWS region '${var.aws_region}' is not valid. Expected format: us-east-1, eu-west-2, ap-southeast-1."
  }
}
```

If someone passes `us-east1` (missing the second hyphen), the message reads:

```
AWS region 'us-east1' is not valid. Expected format: us-east-1, eu-west-2, ap-southeast-1.
```

### 4. Explain Constraints

If there are specific limits, state them clearly.

```hcl
variable "db_name" {
  type = string

  validation {
    condition     = length(var.db_name) >= 1 && length(var.db_name) <= 63
    error_message = "Database name must be between 1 and 63 characters. Current length: ${length(var.db_name)}."
  }

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.db_name))
    error_message = "Database name must start with a letter and contain only letters, numbers, and underscores. Got: '${var.db_name}'."
  }
}
```

## Practical Examples with Good Error Messages

### Validating AWS Account ID

```hcl
variable "aws_account_id" {
  type        = string
  description = "AWS account ID for cross-account access"

  validation {
    condition     = can(regex("^[0-9]{12}$", var.aws_account_id))
    error_message = "AWS account ID must be exactly 12 digits (e.g., 123456789012). Got: '${var.aws_account_id}'."
  }
}
```

### Validating Port Numbers

```hcl
variable "app_port" {
  type        = number
  description = "Port the application listens on"

  validation {
    condition     = var.app_port >= 1 && var.app_port <= 65535
    error_message = "Port must be between 1 and 65535. Got: ${var.app_port}."
  }

  validation {
    condition     = var.app_port >= 1024
    error_message = "Port ${var.app_port} is a privileged port (below 1024). Use a port >= 1024 for application services."
  }
}
```

### Validating a Map of Services

```hcl
variable "services" {
  type = map(object({
    port     = number
    protocol = string
    replicas = number
  }))

  validation {
    condition = alltrue([
      for name, svc in var.services : svc.port >= 1 && svc.port <= 65535
    ])
    error_message = "All service ports must be between 1 and 65535. Check the port values in your services map."
  }

  validation {
    condition = alltrue([
      for name, svc in var.services : contains(["HTTP", "HTTPS", "TCP", "UDP"], svc.protocol)
    ])
    error_message = "Service protocol must be one of: HTTP, HTTPS, TCP, UDP. Check the protocol values in your services map."
  }

  validation {
    condition = alltrue([
      for name, svc in var.services : svc.replicas >= 1 && svc.replicas <= 20
    ])
    error_message = "Service replicas must be between 1 and 20. Increase capacity limits if you need more."
  }
}
```

### Validating Terraform Workspace-Related Names

```hcl
variable "workspace_name" {
  type        = string
  description = "Terraform workspace name"

  validation {
    condition     = !contains(["default"], var.workspace_name)
    error_message = "Do not use 'default' as a workspace name. Use a descriptive name like 'dev', 'staging', or 'production'."
  }

  validation {
    condition     = length(var.workspace_name) <= 90
    error_message = "Workspace name must be 90 characters or fewer. Got ${length(var.workspace_name)} characters."
  }

  validation {
    condition     = can(regex("^[a-zA-Z0-9_-]+$", var.workspace_name))
    error_message = "Workspace name can only contain letters, numbers, hyphens, and underscores. Got: '${var.workspace_name}'."
  }
}
```

### Validating Sensitive Values

For sensitive variables, do not include the actual value in the error message. Terraform would expose it in the output.

```hcl
variable "database_password" {
  type        = string
  description = "Database master password"
  sensitive   = true

  validation {
    condition     = length(var.database_password) >= 16
    error_message = "Database password must be at least 16 characters long."
    # Do NOT include the password in the message:
    # error_message = "Password '${var.database_password}' is too short."
  }

  validation {
    condition     = can(regex("[A-Z]", var.database_password))
    error_message = "Database password must contain at least one uppercase letter."
  }

  validation {
    condition     = can(regex("[0-9]", var.database_password))
    error_message = "Database password must contain at least one number."
  }

  validation {
    condition     = !can(regex("password|123456|admin", lower(var.database_password)))
    error_message = "Database password must not contain common words like 'password', '123456', or 'admin'."
  }
}
```

## Multiple Validation Blocks for Better Messages

A single validation block with a complex condition produces one generic error. Multiple blocks produce specific errors for each check.

```hcl
# Less helpful - one complex condition, one generic message
variable "bucket_name" {
  type = string
  validation {
    condition = (
      length(var.bucket_name) >= 3 &&
      length(var.bucket_name) <= 63 &&
      can(regex("^[a-z0-9][a-z0-9.-]*[a-z0-9]$", var.bucket_name)) &&
      !can(regex("\\.\\.", var.bucket_name))
    )
    error_message = "Invalid S3 bucket name."
  }
}

# More helpful - separate checks with specific messages
variable "bucket_name" {
  type = string

  validation {
    condition     = length(var.bucket_name) >= 3
    error_message = "S3 bucket name must be at least 3 characters. Got ${length(var.bucket_name)} characters."
  }

  validation {
    condition     = length(var.bucket_name) <= 63
    error_message = "S3 bucket name must be 63 characters or fewer. Got ${length(var.bucket_name)} characters."
  }

  validation {
    condition     = can(regex("^[a-z0-9]", var.bucket_name))
    error_message = "S3 bucket name must start with a lowercase letter or number. Got: '${substr(var.bucket_name, 0, 1)}'."
  }

  validation {
    condition     = can(regex("[a-z0-9]$", var.bucket_name))
    error_message = "S3 bucket name must end with a lowercase letter or number."
  }

  validation {
    condition     = !can(regex("\\.\\.", var.bucket_name))
    error_message = "S3 bucket name must not contain consecutive periods (..)."
  }

  validation {
    condition     = can(regex("^[a-z0-9.-]+$", var.bucket_name))
    error_message = "S3 bucket name can only contain lowercase letters, numbers, hyphens, and periods. Got: '${var.bucket_name}'."
  }
}
```

With the second approach, a user who passes `My-Bucket` gets:

```
S3 bucket name must start with a lowercase letter or number. Got: 'M'.
```

instead of the useless "Invalid S3 bucket name."

## Error Message Formatting Tips

- Start with what the field represents: "Database name must..."
- End with what was received when appropriate: "Got: '${var.value}'."
- Use sentence case and proper punctuation.
- Keep messages under 200 characters when possible.
- For lists of allowed values, format them clearly: "Must be one of: dev, staging, production."
- For ranges, state both bounds: "Must be between 1 and 65535."
- Do not use technical jargon that module consumers might not understand.

## Summary

Custom error messages are the difference between a module that is pleasant to use and one that wastes people's time. Include the expected format, provide examples, show the actual value when safe, and split complex validations into multiple blocks. Good error messages save the user a trip to the source code and save you from answering support questions about configuration errors.

For more on variable validation in Terraform, see our post on [Terraform variable validation](https://oneuptime.com/blog/post/2026-01-30-terraform-variable-validation/view).
