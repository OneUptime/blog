# How to Generate Random Passwords with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Random, Password, Security, Random_password

Description: Learn how to generate secure random passwords using the OpenTofu random provider for database credentials, API keys, and secrets stored in cloud secret managers.

## Overview

OpenTofu's `random_password` resource generates cryptographically secure passwords that integrate with cloud secret managers. The passwords are stored in state and only regenerate when explicitly triggered, providing stability for database credentials and API keys.

## Step 1: Basic Password Generation

```hcl
# main.tf - Generate secure passwords

terraform {
  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

# Basic password with sensible defaults
resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
  min_upper        = 4
  min_lower        = 4
  min_numeric      = 4
  min_special      = 4
}

# Output (sensitive - never printed in logs)
output "db_password" {
  value     = random_password.db_password.result
  sensitive = true
}
```

## Step 2: Password with Custom Constraints

```hcl
# Password matching specific complexity requirements
resource "random_password" "api_key" {
  length  = 64
  special = false  # No special chars for API keys

  # Ensure alphanumeric only
  lower   = true
  upper   = true
  numeric = true
}

# Base64-encoded secret (for Kubernetes Secret values)
resource "random_password" "jwt_secret" {
  length = 48  # Results in 64-char base64 output
}

locals {
  jwt_secret_base64 = base64encode(random_password.jwt_secret.result)
}
```

## Step 3: Store in AWS Secrets Manager

```hcl
# Generate and store multiple service passwords
locals {
  services = ["database", "redis", "api", "admin"]
}

resource "random_password" "service_passwords" {
  for_each = toset(local.services)

  length           = 32
  special          = true
  override_special = "!#$%&*()-_="
  min_special      = 2
  min_numeric      = 4
}

resource "aws_secretsmanager_secret" "service_password" {
  for_each = toset(local.services)

  name        = "app/${each.key}/password"
  description = "Auto-generated password for ${each.key}"

  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "service_password" {
  for_each = toset(local.services)

  secret_id     = aws_secretsmanager_secret.service_password[each.key].id
  secret_string = random_password.service_passwords[each.key].result
}
```

## Step 4: Use Directly in Resources

```hcl
# Use generated password directly in RDS
resource "aws_db_instance" "app" {
  identifier = "app-database"
  engine     = "postgres"

  username = "dbadmin"
  password = random_password.db_password.result  # Use directly

  lifecycle {
    ignore_changes = [password]  # Prevents password from causing destroy/recreate
  }
}

# Trigger rotation: change the keeper to regenerate
resource "random_password" "rotating_secret" {
  length  = 32
  special = false

  # Change this value to force a new password
  keepers = {
    version = var.secret_version  # Increment to rotate
  }
}
```

## Summary

OpenTofu's `random_password` resource generates cryptographically secure passwords that persist across plan/apply cycles unless the `keepers` map changes. The `sensitive = true` attribute prevents passwords from appearing in plan output and logs. Using `for_each` over a list of service names generates all required credentials in one block, making it easy to add new services by extending the list. Always store generated passwords in a secret manager rather than consuming them directly from state.
