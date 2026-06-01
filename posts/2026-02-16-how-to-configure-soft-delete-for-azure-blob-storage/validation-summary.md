# Validation Summary: How to Configure Soft Delete for Azure Blob Storage and Recover Deleted Blobs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Blob Storage
- Azure Storage soft delete for blobs and containers
- Azure CLI
- Azure Bicep / ARM storage account blob service properties
- Azure Storage Blob SDK for Python
- Azure Storage Blob SDK for .NET

## Sources Consulted
- Microsoft Learn: Soft delete for blobs - Azure Storage: https://learn.microsoft.com/en-us/azure/storage/blobs/soft-delete-blob-overview
- Microsoft Learn: Manage and restore soft-deleted blobs - Azure Storage: https://learn.microsoft.com/en-us/azure/storage/blobs/soft-delete-blob-manage
- Microsoft Learn: Manage blob containers using Azure CLI: https://learn.microsoft.com/en-us/azure/storage/blobs/blob-containers-cli
- Microsoft Learn: Azure CLI `az storage blob service-properties delete-policy`: https://learn.microsoft.com/en-us/cli/azure/storage/blob/service-properties/delete-policy
- Microsoft Learn: Azure CLI `az storage account blob-service-properties`: https://learn.microsoft.com/en-us/cli/azure/storage/account/blob-service-properties
- Microsoft Learn: Azure CLI `az storage container`: https://learn.microsoft.com/en-us/cli/azure/storage/container
- Microsoft Learn: Bicep resource reference for `Microsoft.Storage/storageAccounts/blobServices`: https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/2023-05-01/storageaccounts/blobservices
- Microsoft Learn: Python `azure.storage.blob.BlobClient` reference: https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob.blobclient
- Microsoft Learn: Python `azure.storage.blob.ContainerClient` reference: https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob.containerclient
- Microsoft Learn: .NET `BlobBaseClient.UndeleteAsync` reference: https://learn.microsoft.com/en-us/dotnet/api/azure.storage.blobs.specialized.blobbaseclient.undeleteasync

## Issues Found
- Corrected the opening claim that a deleted blob is gone permanently without soft delete. Other Azure recovery features, such as versioning, can also preserve recoverable data, so the post now says "without soft delete, versioning, or another recovery feature."
- Clarified how blob soft delete handles overwrites. Azure creates soft-deleted snapshots for overwrites only when blob versioning is not enabled. When versioning is enabled, Azure creates previous versions instead.
- Updated the overwrite recovery section to make clear that the snapshot-based recovery example applies when blob versioning is not enabled, and added a note that versioned accounts should restore by copying the previous version back to the base blob.
- Fixed the "Soft Delete vs. Versioning" explanation. The post no longer says that deleting a blob with both features enabled creates a soft-deleted previous version; Azure makes the current version a previous version, while soft delete protects versions that are explicitly deleted.

## Review Notes
The Azure CLI command group used for blob soft delete is still documented as GA, and the container soft delete command, Bicep property names, Python SDK methods, and .NET undelete API matched the official references consulted. The local environment did not have Azure CLI installed, so CLI checks were performed against Microsoft Learn command reference instead of local `az --help` output.
