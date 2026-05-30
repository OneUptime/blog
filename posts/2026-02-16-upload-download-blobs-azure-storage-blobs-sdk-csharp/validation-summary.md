# Validation Summary: How to Upload and Download Blobs Using Azure.Storage.Blobs SDK in C#

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Blob Storage
- Azure.Storage.Blobs SDK for .NET
- Azure.Identity and DefaultAzureCredential
- C# and .NET
- ASP.NET Core minimal APIs
- Shared access signatures (SAS)

## Sources Consulted
- Microsoft Learn: Get started with Azure Blob Storage and .NET - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-dotnet-get-started
- Microsoft Learn: Upload a blob with .NET - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-upload
- Microsoft Learn: Download a blob with .NET - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-download
- Microsoft Learn: List blobs with .NET - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blobs-list
- Microsoft Learn: Copy a blob with asynchronous scheduling using .NET - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-copy-async-dotnet
- Microsoft Learn API reference: StorageTransferOptions - https://learn.microsoft.com/en-us/dotnet/api/azure.storage.storagetransferoptions
- Microsoft Learn API reference: PublicAccessType - https://learn.microsoft.com/en-us/dotnet/api/azure.storage.blobs.models.publicaccesstype
- Microsoft Learn API reference: BlobSasBuilder.ToSasQueryParameters - https://learn.microsoft.com/en-us/dotnet/api/azure.storage.sas.blobsasbuilder.tosasqueryparameters
- Microsoft Learn: Grant limited access to Azure Storage resources using shared access signatures (SAS) - https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview
- Microsoft Learn: Upload files in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/mvc/models/file-uploads

## Issues Found
- The initial C# using directives omitted `using Azure.Storage;`, but the large-upload example uses `StorageTransferOptions`, which is defined in the `Azure.Storage` namespace. Added the missing using directive.
- The copy/move sample started an asynchronous copy and deleted the source blob immediately in the move example. Updated the sample to capture the returned `CopyFromUriOperation` and call `WaitForCompletionAsync()` before deleting the source blob.
- The ASP.NET Core upload sample used `file.FileName` directly in the blob name. Microsoft guidance warns that client-supplied filenames can contain path data or malicious values. Updated the sample to use `Path.GetFileName(file.FileName)` before constructing the blob name.

## Review Notes
- The SAS example is technically correct for a user delegation SAS, but the caller must have permission to generate a user delegation key, such as an Azure RBAC role containing `Microsoft.Storage/storageAccounts/blobServices/generateUserDelegationKey`.
- `file.ContentType` in ASP.NET Core is client supplied. Setting it as blob content type is a common example pattern, but production applications should validate file types and uploaded content before trusting it.
- Could not run a local C# compilation check because the `dotnet` CLI is not installed in this environment.
