# Validation Summary: How to Configure Terraform State File Encryption for Azure Backend Storage

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Terraform `azurerm` backend
- Azure Storage
- Azure Blob Storage leases
- Azure Key Vault
- Azure customer-managed keys
- Azure RBAC
- Azure Monitor diagnostic settings
- Azure CLI

## Sources Consulted
- HashiCorp Developer documentation for the Terraform `azurerm` backend: https://developer.hashicorp.com/terraform/language/backend/azurerm
- HashiCorp Terraform Registry documentation for the AzureRM provider: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- HashiCorp Terraform Registry documentation for `azurerm_storage_account`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- HashiCorp Terraform Registry documentation for `azurerm_storage_account_customer_managed_key`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account_customer_managed_key
- HashiCorp Terraform Registry documentation for `azurerm_storage_container`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_container
- HashiCorp Terraform Registry documentation for `azurerm_monitor_diagnostic_setting`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting
- Microsoft Learn documentation for Azure Storage encryption for data at rest: https://learn.microsoft.com/en-us/azure/storage/common/storage-service-encryption
- Microsoft Learn documentation for configuring Azure Storage customer-managed keys: https://learn.microsoft.com/en-us/azure/storage/common/customer-managed-keys-configure-existing-account
- Microsoft Learn documentation for Azure CLI blob lease commands: https://learn.microsoft.com/en-us/cli/azure/storage/blob/lease

## Issues Found
- The provider configuration disabled shared key access on the storage account but did not set `storage_use_azuread = true`. Added that provider option so Terraform can manage blob containers through Azure AD when shared key authentication is disabled.
- The storage account customer-managed key example created a user-assigned managed identity but did not assign that identity to the storage account. Added a `UserAssigned` identity block to the storage account.
- The Key Vault was described as using premium HSM-backed keys, but the key used `key_type = "RSA"`, which creates a software-protected key. Changed it to `key_type = "RSA-HSM"` to match the stated HSM-backed configuration.
- The customer-managed key resource could race the RBAC role assignment that grants Key Vault crypto access to the managed identity. Added an explicit `depends_on` for the role assignment.
- The purge protection wording implied keys can never be permanently deleted. Updated it to reflect that purge protection prevents permanent deletion until the retention period has passed.
- The RBAC examples assigned blob data roles at the storage account scope. Changed the examples to use the storage container Resource Manager ID for a narrower scope, matching HashiCorp backend guidance for least privilege.
- The backend example used `use_azuread_auth = true` but the Azure CLI workflow omitted `use_cli = true`, which current backend documentation requires for Azure CLI authentication. Added `use_cli = true` and clarified that CI/CD should use the relevant service principal, OIDC, or managed identity backend options.
- The locking section mixed Terraform lock IDs with Azure blob lease inspection. Kept `terraform force-unlock` for Terraform lock IDs and added the Azure CLI `az storage blob lease break` command for breaking the underlying blob lease when Terraform cannot release it.

## Review Notes
- The post pins the AzureRM provider to `~> 3.80`. The reviewed arguments are valid for that provider generation, but AzureRM 4.x is current as of this review and has some newer guidance, including preferring Resource Manager IDs for storage container management.
- The Key Vault uses RBAC authorization. The Terraform identity running this bootstrap must already have enough Key Vault data-plane permissions to create and manage keys, and RBAC propagation delays can affect first-time applies.
