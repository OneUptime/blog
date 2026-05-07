# How to Configure Azure Storage Shared Access Signatures with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Storage, SAS, OpenTofu, Security, Access Control

Description: Learn how to generate and configure Azure Storage Shared Access Signatures (SAS) with OpenTofu to grant limited, time-bound access to storage resources.

## Overview

Shared Access Signatures (SAS) provide delegated access to Azure Storage resources without sharing account keys. You can restrict SAS tokens by time, IP address, protocol, and specific permissions. OpenTofu's `data` sources can generate SAS tokens for use in application configurations.

## Step 1: Create the Storage Account

```hcl
# main.tf - Base storage account

resource "azurerm_storage_account" "storage" {
  name                     = "mysasstorage"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_storage_container" "uploads" {
  name                  = "uploads"
  storage_account_id    = azurerm_storage_account.storage.id
  container_access_type = "private"
}
```

## Step 2: Generate an Account-Level SAS Token

```hcl
# Generate a SAS token for the entire storage account
data "azurerm_storage_account_sas" "account_sas" {
  connection_string = azurerm_storage_account.storage.primary_connection_string
  https_only        = true

  # Restrict to the blob service only
  services {
    blob  = true
    queue = false
    table = false
    file  = false
  }

  # Allow operations at the container and object levels
  resource_types {
    service   = false
    container = true
    object    = true
  }

  # Time-bounded access window
  start  = "2026-01-01T00:00:00Z"
  expiry = "2026-12-31T23:59:59Z"

  permissions {
    read    = true
    write   = true
    delete  = false  # Deny delete operations
    list    = true
    add     = true
    create  = true
    update  = false
    process = false
    tag     = false
    filter  = false
  }

  # Restrict to a specific IP address range
  ip_addresses = "203.0.113.10-203.0.113.20"
}
```

## Step 3: Generate a Container-Level SAS Token

```hcl
# Blob container SAS for a single container
data "azurerm_storage_account_blob_container_sas" "container_sas" {
  connection_string = azurerm_storage_account.storage.primary_connection_string
  container_name    = azurerm_storage_container.uploads.name
  https_only        = true

  # Short expiry for upload SAS tokens
  start  = timestamp()
  expiry = timeadd(timestamp(), "1h")  # Valid for 1 hour

  permissions {
    read        = false
    add         = true
    create      = true
    write       = true
    delete      = false
    list        = false
    tags        = false
    move        = false
    execute     = false
    ownership   = false
    permissions = false
  }
}
```

## Step 4: Store SAS Token in Key Vault

```hcl
# Store the generated SAS token in Key Vault for secure consumption
resource "azurerm_key_vault_secret" "upload_sas" {
  name         = "upload-sas-token"
  value        = data.azurerm_storage_account_blob_container_sas.container_sas.sas
  key_vault_id = azurerm_key_vault.kv.id

  # Expire the secret on the same one-hour schedule as the SAS token
  expiration_date = timeadd(timestamp(), "1h")

  tags = {
    purpose = "blob-upload-access"
  }
}
```

## Step 5: Outputs

```hcl
output "sas_url" {
  value       = "${azurerm_storage_account.storage.primary_blob_endpoint}${azurerm_storage_container.uploads.name}${data.azurerm_storage_account_blob_container_sas.container_sas.sas}"
  sensitive   = true
  description = "Full SAS URL for the uploads container"
}
```

## Summary

SAS tokens generated via OpenTofu enable automated, time-limited access to Azure Storage without exposing account keys. Store generated tokens in Key Vault and use short expiry windows with minimal permissions to follow the principle of least privilege.
