# Validation Summary: How to Use Azure Storage with Managed Identities for Passwordless Authentication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Managed Identities
- Microsoft Entra ID
- Azure Storage
- Azure RBAC
- Azure CLI
- Python Azure SDK
- .NET Azure SDK
- JavaScript Azure SDK

## Sources Consulted
- Microsoft Learn: Managed identities for Azure resources overview - https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview
- Microsoft Learn: Azure built-in roles for Storage - https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles
- Microsoft Learn: Assign an Azure role for access to blob data - https://learn.microsoft.com/en-us/azure/storage/blobs/assign-azure-role-data-access
- Microsoft Learn: Authorize access to blobs using Microsoft Entra ID - https://learn.microsoft.com/en-us/azure/storage/blobs/authorize-access-azure-active-directory
- Microsoft Learn: Prevent Shared Key authorization for an Azure Storage account - https://learn.microsoft.com/en-us/azure/storage/common/shared-key-authorization-prevent
- Microsoft Learn: Azure CLI az vm identity reference - https://learn.microsoft.com/en-us/cli/azure/vm/identity
- Microsoft Learn: Azure CLI az functionapp identity reference - https://learn.microsoft.com/en-us/cli/azure/functionapp/identity
- Microsoft Learn: Azure CLI az role assignment reference - https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Microsoft Learn: Python BlobServiceClient reference - https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob.blobserviceclient
- Microsoft Learn: Azure Identity client library for Python - https://learn.microsoft.com/en-us/python/api/overview/azure/identity-readme
- Microsoft Learn: Azure Identity DefaultAzureCredential for JavaScript - https://learn.microsoft.com/en-us/javascript/api/@azure/identity/defaultazurecredential
- Microsoft Learn: Azure Identity DefaultAzureCredentialOptions for .NET - https://learn.microsoft.com/en-us/dotnet/api/azure.identity.defaultazurecredentialoptions.excludeinteractivebrowsercredential

## Issues Found
- Updated references from Azure AD to Microsoft Entra ID to match current Microsoft terminology while preserving the meaning.
- Corrected Azure RBAC propagation guidance from 5 minutes to up to 30 minutes, matching Microsoft documentation for blob data role assignment propagation.
- Updated the `DefaultAzureCredential` explanation so it no longer presents an incomplete, language-neutral credential order. The post now describes common credential sources and notes that the exact chain varies by SDK language and version.
- Corrected the Shared Key access section to clarify that disabling Shared Key blocks account keys, service SAS tokens, and account SAS tokens, but user delegation SAS tokens for Blob Storage can still work because they are authorized with Microsoft Entra ID.

## Review Notes
The Azure CLI commands and SDK examples are broadly correct for the current Azure CLI and Azure SDKs. The examples assume the referenced containers and local files already exist and that the managed identity has the relevant data-plane role assignment.
