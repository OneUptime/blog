# Validation Summary: How to Rehydrate an Archived Blob in Azure Blob Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Blob Storage
- Azure Blob Storage Archive, Hot, Cool, and Cold access tiers
- Azure CLI
- Azure Storage Blob SDK for Python
- Azure Event Grid

## Sources Consulted
- Microsoft Learn: Rehydrate an archived blob to an online tier - https://learn.microsoft.com/en-us/azure/storage/blobs/archive-rehydrate-to-online-tier
- Microsoft Learn: Access tiers for blob data - https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview
- Microsoft Learn: Set Blob Tier REST API - https://learn.microsoft.com/en-us/rest/api/storageservices/set-blob-tier
- Microsoft Learn: Azure CLI `az storage blob` reference - https://learn.microsoft.com/en-us/cli/azure/storage/blob?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az storage blob copy` reference - https://learn.microsoft.com/en-us/cli/azure/storage/blob/copy?view=azure-cli-latest
- Microsoft Learn: Set or change a blob's access tier with Python - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-use-access-tier-python
- Microsoft Learn: Azure Blob Storage as Event Grid source - https://learn.microsoft.com/en-us/azure/event-grid/event-schema-blob-storage

## Issues Found
- The post said rehydration can take "up to 15 hours" generally. Updated this to "several hours" in the introduction and clarified later that the 15-hour guidance applies to standard-priority operations, particularly for objects under 10 GB.
- The Azure CLI monitoring query used `properties.archiveStatus` and `properties.rehydratePriority`. Updated it to use `properties.rehydrationStatus` and `rehydratePriority`, matching the current Azure CLI documentation.
- The status list omitted Cold-tier rehydration. Added `rehydrate-pending-to-cold`.
- The post said an in-progress `Set Blob Tier` rehydration can be canceled by setting the tier back to Archive. Replaced that with the supported behavior: Standard-priority pending rehydration can be changed to High priority by calling `set-tier` again with the same target tier, but High cannot be lowered to Standard.
- The cost guidance suggested copying specific sections as a possible way to avoid rehydrating the entire blob. Replaced this with accurate guidance about using copy operations when preserving the archived source is desirable.
- The timing guidance did not mention that bulk rehydration in the same account can take longer. Added that caveat.

## Review Notes
The Azure CLI examples omit explicit authentication flags such as `--auth-mode login`, account key, SAS token, or connection string. This is acceptable for short examples because Azure CLI supports multiple authentication mechanisms, but production documentation could be improved by showing a concrete authentication mode consistently.
