# Validation Summary: How to Set Up Geo-Redundant Storage (GRS) and Failover for Azure Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Storage
- Azure Storage redundancy: LRS, ZRS, GRS, GZRS, RA-GRS, RA-GZRS
- Azure CLI
- Azure Blob Storage Python SDK
- Azure Identity Python SDK
- Storage account failover and disaster recovery

## Sources Consulted
- Azure Storage data redundancy documentation: https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy
- Azure Storage account creation documentation: https://learn.microsoft.com/en-us/azure/storage/common/storage-account-create
- Azure Storage redundancy migration documentation: https://learn.microsoft.com/en-us/azure/storage/common/redundancy-migration
- Azure Storage account failover documentation: https://learn.microsoft.com/en-us/azure/storage/common/storage-initiate-account-failover
- Azure Storage last sync time documentation: https://learn.microsoft.com/en-us/azure/storage/common/last-sync-time-get
- Azure CLI storage account reference: https://learn.microsoft.com/en-us/cli/azure/storage/account
- Azure Storage Blob client library for Python documentation: https://learn.microsoft.com/en-us/python/api/overview/azure/storage-blob-readme
- Azure BlobServiceClient Python API reference: https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob.blobserviceclient

## Issues Found
- The Azure CLI examples that query `geoReplicationStats` omitted `--expand geoReplicationStats`. Current Azure CLI documentation says expanded properties such as `geoReplicationStats` are not included by default, so the commands were updated to include the expansion.
- The failover section described the disaster-recovery scenario as a generic failover even though the data-loss and LRS conversion behavior applies specifically to unplanned failover. The section and command were updated to explicitly use `--failover-type unplanned`.

## Review Notes
- Azure CLI was not installed in the local environment, so CLI behavior was verified against the official Microsoft Learn CLI reference and Azure Storage documentation rather than local `az --help` output.
- Current Azure documentation distinguishes planned and unplanned customer-managed failover. Planned failover avoids data loss and does not require manually reconfiguring geo-redundancy, while the post focuses on unplanned disaster-recovery failover.
