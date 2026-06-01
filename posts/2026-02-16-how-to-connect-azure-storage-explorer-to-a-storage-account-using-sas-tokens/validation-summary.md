# Validation Summary: How to Connect Azure Storage Explorer to a Storage Account Using SAS Tokens

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Storage
- Azure Storage Explorer
- Shared Access Signatures (SAS)
- Azure CLI
- Microsoft Entra ID
- Azure RBAC
- Blob Storage

## Sources Consulted
- Microsoft Learn: Grant limited access to Azure Storage resources using shared access signatures (SAS) - https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview
- Microsoft Learn: Get started with Storage Explorer - https://learn.microsoft.com/en-us/azure/storage/storage-explorer/vs-azure-tools-storage-manage-with-storage-explorer
- Microsoft Learn: Azure CLI `az storage account generate-sas` reference - https://learn.microsoft.com/en-us/cli/azure/storage/account?view=azure-cli-latest#az-storage-account-generate-sas
- Microsoft Learn: Azure CLI `az storage container generate-sas` reference - https://learn.microsoft.com/en-us/cli/azure/storage/container?view=azure-cli-latest#az-storage-container-generate-sas
- Microsoft Learn: Azure CLI `az storage blob generate-sas` reference - https://learn.microsoft.com/en-us/cli/azure/storage/blob?view=azure-cli-latest#az-storage-blob-generate-sas
- Microsoft Learn: Use Azure CLI to create a user delegation SAS for a container or blob - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-user-delegation-sas-create-cli
- Microsoft Learn: Define a stored access policy - https://learn.microsoft.com/en-us/rest/api/storageservices/define-stored-access-policy
- Microsoft Learn: Delegate access by using a shared access signature - https://learn.microsoft.com/en-us/rest/api/storageservices/delegate-access-with-shared-access-signature

## Issues Found
- Corrected the user delegation SAS command comments. Azure CLI implicitly gets the user delegation key when `--as-user` and `--auth-mode login` are used; the user does not run a separate key retrieval command in the example.
- Corrected the Storage Explorer account SAS connection steps. Microsoft documentation describes attaching a storage account with SAS by providing a SAS connection string, not by pasting only the raw SAS token and account name.
- Clarified that stored access policies apply to service SAS tokens. Microsoft documentation states stored access policies are not supported for account SAS or user delegation SAS.
- Changed the revocation wording for stored access policies from "immediately" to "after the change propagates" because Microsoft documentation notes policy changes can take up to 30 seconds to take effect.
- Reworded the user delegation SAS benefits. Azure Storage does not track generated SAS tokens as auditable token objects; the corrected text says the user delegation key is requested with Microsoft Entra credentials and requires an Azure RBAC role that can generate a user delegation key.

## Review Notes
Azure CLI was not installed in the local environment, so command validation was performed against current Microsoft Learn Azure CLI reference pages instead of local `az --help` output.
