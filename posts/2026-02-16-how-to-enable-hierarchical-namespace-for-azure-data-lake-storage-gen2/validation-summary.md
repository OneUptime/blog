# Validation Summary: How to Enable Hierarchical Namespace for Azure Data Lake Storage Gen2

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Data Lake Storage Gen2
- Azure Blob Storage
- Hierarchical namespace (HNS)
- Azure CLI
- Azure PowerShell
- ARM templates
- Terraform AzureRM provider
- Azure Storage Data Lake SDK for Python
- ABFS / Hadoop-compatible access

## Sources Consulted
- Microsoft Learn: Azure Data Lake Storage hierarchical namespace: https://learn.microsoft.com/en-us/azure/storage/blobs/data-lake-storage-namespace
- Microsoft Learn: Create a storage account to use with Azure Data Lake Storage: https://learn.microsoft.com/en-us/azure/storage/blobs/create-data-lake-storage-account
- Microsoft Learn: Create an Azure storage account: https://learn.microsoft.com/en-us/azure/storage/common/storage-account-create
- Microsoft Learn: Upgrade Azure Blob Storage with Azure Data Lake Storage capabilities: https://learn.microsoft.com/en-us/azure/storage/blobs/upgrade-to-data-lake-storage-gen2-how-to
- Microsoft Learn: Blob Storage feature support in Azure storage accounts: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-feature-support-in-storage-accounts
- Microsoft Learn: az storage account hns-migration: https://learn.microsoft.com/en-us/cli/azure/storage/account/hns-migration
- Microsoft Learn: az storage fs directory: https://learn.microsoft.com/en-us/cli/azure/storage/fs/directory
- Microsoft Learn: az storage fs file: https://learn.microsoft.com/en-us/cli/azure/storage/fs/file
- Microsoft Learn: Use Python to manage data in Azure Data Lake Storage: https://learn.microsoft.com/en-us/azure/storage/blobs/data-lake-storage-directory-file-acl-python
- HashiCorp Terraform Registry: azurerm_storage_account: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account

## Issues Found
- The post said existing accounts could not enable hierarchical namespace except for one exception. Microsoft now documents a one-way upgrade process for existing accounts, so I changed the wording to state that creation is the simplest time and existing accounts can be upgraded through migration.
- The flat namespace explanation overstated listing behavior as scanning all blobs in the container. I changed it to describe prefix-based directory-like listing, which is more accurate for Blob Storage.
- The migration prerequisites were incomplete and included an SFTP/NFS note that is not useful for an account that has not yet enabled HNS. I updated the list to include page blobs, unsupported features such as custom domains/object replication/change feed, upgrade-blocked features such as soft delete/encryption scopes/immutable storage, and stopping write activity during upgrade.
- The Python `rename_directory` example passed `raw-data/2026/feb-processed` as the new name. The SDK requires the destination in `{filesystem}/{path}` format, so I changed it to `analytics/raw-data/2026/feb-processed`.
- The compatibility section suggested using directory-level snapshots as a replacement for blob snapshots. Microsoft documentation lists blob snapshots as unsupported with HNS and does not document directory-level snapshots as the replacement, so I removed that parenthetical.
- The compatibility section only mentioned container soft delete. Blob soft delete is also supported with HNS, so I updated the supported-feature wording.
- The SKU section described `Premium_LRS` generically as premium SSD-backed storage. I changed it to premium block blob storage, matching the account type Microsoft documents as HNS-capable.

## Review Notes
The Azure CLI was not installed in the local workspace, so CLI syntax was verified against Microsoft Learn reference pages rather than local `az --help` output. The reviewed commands and snippets match the current documented command groups and SDK method signatures.
