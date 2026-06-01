# Validation Summary: How to Enable Infrastructure Encryption (Double Encryption) for Azure Storage

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Azure Storage accounts
- Azure Storage infrastructure encryption
- Azure Storage customer-managed keys
- Azure Key Vault
- Azure managed identities
- Azure CLI
- ARM templates
- Bicep
- Terraform AzureRM provider
- Azure Storage Blob Python SDK
- Azure Policy
- AzCopy

## Sources Consulted
- Microsoft Learn: Enable infrastructure encryption for double encryption of data - https://learn.microsoft.com/en-us/azure/storage/common/infrastructure-encryption-enable
- Microsoft Learn: Azure Storage encryption for data at rest - https://learn.microsoft.com/en-us/azure/storage/common/storage-service-encryption
- Microsoft Learn: Create an Azure storage account - https://learn.microsoft.com/en-us/azure/storage/common/storage-account-create
- Microsoft Learn: Customer-managed keys for Azure Storage encryption - https://learn.microsoft.com/en-us/azure/storage/common/customer-managed-keys-overview
- Microsoft Learn: Configure customer-managed keys for Azure Files / new storage account CLI flow - https://learn.microsoft.com/en-us/azure/storage/files/customer-managed-keys
- Microsoft Learn: Azure CLI `az storage account` reference - https://learn.microsoft.com/en-us/cli/azure/storage/account
- Microsoft Learn: Azure CLI `az storage account encryption-scope` reference - https://learn.microsoft.com/en-us/cli/azure/storage/account/encryption-scope
- Microsoft Learn: ARM/Bicep reference for `Microsoft.Storage/storageAccounts` - https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/2023-01-01/storageaccounts
- Terraform Registry: `azurerm_storage_account` resource - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- Microsoft Learn: Azure Storage Blob Python SDK `BlobClient.upload_blob` encryption scope parameter - https://learn.microsoft.com/en-us/python/api/azure-storage-blob/azure.storage.blob.blobclient

## Issues Found
- The customer-managed key example attempted to create a new storage account with `--identity-type SystemAssigned` and customer-managed key settings, then grant Key Vault access afterward. Microsoft documentation states that a new storage account cannot use a system-assigned identity for customer-managed keys during account creation because the identity does not exist until after the account is created. I changed the flow to create a user-assigned managed identity first, grant that identity Key Vault key permissions, and then create the storage account with `--identity-type UserAssigned`, `--user-identity-id`, and `--key-vault-user-identity-id`.

## Review Notes
- The Azure CLI binary was not installed in the local environment, so CLI syntax was verified against Microsoft Learn command reference rather than local `az --help` output.
- The Azure Policy example uses the documented infrastructure encryption property name, but production policy definitions normally include the outer `mode`, `policyRule`, and metadata/parameters wrapper.
