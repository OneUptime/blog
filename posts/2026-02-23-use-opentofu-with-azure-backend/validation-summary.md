# Validation Summary: How to Use OpenTofu with Azure Backend

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terraform backend configuration
- Azure Blob Storage
- Azure CLI
- AzureRM Terraform provider
- Microsoft Entra ID authentication, managed identity, OIDC, and storage account access keys
- Azure Monitor diagnostic settings

## Sources Consulted
- OpenTofu azurerm backend documentation: https://opentofu.org/docs/language/settings/backends/azurerm/
- OpenTofu backend configuration documentation: https://opentofu.org/docs/language/settings/backends/configuration/
- Terraform azurerm backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- AzureRM provider `azurerm_storage_account` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- AzureRM provider `azurerm_storage_container` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_container
- Azure CLI `az storage account` documentation: https://learn.microsoft.com/en-us/cli/azure/storage/account
- Azure CLI `az storage account blob-service-properties` documentation: https://learn.microsoft.com/en-us/cli/azure/storage/account/blob-service-properties
- Azure CLI `az storage container` documentation: https://learn.microsoft.com/en-us/cli/azure/storage/container
- Azure CLI `az storage blob service-properties delete-policy` documentation: https://learn.microsoft.com/en-us/cli/azure/storage/blob/service-properties/delete-policy
- Azure Monitor supported logs for Blob services: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-storage-storageaccounts-blobservices-logs
- Azure CLI `az monitor diagnostic-settings` documentation: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings

## Issues Found
- The AzureRM provider example used `storage_account_name` for `azurerm_storage_container`, which is deprecated in favor of `storage_account_id`. Updated the container resource to use `storage_account_id = azurerm_storage_account.state.id`.
- The AzureRM provider example mirrored the CLI storage account hardening but did not disable nested public blob/container access. Added `allow_nested_items_to_be_public = false` to match the current AzureRM provider setting for disabling public access on nested items.
- The service principal, managed identity, and OIDC backend examples assigned or implied data-plane access with `Storage Blob Data Contributor` but did not set `use_azuread_auth = true`. Without that setting, OpenTofu may try to obtain and use storage account keys instead of authenticating directly to the Blob service with Entra ID. Added `use_azuread_auth = true` to those examples.
- The OIDC environment-variable comment said to set the OIDC token, but the snippet enables OIDC and identifies the federated credential rather than providing a token directly. Updated the comment to avoid implying `ARM_OIDC_TOKEN` is being set.
- The security section described `--default-action Deny` as disabling public network access. That command denies access by default through storage account network rules, while public network access remains selectively configurable. Updated the comment to "Deny public network access by default."
- The diagnostic-settings command targeted the storage account resource, but the `StorageRead`, `StorageWrite`, and `StorageDelete` categories are Blob service categories for `Microsoft.Storage/storageAccounts/blobServices`. Updated the resource ID to include `/blobServices/default` and added `StorageDelete` for audit completeness.

## Review Notes
- `az`, `tofu`, and `terraform` were not installed in the local workspace, so command validation was performed against official documentation rather than local CLI help or live execution.
- The Azure CLI data-plane storage commands omit `--auth-mode login`, which is valid when the signed-in principal can query storage account keys. In environments where shared-key access is disabled or only data-plane RBAC is granted, users should add `--auth-mode login` and ensure the caller has an appropriate Storage Blob Data role.
