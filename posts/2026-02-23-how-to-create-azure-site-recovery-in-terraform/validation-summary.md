# Validation Summary: How to Create Azure Site Recovery in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Site Recovery
- Azure Recovery Services vaults
- Azure virtual machines
- Azure virtual networks and storage accounts

## Sources Consulted
- HashiCorp AzureRM provider documentation for `azurerm_site_recovery_replicated_vm`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/site_recovery_replicated_vm
- HashiCorp AzureRM provider documentation for `azurerm_site_recovery_replication_policy`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/site_recovery_replication_policy
- HashiCorp AzureRM provider documentation for `azurerm_site_recovery_protection_container_mapping`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/site_recovery_protection_container_mapping
- HashiCorp AzureRM provider documentation for `azurerm_site_recovery_network_mapping`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/site_recovery_network_mapping
- HashiCorp AzureRM provider documentation for `azurerm_recovery_services_vault`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/recovery_services_vault
- HashiCorp AzureRM provider documentation for `azurerm_linux_virtual_machine`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine
- Microsoft Learn Azure Site Recovery reliability documentation: https://learn.microsoft.com/en-us/azure/reliability/reliability-site-recovery
- Microsoft Learn Azure Site Recovery recovery plans documentation: https://learn.microsoft.com/en-us/azure/site-recovery/recovery-plan-overview
- Microsoft Learn Azure Backup secure-by-default soft delete documentation: https://learn.microsoft.com/en-us/azure/backup/secure-by-default
- Microsoft Learn Azure Site Recovery troubleshooting documentation for application-consistent recovery points: https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-troubleshoot-replication

## Issues Found
- The provider constraint used AzureRM `~> 3.80`, while the examples were adjusted to current AzureRM v4 behavior. Updated it to `~> 4.0`.
- The Recovery Services vault example set `soft_delete_enabled = true`, but that argument is not present in current AzureRM v4 `azurerm_recovery_services_vault` documentation. Removed the argument and kept a note that soft delete is enabled by default for new vaults.
- The replicated VM example referenced `azurerm_linux_virtual_machine.web.os_disk[0].managed_disk_id`, which is not exported by current `azurerm_linux_virtual_machine`. Changed it to `azurerm_linux_virtual_machine.web.os_disk[0].id`.
- The application-consistent snapshot explanation said ASR uses VSS without qualifying the operating system. Updated it to clarify that VSS applies to Windows VMs and Linux application consistency requires custom scripts.
- The network mapping snippet referenced `azurerm_virtual_network.primary` without saying it must already exist in the configuration. Added a short comment to make that dependency explicit.
- The `for_each` replicated VM example omitted the explicit dependency on the protection container mapping and network mapping. Added the same `depends_on` block used in the single-VM example.

## Review Notes
Terraform CLI is not installed in this environment, so I could not run `terraform validate`. The snippets were checked manually against current official AzureRM provider documentation and Microsoft Learn documentation.
