# Validation Summary: How to Set Up Azure Storage Account Failover for Disaster Recovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Storage accounts
- Azure Storage redundancy options: LRS, ZRS, GRS, GZRS, RA-GRS, RA-GZRS
- Azure Storage customer-managed planned and unplanned failover
- Azure CLI
- Azure SDK for Python
- Azure Functions
- Azure Monitor alerts and metrics

## Sources Consulted
- Azure Storage redundancy: https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy
- Initiate a storage account failover: https://learn.microsoft.com/en-us/azure/storage/common/storage-initiate-account-failover
- Azure Storage disaster recovery planning and failover: https://learn.microsoft.com/en-us/azure/storage/common/storage-disaster-recovery-guidance
- Check the Last Sync Time property: https://learn.microsoft.com/en-us/azure/storage/common/last-sync-time-get
- Azure Storage failover FAQ: https://learn.microsoft.com/en-us/azure/storage/common/storage-failover-faq
- Azure CLI storage account command reference: https://learn.microsoft.com/en-us/cli/azure/storage/account?view=azure-cli-latest
- Azure Storage Blob retry policy for Python: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-retry-policy-python
- Azure Storage BlobServiceClient for Python: https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob.blobserviceclient?view=azure-python
- Azure Storage management client for Python: https://learn.microsoft.com/en-us/python/api/azure-mgmt-storage/azure.mgmt.storage.operations.storageaccountsoperations?view=azure-python
- Azure Monitor supported metrics for storage accounts: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-storage-storageaccounts-metrics

## Issues Found
- The post described all failovers as causing data loss and converting the storage account to LRS. This is accurate for unplanned customer-managed failover, but not planned failover. Updated the failover behavior section to explicitly describe unplanned failover.
- The planned failover testing command omitted `--failover-type Planned`, so it would default to unplanned failover. Added the planned failover flag and updated the surrounding explanation to state that planned failover swaps regions, expects no data loss when both regions remain available, and keeps the account geo-replicated.
- The geo-replication status command queried `geoReplicationStats.lastSyncTime` without expanding geo-replication stats. Added `--expand geoReplicationStats`, matching Azure CLI documentation.
- The Python retry example used the generic `azure.core.pipeline.policies.RetryPolicy` and implied automatic secondary retries for RA-GRS. Replaced it with `azure.storage.blob.ExponentialRetry` and `retry_to_secondary=True`, which is the Azure Storage Blob SDK option for secondary endpoint retries.
- The Python examples referenced undefined credentials or subscription values. Added `DefaultAzureCredential()` to the Blob example and read `AZURE_SUBSCRIPTION_ID` from the environment in the Azure Function example.
- The Azure Function failover example did not specify that it was initiating an unplanned failover. Added `failover_type=None` so the example matches the surrounding automation discussion about outage-driven failover and possible data loss.

## Review Notes
- Azure pricing varies by region, access tier, operations, and redundancy configuration, so the cost multipliers in the post should be treated as rough illustrative estimates rather than pricing guidance.
- Planned failover support and CLI behavior can depend on the Azure CLI version or extensions available in the environment. The current Azure CLI reference documents `--failover-type Planned`.
