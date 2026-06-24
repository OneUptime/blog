# How to Create Azure Key Vault Keys and Secrets with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Key Vault, Secret, Key, OpenTofu, Security

Description: Learn how to create and manage Azure Key Vault keys, secrets, and certificates with OpenTofu for secure secret management and cryptographic key storage.

## Overview

Azure Key Vault provides secure storage for cryptographic keys, secrets, and certificates. OpenTofu can create and manage Key Vault objects directly, making it easy to provision initial secrets and keys as part of infrastructure deployments.

## Step 1: Create Key Vault

```hcl
# main.tf - Key Vault for secrets and key management

resource "azurerm_key_vault" "kv" {
  name                       = "my-secrets-kv"
  location                   = azurerm_resource_group.rg.location
  resource_group_name        = azurerm_resource_group.rg.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 90
  purge_protection_enabled   = true

  # Access policy for the identity running OpenTofu
  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    key_permissions    = ["Get", "List", "Create", "Delete", "Update", "Import", "Backup", "Restore", "Recover", "Purge", "GetRotationPolicy"]
    secret_permissions = ["Get", "List", "Set", "Delete", "Backup", "Restore", "Recover", "Purge"]
  }
}
```

## Step 2: Create Keys

```hcl
# Create an RSA key for encryption operations
resource "azurerm_key_vault_key" "rsa_key" {
  name         = "app-encryption-key"
  key_vault_id = azurerm_key_vault.kv.id
  key_type     = "RSA"
  key_size     = 2048

  key_opts = [
    "decrypt",
    "encrypt",
    "sign",
    "verify",
    "wrapKey",
    "unwrapKey",
  ]

  # Set key activation and expiry dates
  not_before_date = "2026-01-01T00:00:00Z"
  expiration_date = "2027-01-01T00:00:00Z"
}

# EC key for JWT signing
resource "azurerm_key_vault_key" "ec_key" {
  name         = "jwt-signing-key"
  key_vault_id = azurerm_key_vault.kv.id
  key_type     = "EC"
  curve        = "P-256"

  key_opts = [
    "sign",
    "verify",
  ]
}
```

## Step 3: Create Secrets

```hcl
# Store an API key as a secret
resource "azurerm_key_vault_secret" "api_key" {
  name         = "external-api-key"
  value        = var.external_api_key  # Pass in via variable, not hardcoded
  key_vault_id = azurerm_key_vault.kv.id

  # Set expiry for credential rotation reminders
  expiration_date = "2026-12-31T23:59:59Z"

  content_type = "application/vnd.api-key"

  tags = {
    environment = "production"
    service     = "payment-gateway"
  }
}

# Store a database connection string
resource "azurerm_key_vault_secret" "db_connection_string" {
  name         = "database-connection-string"
  value        = "Server=${var.db_host};Database=appdb;User=${var.db_user};Password=${var.db_password}"
  key_vault_id = azurerm_key_vault.kv.id
  content_type = "text/plain"
}
```

## Step 4: Generate Random Passwords and Store as Secrets

```hcl
# Generate a random password and store it in Key Vault
resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*-_=+"
}

resource "azurerm_key_vault_secret" "db_password" {
  name         = "db-admin-password"
  value        = random_password.db_password.result
  key_vault_id = azurerm_key_vault.kv.id
  content_type = "application/vnd.password"
}
```

## Step 5: Outputs

```hcl
# Output secret IDs (not values) for reference
output "api_key_secret_id" {
  value       = azurerm_key_vault_secret.api_key.id
  description = "Key Vault secret ID for the API key"
}

output "rsa_key_id" {
  value       = azurerm_key_vault_key.rsa_key.id
  description = "Key Vault key ID for the RSA encryption key"
}
```

## Summary

Azure Key Vault keys and secrets managed with OpenTofu centralize secret storage and cryptographic key management. Use `random_password` to generate strong credentials and store them directly in Key Vault, but remember that secret values managed with `value` are still written to OpenTofu state, so your state backend and access controls must be secured appropriately.
