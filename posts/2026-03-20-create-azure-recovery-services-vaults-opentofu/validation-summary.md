# Validation Summary: How to Create Azure Recovery Services Vaults with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL native syntax)
- AzureRM provider (`azurerm_recovery_services_vault`, `azurerm_backup_policy_vm`, `azurerm_backup_policy_file_share`, `azurerm_monitor_diagnostic_setting`, `azurerm_role_assignment`)
- Azure Recovery Services Vault
- Azure Backup
- Azure Site Recovery
- Azure Key Vault (managed identity / customer-managed keys)
- Azure Monitor diagnostic settings
- Azure Log Analytics

## Sources Consulted
- AzureRM provider docs — `azurerm_recovery_services_vault`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/recovery_services_vault
- AzureRM provider docs — `azurerm_backup_policy_vm`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/backup_policy_vm
- AzureRM provider docs — `azurerm_backup_policy_file_share`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/backup_policy_file_share
- AzureRM provider docs — `azurerm_monitor_diagnostic_setting`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting
- AzureRM provider source: https://github.com/hashicorp/terraform-provider-azurerm
- HCL native syntax spec: https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md
- Azure docs — Recovery Services Vault diagnostic categories (Azure Monitor)
- Azure docs — Storage redundancy (LRS / ZRS / GRS)

## Issues Found
1. **Invalid HCL syntax — semicolons used as attribute separators.** The `retention_weekly` and `retention_monthly` blocks under `azurerm_backup_policy_vm`, and the `retention_weekly` block under `azurerm_backup_policy_file_share`, used `;` to separate attributes on a single line (e.g. `retention_weekly { count = 12; weekdays = ["Sunday"] }`). The HCL native syntax spec only permits a `OneLineBlock` with at most one attribute; multiple attributes must be separated by newlines. Fixed by splitting each block onto multiple lines.
2. **`metric` block deprecated/removed in AzureRM 4.0.** The `azurerm_monitor_diagnostic_setting` resource no longer accepts the legacy `metric { category, enabled }` block in AzureRM v4 — it was renamed to `enabled_metric { category }` (no `enabled` sub-field). Fixed by replacing the `metric` block with `enabled_metric` and removing the now-invalid `enabled = true`.
3. **`soft_delete_enabled = false` is not allowed.** In current AzureRM, `soft_delete_enabled` is deprecated and soft delete is always on by Azure's secure-by-default policy — setting it to `false` will fail. The "Multiple Vaults" example used `soft_delete_enabled = each.key == "production" ? true : false`, which would error for `staging` and `development`. Fixed by removing that line from the multi-vault example. The main example, which sets it to `true`, was left unchanged (still valid, though redundant).

## Review Notes
- `soft_delete_enabled = true` in the first example is technically still valid but is deprecated and slated for removal in AzureRM v5. It is effectively a no-op since soft delete is always enabled. Future readers should be aware this attribute will go away.
- `retention_daily.count` for `azurerm_backup_policy_vm` has a minimum of 7 for newly created policies. The post uses 30 (fine).
- The `Key Vault Crypto Officer` role grants broad cryptographic privileges. For Recovery Services Vault customer-managed-key encryption, `Key Vault Crypto Service Encryption User` is the more narrowly scoped role typically recommended; however, `Key Vault Crypto Officer` will work and is not technically incorrect.
- The post does not pin a provider version. If readers run against AzureRM v3, the original `metric` block would still have worked; the corrected `enabled_metric` is the v4-compatible form, which is the current major version.
- The `azurerm_key_vault.backup_key` and `azurerm_log_analytics_workspace.main` references in the examples are not declared in the post, but this is acceptable in a tutorial that focuses on the Recovery Services Vault resources themselves.
