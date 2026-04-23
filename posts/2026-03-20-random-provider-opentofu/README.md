# How to Configure the Random Provider in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Random, Infrastructure as Code, IaC, Utilities

Description: Learn how to configure the Random provider in OpenTofu to generate random strings, passwords, UUIDs, and integers.

## Introduction

This guide covers how to configure the Random provider in OpenTofu with practical examples and production-ready configurations.

## Prerequisites

- OpenTofu v1.6+
- Basic understanding of OpenTofu concepts

## Step 1: Install and Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# The random provider does not require a provider configuration block.
```

## Step 2: Set Up Authentication

```bash
# No authentication is required for the random provider.
# You do not need to export provider-specific environment variables.
```

```hcl
variable "environment" {
  description = "Environment name used to control regeneration with keepers"
  type        = string
  default     = "dev"
}

variable "allowed_special_characters" {
  description = "Allowed special characters for generated passwords"
  type        = string
  default     = "!#$%&*()-_=+[]{}<>:?"
}
```

## Step 3: Create Basic Resources

```hcl
resource "random_string" "suffix" {
  length  = 8
  upper   = false
  special = false
}

resource "random_password" "admin" {
  length           = 20
  special          = true
  override_special = var.allowed_special_characters
}
```

## Step 4: Configure Advanced Settings

```hcl
resource "random_uuid" "request_id" {
  keepers = {
    environment = var.environment
  }
}

resource "random_integer" "priority" {
  min = 1000
  max = 9999

  keepers = {
    environment = var.environment
  }
}
```

## Step 5: Define Outputs

```hcl
output "random_string" {
  description = "The generated random string"
  value       = random_string.suffix.result
}

output "random_password" {
  description = "The generated random password"
  value       = random_password.admin.result
  sensitive   = true
}

output "random_uuid" {
  description = "The generated random UUID"
  value       = random_uuid.request_id.result
}

output "random_integer" {
  description = "The generated random integer"
  value       = random_integer.priority.result
}
```

## Step 6: Deploy

```bash
# Initialize OpenTofu and download provider
tofu init

# Validate configuration syntax
tofu validate

# Preview planned changes
tofu plan

# Apply configuration
tofu apply
```

## Common Issues and Solutions

### Authentication Errors
The random provider does not require authentication. If initialization fails, verify the provider source is `hashicorp/random` and run `tofu init` again.

### Rate Limiting
The random provider generates values locally and does not call a remote API, so provider-side rate limiting does not apply.

### Provider Version Conflicts
Pin to a specific provider version range, such as `~> 3.0`, to ensure reproducible deployments.

## Conclusion

You have successfully configured the Random provider in OpenTofu to generate random strings, passwords, UUIDs, and integers. These resources keep their generated values in OpenTofu state until they are replaced, which makes them useful for stable identifiers and one-time secret generation. Protect your state carefully, especially when using `random_password`, because the value is still stored in state even though it is treated as sensitive in CLI output.
