# Validation Summary: How to Set Up Object Replication Between Azure Storage Accounts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Blob Storage
- Azure Storage object replication
- Azure CLI
- Azure Bicep / ARM resource provider
- Azure Storage Blob SDK for Python
- Microsoft Entra ID cross-tenant replication controls

## Sources Consulted
- Microsoft Learn: Object replication for block blobs - https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-overview
- Microsoft Learn: Configure object replication for block blobs - https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-configure
- Microsoft Learn: Azure CLI `az storage account or-policy` reference - https://learn.microsoft.com/en-us/cli/azure/storage/account/or-policy?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az storage account or-policy rule` reference - https://learn.microsoft.com/en-us/cli/azure/storage/account/or-policy/rule?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az storage account blob-service-properties update` reference - https://learn.microsoft.com/en-us/cli/azure/storage/account/blob-service-properties?view=azure-cli-latest
- Microsoft Learn: Microsoft.Storage/storageAccounts/objectReplicationPolicies Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/2023-05-01/storageaccounts/objectreplicationpolicies
- Microsoft Learn: Azure Storage Blob SDK for Python `BlobProperties` - https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob.blobproperties?view=azure-python
- Microsoft Learn: Azure Storage Blob SDK for Python `ObjectReplicationPolicy` - https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob.objectreplicationpolicy?view=azure-python

## Issues Found
- Corrected the supported storage account types from GPv2 or BlobStorage to GPv2 or premium block blob accounts, matching the current object replication documentation.
- Clarified delete behavior. A source delete removes the current version state at the destination while preserving previous versions, rather than simply deleting all destination data.
- Fixed the Azure CLI setup flow. Creating a policy on the destination account alone is not sufficient; the same policy must be associated with the source account before replication starts.
- Corrected the explanation of `--min-creation-time`. Without it, Azure replicates new block blobs added after the rule is created by default, not all existing blobs.
- Corrected the Azure Portal flow to start from the source storage account and select the destination account.
- Updated the Bicep API version and variable names, and added the required caveat that the matching source-side policy must also be associated using the same policy ID.
- Replaced the Python monitoring example with a `get_blob_properties()` example for a specific source blob, matching where object replication source properties are exposed.
- Updated the replication lag section to account for priority replication, which can provide an SLA for supported workloads when enabled.
- Corrected the multiple-destination claim and diagram to reflect Azure's current limit of two destination accounts per source account.
- Corrected the deletion instructions to remove the replication policy from both source and destination accounts.

## Review Notes
The local environment did not have the Azure CLI installed, so CLI syntax was verified against Microsoft Learn's official Azure CLI reference rather than local `az --help` output.
