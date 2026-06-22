# Validation Summary: How to Fix 'Storage Account' Access Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Azure Storage Accounts
- Azure Blob Storage
- Azure CLI
- Azure RBAC
- Shared access signatures (SAS)
- Microsoft Entra ID authentication
- Azure SDK for .NET (`Azure.Storage.Blobs`, `Azure.Identity`)
- Terraform AzureRM provider

## Sources Consulted
- Microsoft Learn: Troubleshoot 403 errors in Azure Blob Storage: https://learn.microsoft.com/en-us/troubleshoot/azure/azure-storage/blobs/authentication/storage-troubleshoot-403-errors
- Microsoft Learn: Azure CLI `az storage account keys`: https://learn.microsoft.com/en-us/cli/azure/storage/account/keys
- Microsoft Learn: Azure CLI `az role assignment`: https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Microsoft Learn: Azure CLI `az storage account network-rule`: https://learn.microsoft.com/en-us/cli/azure/storage/account/network-rule
- Microsoft Learn: Azure Storage network security and virtual network rules: https://learn.microsoft.com/en-us/azure/storage/common/storage-network-security and https://learn.microsoft.com/en-us/azure/storage/common/storage-network-security-virtual-networks
- Microsoft Learn: Azure CLI `az storage container`: https://learn.microsoft.com/en-us/cli/azure/storage/container
- Microsoft Learn: Configure anonymous read access for containers and blobs: https://learn.microsoft.com/en-us/azure/storage/blobs/anonymous-read-access-configure
- Microsoft Learn: DefaultAzureCredential for .NET: https://learn.microsoft.com/en-us/dotnet/api/azure.identity.defaultazurecredential
- Microsoft Learn: `BlobContainerClient.CanGenerateSasUri`: https://learn.microsoft.com/en-us/dotnet/api/azure.storage.blobs.blobcontainerclient.cangeneratesasuri
- Microsoft Learn: Create a service SAS with .NET: https://learn.microsoft.com/en-us/azure/storage/blobs/sas-service-create-dotnet
- Microsoft Learn: Create a user delegation SAS with .NET: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-user-delegation-sas-create-dotnet
- Microsoft Learn: Create a user delegation SAS REST reference: https://learn.microsoft.com/en-us/rest/api/storageservices/create-user-delegation-sas
- Microsoft Learn: Azure built-in roles for Storage: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/storage
- Terraform AzureRM provider docs for `azurerm_storage_account`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/storage_account.html.markdown
- Terraform AzureRM provider docs for `azurerm_private_endpoint`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/private_endpoint.html.markdown

## Issues Found
- The `StorageConfig.CreateClient()` example returned a connection-string client before the managed identity option, making the second option unreachable. I split the example into `CreateClientWithConnectionString()` and `CreateClientWithManagedIdentity()` so both valid approaches are usable.
- The SAS generation example said `CanGenerateSasUri` applied to account key or user delegation key authentication. Microsoft documents that this property is true when the client can create a service SAS using `StorageSharedKeyCredential`, so I corrected the comment.
- The user delegation SAS example manually assembled the blob URI and SAS query parameters. I changed it to use `BlobClient.GenerateUserDelegationSasUri(...)`, the SDK method intended for a blob SAS signed with a user delegation key.
- The SAS debugger parsed expiration with `DateTime` and compared it to `DateTime.UtcNow`. I changed it to `DateTimeOffset` so UTC offsets in SAS timestamps are handled correctly.
- The network-rule example added IP and VNet rules but did not show setting the account default action to `Deny`. Microsoft notes that network rules have no effect unless the default action is `Deny`, so I added the `az storage account update --default-action Deny` command.
- The best-practices list recommended "storage analytics" for monitoring. Microsoft now recommends Azure Monitor diagnostics over classic Storage Analytics logs, so I updated the wording to "Azure Monitor diagnostics."

## Review Notes
- The Azure CLI commands, RBAC role names, container public access values, storage account key commands, and Terraform argument names were checked against current official documentation and are valid.
- The C# examples are illustrative snippets and omit surrounding project setup, helper classes, and using directives in some places; this is acceptable for the post format, but a future revision could add package and namespace prerequisites.
