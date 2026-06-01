# Validation Summary: How to Configure Azure Blob Storage Inventory Reports

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Blob Storage
- Azure Blob Storage inventory reports
- Azure CLI
- JSON inventory policy configuration
- Python and pandas
- Azure Synapse Analytics serverless SQL
- Apache Parquet and CSV

## Sources Consulted
- Microsoft Learn: Azure Storage blob inventory: https://learn.microsoft.com/en-us/azure/storage/blobs/blob-inventory
- Microsoft Learn: Azure CLI `az storage account blob-inventory-policy`: https://learn.microsoft.com/en-us/cli/azure/storage/account/blob-inventory-policy?view=azure-cli-latest
- Microsoft Learn: Blob Inventory Policies REST API schema: https://learn.microsoft.com/en-us/rest/api/storagerp/blob-inventory-policies/list?view=rest-storagerp-2025-06-01
- Microsoft Learn: Azure Blob Storage FAQ, blob inventory timing and multiple output files: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-faq
- Microsoft Learn: Azure Blob Storage access tiers: https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview

## Issues Found
- Removed `Container-Name` from blob inventory schema examples and the field list because it is not a supported blob inventory schema field. The blob `Name` field includes the container path, so the compliance example now derives the container name from `Name`.
- Added `includeDeleted: true` to the comprehensive blob inventory rule because `Deleted` and `RemainingRetentionDays` should only be included when deleted blobs are included.
- Clarified that the tags-and-versions example targets standard Blob Storage accounts without hierarchical namespace enabled, because blob inventory tag fields are only supported for non-HNS accounts.
- Added a `filters` object to the container inventory rule because inventory rule definitions require a filters object, even though only `prefixMatch` is applicable and optional for container inventory.
- Corrected the sample output path and downstream CSV/Parquet paths to match Azure's documented layout: destination container, date/time, then rule name.
- Corrected the pricing note. Blob inventory is billed by scanned blobs and containers, with additional normal storage and operation charges for generated files; it is not free apart from file storage.
- Clarified that `prefixMatch` values start with the container name.
- Corrected a cost-optimization comment that said the sample found recently accessed blobs; the code uses `Last-Modified`, so it identifies blobs not modified recently.

## Review Notes
The Azure CLI command group is currently documented as preview. The local environment did not have `az` installed, so CLI verification was performed against Microsoft Learn CLI reference instead of local `az --help` output.
