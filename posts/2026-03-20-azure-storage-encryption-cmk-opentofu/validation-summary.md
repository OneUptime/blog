# Validation Summary: How to Set Up Azure Storage Encryption with Customer-Managed Keys in OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Storage
- Azure Key Vault
- Customer-managed keys (CMK)
- Managed identities
- OpenTofu
- HashiCorp AzureRM provider
- HCL

## Sources Consulted
- Azure Storage CMK overview: https://learn.microsoft.com/en-us/azure/storage/common/customer-managed-keys-overview
- Configure customer-managed keys in the same tenant for an existing storage account: https://learn.microsoft.com/en-us/azure/storage/common/customer-managed-keys-configure-existing-account
- Quickstart: Create an Azure key vault and key using Terraform: https://learn.microsoft.com/en-us/azure/key-vault/keys/quick-create-terraform
- Azure RBAC vs. Key Vault access policies: https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-access-policy
- AzureRM provider `azurerm_key_vault` docs: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/key_vault.html.markdown
- AzureRM provider `azurerm_key_vault_key` docs: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/key_vault_key.html.markdown
- AzureRM provider `azurerm_key_vault_access_policy` docs: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/key_vault_access_policy.html.markdown
- AzureRM provider `azurerm_storage_account` docs: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/storage_account.html.markdown
- AzureRM provider `azurerm_storage_account_customer_managed_key` docs: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/storage_account_customer_managed_key.html.markdown

## Issues Found
- The `azurerm_storage_account_customer_managed_key` example used the older `key_vault_id`, `key_name`, and `key_version` argument pattern. I replaced it with the current `key_vault_key_id` argument and used `azurerm_key_vault_key.storage_key.versionless_id`, because the current provider schema expects a key ID and a versionless key URI is what enables automatic key-version updates.
- The Key Vault example did not grant the identity running OpenTofu permission to create the key or set its rotation policy. I added a `azurerm_key_vault_access_policy` for `data.azurerm_client_config.current.object_id` and added a dependency from `azurerm_key_vault_key.storage_key`, because the provider docs require those key permissions for the caller.
- The storage account example omitted the `lifecycle { ignore_changes = [customer_managed_key] }` stanza that the AzureRM provider documents when CMK is managed through the separate `azurerm_storage_account_customer_managed_key` resource. I added it to prevent drift and conflicting management of the same CMK setting.
- The `encryption_key_id` output returned the versioned key ID even though the corrected CMK binding now uses a versionless key URI. I changed the output to `versionless_id` and updated the description so the example is internally consistent.
- The summary described the CMK binding as happening through a Key Vault access policy. I corrected that wording, because the access policies authorize the identities, while the actual CMK binding is performed by `azurerm_storage_account_customer_managed_key`.

## Review Notes
- The post is technically valid after the fixes. Using a system-assigned identity is correct here because the CMK is configured after the storage account already exists. Microsoft’s storage documentation only requires a user-assigned identity when CMK is configured during storage-account creation.
- The example continues to use Key Vault access policies, which are still supported and match the AzureRM provider examples, but Microsoft now recommends Azure RBAC and notes it becomes the default access control model for new vaults starting with API version `2026-02-01`.
- A local `tofu validate` or `terraform validate` run was not possible in this environment because neither CLI is installed, so validation was performed against the current official Azure and AzureRM provider documentation.
