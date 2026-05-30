# Validation Summary: How to Upload Large Files to Azure Blob Storage Using Block Blobs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Blob Storage
- Block blobs, Put Block, Put Block List, and Get Block List
- Azure Storage client library for Python
- Azure.Storage.Blobs SDK for .NET
- AzCopy v10
- Parallel uploads and retry handling

## Sources Consulted
- Azure Storage Put Block REST API: https://learn.microsoft.com/en-us/rest/api/storageservices/put-block
- Azure Storage Put Block List REST API: https://learn.microsoft.com/en-us/rest/api/storageservices/put-block-list
- Azure Storage scalability and performance targets for Blob Storage: https://learn.microsoft.com/en-us/azure/storage/blobs/scalability-targets
- Understanding block blobs, append blobs, and page blobs: https://learn.microsoft.com/en-us/rest/api/storageservices/understanding-block-blobs--append-blobs--and-page-blobs
- Upload a blob with Python: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-upload-python
- BlockBlobClient.StageBlockAsync API reference: https://learn.microsoft.com/en-us/dotnet/api/azure.storage.blobs.specialized.blockblobclient.stageblockasync
- BlockBlobClient.CommitBlockList API reference: https://learn.microsoft.com/en-us/dotnet/api/azure.storage.blobs.specialized.blockblobclient.commitblocklist
- Performance tuning for uploads and downloads with Azure Storage client library for .NET: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blobs-tune-upload-download
- StorageTransferOptions API reference: https://learn.microsoft.com/en-us/dotnet/api/azure.storage.storagetransferoptions
- AzCopy copy reference: https://learn.microsoft.com/en-us/azure/storage/common/storage-ref-azcopy-copy

## Issues Found
- The Python built-in parallel upload example passed `max_block_size` to `upload_blob()`. Microsoft documents `max_block_size` and `max_single_put_size` as client construction options, while `max_concurrency` is passed to `upload_blob()`. Updated the example to create a `BlobClient` with transfer-size options and pass only `max_concurrency` to the upload call.
- The .NET manual upload sample said the method returns the committed blob URL, but the method returns `Task`. Removed the inaccurate return comment.
- The .NET manual upload sample used a single `ReadAsync` call to fill a block buffer. A single stream read is not guaranteed to fill the requested buffer, so the sample could upload partial block data. Replaced it with `ReadExactlyAsync` for the requested block length.
- The .NET `InitialTransferSize` comment described it as "Start chunking at 100 MB." Microsoft documents it as the first transfer size and single-request threshold for small blobs, while later chunks use `MaximumTransferSize`. Updated the comment to match that behavior.

## Review Notes
- The core block blob limits, including 4,000 MiB maximum block size for service version 2019-12-12 and later, 50,000 committed blocks, approximately 190.7 TiB maximum block blob size, and 7-day expiration for uncommitted blocks, matched official Azure documentation.
- The AzCopy command flags `--block-size-mb`, `--cap-mbps`, and `--put-md5` are valid for AzCopy v10. The destination URL still requires either Microsoft Entra authorization through `azcopy login` or a SAS token with suitable permissions.
