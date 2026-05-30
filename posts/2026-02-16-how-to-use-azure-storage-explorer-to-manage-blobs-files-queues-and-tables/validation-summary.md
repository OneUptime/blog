# Validation Summary: How to Use Azure Storage Explorer to Manage Blobs, Files, Queues, and Tables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Storage Explorer
- Azure Blob Storage
- Azure Files
- Azure Queue Storage
- Azure Table Storage
- Shared access signatures (SAS)
- Blob access tiers
- Blob soft delete
- Stored access policies
- CORS rules

## Sources Consulted
- Microsoft Learn: Get started with Storage Explorer: https://learn.microsoft.com/en-us/azure/storage/storage-explorer/vs-azure-tools-storage-manage-with-storage-explorer
- Microsoft Learn: Manage Azure Blob Storage resources with Storage Explorer: https://learn.microsoft.com/en-us/azure/storage/storage-explorer/vs-azure-tools-storage-explorer-blobs
- Microsoft Learn: Quickstart: Use Azure Storage Explorer to create a blob: https://learn.microsoft.com/en-us/azure/storage/blobs/quickstart-storage-explorer
- Microsoft Learn: Using Storage Explorer with Azure Files: https://learn.microsoft.com/en-us/azure/storage/storage-explorer/vs-azure-tools-storage-explorer-files
- Microsoft Learn: Use Azure Files share snapshots: https://learn.microsoft.com/en-us/azure/storage/files/storage-snapshots-files
- Microsoft Learn: How to use Azure Queue Storage from PowerShell: https://learn.microsoft.com/en-us/azure/storage/queues/storage-powershell-how-to-use-queues
- Microsoft Learn: Clear Messages (Queue Storage REST API): https://learn.microsoft.com/en-us/rest/api/storageservices/clear-messages
- Microsoft Learn: Querying tables and entities (Table Storage REST API): https://learn.microsoft.com/en-us/rest/api/storageservices/querying-tables-and-entities
- Microsoft Learn: Access tiers for blob data: https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview
- Microsoft Learn: Azure Storage Explorer soft delete guide: https://learn.microsoft.com/en-us/azure/storage/common/storage-explorer-soft-delete
- Microsoft Azure Storage Explorer release notes: https://github.com/microsoft/AzureStorageExplorer/releases

## Issues Found
- Updated "Azure AD account" to "Microsoft Entra ID account" to use Microsoft's current identity product naming.
- Clarified that blob access tiers apply to block blobs and depend on storage account support. Azure Blob access tier operations are not universally available for every blob type or account configuration.
- Corrected the blob container creation flow. Microsoft documentation shows creating a container first, then setting public access level separately.
- Replaced the file share snapshot claim that snapshots appear as child nodes in Storage Explorer with a supported-tool description based on Azure Files documentation.
- Corrected queue dequeue semantics. Receiving/dequeuing a message makes it temporarily invisible and increments `DequeueCount`; the message is only permanently removed when deleted, and it reappears if the visibility timeout expires.

## Review Notes
The table query examples use valid Azure Table Storage OData filter syntax, including `PartitionKey` string filtering and `datetime'...'` constants for `DateTime` values. Storage Explorer's table JSON import/export support was verified against Microsoft Azure Storage Explorer release notes. No code or terminal commands needed execution because the post is a GUI-focused guide.
