# Validation Summary: How to Troubleshoot Azure Storage Throttling and 503 Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Storage
- Azure Blob Storage
- Azure Table Storage
- Azure Queue Storage
- Azure Monitor metrics and alerts
- Azure CLI
- Azure Storage SDK for .NET
- Azure Storage SDK for Python

## Sources Consulted
- Microsoft Learn: Scalability and performance targets for standard storage accounts - https://learn.microsoft.com/en-us/azure/storage/common/scalability-targets-standard-account
- Microsoft Learn: Scalability and performance targets for Blob storage - https://learn.microsoft.com/en-us/azure/storage/blobs/scalability-targets
- Microsoft Learn: Optimize blob partitions - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-performance-blob-partitions
- Microsoft Learn: Monitoring data reference for Azure Blob Storage - https://learn.microsoft.com/en-us/azure/storage/blobs/monitor-blob-storage-reference
- Microsoft Learn: Supported metrics for Microsoft.Storage/storageAccounts/blobServices - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-storage-storageaccounts-blobservices-metrics
- Microsoft Learn: Storage Analytics log format - https://learn.microsoft.com/en-us/rest/api/storageservices/storage-analytics-log-format
- Microsoft Learn: Scalability and performance targets for Table storage - https://learn.microsoft.com/en-ie/azure/storage/tables/scalability-targets
- Microsoft Learn: Design a scalable partitioning strategy for Azure Table storage - https://learn.microsoft.com/en-us/rest/api/storageservices/designing-a-scalable-partitioning-strategy-for-azure-table-storage
- Microsoft Learn: Scalability and performance targets for Queue Storage - https://learn.microsoft.com/en-us/azure/storage/queues/scalability-targets
- Microsoft Learn: Implement a retry policy using the Azure Storage client library for .NET - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-retry-policy
- Microsoft Learn: azure.core.pipeline.policies.RetryPolicy class - https://learn.microsoft.com/en-us/python/api/azure-core/azure.core.pipeline.policies.retrypolicy
- Microsoft Learn: Azure Storage Blobs client library for Python - https://learn.microsoft.com/en-us/python/api/overview/azure/storage-blob-readme
- Microsoft Learn: az monitor metrics alert - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft Learn: Troubleshoot availability issues in Azure Storage accounts - https://learn.microsoft.com/en-us/troubleshoot/azure/azure-storage/blobs/alerts/troubleshoot-storage-availability
- Microsoft Learn: Data redundancy in Azure Storage - https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy
- Microsoft Learn: Scalability targets for premium block blob storage accounts - https://learn.microsoft.com/en-us/azure/storage/blobs/scalability-targets-premium-block-blobs

## Issues Found
- The storage account request-rate target was stated as only 20,000 requests per second for standard general-purpose v2 accounts. Microsoft documentation now lists 40,000 requests per second in many regions and 20,000 in other regions, so the post was updated to include both targets.
- The post said a single blob is limited to about 500 requests per second. Microsoft documentation distinguishes block blobs and page blobs: single block blobs target up to 3,000 requests per second, while single page blobs target up to 500 requests per second. The post was updated in both the target list and per-blob throttling section.
- The post described diagnostic logging as writing to the `$logs` container without distinguishing it from current Azure Monitor diagnostic logging. The wording was changed to classic Storage Analytics logging, which is the logging mode that uses `$logs`.
- The Blob Storage partition-key explanation said the partition key is the blob name. Microsoft documentation defines it as account name plus container name plus blob name, so the explanation was corrected.
- The blob naming guidance said all blobs for the same date land on the same partition. That was too absolute. Microsoft documentation warns that sequential naming can concentrate traffic on partition ranges, so the statement was softened to match the documented behavior.
- The warm-up-period pitfall was too specific to new storage accounts. Microsoft troubleshooting guidance documents throttling during sudden bursts and initial load tests while Azure Storage load balances, so the wording was corrected.
- The RA-GRS pitfall said the secondary endpoint has lower throughput limits than the primary. The official redundancy documentation emphasizes asynchronous replication and possible lag, so the pitfall was corrected to focus on stale reads rather than unsupported throughput claims.

## Review Notes
The Azure CLI alert example uses the documented metric alert condition syntax, including a `ResponseType` dimension filter. Azure CLI was not installed locally, so CLI validation was done against Microsoft Learn command documentation rather than local `az --help` output.
