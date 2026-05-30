# Validation Summary: How to Use Azure Blob Storage Append Blobs for Logging and Audit Trails

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Blob Storage
- Azure append blobs
- Azure Storage lifecycle management
- Azure immutable storage policies
- Azure CLI
- Azure Storage Blob SDK for Python
- Python JSON Lines log processing

## Sources Consulted
- Microsoft Learn: Append Block REST API - https://learn.microsoft.com/en-us/rest/api/storageservices/append-block
- Microsoft Learn: Azure Storage Blob SDK for Python `BlobClient` - https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob.blobclient
- Microsoft Learn: Azure Storage Blob SDK for Python `BlobProperties` - https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob.blobproperties
- Microsoft Learn: Access tiers for blob data - https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview
- Microsoft Learn: Azure Blob Storage lifecycle management policy structure - https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-structure
- Microsoft Learn: Azure CLI `az storage container immutability-policy` - https://learn.microsoft.com/en-us/cli/azure/storage/container/immutability-policy
- Python documentation: `datetime.utcnow()` deprecation note - https://docs.python.org/3/library/datetime.html

## Issues Found
- The append blob size limits were outdated. The post stated a 4 MiB append-operation limit and about 195 GiB maximum blob size as the general limit. Updated the text to reflect current service versions, where append blocks can be up to 100 MiB and append blobs can reach about 4.75 TiB, while noting the older 4 MiB / 195 GiB limit for older service versions.
- The post said append blobs are always in the Hot tier. Updated this to the technically accurate limitation: explicit Set Blob Tier and lifecycle tiering are supported only for block blobs, not append blobs or page blobs.
- Several examples used broad `except Exception` handling around blob creation. This can hide real failures and, with `create_append_blob`, can risk overwriting existing blob content. Replaced those cases with `ResourceNotFoundError` and added `ResourceExistsError` handling where needed.
- The first append-blob creation example always called `create_append_blob()`, which overwrites an existing blob according to the SDK documentation. Updated it to check for existence first.
- The rotation example used `content_length` as a rough stand-in for append block count. Replaced it with the SDK's `append_blob_committed_block_count` property.
- The streaming JSON Lines reader parsed each downloaded chunk independently, which can fail when a JSON line is split across chunks. Added carry-over handling for partial lines.
- The Python snippets used `datetime.utcnow()`, which is deprecated in modern Python. Updated examples to use `datetime.now(timezone.utc)`.
- The concurrency example checked the append-position error by searching the exception string. Updated it to prefer the SDK error code while still tolerating string conversion.

## Review Notes
- The Azure CLI was not installed in the local environment, so CLI validation was performed against the official Microsoft Learn Azure CLI reference.
- The Python code snippets were syntax-checked with `ast.parse` after edits.
