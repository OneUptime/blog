# Validation Summary: How to Generate and Use SAS Tokens for Secure Azure Blob Storage Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Blob Storage
- Azure Storage shared access signatures (SAS)
- Azure CLI
- Azure Storage SDK for Python
- Azure.Storage.Blobs SDK for .NET / C#
- Stored access policies
- Microsoft Entra ID authentication

## Sources Consulted
- Microsoft Learn: Grant limited access to Azure Storage resources using shared access signatures (SAS): https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview
- Microsoft Learn: Use Azure CLI to create a user delegation SAS for a container or blob: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-user-delegation-sas-create-cli
- Microsoft Learn: Azure CLI reference for `az storage container generate-sas`: https://learn.microsoft.com/en-us/cli/azure/storage/container?view=azure-cli-latest#az-storage-container-generate-sas
- Microsoft Learn: Azure Storage Blob Python API reference for `generate_blob_sas`: https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob?view=azure-python
- Microsoft Learn: Azure.Storage.Blobs .NET `BlobClient.GenerateSasUri`: https://learn.microsoft.com/en-us/dotnet/api/azure.storage.blobs.blobclient?view=azure-dotnet
- Microsoft Learn: Define a stored access policy: https://learn.microsoft.com/en-us/rest/api/storageservices/define-stored-access-policy

## Issues Found
- The post said account-key-based SAS tokens become invalid if the key is rotated or compromised. I changed this to distinguish rotation from compromise: rotation invalidates SAS tokens signed with that key, while a compromised key lets an attacker generate new SAS tokens until the key is rotated.
- The Azure CLI examples recommended HTTPS-only SAS usage but did not include the `--https-only` flag. I added `--https-only` to the CLI SAS generation examples.
- The user delegation SAS section said "First, you need to get a user delegation key" before showing `az storage blob generate-sas`. In Azure CLI, the user delegation key is requested implicitly when `--auth-mode login` and `--as-user` are used. I updated the wording and command comment.
- The Python sample imported `BlobServiceClient` and described initializing it with a connection string, but the sample only uses account name and account key with `generate_blob_sas`. I removed the unused import and corrected the comment.
- The C# sample comment said it used a storage account connection string, but the code uses `StorageSharedKeyCredential`. I corrected the comment.
- Stored access policy commands omitted explicit authentication parameters. I added `--auth-mode key` and `--account-key $STORAGE_ACCOUNT_KEY` to make the Shared Key authorization requirement explicit.
- The security best practice "Never put SAS tokens in client-side code" conflicted with sending a signed URL to the client. I changed it to warn against putting account keys or SAS generation logic in client-side code while allowing clients to use backend-generated SAS URLs.

## Review Notes
- The local environment did not have the Azure CLI installed, so CLI validation was performed against Microsoft Learn's current Azure CLI reference rather than local `az --help` output.
- Microsoft documentation now uses "Microsoft Entra ID"; the post still uses "Azure AD" in some explanatory text. This remains understandable and technically recognizable, but future edits could update terminology.
