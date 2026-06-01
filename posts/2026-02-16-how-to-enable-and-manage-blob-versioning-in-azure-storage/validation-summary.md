# Validation Summary: How to Enable and Manage Blob Versioning in Azure Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Blob Storage
- Blob versioning
- Azure Storage soft delete
- Azure CLI
- Azure PowerShell
- Bicep / Azure Resource Manager
- Azure Storage Blob SDK for Python
- Azure Blob Storage lifecycle management policies
- Azure Storage REST API

## Sources Consulted
- Microsoft Learn: Enable and manage blob versioning - https://learn.microsoft.com/en-us/azure/storage/blobs/versioning-enable
- Microsoft Learn: Blob versioning - https://learn.microsoft.com/en-us/azure/storage/blobs/versioning-overview
- Microsoft Learn: Soft delete for blobs - https://learn.microsoft.com/en-us/azure/storage/blobs/soft-delete-blob-overview
- Microsoft Learn: Manage and restore soft-deleted blobs - https://learn.microsoft.com/en-us/azure/storage/blobs/soft-delete-blob-manage
- Microsoft Learn: Azure Blob Storage lifecycle management policy structure - https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-structure
- Microsoft Learn: Lifecycle management policies that transition blobs between tiers - https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-access-tiers
- Microsoft Learn: Microsoft.Storage/storageAccounts/blobServices Bicep/ARM reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/storageaccounts/blobservices
- Microsoft Learn: Azure Storage BlobServiceClient for Python - https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob.blobserviceclient?view=azure-python
- Microsoft Learn: Azure Storage ContainerClient for Python - https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob.containerclient?view=azure-python
- Microsoft Learn: Azure Storage BlobClient for Python - https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob.blobclient?view=azure-python

## Issues Found
- Clarified the opening claim that overwrites are permanent only when data protection features such as blob versioning or soft delete are not enabled.
- Corrected the version creation explanation to state that Azure creates a version when a blob is first created and on later modifications, while deletion makes the current version a previous version and leaves no current version.
- Changed the REST query parameter example from `versionId` to the documented `versionid`.
- Added the Azure limitation that blob versioning is not supported for storage accounts with hierarchical namespace enabled.
- Corrected the cost example to avoid implying Azure always bills every full version independently; when the tier is not explicitly set, billing is based on unique blocks or pages across versions.
- Corrected the soft-delete interaction: deleting the base blob when versioning and soft delete are both enabled does not soft-delete the base blob for the retention period; deleting a specific version is what soft-deletes that version.

## Review Notes
- Azure CLI and PowerShell were not installed in the local environment, so command validation was performed against Microsoft Learn documentation rather than local `--help` output.
- The Python SDK examples use current v12-style APIs and parameter names documented by Microsoft.
