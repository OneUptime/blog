# How to Import Azure Storage Accounts into OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Azure, Storage Account, Blob Storage, Import

Description: Learn how to import existing Azure Storage Accounts, blob containers, and queues into OpenTofu state management.

## Introduction

Azure Storage Accounts are foundational resources used for blob storage, queues, tables, and file shares. Importing them into OpenTofu lets you manage account-level configuration (replication, encryption, network rules) as code.

## Step 1: Get Storage Account Details

```bash
RG="my-app-rg"
STORAGE="myappstorageacct"

az storage account show \
  --resource-group $RG \
  --name $STORAGE \
  --output json | jq '{
    kind: .kind,
    sku: .sku.name,
    access_tier: .accessTier,
    https_traffic_only_enabled: .enableHttpsTrafficOnly,
    min_tls_version: .minimumTlsVersion,
    network_acls: .networkRuleSet
  }'

# List blob containers

az storage container list --account-name $STORAGE --auth-mode login --output table

# Get blob service properties
az storage account blob-service-properties show \
  --account-name $STORAGE --resource-group $RG
```

## Step 2: Write Matching HCL

```hcl
resource "azurerm_storage_account" "app" {
  name                     = "myappstorageacct"
  resource_group_name      = azurerm_resource_group.app.name
  location                 = azurerm_resource_group.app.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"
  access_tier              = "Hot"

  # Security settings
  https_traffic_only_enabled      = true
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false

  blob_properties {
    versioning_enabled = true
    delete_retention_policy {
      days = 7
    }
    container_delete_retention_policy {
      days = 7
    }
  }

  network_rules {
    default_action = "Deny"
    ip_rules       = var.allowed_ip_ranges
    bypass         = ["AzureServices"]
  }

  tags = { Environment = "prod", ManagedBy = "OpenTofu" }
}

# Import blob containers
resource "azurerm_storage_container" "app_data" {
  name                  = "app-data"
  storage_account_id    = azurerm_storage_account.app.id
  container_access_type = "private"
}

resource "azurerm_storage_container" "backups" {
  name                  = "backups"
  storage_account_id    = azurerm_storage_account.app.id
  container_access_type = "private"
}
```

## Import Blocks

```hcl
# import.tf
import {
  to = azurerm_storage_account.app
  id = "/subscriptions/SUBSCRIPTION_ID/resourceGroups/my-app-rg/providers/Microsoft.Storage/storageAccounts/myappstorageacct"
}

# Storage containers use the Resource Manager ID
import {
  to = azurerm_storage_container.app_data
  id = "/subscriptions/SUBSCRIPTION_ID/resourceGroups/my-app-rg/providers/Microsoft.Storage/storageAccounts/myappstorageacct/blobServices/default/containers/app-data"
}

import {
  to = azurerm_storage_container.backups
  id = "/subscriptions/SUBSCRIPTION_ID/resourceGroups/my-app-rg/providers/Microsoft.Storage/storageAccounts/myappstorageacct/blobServices/default/containers/backups"
}
```

## Importing Storage Queues

```hcl
resource "azurerm_storage_queue" "jobs" {
  name                 = "job-queue"
  storage_account_id   = azurerm_storage_account.app.id
}

import {
  to = azurerm_storage_queue.jobs
  id = "/subscriptions/SUBSCRIPTION_ID/resourceGroups/my-app-rg/providers/Microsoft.Storage/storageAccounts/myappstorageacct/queueServices/default/queues/job-queue"
}
```

## Handling Lifecycle Management Policies

```hcl
resource "azurerm_storage_management_policy" "app" {
  storage_account_id = azurerm_storage_account.app.id

  rule {
    name    = "archive-old-blobs"
    enabled = true

    filters {
      blob_types   = ["blockBlob"]
      prefix_match = ["archive/"]
    }

    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than    = 30
        tier_to_archive_after_days_since_modification_greater_than = 90
        delete_after_days_since_modification_greater_than          = 365
      }
    }
  }
}
```

## Conclusion

Azure Storage Account import uses the full ARM resource ID for the account. When you model containers and queues with `storage_account_id`, import those child resources with their full Resource Manager IDs as well. The `network_rules` block is particularly important to get right - a misconfigured network rule can block access to the storage account after the first apply. Always test with a refresh-only plan before applying changes after import.
