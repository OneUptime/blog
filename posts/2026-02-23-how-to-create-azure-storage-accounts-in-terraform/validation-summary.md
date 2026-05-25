# Validation Summary: How to Create Azure Storage Accounts in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Storage Accounts
- Azure Blob Storage lifecycle management
- Azure Storage network rules
- Azure Key Vault
- Customer-managed keys for Azure Storage encryption

## Sources Consulted
- HashiCorp Terraform Registry: AzureRM `azurerm_storage_account` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- HashiCorp Terraform Registry: AzureRM `azurerm_storage_account_network_rules` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account_network_rules
- HashiCorp Terraform Registry: AzureRM `azurerm_storage_management_policy` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_management_policy
- HashiCorp Terraform Registry: AzureRM `azurerm_storage_account_customer_managed_key` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account_customer_managed_key
- HashiCorp Terraform Registry: AzureRM `azurerm_key_vault_access_policy` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_access_policy
- HashiCorp Terraform Registry: AzureRM 4.0 upgrade guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide
- Microsoft Learn: Azure Storage account overview and naming rules: https://learn.microsoft.com/en-us/azure/storage/common/storage-account-overview
- Microsoft Learn: Azure Storage redundancy: https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy
- Microsoft Learn: Azure Blob Storage lifecycle management policy structure: https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-structure
- Microsoft Learn: Customer-managed keys for Azure Storage encryption: https://learn.microsoft.com/en-us/azure/storage/common/customer-managed-keys-overview

## Issues Found
- The provider example pinned AzureRM `~> 3.80`, which is outdated for a current 2026 guide. Updated it to AzureRM `~> 4.0` and added the required `subscription_id` provider argument through a variable.
- The storage account examples used the old `enable_https_traffic_only` argument. Updated both examples to the current `https_traffic_only_enabled` argument.
- The main storage account hard-coded the storage account name even though the post defined a validated `storage_account_name` variable. Updated the resource to use `var.storage_account_name`.
- The network rules example always passed `[""]` when `app_subnet_id` was left at its default. Updated it to `compact([var.app_subnet_id])` so the default does not produce an invalid subnet ID.
- The customer-managed key example used obsolete `key_vault_id` and `key_name` arguments for `azurerm_storage_account_customer_managed_key`. Updated it to use `key_vault_key_id`.
- The customer-managed key example omitted the storage account managed identity and Key Vault access policies required for Azure Storage to use the key. Added a system-assigned identity and the required access policies.
- The Premium storage account explanation implied the `BlockBlobStorage` example was appropriate for VM disks or premium file shares. Narrowed the wording to Premium block blob workloads.
- The final naming paragraph said Terraform catches naming violations at plan time. Clarified that Terraform can catch many format violations, while Azure enforces global uniqueness during deployment.

## Review Notes
The lifecycle policy examples are syntactically valid for the AzureRM provider, but real deployments should ensure `prefix_match` values begin with the intended container names. The example storage account names may still need to be changed by readers because Azure Storage account names must be globally unique.
