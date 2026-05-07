# How to Configure Azure Blob Storage with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Blob Storage, Storage Account, Infrastructure as Code

Description: Learn how to configure Azure Blob Storage with OpenTofu - creating storage accounts, containers, lifecycle management policies, private endpoints, and access tier optimization.

## Introduction

Azure Blob Storage stores unstructured data at scale. OpenTofu manages storage accounts, blob containers, lifecycle management policies, private endpoints for network security, and RBAC assignments - all as declarative code that can be versioned and reviewed.

## Storage Account

```hcl
resource "azurerm_storage_account" "app" {
  name                = "${var.environment}appdata"  # Globally unique, max 24 chars
  resource_group_name = azurerm_resource_group.app.name
  location            = azurerm_resource_group.app.location

  account_tier             = "Standard"
  account_replication_type = "GRS"       # LRS, GRS, RAGRS, ZRS, GZRS, RAGZRS
  account_kind             = "StorageV2" # Recommended for blobs

  # Security settings
  https_traffic_only_enabled      = true
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false  # Prevent public blob access

  # Encryption
  infrastructure_encryption_enabled = true

  blob_properties {
    versioning_enabled       = true
    change_feed_enabled      = true
    last_access_time_enabled = true  # Required only for lifecycle rules based on last access time

    delete_retention_policy {
      days = 30
    }

    container_delete_retention_policy {
      days = 7
    }
  }

  identity {
    type = "SystemAssigned"
  }

  tags = { Environment = var.environment }
}
```

## Blob Containers

```hcl
resource "azurerm_storage_container" "uploads" {
  name                  = "uploads"
  storage_account_id    = azurerm_storage_account.app.id
  container_access_type = "private"  # blob, container, or private
}

resource "azurerm_storage_container" "backups" {
  name                  = "backups"
  storage_account_id    = azurerm_storage_account.app.id
  container_access_type = "private"
}

resource "azurerm_storage_container" "assets" {
  name                  = "assets"
  storage_account_id    = azurerm_storage_account.app.id
  container_access_type = "private"  # Serve via CDN, not direct public access
}
```

## Lifecycle Management Policy

```hcl
resource "azurerm_storage_management_policy" "app" {
  storage_account_id = azurerm_storage_account.app.id

  rule {
    name    = "uploads-lifecycle"
    enabled = true

    filters {
      prefix_match = ["uploads/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        # Move to cool tier after 30 days
        tier_to_cool_after_days_since_modification_greater_than = 30
        # Move to archive tier after 90 days
        tier_to_archive_after_days_since_modification_greater_than = 90
        # Delete after 365 days
        delete_after_days_since_modification_greater_than = 365
      }

      snapshot {
        delete_after_days_since_creation_greater_than = 30
      }

      version {
        delete_after_days_since_creation = 90
      }
    }
  }

  rule {
    name    = "backups-archival"
    enabled = true

    filters {
      prefix_match = ["backups/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        tier_to_archive_after_days_since_modification_greater_than = 7
        delete_after_days_since_modification_greater_than = 2557  # 7 years
      }
    }
  }
}
```

## Private Endpoint for Blob Storage

```hcl
resource "azurerm_private_endpoint" "storage" {
  name                = "${var.environment}-storage-pe"
  resource_group_name = azurerm_resource_group.app.name
  location            = azurerm_resource_group.app.location
  subnet_id           = azurerm_subnet.private.id

  private_service_connection {
    name                           = "storage-connection"
    private_connection_resource_id = azurerm_storage_account.app.id
    subresource_names              = ["blob"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "blob-dns-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.storage.id]
  }
}

resource "azurerm_private_dns_zone" "storage" {
  name                = "privatelink.blob.core.windows.net"
  resource_group_name = azurerm_resource_group.app.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "storage" {
  name                  = "storage-dns-link"
  resource_group_name   = azurerm_resource_group.app.name
  private_dns_zone_name = azurerm_private_dns_zone.storage.name
  virtual_network_id    = azurerm_virtual_network.app.id
}

# Private endpoints do not automatically block the public endpoint.
# Use firewall rules to restrict access to the public endpoint.
# The referenced subnet must have a Microsoft.Storage service endpoint enabled.

resource "azurerm_storage_account_network_rules" "app" {
  storage_account_id = azurerm_storage_account.app.id

  default_action             = "Deny"
  bypass                     = ["AzureServices", "Logging", "Metrics"]
  virtual_network_subnet_ids = [azurerm_subnet.private.id]
}
```

## RBAC Access Control

```hcl
# Grant application managed identity access to read blobs
resource "azurerm_role_assignment" "app_blob_reader" {
  scope                = azurerm_storage_container.assets.resource_manager_id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

# Grant application managed identity write access to uploads container
resource "azurerm_role_assignment" "app_blob_contributor" {
  scope                = azurerm_storage_container.uploads.resource_manager_id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}
```

## Outputs

```hcl
output "storage_account_name" {
  value = azurerm_storage_account.app.name
}

output "primary_blob_endpoint" {
  value = azurerm_storage_account.app.primary_blob_endpoint
}

output "private_endpoint_ip" {
  value = azurerm_private_endpoint.storage.private_service_connection[0].private_ip_address
}
```

## Conclusion

Azure Blob Storage with OpenTofu should typically set `allow_nested_items_to_be_public = false` and combine private endpoints with firewall rules or disabled public network access for production security. Enable `versioning_enabled = true` and `delete_retention_policy` for data protection. The lifecycle management policy automatically tiers blobs from Hot to Cool to Archive, which can reduce storage costs for cold data. Use RBAC with managed identities rather than storage account keys, because Microsoft recommends Microsoft Entra ID-based authorization over Shared Key whenever possible.
