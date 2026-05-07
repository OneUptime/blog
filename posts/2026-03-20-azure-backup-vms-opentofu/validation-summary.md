# Validation Summary: How to Back Up Azure VMs with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AzureRM provider
- Azure Backup
- Recovery Services vaults
- Azure virtual machines
- Azure Monitor built-in backup alerts

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- AzureRM features block: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/guides/features-block.html.markdown
- AzureRM Recovery Services vault resource: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/recovery_services_vault.html.markdown
- AzureRM VM backup policy resource: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/backup_policy_vm.html.markdown
- AzureRM protected VM resource: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/backup_protected_vm.html.markdown
- AzureRM resources data source: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/d/resources.html.markdown
- AzureRM virtual machine data source: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/d/virtual_machine.html.markdown
- HashiCorp support note for AzureRM 4.x `subscription_id`: https://support.hashicorp.com/hc/en-us/articles/40621007246099-Required-subscription-id-Error-in-Terraform-with-AzureRM
- Azure VM backup overview: https://learn.microsoft.com/en-us/azure/backup/backup-azure-vms-introduction
- Azure Backup secure-by-default soft delete: https://learn.microsoft.com/en-us/azure/backup/secure-by-default
- Immutable vault for Azure Backup: https://learn.microsoft.com/en-us/azure/backup/backup-azure-immutable-vault-concept
- Create and configure Recovery Services vaults: https://learn.microsoft.com/en-us/azure/backup/backup-create-recovery-services-vault
- Azure Backup support matrix: https://learn.microsoft.com/en-us/azure/backup/backup-support-matrix
- Monitor and manage Recovery Services vaults: https://learn.microsoft.com/en-us/azure/backup/backup-azure-manage-windows-server

## Issues Found
- The provider block used AzureRM `~> 3.0` and an invalid feature flag, `recover_soft_deleted_vms_after_cleanup`. I updated the example to AzureRM `~> 4.0`, added the required `subscription_id`, and replaced the feature flag with the documented `recover_soft_deleted_backup_protected_vm`.
- The vault example set `soft_delete_enabled = true`. In current Azure Backup behavior, soft delete is enforced by secure-by-default and the provider marks `soft_delete_enabled` as deprecated for Recovery Services vaults, so I removed it.
- The vault storage comment listed unsupported shorthand values (`LRS`, `GRS`, `ZRS`) for `storage_mode_type`. I changed the comment to the accepted values `GeoRedundant`, `LocallyRedundant`, and `ZoneRedundant`.
- The immutability comment overstated the behavior as preventing general vault modification and deletion. I revised it to reflect the documented purpose of immutability: blocking destructive changes that could lead to loss of recovery points.
- The VM protection example referenced `azurerm_virtual_machine` resources that were not defined and that resource type is superseded for new AzureRM usage. I changed the example to use the documented `data "azurerm_virtual_machine"` data source and wired `source_vm_id` to those IDs.
- The `Backup Alert` section used a nonexistent resource name, `azurerm_monitor_alert_rule_action_group`, with unsupported arguments. I replaced it with the documented `monitoring` block on `azurerm_recovery_services_vault`, which enables built-in Azure Monitor alerts for backup job failures.
- The intro text implied Azure VM backup always produces application-consistent snapshots. I corrected it to note that Azure Backup provides application-consistent or file-system-consistent snapshots, depending on workload and configuration.

## Review Notes
- Microsoft documents that classic Recovery Services vault alerts were retired on March 31, 2026. The corrected alert example uses the vault's built-in Azure Monitor alert configuration instead of the retired classic alert model.
- `cross_region_restore_enabled = true` is valid only with `storage_mode_type = "GeoRedundant"`, which the post already does correctly.
- The monthly and yearly retention blocks in `azurerm_backup_policy_vm` were reviewed against current provider documentation and are valid as written.
- The post remains a technically relevant how-to guide after these corrections.
