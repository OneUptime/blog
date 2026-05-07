# How to Set Up Azure SQL Transparent Data Encryption with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, SQL, TDE, Encryption, OpenTofu, Security, Compliance

Description: Learn how to configure Azure SQL Transparent Data Encryption (TDE) with customer-managed keys using OpenTofu for database-at-rest encryption and compliance.

## Overview

Transparent Data Encryption (TDE) protects Azure SQL databases, managed instances, and data warehouses by encrypting data at rest. While TDE is enabled by default with service-managed keys, you can use customer-managed keys (CMK) stored in Azure Key Vault for greater control.

## Step 1: Create Key Vault for TDE Key

```hcl
# main.tf - Key Vault for TDE customer-managed key

data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "tde_kv" {
  name                        = "my-sql-tde-kv"
  location                    = azurerm_resource_group.rg.location
  resource_group_name         = azurerm_resource_group.rg.name
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  sku_name                    = "premium"  # Premium required for HSM-protected keys

  # Required for TDE CMK
  soft_delete_retention_days = 90
  purge_protection_enabled   = true
}

# Allow the current principal to create the TDE key
resource "azurerm_key_vault_access_policy" "current_user" {
  key_vault_id = azurerm_key_vault.tde_kv.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  key_permissions = [
    "Create",
    "Delete",
    "Get",
    "GetRotationPolicy",
    "Purge",
    "Recover",
    "Update",
  ]
}
```

## Step 2: Create SQL Server with System-Assigned Identity

```hcl
# SQL Server with managed identity for Key Vault access
resource "azurerm_mssql_server" "server" {
  name                         = "my-tde-sql-server"
  resource_group_name          = azurerm_resource_group.rg.name
  location                     = azurerm_resource_group.rg.location
  version                      = "12.0"
  administrator_login          = "sqladmin"
  administrator_login_password = var.sql_admin_password

  # System-assigned identity for Key Vault authentication
  identity {
    type = "SystemAssigned"
  }

  # Avoid drift when the TDE protector is managed separately
  lifecycle {
    ignore_changes = [transparent_data_encryption_key_vault_key_id]
  }
}

# Grant the SQL Server identity access to the Key Vault
resource "azurerm_key_vault_access_policy" "sql_tde_policy" {
  key_vault_id = azurerm_key_vault.tde_kv.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_mssql_server.server.identity[0].principal_id

  key_permissions = [
    "Get",
    "WrapKey",
    "UnwrapKey",
  ]
}
```

## Step 3: Create the TDE Key in Key Vault

```hcl
# RSA key for TDE encryption
resource "azurerm_key_vault_key" "tde_key" {
  name         = "sql-tde-key"
  key_vault_id = azurerm_key_vault.tde_kv.id
  key_type     = "RSA"
  key_size     = 2048

  key_opts = [
    "unwrapKey",
    "wrapKey",
  ]

  depends_on = [
    azurerm_key_vault_access_policy.current_user,
    azurerm_key_vault_access_policy.sql_tde_policy,
  ]
}
```

## Step 4: Configure TDE with CMK

```hcl
# Set the TDE protector to use the customer-managed key
resource "azurerm_mssql_server_transparent_data_encryption" "tde" {
  server_id        = azurerm_mssql_server.server.id
  key_vault_key_id = azurerm_key_vault_key.tde_key.id

  # Use CMK from Key Vault (not service-managed key)
  auto_rotation_enabled = true  # Automatically rotate to newer key versions
}
```

## Step 5: Create Database Protected by TDE

```hcl
# Databases on the server inherit the server-level TDE protector
resource "azurerm_mssql_database" "protected_db" {
  name                                = "protecteddb"
  server_id                           = azurerm_mssql_server.server.id
  sku_name                            = "S1"
  transparent_data_encryption_enabled = true
}
```

## Step 6: Outputs

```hcl
output "tde_key_id" {
  value       = azurerm_key_vault_key.tde_key.id
  description = "Key Vault key used for TDE"
}

output "sql_server_identity" {
  value       = azurerm_mssql_server.server.identity[0].principal_id
  description = "SQL Server managed identity for Key Vault access"
}
```

## Summary

Azure SQL TDE with customer-managed keys, configured via OpenTofu, provides encryption-at-rest with full key lifecycle control. The CMK approach meets regulatory requirements where customers must own and control their encryption keys, with Key Vault's purge protection ensuring keys cannot be accidentally deleted.
