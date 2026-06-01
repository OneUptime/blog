# Validation Summary: How to Move Data Between Azure Blob Storage Access Tiers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Blob Storage access tiers
- Azure CLI
- Azure Blob Storage lifecycle management policies
- Azure Storage Blob Python SDK
- Azure Storage Blob .NET SDK

## Sources Consulted
- Microsoft Learn: Access tiers for blob data - https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview
- Microsoft Learn: Set a blob's access tier - https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-online-manage
- Microsoft Learn: Azure Blob Storage lifecycle management policy structure - https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-structure
- Microsoft Learn: Set Blob Tier REST API - https://learn.microsoft.com/en-us/rest/api/storageservices/set-blob-tier
- Microsoft Learn: Azure CLI `az storage blob` reference - https://learn.microsoft.com/en-us/cli/azure/storage/blob
- Microsoft Learn: Azure CLI `az storage account blob-service-properties` reference - https://learn.microsoft.com/en-us/cli/azure/storage/account/blob-service-properties
- Microsoft Learn: Azure CLI `az storage account management-policy` reference - https://learn.microsoft.com/en-us/cli/azure/storage/account/management-policy
- Microsoft Learn: Set or change a blob's access tier with Python - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-use-access-tier-python
- Microsoft Learn: Azure.Storage.Blobs BlobClient .NET API - https://learn.microsoft.com/en-us/dotnet/api/azure.storage.blobs.blobclient

## Issues Found
- The Azure CLI bulk tiering example used `az storage blob set-tier --name "logs/2024/"`, which would target a single blob named `logs/2024/` rather than all blobs under that prefix. I changed the example to list blobs by prefix and pipe each blob name into `az storage blob set-tier`.
- The early deletion section stated the Cool, Cold, and Archive minimum durations without account-type qualification. I clarified that Cool and Cold minimum retention durations apply to general-purpose v2 accounts, while Blob Storage accounts have no Cool or Cold minimum storage duration.
- The tier transition cost section said every tier change incurs a write operation charge at the destination tier's rate. I corrected this to distinguish cooler-tier moves from warmer-tier moves, which are billed as reads from the source tier plus writes to the destination tier.

## Review Notes
The local environment did not have Azure CLI installed, so CLI validation was performed against Microsoft Learn Azure CLI reference documentation instead of local `az --help` output. The Python and C# SDK examples use current documented methods for setting blob access tiers.
