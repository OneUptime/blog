# How to Use String Variables in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, String, HCL, Infrastructure as Code, DevOps

Description: A guide to declaring and using string type variables in OpenTofu configurations.

## Introduction

String variables are the most common type in OpenTofu. They hold text values and are used for names, identifiers, URLs, configuration values, and more. This guide covers declaring, validating, and using string variables effectively.

## Declaring String Variables

```hcl
# Basic string variable

variable "project_name" {
  type = string
}

# String with default
variable "aws_region" {
  type    = string
  default = "us-east-1"
}

# String with description and validation
variable "environment" {
  type        = string
  description = "Deployment environment name"
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}
```

## Using Strings in Interpolation

```hcl
variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

locals {
  # String interpolation
  resource_prefix = "${var.project_name}-${var.environment}"

  # Concatenation
  bucket_name = "${var.project_name}-state-${var.environment}"

  # Upper/lower case
  env_upper = upper(var.environment)
}

resource "aws_s3_bucket" "state" {
  bucket = local.bucket_name

  tags = {
    Name = "${local.resource_prefix}-state"
  }
}
```

## String Functions

```hcl
locals {
  # Common string operations
  project = "my-project"

  # Case
  upper_project = upper(local.project)     # "MY-PROJECT"
  lower_project = lower(local.project)     # "my-project"

  # Length
  name_length = length(local.project)      # 10

  # Substring
  prefix = substr(local.project, 0, 2)    # "my"

  # Replace
  dashed = replace(local.project, "-", "_")  # "my_project"

  # Split
  parts = split("-", local.project)        # ["my", "project"]

  # Join
  joined = join("_", ["my", "project"])    # "my_project"

  # Trim
  trimmed = trimspace("  hello  ")         # "hello"

  # Contains
  has_my = strcontains(local.project, "my")  # true
}
```

## Multi-Line Strings (Heredoc)

```hcl
variable "ubuntu_ami_id" {
  type = string
}

variable "user_data" {
  type = string
  default = <<-EOT
    #!/bin/bash
    apt-get update
    apt-get install -y nginx
    systemctl start nginx
  EOT
}

resource "aws_instance" "web" {
  ami           = var.ubuntu_ami_id
  instance_type = "t2.micro"
  user_data     = var.user_data
}
```

## String Validation Patterns

```hcl
variable "bucket_name" {
  type        = string
  description = "S3 bucket name (3-63 chars, lowercase letters, numbers, hyphens)"

  validation {
    condition     = length(var.bucket_name) >= 3 && length(var.bucket_name) <= 63
    error_message = "Bucket name must be between 3 and 63 characters."
  }

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]*[a-z0-9]$", var.bucket_name))
    error_message = "Bucket name must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "email" {
  type        = string
  description = "Email address for notifications"

  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.email))
    error_message = "Must be a valid email address."
  }
}
```

## Sensitive Strings

```hcl
variable "api_key" {
  type        = string
  description = "API key for the external service"
  sensitive   = true  # Redacted in plan/apply output, but still stored in state
}

variable "database_password" {
  type      = string
  sensitive = true
}
```

## Conclusion

String variables are foundational in OpenTofu configurations. Using type constraints, validation rules, and the `sensitive` flag, you can create robust, self-documenting variables that prevent misconfiguration and reduce accidental exposure of sensitive values in CLI output. String interpolation and built-in string functions make it easy to compose resource names and configuration values dynamically.
