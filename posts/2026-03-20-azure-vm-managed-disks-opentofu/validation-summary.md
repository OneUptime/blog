# Validation Summary: How to Configure Azure VM Managed Disks with OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu / HCL
- Azure Managed Disks
- Azure Ultra Disk
- Azure Disk Encryption Set
- Azure Key Vault
- Azure CLI
- Azure Monitor

## Sources Consulted
- AzureRM provider `azurerm_managed_disk`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/managed_disk
- AzureRM provider `azurerm_snapshot`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/snapshot
- AzureRM provider `azurerm_virtual_machine_data_disk_attachment`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_machine_data_disk_attachment
- AzureRM provider `azurerm_disk_encryption_set`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/disk_encryption_set
- Select a disk type for Azure IaaS VMs - managed disks: https://learn.microsoft.com/en-us/azure/virtual-machines/disks-types
- Enable on-demand disk bursting: https://learn.microsoft.com/en-us/azure/virtual-machines/disks-enable-bursting
- Create incremental snapshots for managed disks: https://learn.microsoft.com/en-us/azure/virtual-machines/disks-incremental-snapshots
- Enable customer-managed keys with SSE for managed disks (CLI): https://learn.microsoft.com/en-us/azure/virtual-machines/linux/disks-enable-customer-managed-keys-cli
- Azure Monitor CLI metrics reference: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics?view=azure-cli-lts
- Azure CLI disk reference: https://learn.microsoft.com/en-us/cli/azure/disk?view=azure-cli-latest
- Expand Virtual Hard Disks on a Linux VM: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/expand-disks
- Expand Virtual Hard Disks Attached to a Windows VM in Azure: https://learn.microsoft.com/en-us/azure/virtual-machines/windows/expand-disks

## Issues Found
- The introduction said managed disks "come in four types," which is outdated. I updated it to reflect the current Azure disk families relevant to the topic, including Premium SSD v2, and clarified that bursting applies only to some disk types.
- The `azurerm_managed_disk` examples used `zones = ["1"]`, but the current AzureRM resource uses `zone = "1"`. I corrected both managed disk examples and fixed the misleading "zone-redundant deployment" wording.
- The Premium SSD example enabled `on_demand_bursting_enabled = true` on a 512 GiB disk. Azure documents on-demand bursting only for Premium SSDs larger than 512 GiB, so I increased the example disk to 1024 GiB and corrected the conclusion accordingly.
- The Ultra Disk performance comments were outdated. I updated the max IOPS and throughput references to current Azure limits.
- The customer-managed key section omitted required Key Vault prerequisites and could race disk creation before the Disk Encryption Set had access to the key. I added the Key Vault prerequisite and a `depends_on` on the encrypted disk.
- The incremental snapshot explanation implied every incremental snapshot stores only deltas. Azure documents that the first incremental snapshot is a full copy, so I corrected the snapshot comment and the conclusion.
- The Azure CLI example used a less precise metrics flag form and oversimplified disk resize behavior. I updated the metrics example to `--metrics` and corrected the resize note to match Azure's current online expansion behavior for data disks versus OS disks.

## Review Notes
- The Key Vault example is written for the access-policy permission model. If the target Key Vault uses Azure RBAC, the access grant needs to be implemented with a role assignment instead of `azurerm_key_vault_access_policy`.
- The snapshot resource models a single declarative snapshot object. Recurring backup schedules or rotating snapshot sets would need separate orchestration outside this single static resource definition.
- `az` and `tofu` were not installed in the local review environment, so CLI and provider behavior were verified against current official documentation rather than local `--help` output.
