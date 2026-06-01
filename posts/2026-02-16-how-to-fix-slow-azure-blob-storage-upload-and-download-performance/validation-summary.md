# Validation Summary: How to Fix Slow Azure Blob Storage Upload and Download Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Blob Storage
- Azure Storage .NET SDK
- Azure Storage Python SDK
- AzCopy
- Azure CLI
- Azure Private Link and private endpoints
- Azure Monitor metrics
- Azure CDN and Azure Front Door

## Sources Consulted
- Azure Blob Storage scalability and performance targets: https://learn.microsoft.com/en-us/azure/storage/blobs/scalability-targets
- Azure standard storage account scalability targets: https://learn.microsoft.com/en-us/azure/storage/common/scalability-targets-standard-account
- Azure Blob Storage performance checklist: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-performance-checklist
- Azure Storage .NET transfer tuning: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blobs-tune-upload-download
- Azure StorageTransferOptions API reference: https://learn.microsoft.com/en-us/dotnet/api/azure.storage.storagetransferoptions
- Azure Storage Python transfer tuning: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blobs-tune-upload-download-python
- Azure Storage BlobServiceClient Python API reference: https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob.blobserviceclient
- Azure storage account creation documentation: https://learn.microsoft.com/en-us/azure/storage/common/storage-account-create
- Azure private endpoints for Azure Storage: https://learn.microsoft.com/en-us/azure/storage/common/storage-private-endpoints
- Azure CLI private endpoint command reference: https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint
- Azure Monitor supported metrics for storage accounts: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-storage-storageaccounts-metrics

## Issues Found
- Corrected the single-blob throughput claim. The original text said a single blob can handle up to 60 MiB/s for reads and writes, but Azure documents that target for page blobs. A single block blob can scale up to storage account ingress and egress limits.
- Updated standard storage account bandwidth targets. The original 20 Gbps ingress and 50 Gbps egress values were outdated/incomplete for current standard GPv2 regional targets.
- Fixed the .NET example import. `StorageTransferOptions` is in the `Azure.Storage` namespace, so the snippet now includes `using Azure.Storage;`.
- Fixed the Python upload tuning example. `max_block_size` and `max_single_put_size` are configured when constructing the client, while `max_concurrency` is passed to `upload_blob`.
- Replaced the fixed "under 256 MiB" single-put guideline with SDK single-upload threshold wording, because current service and SDK thresholds vary.
- Corrected the multi-region guidance. RA-GRS and RA-GZRS expose a paired secondary region; they do not provide general nearest-region routing.
- Corrected private endpoint wording. Private endpoints route over VNet and Azure Private Link on the Microsoft backbone and improve isolation; throughput or latency gains are scenario-dependent.
- Added the missing `os` import to the small-file Python example.
- Replaced the unsupported HTTP/2 optimization claim with guidance to reuse Azure Storage clients and underlying HTTP connections.

## Review Notes
The Azure CLI command examples are structurally correct based on official command references, but they require Azure CLI and AzCopy to be installed and authenticated in the execution environment. The local environment did not have `az` installed, so command verification used official Microsoft documentation rather than local CLI help.
