# Validation Summary: How to Set Up Azure Storage Encryption with Customer-Managed Keys in Key Vault

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Storage
- Azure Storage service-side encryption
- Customer-managed keys
- Azure Key Vault
- Azure Key Vault Managed HSM
- Azure CLI
- Azure PowerShell
- Terraform AzureRM provider
- Azure Monitor diagnostic settings

## Sources Consulted
- Microsoft Learn: Azure Storage encryption for data at rest - https://learn.microsoft.com/en-us/azure/storage/common/storage-service-encryption
- Microsoft Learn: Configure customer-managed keys for Azure Files encryption - https://learn.microsoft.com/en-us/azure/storage/files/customer-managed-keys
- Microsoft Learn: Create and manage encryption scopes - https://learn.microsoft.com/en-us/azure/storage/blobs/encryption-scope-manage
- Microsoft Learn: Encryption scopes for Blob storage - https://learn.microsoft.com/en-us/azure/storage/blobs/encryption-scope-overview/
- Microsoft Learn: Azure CLI `az storage account encryption-scope` reference - https://learn.microsoft.com/en-us/cli/azure/storage/account/encryption-scope
- Microsoft Learn: Azure CLI `az keyvault key rotation-policy` reference - https://learn.microsoft.com/en-us/cli/azure/keyvault/key/rotation-policy
- Microsoft Learn: Configure cryptographic key auto-rotation in Azure Key Vault - https://learn.microsoft.com/en-us/azure/key-vault/keys/how-to-configure-key-rotation
- Microsoft Learn: About keys in Managed HSM - https://learn.microsoft.com/en-us/azure/key-vault/managed-hsm/about-keys
- Microsoft Learn: Enable Azure Key Vault logging - https://learn.microsoft.com/en-us/azure/key-vault/general/howto-logging
- Terraform Registry: `azurerm_storage_account_customer_managed_key` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account_customer_managed_key
- Terraform Registry: `azurerm_key_vault_key` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_key

## Issues Found
- The Terraform `azurerm_storage_account_customer_managed_key` example used outdated/incorrect `key_vault_id` and `key_name` arguments. Updated it to use the current `key_vault_key_id` argument with the key's versionless resource ID so automatic key version updates remain consistent with the rest of the post.
- The Managed HSM compliance wording referred to FIPS 140-2 Level 3. Updated it to FIPS 140-3 Level 3 to match current Managed HSM documentation.
- The key rotation section said the storage account would automatically detect a new key version without stating the documented timing. Updated the wording to say Azure checks for new key versions daily and picks them up within 24 hours.
- The encryption scope example used a versionless Key Vault key URI, while the Azure CLI reference documents a key object identifier including a key version. Updated the example URI to include `<key-version>`.
- The Key Vault diagnostic settings example included a `retentionPolicy` inside a Log Analytics workspace destination. Removed that field and kept the documented `AuditEvent` log setting for workspace routing.

## Review Notes
The Azure CLI was not installed in the local environment, so command validation was performed against current Microsoft Learn CLI reference pages rather than local `az --help` output.
