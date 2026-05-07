# How to Configure Azure Storage Lifecycle Management with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Storage, OpenTofu, Lifecycle, Cost Optimization, Infrastructure

Description: Learn how to configure Azure Storage lifecycle management policies with OpenTofu to automatically tier and delete blobs based on age and access patterns.

## Overview

Azure Storage lifecycle management lets you automatically transition blobs between access tiers (Hot, Cool, Archive) or delete them after a specified number of days. This reduces storage costs without manual intervention.

## Step 1: Storage Account Setup

```hcl
# main.tf - Storage account with lifecycle management support

resource "azurerm_storage_account" "storage" {
  name                     = "mylifecyclestorage"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  # GRS enables geo-redundancy and supports the archive-tier actions used below
  account_replication_type = "GRS"
  access_tier              = "Hot"
}
```

## Step 2: Define Lifecycle Management Policy

The lifecycle policy applies rules based on blob age, container-qualified prefixes, or tags.

```hcl
# Lifecycle management policy with multiple rules
resource "azurerm_storage_management_policy" "lifecycle" {
  storage_account_id = azurerm_storage_account.storage.id

  rule {
    name    = "archive-old-logs"
    enabled = true

    filters {
      # Prefix filters must start with a container name; "logs/" matches blobs in the "logs" container
      prefix_match = ["logs/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        # Move to Cool tier after 30 days without modification
        tier_to_cool_after_days_since_modification_greater_than    = 30
        # Move to Archive tier after 90 days without modification
        tier_to_archive_after_days_since_modification_greater_than = 90
        # Permanently delete after 365 days without modification
        delete_after_days_since_modification_greater_than          = 365
      }

      # Also manage snapshot retention
      snapshot {
        delete_after_days_since_creation_greater_than = 30
      }
    }
  }

  rule {
    name    = "expire-temp-files"
    enabled = true

    filters {
      # "temp/" matches blobs in the "temp" container
      prefix_match = ["temp/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        # Delete temporary files after 7 days
        delete_after_days_since_modification_greater_than = 7
      }
    }
  }
}
```

## Step 3: Tiering Based on Last Access Time

Enable last access time tracking for access-based tiering:

```hcl
resource "azurerm_storage_account" "storage_with_lat" {
  name                     = "mystoragewithlat"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  blob_properties {
    # Required for last-access-time based lifecycle rules
    last_access_time_enabled = true
  }
}

resource "azurerm_storage_management_policy" "lat_lifecycle" {
  storage_account_id = azurerm_storage_account.storage_with_lat.id

  rule {
    name    = "cool-after-inactivity"
    enabled = true

    filters {
      blob_types = ["blockBlob"]
    }

    actions {
      base_blob {
        # Move to Cool if not accessed for 30 days
        tier_to_cool_after_days_since_last_access_time_greater_than = 30
        # Archive if not accessed for 180 days
        tier_to_archive_after_days_since_last_access_time_greater_than = 180
      }
    }
  }
}
```

## Step 4: Outputs

```hcl
output "policy_id" {
  value       = azurerm_storage_management_policy.lifecycle.id
  description = "The lifecycle management policy ID"
}
```

## Summary

Azure Storage lifecycle management policies automated through OpenTofu help reduce storage costs by moving infrequently accessed data to cheaper tiers and deleting obsolete data. The combination of time-since-modification and last-access-time rules gives fine-grained control over your data lifecycle.
