# Validation Summary: How to Configure the Azure Backend (azurerm) in OpenTofu - Opentofu Azure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (azurerm backend)
- Terraform (HCL syntax, backend configuration)
- Azure Blob Storage (state file storage, blob leases, blob versioning)
- Azure Resource Manager (azurerm provider — storage account, storage container, resource group, customer-managed keys)
- Azure CLI (`az login`, `az account set`, `az role assignment create`)
- Azure RBAC (Storage Blob Data Contributor role)
- Azure service principal authentication (ARM_* environment variables)

## Sources Consulted
- OpenTofu azurerm backend documentation: https://opentofu.org/docs/language/settings/backends/azurerm/
- Terraform AzureRM provider — `azurerm_storage_account`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- Terraform AzureRM provider — `azurerm_storage_container`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_container
- OpenTofu source code (`internal/backend/remote-state/azure/client.go`) — confirms blob lease–based locking
- Microsoft Learn — Azure RBAC built-in roles for blob storage: https://learn.microsoft.com/azure/storage/blobs/authorize-access-azure-active-directory
- Microsoft Learn — Blob versioning vs. snapshots

## Issues Found

1. **Inaccurate versioning mechanism in the introduction.** The post stated the backend "supports versioning through blob snapshots." Blob snapshots and blob versioning are distinct Azure features, and the example code enables `versioning_enabled = true` (blob versioning), not snapshots. OpenTofu actually offers two separate mechanisms: a `snapshot = true` backend option (uses blob snapshots) and reliance on storage-account-level blob versioning (recommended approach). Updated the sentence to accurately describe the mechanism shown in the example: "supports state history when blob versioning is enabled on the storage account."

2. **Inconsistent identity configuration in the customer-managed-key example.** The storage account had `identity { type = "SystemAssigned" }` while `customer_managed_key.user_assigned_identity_id` referenced an `azurerm_user_assigned_identity`. For the storage account to use a user-assigned identity to access Key Vault, that identity must actually be attached to the storage account. Updated the identity block to `type = "UserAssigned"` with `identity_ids = [azurerm_user_assigned_identity.state.id]` so the configuration is internally consistent and would actually work.

## Review Notes

- `storage_account_name` on `azurerm_storage_container` is deprecated in azurerm provider v4.x in favor of `storage_account_id`. Both still work and migration is supported without recreation, so this was not flagged as an error — but readers using v4.x will see deprecation warnings and may want to migrate.
- The example uses `account_replication_type = "GRS"`. For state files, LRS or ZRS is often sufficient and cheaper; GRS is a defensible choice but not always necessary. Not a correctness issue.
- `customer_managed_key` requires the storage account to be `account_kind = "StorageV2"` (the default) or `account_tier = "Premium"`, and assumes a Key Vault with appropriate access policies / RBAC and an `azurerm_key_vault_key` resource exist — these surrounding resources are intentionally omitted from the snippet for brevity.
- The post does not mention `use_azuread_auth = true` or `use_oidc = true` backend options, which are increasingly recommended for keyless auth in CI environments. Could be a future addition but not an error in the current content.
- Backend block uses `terraform { backend "azurerm" {} }` — this is correct syntax; OpenTofu reads the same `terraform` block name for backwards compatibility with Terraform configurations.
