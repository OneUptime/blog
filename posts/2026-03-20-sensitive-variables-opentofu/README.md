# How to Mark Variables as Sensitive in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, Sensitive, Security, Infrastructure as Code, DevOps

Description: A guide to marking OpenTofu variables as sensitive to prevent secrets from appearing in logs, plan output, and state files.

## Introduction

The `sensitive = true` attribute in variable declarations tells OpenTofu to treat a value as a secret in normal CLI output. Sensitive values are redacted from plan and apply output, but they are still sent to providers and recorded in state, so protect the state with state encryption or an encrypted backend. This is essential for passwords, API keys, private keys, and other confidential information.

## Marking a Variable as Sensitive

```hcl
# variables.tf

variable "database_password" {
  type        = string
  description = "Password for the RDS database"
  sensitive   = true  # Marks this as sensitive
}

variable "api_key" {
  type        = string
  description = "API key for the external service"
  sensitive   = true
}

variable "ssl_private_key" {
  type        = string
  description = "SSL/TLS private key content"
  sensitive   = true
}
```

## How Sensitive Values Are Handled

```bash
# Plan output for sensitive variables:
# resource "aws_db_instance" "main" {
#   + password = (sensitive value)  <-- Redacted!
# }

# Apply output:
# aws_db_instance.main: Creating...
# aws_db_instance.main: Creation complete

# tofu output for sensitive outputs:
# password = <sensitive>  <-- Shows redacted marker
```

## Sensitive Variables in Resources

```hcl
variable "db_password" {
  type      = string
  sensitive = true
}

resource "aws_db_instance" "main" {
  identifier = "production-db"
  engine     = "postgres"
  username   = "admin"
  password   = var.db_password  # Redacted in normal plan/apply output

  # ... other config
}

output "db_endpoint" {
  value = aws_db_instance.main.endpoint
}

# Note: The password is in the state file (encrypted if using encrypted backend)
# Always use an encrypted backend like S3 with SSE when handling sensitive data
```

## Sensitive Outputs

```hcl
# Outputs can also be marked sensitive
output "db_password" {
  value       = var.db_password
  sensitive   = true  # Required if value contains sensitive data
}

# Without sensitive = true, you'd get:
# Error: Output refers to sensitive values
```

## Propagation of Sensitivity

```hcl
variable "api_key" {
  type      = string
  sensitive = true
}

locals {
  # This local also becomes sensitive because it references sensitive input
  api_header = "Authorization: Bearer ${var.api_key}"

  # Even non-obvious uses propagate sensitivity
  config = {
    endpoint = "https://api.example.com"
    auth     = var.api_key  # Makes 'config' sensitive
  }
}

output "api_config" {
  value     = local.config  # Must also be marked sensitive
  sensitive = true
}
```

## Reading Sensitive Outputs

```bash
# Sensitive outputs are hidden by default
tofu output
# api_key = <sensitive>

# To see the actual value (use with care):
tofu output -raw api_key

# Or as JSON (still shows the value - use with extreme caution)
tofu output -json | jq .api_key
```

## Providing Sensitive Variable Values

```bash
# RECOMMENDED: Use environment variables populated by your shell, CI system, or secrets manager
export TF_VAR_database_password="my-secret-password"
tofu apply

# Use from secrets manager
export TF_VAR_api_key=$(aws secretsmanager get-secret-value \
  --secret-id prod/api-key \
  --query SecretString \
  --output text)
tofu apply

# AVOID: Command line (visible in process list)
# tofu apply -var="database_password=secret"  # BAD
```

## State File Considerations

```bash
# WARNING: Sensitive values ARE stored in the state file in plain text!
# (unless using state encryption)

# Always use an encrypted backend:
# S3 with SSE:
terraform {
  backend "s3" {
    bucket  = "my-state-bucket"
    key     = "terraform.tfstate"
    region  = "us-east-1"
    encrypt = true  # Server-side encryption
  }
}

# Or use OpenTofu's client-side state encryption (1.7+)
terraform {
  encryption {
    key_provider "pbkdf2" "main" {
      # Must be at least 16 characters long
      passphrase = var.state_encryption_key
    }
    method "aes_gcm" "main" {
      keys = key_provider.pbkdf2.main
    }
    state {
      method = method.aes_gcm.main
    }
  }
}
```

## Conclusion

Marking variables as `sensitive = true` is a critical security practice for handling secrets in OpenTofu. While it doesn't encrypt the state file, it prevents accidental exposure in normal plan and apply output. Always combine sensitive variables with encrypted state backends, secret management systems for providing values, and access controls on your state storage. These layers together provide robust secret management for your infrastructure.
