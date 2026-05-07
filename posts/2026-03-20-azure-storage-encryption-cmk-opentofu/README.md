# How to Set Up Azure Storage Encryption with Customer-Managed Keys in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Storage, Encryption, OpenTofu, Key Vault, Security, CMK

Description: Learn how to configure Azure Storage encryption with customer-managed keys (CMK) stored in Azure Key Vault using OpenTofu for enhanced data security and compliance.

## Overview

By default, Azure Storage encrypts data with Microsoft-managed keys. For regulatory compliance or enhanced control, you can use Customer-Managed Keys (CMK) stored in Azure Key Vault. This gives you full control over the encryption key lifecycle.

## Step 1: Create Azure Key Vault

```hcl
# main.tf - Key Vault for storing the customer-managed key

data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "kv" {
  name                        = "my-storage-cmk-kv"
  location                    = azurerm_resource_group.rg.location
  resource_group_name         = azurerm_resource_group.rg.name
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  sku_name                    = "standard"

  # Soft delete and purge protection are required for CMK with storage
  soft_delete_retention_days  = 90
  purge_protection_enabled    = true
}

# Grant the identity running OpenTofu permission to create and manage the key
resource "azurerm_key_vault_access_policy" "current_user" {
  key_vault_id = azurerm_key_vault.kv.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  key_permissions = [
    "Create",
    "Delete",
    "Get",
    "GetRotationPolicy",
    "Purge",
    "Recover",
    "SetRotationPolicy",
    "Update",
  ]
}
```

## Step 2: Create the Encryption Key

```hcl
# Create an RSA key in Key Vault for storage encryption
resource "azurerm_key_vault_key" "storage_key" {
  name         = "storage-encryption-key"
  key_vault_id = azurerm_key_vault.kv.id
  key_type     = "RSA"
  key_size     = 2048

  # Supported key operations for this RSA key
  key_opts = [
    "decrypt",
    "encrypt",
    "sign",
    "unwrapKey",
    "verify",
    "wrapKey",
  ]

  # Enable key rotation with expiry
  rotation_policy {
    automatic {
      time_before_expiry = "P30D"  # Rotate 30 days before expiry
    }
    expire_after         = "P180D"  # Key expires after 180 days
    notify_before_expiry = "P29D"
  }

  depends_on = [
    azurerm_key_vault_access_policy.current_user
  ]
}
```

## Step 3: Create Storage Account with System-Assigned Identity

```hcl
# Storage account needs a managed identity to access Key Vault
resource "azurerm_storage_account" "encrypted_storage" {
  name                     = "myencryptedstorage"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  # System-assigned identity used to authenticate with Key Vault
  identity {
    type = "SystemAssigned"
  }

  lifecycle {
    ignore_changes = [
      customer_managed_key
    ]
  }
}

# Grant the storage account's identity access to the Key Vault key
resource "azurerm_key_vault_access_policy" "storage_kv_policy" {
  key_vault_id = azurerm_key_vault.kv.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_storage_account.encrypted_storage.identity[0].principal_id

  key_permissions = [
    "Get",
    "WrapKey",
    "UnwrapKey",
  ]
}
```

## Step 4: Enable CMK Encryption

```hcl
# Configure the existing storage account to use the CMK for encryption
resource "azurerm_storage_account_customer_managed_key" "cmk" {
  storage_account_id = azurerm_storage_account.encrypted_storage.id
  # Use the versionless key URI so Azure Storage can automatically use new key versions
  key_vault_key_id   = azurerm_key_vault_key.storage_key.versionless_id

  depends_on = [
    azurerm_key_vault_access_policy.storage_kv_policy
  ]
}
```

## Step 5: Outputs

```hcl
output "storage_account_id" {
  value = azurerm_storage_account.encrypted_storage.id
}

output "encryption_key_id" {
  value       = azurerm_key_vault_key.storage_key.versionless_id
  description = "Versionless Key Vault key ID used for storage encryption"
}
```

## Summary

Configuring Azure Storage with Customer-Managed Keys via OpenTofu provides full control over your encryption keys while meeting compliance requirements. The key components are: Key Vault with purge protection, Key Vault access policies for the identity running OpenTofu and the storage account identity, an RSA key with rotation policy, and a CMK binding that uses the versionless key URI for automatic key-version updates.
