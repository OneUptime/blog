# How to Add Validation Rules to OpenTofu Variables - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, Validation, Infrastructure as Code, DevOps

Description: A guide to adding validation rules to OpenTofu variables to catch configuration errors before infrastructure is modified.

## Introduction

OpenTofu supports custom validation rules in variable blocks that run before any infrastructure changes. These rules catch invalid values early, providing helpful error messages that guide users toward correct configurations.

## Basic Validation Block

```hcl
variable "environment" {
  type        = string
  description = "Deployment environment"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}
```

## Multiple Validation Rules

```hcl
variable "bucket_name" {
  type        = string
  description = "S3 bucket name"

  # Rule 1: Length check
  validation {
    condition     = length(var.bucket_name) >= 3 && length(var.bucket_name) <= 63
    error_message = "Bucket name must be between 3 and 63 characters."
  }

  # Rule 2: Pattern check
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]*[a-z0-9]$", var.bucket_name))
    error_message = "Bucket name must start and end with a lowercase letter or number, and can only contain lowercase letters, numbers, and hyphens."
  }

  # Rule 3: Cannot be IP address
  validation {
    condition     = !can(regex("^\\d+\\.\\d+\\.\\d+\\.\\d+$", var.bucket_name))
    error_message = "Bucket name must not be formatted as an IP address."
  }
}
```

## Numeric Range Validation

```hcl
variable "instance_count" {
  type        = number
  description = "Number of instances to create"
  default     = 2

  validation {
    condition     = var.instance_count >= 1 && var.instance_count <= 20
    error_message = "Instance count must be between 1 and 20."
  }
}

variable "port" {
  type        = number
  description = "Application port (non-privileged)"

  validation {
    condition     = var.port > 1023 && var.port <= 65535
    error_message = "Port must be between 1024 and 65535 (non-privileged ports only)."
  }
}
```

## CIDR Block Validation

```hcl
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"

  validation {
    # can() returns true if the expression succeeds without errors
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "vpc_cidr must be a valid IPv4 CIDR block (e.g., 10.0.0.0/16)."
  }

  validation {
    # Ensure the prefix length is /24 or smaller number (i.e., /24, /16, /8, ...)
    condition     = tonumber(split("/", var.vpc_cidr)[1]) <= 24
    error_message = "VPC CIDR prefix length must be /24 or less (e.g., /8, /16, /24)."
  }
}
```

## List and Collection Validation

```hcl
variable "availability_zones" {
  type        = list(string)
  description = "Availability zones (at least 2 for HA)"

  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least 2 availability zones are required for high availability."
  }

  validation {
    condition     = length(var.availability_zones) == length(distinct(var.availability_zones))
    error_message = "Availability zones must be unique (no duplicates)."
  }
}

variable "allowed_origins" {
  type        = list(string)
  description = "Allowed CORS origins"

  validation {
    condition = alltrue([
      for origin in var.allowed_origins :
      can(regex("^https?://", origin))
    ])
    error_message = "All origins must start with http:// or https://."
  }
}
```

## Object Attribute Validation

```hcl
variable "network_config" {
  type = object({
    vpc_cidr    = string
    subnet_mask = number
  })

  validation {
    condition     = can(cidrhost(var.network_config.vpc_cidr, 0))
    error_message = "network_config.vpc_cidr must be a valid CIDR block."
  }

  validation {
    condition = (
      var.network_config.subnet_mask >= 24 &&
      var.network_config.subnet_mask <= 28
    )
    error_message = "network_config.subnet_mask must be between 24 and 28."
  }
}
```

## Using can() and try() in Validation

```hcl
variable "json_config" {
  type        = string
  description = "JSON-encoded configuration string"

  validation {
    condition     = can(jsondecode(var.json_config))
    error_message = "json_config must be valid JSON."
  }
}

variable "cidr_list" {
  type = list(string)

  validation {
    condition = alltrue([
      for cidr in var.cidr_list : can(cidrhost(cidr, 0))
    ])
    error_message = "All values in cidr_list must be valid CIDR blocks."
  }
}
```

## Conclusion

Validation rules in OpenTofu variables create a self-documenting, fail-fast configuration system. They catch misconfigurations before any infrastructure changes are made, providing clear error messages that guide users toward correct values. Use multiple validation blocks for complex rules, and leverage `can()` and `regex()` for format validation. Good validation rules are worth the effort as they prevent hours of debugging later.
