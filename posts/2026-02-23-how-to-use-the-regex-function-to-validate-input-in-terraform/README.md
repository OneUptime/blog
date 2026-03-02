# How to Use the regex Function to Validate Input in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Regex, Input Validation, Variables, Infrastructure as Code, HCL

Description: Learn how to use Terraform's regex and regexall functions along with validation blocks to enforce input constraints and catch configuration errors early.

---

Catching bad input before Terraform tries to create resources saves time, money, and frustration. Instead of waiting for an API to reject an invalid value twenty minutes into an apply, you can validate inputs at plan time using regex patterns. Terraform provides the `regex` and `regexall` functions alongside variable `validation` blocks to make this possible.

## Understanding regex vs regexall

Terraform offers two regex functions with different behaviors:

```hcl
# regex(pattern, string) - returns the first match or raises an error
regex("[a-z]+", "hello123")
# Result: "hello"

# regexall(pattern, string) - returns ALL matches as a list (never errors)
regexall("[a-z]+", "hello123world")
# Result: ["hello", "world"]
```

The critical difference: `regex` will throw an error if there is no match, while `regexall` returns an empty list. This matters a lot for validation, because you typically want to check whether something matches without crashing your plan.

## Basic Variable Validation

Terraform variable blocks support a `validation` block that runs during planning:

```hcl
variable "environment" {
  type        = string
  description = "Deployment environment"

  validation {
    # Use can() to catch regex errors gracefully
    condition     = can(regex("^(dev|staging|production)$", var.environment))
    error_message = "Environment must be one of: dev, staging, production."
  }
}
```

The `can()` function wraps `regex` and returns `true` if it succeeds, `false` if it raises an error. This is the standard pattern for regex validation.

## Validating Resource Names

Cloud providers have strict naming rules. Here is how to enforce them upfront:

```hcl
# S3 bucket name validation
variable "bucket_name" {
  type        = string
  description = "Name for the S3 bucket"

  validation {
    condition = can(regex(
      "^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$",
      var.bucket_name
    ))
    error_message = "Bucket name must be 3-63 characters, lowercase letters, numbers, hyphens, and periods only. Must start and end with a letter or number."
  }
}

# Azure resource group name validation
variable "resource_group_name" {
  type        = string
  description = "Name for the Azure resource group"

  validation {
    condition = can(regex(
      "^[a-zA-Z0-9._()-]{1,90}$",
      var.resource_group_name
    ))
    error_message = "Resource group name must be 1-90 characters and contain only alphanumerics, underscores, parentheses, hyphens, and periods."
  }
}

# GCP project ID validation
variable "gcp_project_id" {
  type        = string
  description = "GCP project ID"

  validation {
    condition = can(regex(
      "^[a-z][a-z0-9-]{4,28}[a-z0-9]$",
      var.gcp_project_id
    ))
    error_message = "GCP project ID must be 6-30 characters, start with a letter, contain only lowercase letters, numbers, and hyphens, and not end with a hyphen."
  }
}
```

## Validating Email Addresses

```hcl
variable "alert_email" {
  type        = string
  description = "Email address for alerts"

  validation {
    condition = can(regex(
      "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
      var.alert_email
    ))
    error_message = "Please provide a valid email address."
  }
}
```

## Validating CIDR Blocks

```hcl
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"

  validation {
    condition = can(regex(
      "^([0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$",
      var.vpc_cidr
    ))
    error_message = "VPC CIDR must be a valid CIDR notation (e.g., 10.0.0.0/16)."
  }

  # You can have multiple validation blocks
  validation {
    condition = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid CIDR block that Terraform can parse."
  }
}

# Validate a list of CIDRs
variable "allowed_cidrs" {
  type        = list(string)
  description = "List of allowed CIDR blocks"

  validation {
    condition = alltrue([
      for cidr in var.allowed_cidrs :
      can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$", cidr))
    ])
    error_message = "All entries must be valid CIDR blocks."
  }
}
```

## Validating Domain Names

```hcl
variable "domain_name" {
  type        = string
  description = "Domain name for the application"

  validation {
    condition = can(regex(
      "^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\\.[a-zA-Z]{2,}$",
      var.domain_name
    ))
    error_message = "Please provide a valid domain name (e.g., example.com or sub.example.com)."
  }
}
```

## Validating Version Strings

```hcl
# Semantic version validation
variable "app_version" {
  type        = string
  description = "Application version in semver format"

  validation {
    condition = can(regex(
      "^v?[0-9]+\\.[0-9]+\\.[0-9]+(-[a-zA-Z0-9.]+)?$",
      var.app_version
    ))
    error_message = "Version must follow semantic versioning (e.g., 1.2.3 or v1.2.3-beta.1)."
  }
}
```

## Validating AWS Resource Identifiers

```hcl
# Validate an AWS account ID
variable "aws_account_id" {
  type        = string
  description = "AWS account ID"

  validation {
    condition     = can(regex("^[0-9]{12}$", var.aws_account_id))
    error_message = "AWS account ID must be exactly 12 digits."
  }
}

# Validate an AMI ID
variable "ami_id" {
  type        = string
  description = "AMI ID for the EC2 instance"

  validation {
    condition     = can(regex("^ami-[a-f0-9]{8,17}$", var.ami_id))
    error_message = "AMI ID must start with 'ami-' followed by 8-17 hex characters."
  }
}

# Validate an IAM ARN
variable "iam_role_arn" {
  type        = string
  description = "IAM role ARN"

  validation {
    condition = can(regex(
      "^arn:aws:iam::[0-9]{12}:role/[a-zA-Z0-9+=,.@_/-]+$",
      var.iam_role_arn
    ))
    error_message = "Must be a valid IAM role ARN (e.g., arn:aws:iam::123456789012:role/MyRole)."
  }
}
```

## Using regexall for Pattern Counting

`regexall` is useful when you want to count occurrences or check that a string contains (or does not contain) certain patterns:

```hcl
variable "password" {
  type        = string
  description = "Database password"
  sensitive   = true

  # Check minimum length
  validation {
    condition     = length(var.password) >= 12
    error_message = "Password must be at least 12 characters."
  }

  # Check for at least one uppercase letter
  validation {
    condition     = length(regexall("[A-Z]", var.password)) > 0
    error_message = "Password must contain at least one uppercase letter."
  }

  # Check for at least one lowercase letter
  validation {
    condition     = length(regexall("[a-z]", var.password)) > 0
    error_message = "Password must contain at least one lowercase letter."
  }

  # Check for at least one digit
  validation {
    condition     = length(regexall("[0-9]", var.password)) > 0
    error_message = "Password must contain at least one digit."
  }

  # Check for at least one special character
  validation {
    condition     = length(regexall("[^a-zA-Z0-9]", var.password)) > 0
    error_message = "Password must contain at least one special character."
  }
}
```

## Extracting Values with Capture Groups

The `regex` function returns capture group matches, which lets you extract specific parts:

```hcl
locals {
  # Extract version components
  version_string = "v2.15.3"
  version_parts  = regex("^v?(\\d+)\\.(\\d+)\\.(\\d+)$", local.version_string)
  major_version  = local.version_parts[0]  # "2"
  minor_version  = local.version_parts[1]  # "15"
  patch_version  = local.version_parts[2]  # "3"

  # Extract components from an S3 URI
  s3_uri     = "s3://my-bucket/path/to/object.json"
  s3_parts   = regex("^s3://([^/]+)/(.+)$", local.s3_uri)
  bucket     = local.s3_parts[0]  # "my-bucket"
  object_key = local.s3_parts[1]  # "path/to/object.json"
}
```

## Validating Complex Objects

You can validate nested object structures by combining regex with other conditions:

```hcl
variable "database_config" {
  type = object({
    host     = string
    port     = number
    name     = string
    username = string
  })

  # Validate the hostname
  validation {
    condition = can(regex(
      "^[a-zA-Z0-9.-]+$",
      var.database_config.host
    ))
    error_message = "Database host must contain only alphanumeric characters, dots, and hyphens."
  }

  # Validate port range
  validation {
    condition = (
      var.database_config.port >= 1 &&
      var.database_config.port <= 65535
    )
    error_message = "Database port must be between 1 and 65535."
  }

  # Validate database name
  validation {
    condition = can(regex(
      "^[a-zA-Z][a-zA-Z0-9_]{0,62}$",
      var.database_config.name
    ))
    error_message = "Database name must start with a letter and contain only alphanumeric characters and underscores."
  }
}
```

## Validating Maps with Regex

When you have a map and need to validate both keys and values:

```hcl
variable "tags" {
  type        = map(string)
  description = "Resource tags"

  # Validate tag keys
  validation {
    condition = alltrue([
      for key in keys(var.tags) :
      can(regex("^[a-zA-Z][a-zA-Z0-9_.-]{0,127}$", key))
    ])
    error_message = "Tag keys must start with a letter, be 1-128 characters, and contain only alphanumeric characters, underscores, periods, and hyphens."
  }

  # Validate tag values are not empty
  validation {
    condition = alltrue([
      for value in values(var.tags) :
      length(value) > 0 && length(value) <= 256
    ])
    error_message = "Tag values must be 1-256 characters."
  }
}
```

## Common Regex Patterns Reference

Here is a quick reference of patterns you will use often:

```hcl
locals {
  # These are useful regex patterns for Terraform validation

  # IPv4 address
  ipv4_pattern = "^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"

  # Hostname (RFC 1123)
  hostname_pattern = "^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$"

  # AWS region
  aws_region_pattern = "^[a-z]{2}(-[a-z]+)+-[0-9]+$"

  # Kubernetes namespace
  k8s_namespace_pattern = "^[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?$"

  # Docker image tag
  docker_tag_pattern = "^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$"
}
```

## Summary

Input validation with regex in Terraform is about catching errors early. Use `can(regex(...))` in validation blocks to enforce patterns on variable inputs. Use `regexall` when you need to count matches or check for the presence of patterns without causing errors. Use capture groups with `regex` when you need to extract specific parts of a string. The small investment in writing validation rules pays off every time someone passes an invalid value and gets a clear error message instead of a mysterious API failure.
