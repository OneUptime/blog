# Validation Summary: How to Optimize Azure Blob Storage Performance for Large File Uploads

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Blob Storage
- Azure Storage SDK for Python
- Azure Storage SDK for .NET
- AzCopy
- Azure CLI
- Azure Monitor metrics
- Azure Virtual Machines networking
- Azure ExpressRoute and Private Endpoints

## Sources Consulted
- Azure Blob Storage Put Block REST API: https://learn.microsoft.com/en-us/rest/api/storageservices/put-block
- Azure Blob Storage scalability and performance targets: https://learn.microsoft.com/en-us/azure/storage/blobs/scalability-targets
- Azure Storage client library transfer tuning for Python: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blobs-tune-upload-download-python
- Azure SDK for Python BlobClient API reference: https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob.blobclient
- Azure SDK for Python BlobBlock API reference: https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob.blobblock
- Azure StorageTransferOptions .NET API reference: https://learn.microsoft.com/en-us/dotnet/api/azure.storage.storagetransferoptions
- Azure BlobClient.UploadAsync .NET API reference: https://learn.microsoft.com/en-us/dotnet/api/azure.storage.blobs.blobclient.uploadasync
- AzCopy copy command reference: https://learn.microsoft.com/en-us/azure/storage/common/storage-ref-azcopy-copy
- AzCopy performance optimization: https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-optimize
- Azure CLI monitor metrics reference: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics
- Azure Dsv3 VM size series: https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dsv3-series
- Azure Accelerated Networking overview: https://learn.microsoft.com/en-us/azure/virtual-network/accelerated-networking-overview

## Issues Found
- The Python SDK example passed `max_block_size` to `upload_blob`, but the documented Python SDK transfer option is configured on the `BlobClient` constructor. Changed the example to create a `BlobClient` with `max_block_size` and `max_single_put_size`, then pass only `max_concurrency` to `upload_blob`.
- The .NET comment described `InitialTransferSize` only as the threshold for switching to block upload. Updated the comment to match the documented behavior: it controls the first request size and single-request threshold.
- The VM bandwidth examples for Standard_D4s_v3 and Standard_D16s_v3 were inaccurate against the current Azure Dsv3 size table. Updated the examples to use the documented Dsv3 values.
- The resumable upload example treated `get_block_list()` as an object with an `uncommitted_blocks` property and used `b.id`. The Python SDK returns a tuple of committed and uncommitted block lists, and `BlobBlock` exposes `block_id`. Updated the code accordingly.

## Review Notes
The remaining performance guidance is directionally correct, but workload-specific tuning is still required. AzCopy and SDK concurrency settings can improve throughput only when the client machine, network path, storage account limits, and retry behavior can support the additional parallelism.
