# Validation Summary: How to Create Azure Key Vault Secrets with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Azure Key Vault
- HashiCorp `azurerm` provider (~> 3.0)
- Azure RBAC (built-in roles)
- Azure Monitor Diagnostic Settings
- Azure Log Analytics
- Azure Resource Manager (resource groups, virtual network subnets)

## Sources Consulted
- azurerm `azurerm_key_vault` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault
- azurerm `azurerm_key_vault_secret` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_secret
- azurerm `azurerm_monitor_diagnostic_setting` docs (GitHub source): https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/monitor_diagnostic_setting.html.markdown
- azurerm `azurerm_postgresql_flexible_server` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/postgresql_flexible_server
- Azure Key Vault RBAC built-in roles: https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide

## Issues Found
1. **AWS resource referenced inside an Azure tutorial** — In the "Multiple Secrets with for_each" example, the `database-host` secret value was sourced from `aws_db_instance.main.fqdn`, an AWS provider resource. Replaced with `azurerm_postgresql_flexible_server.main.fqdn`, which is the Azure-native equivalent and matches the rest of the post's azurerm-only resource set.
2. **Deprecated `metric` block in diagnostic settings** — In the "Diagnostic Settings" example, the `metric { category = "AllMetrics"; enabled = true }` block is the legacy form. The current azurerm documentation uses `enabled_metric { category = "AllMetrics" }` (no `enabled` field, since the block being present implies enabled). Updated to `enabled_metric` to match current provider documentation and avoid deprecation warnings.

## Review Notes
- The post pins `azurerm` to `~> 3.0`. Version 4.x is current and contains breaking changes (e.g. `features {}` block requirements, removal of some legacy attributes). Readers upgrading should consult the v3→v4 upgrade guide; the examples in this post would need minor adjustments under v4.
- `soft_delete_retention_days = 90` is the maximum allowed value (range is 7–90); this is correctly set for maximum recovery window.
- `purge_protection_enabled = true` cannot be disabled once set — worth noting for readers who may want to tear down vaults later, though this is intentional security behaviour.
- The "Key Vault Secrets Officer" / "Key Vault Secrets User" / "Key Vault Administrator" built-in role names are all valid Azure built-in role names per Microsoft's RBAC guide.
- `expiration_date` correctly uses RFC3339 format as required by the provider.
