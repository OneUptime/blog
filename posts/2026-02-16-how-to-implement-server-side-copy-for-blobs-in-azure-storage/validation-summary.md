# Validation Summary: How to Implement Server-Side Copy for Blobs in Azure Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Blob Storage
- Azure Storage REST copy operations
- Azure CLI
- AzCopy
- Azure Storage SDK for Python
- Azure Storage SDK for .NET
- Microsoft Entra ID authentication
- Shared access signatures (SAS)

## Sources Consulted
- Microsoft Learn: Copy Blob REST API - https://learn.microsoft.com/en-us/rest/api/storageservices/copy-blob
- Microsoft Learn: Copy Blob From URL REST API - https://learn.microsoft.com/en-us/rest/api/storageservices/copy-blob-from-url
- Microsoft Learn: Put Blob From URL REST API - https://learn.microsoft.com/en-us/rest/api/storageservices/put-blob-from-url
- Microsoft Learn: Copy a blob with asynchronous scheduling using Python - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-copy-async-python
- Microsoft Learn: Copy a blob from a source object URL with Python - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-copy-url-python
- Microsoft Learn: Set or change a block blob's access tier with Python - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-use-access-tier-python
- Microsoft Learn: StandardBlobTier enum for Python - https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob.standardblobtier
- Microsoft Learn: RehydratePriority enum for Python - https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob.rehydratepriority
- Microsoft Learn: Rehydrate an archived blob to an online tier - https://learn.microsoft.com/en-us/azure/storage/blobs/archive-rehydrate-to-online-tier
- Microsoft Learn: Manage block blobs with Azure CLI - https://learn.microsoft.com/en-us/azure/storage/blobs/blob-cli
- Microsoft Learn: az storage blob copy reference - https://learn.microsoft.com/en-us/cli/azure/storage/blob/copy
- Microsoft Learn: Copy a blob with asynchronous scheduling using .NET - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-copy-async-dotnet
- Microsoft Learn: Manage and find Azure Blob data with blob index tags - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-manage-find-blobs

## Issues Found
- The post described the synchronous Python example as Copy Blob from URL with a 256 MB limit. The SDK method shown, `upload_blob_from_url()`, wraps Put Blob From URL, which is synchronous and supports source blobs up to 5,000 MiB. Updated the mechanism list and section wording.
- The server-side copy mechanism list omitted Put Blob from URL while using it in the Python synchronous example. Added Put Blob from URL and changed the list to "several copy mechanisms."
- Python examples used `StandardBlobTier.Cool` and `StandardBlobTier.Hot`, but the documented enum members are uppercase. Updated them to `StandardBlobTier.COOL` and `StandardBlobTier.HOT`.
- The archive rehydration example used a string for rehydration priority and omitted the `time` import used by the polling loop. Updated the snippet to import `RehydratePriority` and `time`, and to use `RehydratePriority.HIGH`.
- The archive tier text implied an archived blob must always be rehydrated before copying. Azure also supports rehydrating by copying an archived blob to a new online-tier blob. Adjusted the wording.
- The .NET sample configured different storage accounts but then used `StartCopyFromUriAsync(sourceBlob.Uri)` without a source SAS. For cross-account copies the source must be public or SAS-authorized. Updated the sample to use the same account, matching its "no SAS token needed" comment.
- The key takeaways said tags are copied along with metadata and HTTP headers. Blob index tags are not copied by default and must be set explicitly or copied via supported tag-copy options. Updated the statement.

## Review Notes
Azure CLI and AzCopy were not installed in the local environment, so command syntax was verified against Microsoft Learn rather than local `--help` output. The remaining examples are illustrative and still require appropriate RBAC roles, SAS permissions, existing containers, and valid account names.
