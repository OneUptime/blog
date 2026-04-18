# How to Configure the Vault Provider in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, HashiCorp Vault, Infrastructure as Code, IaC, Secrets Management

Description: Learn how to configure the HashiCorp Vault provider in OpenTofu for secrets management and dynamic credentials.

## Introduction

This guide covers how to configure the HashiCorp Vault provider in OpenTofu with practical examples and production-ready configurations.

## Prerequisites

- OpenTofu v1.6+
- A running Vault server (v1.10+) reachable from where you run OpenTofu
- A Vault token with sufficient policy privileges to manage the resources below
- Basic understanding of OpenTofu concepts

## Step 1: Install and Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    vault = {
      source  = "hashicorp/vault"
      version = "~> 4.0"
    }
  }
}

# Configure the provider. Address and token can also come from
# the VAULT_ADDR and VAULT_TOKEN environment variables.

provider "vault" {
  address = "https://vault.example.com:8200"
  # token = var.vault_token  # Prefer VAULT_TOKEN env var
}
```

## Step 2: Set Up Authentication

```bash
# Use environment variables for authentication
export VAULT_ADDR="https://vault.example.com:8200"
export VAULT_TOKEN="hvs.your-vault-token"
export VAULT_NAMESPACE="admin"  # Only required for Vault Enterprise
```

```hcl
variable "vault_address" {
  description = "Address of the Vault server"
  type        = string
}

variable "vault_token" {
  description = "Token used to authenticate with Vault"
  type        = string
  sensitive   = true
}
```

## Step 3: Create Basic Resources

```hcl
# Enable a KV v2 secrets engine at path "secret/"
resource "vault_mount" "kvv2" {
  path        = "secret"
  type        = "kv"
  options     = { version = "2" }
  description = "KV Version 2 secret engine"
}

# Define a policy granting access to a path under the engine
resource "vault_policy" "developers" {
  name = "developers"

  policy = <<EOT
path "secret/data/developers/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
EOT
}
```

## Step 4: Configure Advanced Settings

```hcl
# Enable the AppRole authentication backend
resource "vault_auth_backend" "approle" {
  type = "approle"
}

# Create an AppRole bound to the developers policy
resource "vault_approle_auth_backend_role" "app" {
  backend        = vault_auth_backend.approle.path
  role_name      = "app-role"
  token_policies = [vault_policy.developers.name]
  token_ttl      = 3600
  token_max_ttl  = 7200
}

# Write a KV v2 secret
resource "vault_kv_secret_v2" "app_config" {
  mount = vault_mount.kvv2.path
  name  = "developers/app-config"

  data_json = jsonencode({
    api_key = "example-api-key"
    db_url  = "postgres://localhost:5432/app"
  })
}
```

## Step 5: Define Outputs

```hcl
output "kv_mount_path" {
  description = "Path of the KV v2 secret engine"
  value       = vault_mount.kvv2.path
}

output "approle_role_id" {
  description = "Role ID for the AppRole authentication"
  value       = vault_approle_auth_backend_role.app.role_id
  sensitive   = true
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
Verify `VAULT_TOKEN` is valid and has not expired, and that `VAULT_ADDR` points to the correct server. Ensure the token's attached policies grant the capabilities required by the resources you manage.

### Rate Limiting
Add `depends_on` to serialize resource creation and avoid hitting API rate limits.

### Provider Version Conflicts
Pin to a specific provider version range to ensure reproducible deployments.

## Conclusion

You have successfully configured the HashiCorp Vault provider in OpenTofu. This provider enables you to manage Vault auth methods, secret engines, policies, and secrets as code, ensuring consistency and enabling GitOps workflows. Always use environment variables or secure secret stores for sensitive credentials such as `VAULT_TOKEN`.
