# Validation Summary: How to Configure Point-in-Time Restore for Azure Blob Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Blob Storage
- Azure Storage point-in-time restore
- Azure Storage blob versioning
- Azure Storage change feed
- Azure Blob soft delete and container soft delete
- Azure CLI
- Azure Storage Blob client library for Python
- Azure Blob Storage lifecycle management policies
- Azure Monitor storage metrics

## Sources Consulted
- Microsoft Learn: Point-in-time restore for block blobs: https://learn.microsoft.com/en-us/azure/storage/blobs/point-in-time-restore-overview
- Microsoft Learn: Perform a point-in-time restore on block blob data: https://learn.microsoft.com/en-us/azure/storage/blobs/point-in-time-restore-manage
- Microsoft Learn: Azure CLI `az storage blob restore`: https://learn.microsoft.com/en-us/cli/azure/storage/blob?view=azure-cli-latest#az-storage-blob-restore
- Microsoft Learn: Azure CLI `az storage account blob-service-properties`: https://learn.microsoft.com/en-us/cli/azure/storage/account/blob-service-properties
- Microsoft Learn: Enable and manage blob versioning: https://learn.microsoft.com/en-us/azure/storage/blobs/versioning-enable
- Microsoft Learn: Soft delete for blobs: https://learn.microsoft.com/en-us/azure/storage/blobs/soft-delete-blob-overview
- Microsoft Learn: Azure Blob Storage lifecycle management policy structure: https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-structure
- Microsoft Learn: Azure Monitor supported metrics for Blob service: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-storage-storageaccounts-blobservices-metrics
- Microsoft Learn: Azure Storage Blob Python client documentation: https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob.blobserviceclient

## Issues Found
- The post configured blob soft delete retention for 14 days and then configured point-in-time restore for 30 days. Azure requires `--restore-days` to be greater than zero and less than the blob soft delete retention period. I changed the soft delete example to 31 days and explained the requirement.
- The post stated that the maximum restore window is 365 days. The Azure CLI requires restore days to be less than blob delete retention days, and blob soft delete retention is capped at 365 days. I replaced the claim with the documented relationship between restore retention and soft delete retention.
- The Azure CLI restore examples used JSON array strings for `--blob-range`. The current CLI expects two separate values for each range. I updated all restore examples to use `--blob-range start end` and repeated `--blob-range` for multiple ranges.
- The restore commands were described as asynchronous but omitted `--no-wait`. Azure CLI waits for the long-running operation by default unless `--no-wait` is passed. I added `--no-wait` to the restore examples that are followed by status monitoring.
- The status check used `az storage account show` without expanding `blobRestoreStatus`. Microsoft documentation uses `--expand blobRestoreStatus`, so I added it.
- The restore-in-progress limitation only mentioned writes. Microsoft documentation says read, write, and delete operations are blocked on blobs in the restored ranges in the primary location. I updated the limitation.
- The post said the features start tracking changes immediately. Microsoft documentation notes that the point-in-time restore retention period begins a few minutes after point-in-time restore is enabled. I adjusted that wording.

## Review Notes
- The local environment did not have Azure CLI installed, so CLI validation was performed against current Microsoft Learn CLI reference pages rather than local `az --help` output.
- The Python examples use current `azure-storage-blob` client patterns and are syntactically valid, assuming the caller provides a valid connection string and the sample container does not already exist.
