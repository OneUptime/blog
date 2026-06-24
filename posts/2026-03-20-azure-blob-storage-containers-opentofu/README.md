# How to Create Azure Blob Storage Containers with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Storage, OpenTofu, Terraform, BLOB, Infrastructure

Description: Learn how to create and configure Azure Blob Storage containers with OpenTofu, including access tiers, versioning, and container-level settings.

## Overview

Azure Blob Storage is Microsoft's object storage solution for the cloud. Using OpenTofu, you can automate the creation and configuration of storage accounts and blob containers as part of your infrastructure-as-code workflow.

## Step 1: Create a Storage Account

Before creating containers, you need a storage account to host them.

```hcl
# variables.tf - Define configurable parameters

variable "resource_group_name" {
  description = "Name of the Azure resource group"
  type        = string
  default     = "my-storage-rg"
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "eastus"
}
```

```hcl
# main.tf - Storage account definition
resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
}

resource "azurerm_storage_account" "storage" {
  name                     = "mystorageacct${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  # Required if any container should allow anonymous blob or container reads
  allow_nested_items_to_be_public = true

  # Enable blob versioning and soft delete
  blob_properties {
    versioning_enabled = true

    delete_retention_policy {
      days = 7
    }

    container_delete_retention_policy {
      days = 7
    }
  }

  tags = {
    Environment = "production"
  }
}

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}
```

## Step 2: Create Blob Containers

```hcl
# Create multiple containers with different access levels
resource "azurerm_storage_container" "public_assets" {
  name                  = "public-assets"
  storage_account_id    = azurerm_storage_account.storage.id
  # "blob" access allows anonymous read for blobs, but not container listing
  container_access_type = "blob"
}

resource "azurerm_storage_container" "private_data" {
  name                  = "private-data"
  storage_account_id    = azurerm_storage_account.storage.id
  # "private" requires authentication for all operations
  container_access_type = "private"
}

resource "azurerm_storage_container" "backups" {
  name                  = "backups"
  storage_account_id    = azurerm_storage_account.storage.id
  container_access_type = "private"
}
```

## Step 3: Create Multiple Containers with for_each

For managing multiple containers dynamically:

```hcl
# Define all containers in a map for easy management
locals {
  containers = {
    uploads = {
      access_type = "private"
    }
    thumbnails = {
      access_type = "blob"
    }
    archives = {
      access_type = "private"
    }
  }
}

# Create all containers using for_each
resource "azurerm_storage_container" "containers" {
  for_each = local.containers

  name                  = each.key
  storage_account_id    = azurerm_storage_account.storage.id
  container_access_type = each.value.access_type
}
```

## Step 4: Outputs

```hcl
# outputs.tf - Expose container URLs for downstream use
output "storage_account_name" {
  value = azurerm_storage_account.storage.name
}

output "container_urls" {
  value = {
    for name, container in azurerm_storage_container.containers :
    name => "${azurerm_storage_account.storage.primary_blob_endpoint}${name}"
  }
  description = "URLs for each blob container"
}
```

## Summary

Using OpenTofu to manage Azure Blob Storage containers gives you consistent, repeatable infrastructure. The `for_each` pattern is particularly useful when managing multiple containers with varying configurations across environments.
