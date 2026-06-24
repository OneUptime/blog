# How to Mark Outputs as Sensitive in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Output, Sensitive, Security, Infrastructure as Code, DevOps

Description: A guide to marking OpenTofu output values as sensitive to protect secrets from being displayed in logs and terminal output.

## Introduction

Marking outputs as `sensitive = true` redacts their values in normal `tofu plan` and `tofu apply` messages and default `tofu output` results. This helps protect passwords, private keys, tokens, and other secrets from accidental exposure in logs and terminals, but `tofu output -raw`, `tofu output -json`, and `tofu output -show-sensitive` can still print sensitive values.

## Marking Outputs as Sensitive

```hcl
# outputs.tf

# Password output - must be sensitive

output "database_password" {
  description = "The randomly generated database password"
  value       = random_password.db.result
  sensitive   = true  # Masks in output: <sensitive>
}

# Private key output - definitely sensitive
output "private_key_pem" {
  description = "Private key in PEM format for SSH access"
  value       = tls_private_key.ssh.private_key_pem
  sensitive   = true
}

# API endpoint with embedded credentials
output "connection_string" {
  description = "Full database connection string"
  value       = "postgres://${var.db_username}:${random_password.db.result}@${aws_db_instance.main.endpoint}/${var.db_name}"
  sensitive   = true
}
```

## Required Sensitive Marking

If an output references sensitive input values or sensitive resource attributes, OpenTofu requires you to mark the output as sensitive:

```hcl
variable "api_key" {
  type      = string
  sensitive = true
}

# This MUST be sensitive because it references a sensitive variable
output "api_key_length" {
  value = length(var.api_key)
  # Even though length() doesn't reveal the key contents, OpenTofu requires this:
  sensitive = true
}

# This also requires sensitive = true
output "formatted_key" {
  value     = "Bearer ${var.api_key}"
  sensitive = true
}
```

## How Sensitive Outputs Appear

```bash
# Regular apply output:
# Apply complete! Resources: 1 added.
#
# Outputs:
# database_password = <sensitive>  <- Masked
# vpc_id            = "vpc-abc123" <- Not sensitive

# tofu output command:
tofu output
# database_password = <sensitive>
# vpc_id            = "vpc-abc123"

# tofu output for specific sensitive output:
tofu output database_password
# database_password = <sensitive>

# To see the actual value (use with care):
tofu output -raw database_password
# actual-password-value-here (WARNING: visible in terminal)
```

## Accessing Sensitive Outputs Securely

```bash
# Store sensitive output in a variable (not displayed)
DB_PASSWORD=$(tofu output -raw database_password)

# Pass to another command without displaying
kubectl create secret generic db-creds \
  --from-literal=password="$(tofu output -raw database_password)"

# Save to a file with restricted permissions
tofu output -raw private_key_pem > /tmp/key.pem
chmod 600 /tmp/key.pem
# Remember to clean up after use
```

## Using Sensitive Outputs in Other Modules

```hcl
# root module using outputs from child module
module "database" {
  source      = "./modules/rds"
  environment = var.environment
}

# Use sensitive output from module in another module
module "app" {
  source = "./modules/ecs"

  # Passing sensitive output between modules
  db_password = module.database.password   # Sensitive propagates automatically
  db_endpoint = module.database.endpoint
}
```

## State File Warning

```hcl
# IMPORTANT: Sensitive outputs are still in the state file!
# The sensitive flag only affects display, not storage.
# Always use encrypted state backends:

terraform {
  backend "s3" {
    bucket  = "my-state"
    key     = "terraform.tfstate"
    region  = "us-east-1"
    encrypt = true  # Server-side encryption
  }
}
```

## Conclusion

Marking outputs as sensitive is a necessary security practice when exposing secrets from your OpenTofu configurations. While it doesn't encrypt the state file (you need an encrypted backend for that), it helps prevent accidental exposure in normal CLI output and CI/CD logs. Always mark database passwords, private keys, tokens, and connection strings containing credentials as sensitive, and access their values programmatically rather than displaying them in terminals.
