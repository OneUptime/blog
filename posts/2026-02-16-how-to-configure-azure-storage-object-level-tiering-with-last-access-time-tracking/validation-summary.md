# Validation Summary: How to Configure Azure Storage Object-Level Tiering

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Blob Storage
- Azure Blob Storage access tiers
- Azure Blob Storage lifecycle management policies
- Azure CLI
- Azure Monitor metrics
- Azure Storage SDK for Python

## Sources Consulted
- Microsoft Learn: Azure Blob Storage lifecycle management policy structure - https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-structure
- Microsoft Learn: Lifecycle management policies that transition blobs between tiers - https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-access-tiers
- Microsoft Learn: Azure Blob Storage lifecycle management overview - https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview
- Microsoft Learn: Access tiers for blob data - https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview
- Microsoft Learn: Rehydrate an archived blob to an online tier - https://learn.microsoft.com/en-us/azure/storage/blobs/archive-rehydrate-to-online-tier
- Microsoft Learn: az storage account blob-service-properties - https://learn.microsoft.com/en-us/cli/azure/storage/account/blob-service-properties
- Microsoft Learn: az storage account management-policy - https://learn.microsoft.com/en-us/cli/azure/storage/account/management-policy
- Microsoft Learn: Supported metrics for Microsoft.Storage/storageAccounts/blobServices - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-storage-storageaccounts-blobservices-metrics
- Microsoft Learn: az monitor metrics - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics
- Microsoft Learn: Set or change a block blob's access tier with Python - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-use-access-tier-python

## Issues Found
- Corrected last access time semantics. The post said only reads update the timestamp and listed GetBlobProperties as an updating read operation. Microsoft documentation says LastAccessTime is updated by access operations such as Get Blob and Put Blob, while Get Blob Properties, Get Blob Metadata, and Get Blob Tags do not update it.
- Corrected the 24-hour update behavior. The post said later reads within 24 hours may or may not update the timestamp; Microsoft documentation says subsequent reads in the same 24-hour period do not update it.
- Added the lifecycle-policy behavior for blobs with an empty LastAccessTime. Microsoft documentation says policies using daysAfterLastAccessTimeGreaterThan fall back to the date when last access tracking was enabled when LastAccessTime is null.
- Added daysAfterLastTierChangeGreaterThan to archive lifecycle actions. Microsoft documentation warns that rehydrating a blob does not update last modified or last access time, so archive actions should include this condition to avoid re-archiving recently rehydrated blobs.
- Clarified enableAutoTierToHotFromCool behavior. It applies to blobs tiered down by that rule, has no effect on blobs already in Cool before enabling the rule, and automatic Cool-to-Hot tiering is limited to once every 30 days.
- Corrected Python SDK enum names from StandardBlobTier.Cool and StandardBlobTier.Archive to StandardBlobTier.COOL and StandardBlobTier.ARCHIVE, matching current Microsoft Python SDK documentation.
- Corrected early deletion fee wording. Reading a blob does not itself trigger early deletion fees; deleting, overwriting, or moving the blob to another tier before the minimum duration can trigger the charge.
- Corrected archive rehydration wording. Archived blobs can be rehydrated to Hot, Cool, or Cold, and high-priority rehydration may complete in less than one hour for objects under 10 GB.

## Review Notes
Azure CLI was not installed in the local workspace, so CLI syntax was verified against official Microsoft CLI documentation instead of local `az --help` output. The lifecycle policy JSON snippets were parsed successfully, and the Python snippet was checked for syntax.
