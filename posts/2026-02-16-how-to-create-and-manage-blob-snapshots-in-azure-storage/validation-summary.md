# Validation Summary: How to Create and Manage Blob Snapshots in Azure Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Blob Storage
- Blob snapshots
- Blob versioning
- Azure CLI
- Azure Storage SDK for Python
- Azure Storage SDK for .NET
- Azure Blob Storage lifecycle management policies

## Sources Consulted
- Microsoft Learn: Blob snapshots overview - https://learn.microsoft.com/en-us/azure/storage/blobs/snapshots-overview
- Microsoft Learn: Snapshot Blob REST API - https://learn.microsoft.com/en-us/rest/api/storageservices/snapshot-blob
- Microsoft Learn: Azure CLI `az storage blob` reference - https://learn.microsoft.com/en-us/cli/azure/storage/blob
- Microsoft Learn: Azure CLI `az storage blob copy` reference - https://learn.microsoft.com/en-us/cli/azure/storage/blob/copy
- Microsoft Learn: Create and manage a blob snapshot with .NET - https://learn.microsoft.com/en-us/azure/storage/blobs/snapshots-manage-dotnet
- Microsoft Learn: BlobBaseClient.CreateSnapshotAsync API reference - https://learn.microsoft.com/en-us/dotnet/api/azure.storage.blobs.specialized.blobbaseclient.createsnapshotasync
- Microsoft Learn: Get started with Azure Blob Storage and Python - https://learn.microsoft.com/azure/storage/blobs/storage-blob-python-get-started
- Microsoft Learn: Copy a blob from a source object URL with Python - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-copy-url-python
- Microsoft Learn: Copy a blob with asynchronous scheduling using Python - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-copy-async-python
- Microsoft Learn: Azure Blob Storage lifecycle management policy structure - https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-structure
- Microsoft Learn: Azure Storage data protection overview - https://learn.microsoft.com/en-us/azure/storage/blobs/data-protection-overview

## Issues Found
- The lifecycle management `prefixMatch` example used `data/`, but Azure lifecycle policy prefixes must start with a container name. Changed it to `mycontainer/data/` and updated the explanatory sentence accordingly.
- The cost comparison stated that snapshots and versions cost "only changed blocks" without qualification. Azure bills unique blocks/pages when tiers have not been explicitly set, but explicitly setting a tier can cause full-content-length billing. Updated the table and snapshot cost paragraph to include that caveat.

## Review Notes
The Azure CLI was not installed in the local environment, and the Python `azure-storage-blob` package was not installed, so command and SDK validation was performed against official Microsoft documentation rather than local execution. The Azure CLI command names and flags, Python SDK method names, .NET snapshot API, snapshot URI format, restore-by-copy explanation, delete snapshot behavior, and lifecycle snapshot delete action were otherwise consistent with current Microsoft documentation.
