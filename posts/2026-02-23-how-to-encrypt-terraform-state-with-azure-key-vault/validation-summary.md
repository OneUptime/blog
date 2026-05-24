# Validation Summary: How to Encrypt Terraform State with Azure Key Vault

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Terraform (1.0+, examples assume 1.7.0 in CI/CD)
- AzureRM Terraform Provider (~> 3.85)
- Azure Key Vault (customer-managed keys, RBAC, access policies, rotation policies)
- Azure Storage Account (Blob Storage, CMK encryption, GRS replication)
- Azure User-Assigned Managed Identity
- Azure Monitor diagnostic settings & Log Analytics workspace
- Azure CLI (`az keyvault`, `az storage`, `az monitor log-analytics`)
- Terraform azurerm backend with Azure AD authentication
- GitHub Actions for Terraform CI/CD

## Sources Consulted
- Terraform AzureRM Provider docs — `azurerm_key_vault`: https://registry.terraform.io/providers/hashicorp/azurerm/3.85.0/docs/resources/key_vault
- Terraform AzureRM Provider docs — `azurerm_key_vault_key` (rotation_policy block): https://registry.terraform.io/providers/hashicorp/azurerm/3.85.0/docs/resources/key_vault_key
- Terraform AzureRM Provider docs — `azurerm_storage_account` (customer_managed_key block): https://registry.terraform.io/providers/hashicorp/azurerm/3.85.0/docs/resources/storage_account
- Terraform AzureRM Provider docs — `azurerm_monitor_diagnostic_setting`: https://registry.terraform.io/providers/hashicorp/azurerm/3.85.0/docs/resources/monitor_diagnostic_setting
- Terraform azurerm backend docs (use_azuread_auth): https://developer.hashicorp.com/terraform/language/backend/azurerm
- Microsoft Learn — Azure Key Vault logging (OperationName values): https://learn.microsoft.com/en-us/azure/key-vault/general/logging
- Microsoft Learn — Customer-managed keys for Azure Storage encryption: https://learn.microsoft.com/en-us/azure/storage/common/customer-managed-keys-overview
- Microsoft Learn — Key Vault built-in roles (Key Vault Crypto Officer, Key Vault Crypto Service Encryption User): https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide
- Azure CLI reference — `az keyvault key rotate`, `az keyvault recover`, `az storage account failover`: https://learn.microsoft.com/en-us/cli/azure/keyvault/key
- `hashicorp/setup-terraform@v3` GitHub Action: https://github.com/hashicorp/setup-terraform

## Issues Found
- **Incorrect OperationName values in KQL audit query.** The audit query referenced `KeyWrapKey` and `KeyUnwrapKey` as Key Vault operation names, but per Microsoft's Key Vault logging documentation the correct OperationName values are `KeyWrap` and `KeyUnwrap`. Updated the `where OperationName in (...)` clause to use the correct values so the query actually returns matching log records.

## Review Notes
- The post pins `azurerm` to `~> 3.85`. The `metric { category = "AllMetrics" }` block in `azurerm_monitor_diagnostic_setting` is valid for 3.x but was removed in azurerm 4.x in favor of `enabled_metric` — readers upgrading the provider should be aware of this.
- The inline `customer_managed_key` block on `azurerm_storage_account` works, but Hashicorp also provides a separate `azurerm_storage_account_customer_managed_key` resource that can avoid circular-dependency issues in some setups. Either approach is technically correct.
- `purge_protection_enabled = true` is intentionally noted as required for CMK on storage — this is accurate; Azure rejects associating a key vault key for storage CMK if purge protection is not enabled.
- `soft_delete_retention_days = 90` is at the maximum allowed value (range 7–90).
- The `use_azuread_auth = true` backend argument is supported by recent azurerm provider versions and is correctly recommended over shared-key auth.
- The Built-in RBAC role names "Key Vault Crypto Officer" and "Key Vault Crypto Service Encryption User" are correct per Microsoft's RBAC guide.
- The `rotation_policy` ISO 8601 durations (`P30D`, `P365D`) are valid and accepted by the AzureRM provider.
