# How to Create Terraform Variable Validation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, IaC, Validation, DevOps

Description: Add validation rules to Terraform variables with custom error messages for input validation and module contracts.

---

Terraform variable validation allows you to define constraints on input variables, catching configuration errors before they cause deployment failures. This feature is particularly useful when building reusable modules where you need to enforce specific input requirements.

## Basic Validation Block Syntax

The validation block lives inside a variable definition. Each variable can have one or more validation blocks that define conditions the input must satisfy.

Here is the basic structure of a variable with validation:

```hcl
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"

  validation {
    condition     = contains(["t3.micro", "t3.small", "t3.medium"], var.instance_type)
    error_message = "Instance type must be t3.micro, t3.small, or t3.medium."
  }
}
```

The validation block has two required arguments:

| Argument | Description |
|----------|-------------|
| `condition` | A boolean expression that must evaluate to true for the value to be valid |
| `error_message` | A string shown to the user when the condition evaluates to false |

## Understanding Condition Expressions

The condition expression can use any Terraform function or operator. The only requirement is that it must reference the variable being validated using `var.<variable_name>`.

### String Length Validation

Validate that a string falls within acceptable length bounds:

```hcl
variable "project_name" {
  description = "Name of the project"
  type        = string

  validation {
    condition     = length(var.project_name) >= 3 && length(var.project_name) <= 32
    error_message = "Project name must be between 3 and 32 characters."
  }
}
```

### Numeric Range Validation

Ensure numeric values fall within expected ranges:

```hcl
variable "instance_count" {
  description = "Number of instances to create"
  type        = number

  validation {
    condition     = var.instance_count >= 1 && var.instance_count <= 10
    error_message = "Instance count must be between 1 and 10."
  }
}

variable "port" {
  description = "Application port number"
  type        = number

  validation {
    condition     = var.port >= 1024 && var.port <= 65535
    error_message = "Port must be between 1024 and 65535 (non-privileged ports)."
  }
}
```

### List Validation

Validate list contents and length:

```hcl
variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)

  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "You must specify at least 2 availability zones for high availability."
  }
}

variable "allowed_cidrs" {
  description = "List of CIDR blocks for ingress rules"
  type        = list(string)

  validation {
    condition     = length(var.allowed_cidrs) > 0
    error_message = "At least one CIDR block must be specified."
  }
}
```

## Regex Validation with can() Function

Regular expressions are powerful for validating string formats. The `can()` function is essential here because `regex()` throws an error when there is no match, which would cause Terraform to crash instead of showing your error message.

### Basic Regex Pattern Matching

The `can()` function catches errors and returns false instead of failing:

```hcl
variable "environment" {
  description = "Environment name"
  type        = string

  validation {
    # The regex function returns the matched string or errors if no match
    # can() converts the error into a boolean false
    condition     = can(regex("^(dev|staging|prod)$", var.environment))
    error_message = "Environment must be dev, staging, or prod."
  }
}
```

### Validating Resource Naming Conventions

Enforce naming standards across your infrastructure:

```hcl
variable "resource_name" {
  description = "Name for the resource"
  type        = string

  validation {
    # Must start with a letter, can contain letters, numbers, and hyphens
    # Must be between 3 and 63 characters
    condition     = can(regex("^[a-z][a-z0-9-]{2,62}$", var.resource_name))
    error_message = "Resource name must start with a lowercase letter, contain only lowercase letters, numbers, and hyphens, and be 3-63 characters long."
  }
}
```

### Email Validation

Validate email format for notification configurations:

```hcl
variable "alert_email" {
  description = "Email address for alerts"
  type        = string

  validation {
    # Basic email format validation
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.alert_email))
    error_message = "Please provide a valid email address."
  }
}
```

### AWS Resource ID Validation

Validate that inputs match expected AWS resource ID patterns:

```hcl
variable "vpc_id" {
  description = "VPC ID where resources will be created"
  type        = string

  validation {
    condition     = can(regex("^vpc-[a-f0-9]{8,17}$", var.vpc_id))
    error_message = "VPC ID must be a valid vpc-* identifier."
  }
}

variable "subnet_ids" {
  description = "List of subnet IDs"
  type        = list(string)

  validation {
    # Use alltrue() with a for expression to validate each element
    condition     = alltrue([for s in var.subnet_ids : can(regex("^subnet-[a-f0-9]{8,17}$", s))])
    error_message = "All subnet IDs must be valid subnet-* identifiers."
  }
}

variable "ami_id" {
  description = "AMI ID for the instances"
  type        = string

  validation {
    condition     = can(regex("^ami-[a-f0-9]{8,17}$", var.ami_id))
    error_message = "AMI ID must be a valid ami-* identifier."
  }
}
```

### CIDR Block Validation

Validate IP address and CIDR notation:

```hcl
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string

  validation {
    # Validate CIDR format: x.x.x.x/xx
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block (e.g., 10.0.0.0/16)."
  }
}

variable "private_subnets" {
  description = "CIDR blocks for private subnets"
  type        = list(string)

  validation {
    condition     = alltrue([for cidr in var.private_subnets : can(cidrhost(cidr, 0))])
    error_message = "All private subnet values must be valid CIDR blocks."
  }
}
```

## The can() Function Deep Dive

The `can()` function is a key tool for validation. It evaluates an expression and returns true if it succeeds or false if it produces an error.

### How can() Works

```hcl
# Without can() - this would crash Terraform on invalid input
variable "bad_example" {
  type = string
  validation {
    # DO NOT DO THIS - regex errors will crash Terraform
    condition     = regex("^[a-z]+$", var.bad_example) != ""
    error_message = "This will never be shown on invalid input."
  }
}

# With can() - errors are caught and converted to false
variable "good_example" {
  type = string
  validation {
    condition     = can(regex("^[a-z]+$", var.good_example))
    error_message = "Value must contain only lowercase letters."
  }
}
```

### Using can() for Type Conversion Validation

Validate that strings can be converted to other types:

```hcl
variable "timeout_seconds" {
  description = "Timeout value as a string"
  type        = string

  validation {
    # Ensure the string can be converted to a number
    condition     = can(tonumber(var.timeout_seconds))
    error_message = "Timeout must be a valid number."
  }
}

variable "config_json" {
  description = "Configuration as a JSON string"
  type        = string

  validation {
    # Validate that the string is valid JSON
    condition     = can(jsondecode(var.config_json))
    error_message = "Configuration must be a valid JSON string."
  }
}
```

### Combining can() with Complex Expressions

```hcl
variable "s3_bucket_name" {
  description = "S3 bucket name"
  type        = string

  validation {
    # S3 bucket naming rules:
    # - 3-63 characters
    # - lowercase letters, numbers, and hyphens
    # - must start and end with letter or number
    # - no consecutive periods
    # - not formatted as IP address
    condition = can(regex("^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$", var.s3_bucket_name)) && !can(regex("^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+$", var.s3_bucket_name)) && !can(regex("\\.\\.", var.s3_bucket_name))
    error_message = "S3 bucket name must be 3-63 characters, use only lowercase letters, numbers, hyphens, and periods. Cannot be formatted as IP address or contain consecutive periods."
  }
}
```

## Multiple Validation Rules

A single variable can have multiple validation blocks. Terraform evaluates them in order and reports the first failure.

### Layered Validation Example

```hcl
variable "database_name" {
  description = "Name for the database"
  type        = string

  # First validation: check length
  validation {
    condition     = length(var.database_name) >= 1 && length(var.database_name) <= 64
    error_message = "Database name must be between 1 and 64 characters."
  }

  # Second validation: check starting character
  validation {
    condition     = can(regex("^[a-zA-Z]", var.database_name))
    error_message = "Database name must start with a letter."
  }

  # Third validation: check allowed characters
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.database_name))
    error_message = "Database name can only contain letters, numbers, and underscores."
  }

  # Fourth validation: check for reserved words
  validation {
    condition     = !contains(["admin", "root", "system", "master"], lower(var.database_name))
    error_message = "Database name cannot be a reserved word (admin, root, system, master)."
  }
}
```

### Complex Object Validation

When validating objects, you can add multiple rules for different attributes:

```hcl
variable "database_config" {
  description = "Database configuration"
  type = object({
    engine         = string
    engine_version = string
    instance_class = string
    storage_gb     = number
    multi_az       = bool
  })

  # Validate engine type
  validation {
    condition     = contains(["mysql", "postgres", "mariadb"], var.database_config.engine)
    error_message = "Database engine must be mysql, postgres, or mariadb."
  }

  # Validate storage size
  validation {
    condition     = var.database_config.storage_gb >= 20 && var.database_config.storage_gb <= 65536
    error_message = "Storage must be between 20 GB and 65536 GB."
  }

  # Validate instance class format
  validation {
    condition     = can(regex("^db\\.[a-z0-9]+\\.[a-z0-9]+$", var.database_config.instance_class))
    error_message = "Instance class must be in format db.*.* (e.g., db.t3.micro)."
  }
}
```

## Practical Validation Patterns

### AWS Region Validation

```hcl
variable "aws_region" {
  description = "AWS region for deployment"
  type        = string

  validation {
    condition = contains([
      "us-east-1", "us-east-2", "us-west-1", "us-west-2",
      "eu-west-1", "eu-west-2", "eu-west-3", "eu-central-1",
      "ap-southeast-1", "ap-southeast-2", "ap-northeast-1"
    ], var.aws_region)
    error_message = "Please specify a supported AWS region."
  }
}
```

### Tag Validation

Ensure required tags are present:

```hcl
variable "tags" {
  description = "Resource tags"
  type        = map(string)

  validation {
    condition     = contains(keys(var.tags), "Environment")
    error_message = "Tags must include an 'Environment' key."
  }

  validation {
    condition     = contains(keys(var.tags), "Owner")
    error_message = "Tags must include an 'Owner' key."
  }

  validation {
    condition     = contains(keys(var.tags), "CostCenter")
    error_message = "Tags must include a 'CostCenter' key."
  }
}
```

### Kubernetes Namespace Validation

```hcl
variable "k8s_namespace" {
  description = "Kubernetes namespace"
  type        = string

  validation {
    # Kubernetes namespace naming rules (DNS-1123 label)
    # - max 63 characters
    # - lowercase alphanumeric or '-'
    # - must start with alphanumeric
    # - must end with alphanumeric
    condition     = can(regex("^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$", var.k8s_namespace)) || can(regex("^[a-z0-9]$", var.k8s_namespace))
    error_message = "Namespace must be a valid DNS-1123 label: lowercase, alphanumeric, hyphens allowed in middle, max 63 characters."
  }
}
```

### Domain Name Validation

```hcl
variable "domain_name" {
  description = "Domain name for the application"
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]?(\\.[a-z0-9][a-z0-9-]{0,61}[a-z0-9]?)*\\.[a-z]{2,}$", var.domain_name))
    error_message = "Please provide a valid domain name (e.g., example.com, sub.example.com)."
  }
}
```

### Semantic Version Validation

```hcl
variable "app_version" {
  description = "Application version in semver format"
  type        = string

  validation {
    # Matches semantic versioning: major.minor.patch with optional pre-release
    condition     = can(regex("^[0-9]+\\.[0-9]+\\.[0-9]+(-[a-zA-Z0-9]+)?$", var.app_version))
    error_message = "Version must follow semantic versioning (e.g., 1.0.0, 2.1.3-beta)."
  }
}
```

## Validation with Optional Variables

When working with optional variables, account for null values in your conditions:

```hcl
variable "backup_retention_days" {
  description = "Number of days to retain backups (optional)"
  type        = number
  default     = null

  validation {
    # Allow null or a value between 1 and 35
    condition     = var.backup_retention_days == null || (var.backup_retention_days >= 1 && var.backup_retention_days <= 35)
    error_message = "Backup retention must be between 1 and 35 days, or leave unset."
  }
}

variable "custom_domain" {
  description = "Custom domain name (optional)"
  type        = string
  default     = null

  validation {
    condition     = var.custom_domain == null || can(regex("^[a-z0-9][a-z0-9-.]*[a-z0-9]\\.[a-z]{2,}$", var.custom_domain))
    error_message = "If specified, custom domain must be a valid domain name."
  }
}
```

## Conditional Validation Based on Other Variables

While validation blocks cannot directly reference other variables, you can use locals for cross-variable validation:

```hcl
variable "enable_encryption" {
  description = "Enable encryption at rest"
  type        = bool
  default     = true
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption"
  type        = string
  default     = ""
}

locals {
  # Cross-variable validation
  validate_encryption = var.enable_encryption && var.kms_key_arn == "" ? tobool("ERROR: kms_key_arn is required when encryption is enabled") : true
}

# Alternative approach using a validation in a null_resource or check block (Terraform 1.5+)
```

For Terraform 1.5 and later, use check blocks for cross-variable validation:

```hcl
check "encryption_config" {
  assert {
    condition     = !var.enable_encryption || var.kms_key_arn != ""
    error_message = "KMS key ARN is required when encryption is enabled."
  }
}
```

## Error Message Best Practices

Write clear, actionable error messages that help users fix the problem:

```hcl
# Bad error message - not helpful
variable "bad_example" {
  type = string
  validation {
    condition     = length(var.bad_example) <= 255
    error_message = "Invalid value."
  }
}

# Good error message - specific and actionable
variable "good_example" {
  type = string
  validation {
    condition     = length(var.good_example) <= 255
    error_message = "Value must be 255 characters or less. Current length: use a shorter string."
  }
}

# Even better - include format requirements
variable "better_example" {
  type = string
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*[a-z0-9]$", var.better_example))
    error_message = "Value must start with a lowercase letter, end with a letter or number, and contain only lowercase letters, numbers, and hyphens. Example: my-resource-name"
  }
}
```

## Common Validation Functions Reference

| Function | Use Case | Example |
|----------|----------|---------|
| `length()` | String/list/map size | `length(var.name) >= 3` |
| `contains()` | Value in list | `contains(["a", "b"], var.x)` |
| `can()` | Error handling | `can(regex("...", var.x))` |
| `regex()` | Pattern matching | `regex("^[a-z]+$", var.x)` |
| `alltrue()` | All conditions true | `alltrue([for x in var.list : x > 0])` |
| `anytrue()` | Any condition true | `anytrue([for x in var.list : x > 0])` |
| `startswith()` | String prefix | `startswith(var.x, "prefix-")` |
| `endswith()` | String suffix | `endswith(var.x, "-suffix")` |
| `tonumber()` | Numeric validation | `can(tonumber(var.x))` |
| `cidrhost()` | CIDR validation | `can(cidrhost(var.cidr, 0))` |
| `jsondecode()` | JSON validation | `can(jsondecode(var.json))` |

## Complete Module Example

Here is a complete example showing validation in a reusable module:

```hcl
# variables.tf for an ECS service module

variable "service_name" {
  description = "Name of the ECS service"
  type        = string

  validation {
    condition     = length(var.service_name) >= 1 && length(var.service_name) <= 255
    error_message = "Service name must be between 1 and 255 characters."
  }

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9-_]*$", var.service_name))
    error_message = "Service name must start with a letter and contain only letters, numbers, hyphens, and underscores."
  }
}

variable "container_port" {
  description = "Port the container listens on"
  type        = number

  validation {
    condition     = var.container_port >= 1 && var.container_port <= 65535
    error_message = "Container port must be between 1 and 65535."
  }
}

variable "desired_count" {
  description = "Desired number of tasks"
  type        = number
  default     = 2

  validation {
    condition     = var.desired_count >= 0 && var.desired_count <= 100
    error_message = "Desired count must be between 0 and 100."
  }
}

variable "cpu" {
  description = "CPU units for the task (256, 512, 1024, 2048, 4096)"
  type        = number

  validation {
    condition     = contains([256, 512, 1024, 2048, 4096], var.cpu)
    error_message = "CPU must be one of: 256, 512, 1024, 2048, 4096."
  }
}

variable "memory" {
  description = "Memory in MB for the task"
  type        = number

  validation {
    condition     = var.memory >= 512 && var.memory <= 30720
    error_message = "Memory must be between 512 MB and 30720 MB."
  }
}

variable "health_check_path" {
  description = "Health check endpoint path"
  type        = string
  default     = "/health"

  validation {
    condition     = startswith(var.health_check_path, "/")
    error_message = "Health check path must start with a forward slash."
  }
}

variable "environment_variables" {
  description = "Environment variables for the container"
  type        = map(string)
  default     = {}

  validation {
    condition     = alltrue([for k, v in var.environment_variables : can(regex("^[A-Z][A-Z0-9_]*$", k))])
    error_message = "Environment variable names must be uppercase and contain only letters, numbers, and underscores."
  }
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.log_retention_days)
    error_message = "Log retention must be a valid CloudWatch retention period."
  }
}
```

## Debugging Validation Failures

When validation fails, Terraform shows the error message you defined. To debug complex validations:

```hcl
# Use output to see what value is being validated
output "debug_value" {
  value = var.my_variable
}

# Temporarily simplify the condition
variable "debug_me" {
  type = string
  validation {
    # Start simple
    condition     = length(var.debug_me) > 0
    error_message = "Step 1 passed"
  }
  validation {
    # Add complexity
    condition     = can(regex("^[a-z]+$", var.debug_me))
    error_message = "Failed regex validation. Value must contain only lowercase letters."
  }
}
```

## Summary

Variable validation in Terraform provides a powerful mechanism for:

- Catching configuration errors early in the development cycle
- Documenting expected input formats through error messages
- Creating self-documenting module interfaces
- Preventing deployment failures caused by invalid inputs

Key points to remember:

1. Use `can()` to wrap functions that might throw errors
2. Multiple validation blocks are evaluated in order
3. Error messages should be clear and actionable
4. Combine built-in functions for complex validation logic
5. Account for null values in optional variable validation

Start with simple validations and add complexity as needed. Well-designed validations make your modules more robust and easier to use.
