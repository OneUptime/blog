# How to Create Azure Data Lake Storage Gen2 with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Data Lake, Storage, OpenTofu, Analytics, Big Data

Description: Learn how to create and configure Azure Data Lake Storage Gen2 with OpenTofu, including hierarchical namespaces, ACLs, and filesystem containers.

## Overview

Azure Data Lake Storage Gen2 (ADLS Gen2) combines the capabilities of Azure Blob Storage with a hierarchical filesystem, making it ideal for big data analytics workloads. It's built on top of a standard Azure Storage account with the hierarchical namespace (HNS) feature enabled.

## Step 1: Create the Storage Account with HNS

```hcl
# main.tf - ADLS Gen2 requires hierarchical namespace to be enabled

resource "azurerm_storage_account" "adls" {
  name                     = "myadlsgen2storage"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"

  # Enabling HNS transforms the account into ADLS Gen2
  is_hns_enabled = true

  # SFTP access is available on ADLS Gen2 accounts
  sftp_enabled = false

  # NFS 3.0 protocol support for Linux workloads
  nfsv3_enabled = false
}
```

## Step 2: Create Filesystem Containers

In ADLS Gen2, containers are called "filesystems" and support directory hierarchies.

```hcl
# Create a filesystem (top-level container in ADLS Gen2)
resource "azurerm_storage_data_lake_gen2_filesystem" "raw_data" {
  name               = "raw-data"
  storage_account_id = azurerm_storage_account.adls.id

  # Set default ACLs on the filesystem root for new files and directories
  ace {
    scope       = "default"
    type        = "user"
    permissions = "rwx"
  }

  ace {
    scope       = "default"
    type        = "group"
    permissions = "r-x"
  }

  ace {
    scope       = "default"
    type        = "other"
    permissions = "---"
  }
}

resource "azurerm_storage_data_lake_gen2_filesystem" "processed_data" {
  name               = "processed-data"
  storage_account_id = azurerm_storage_account.adls.id
}

resource "azurerm_storage_data_lake_gen2_filesystem" "curated_data" {
  name               = "curated-data"
  storage_account_id = azurerm_storage_account.adls.id
}
```

## Step 3: Create Directory Paths

```hcl
# Create a directory within the filesystem
resource "azurerm_storage_data_lake_gen2_path" "year_dir" {
  path               = "2026/01"
  filesystem_name    = azurerm_storage_data_lake_gen2_filesystem.raw_data.name
  storage_account_id = azurerm_storage_account.adls.id
  resource           = "directory"

  # Grant a specific service principal access to this directory
  ace {
    scope       = "access"
    type        = "user"
    id          = var.service_principal_object_id
    permissions = "rwx"
  }
}
```

## Step 4: Role Assignments for Analytics Services

```hcl
# Grant Azure Synapse or Databricks access to the Data Lake
resource "azurerm_role_assignment" "synapse_contributor" {
  scope                = azurerm_storage_account.adls.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = var.synapse_managed_identity_object_id
}

# Grant read-only access to a reporting service
resource "azurerm_role_assignment" "report_reader" {
  scope                = "${azurerm_storage_account.adls.id}/blobServices/default/containers/curated-data"
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = var.reporting_service_principal_id
}
```

## Step 5: Outputs

```hcl
output "adls_primary_dfs_endpoint" {
  value       = azurerm_storage_account.adls.primary_dfs_endpoint
  description = "DFS endpoint for ADLS Gen2 access (used by Spark, Databricks, Synapse)"
}

output "filesystem_names" {
  value = [
    azurerm_storage_data_lake_gen2_filesystem.raw_data.name,
    azurerm_storage_data_lake_gen2_filesystem.processed_data.name,
    azurerm_storage_data_lake_gen2_filesystem.curated_data.name,
  ]
}
```

## Summary

Azure Data Lake Storage Gen2 with OpenTofu enables scalable analytics storage with a hierarchical namespace, POSIX-compatible ACLs, and native integration with Azure analytics services like Synapse Analytics and Azure Databricks. The layered filesystem approach (raw → processed → curated) is a standard pattern for data lakehouse architectures.
