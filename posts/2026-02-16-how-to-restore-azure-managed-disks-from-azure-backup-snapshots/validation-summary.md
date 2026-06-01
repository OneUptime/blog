# Validation Summary: How to Restore Azure Managed Disks from Azure Backup Snapshots

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Azure Backup
- Azure Recovery Services vaults
- Azure Virtual Machines
- Azure Managed Disks
- Azure CLI
- Azure PowerShell Az.Compute
- Cross Region Restore

## Sources Consulted
- Microsoft Learn: How to restore Azure VM data in Azure portal - https://learn.microsoft.com/en-us/azure/backup/backup-azure-arm-restore-vms
- Microsoft Learn: About Azure Virtual Machine restore - https://learn.microsoft.com/en-us/azure/backup/about-azure-vm-restore
- Microsoft Learn: az backup restore restore-disks - https://learn.microsoft.com/en-us/cli/azure/backup/restore?view=azure-cli-latest#az-backup-restore-restore-disks
- Microsoft Learn: az backup recoverypoint list - https://learn.microsoft.com/en-us/cli/azure/backup/recoverypoint?view=azure-cli-latest#az-backup-recoverypoint-list
- Microsoft Learn: az vm disk attach - https://learn.microsoft.com/en-us/cli/azure/vm/disk?view=azure-cli-latest#az-vm-disk-attach
- Microsoft Learn: Set-AzVMOSDisk - https://learn.microsoft.com/en-us/powershell/module/az.compute/set-azvmosdisk
- Microsoft Learn: Add-AzVMDataDisk - https://learn.microsoft.com/en-us/powershell/module/az.compute/add-azvmdatadisk
- Microsoft Learn: Remove-AzVMDataDisk - https://learn.microsoft.com/en-us/powershell/module/az.compute/remove-azvmdatadisk

## Issues Found
- The post described "Restore as files" as downloading disk data as VHD files to a storage account. Azure VM file recovery is for browsing and copying selected files, while VHD files are staging artifacts created only for supported vault-tier disk restores. Updated the restore option, diagram, and VHD section to reflect this distinction.
- The Azure CLI disk attach example used `az vm disk attach --disk`, which is not a supported argument. Replaced it with `--name` using the managed disk resource ID, which the command supports.
- The PowerShell OS disk swap used `Set-AzVMOSDisk` without specifying `-CreateOption Attach`. Added `-CreateOption Attach` for attaching an existing restored managed disk.
- The post stated that CRR recovery points are typically 12-24 hours behind. Microsoft documentation states Azure VM secondary-region RPO can be up to 36 hours in the worst case. Updated the CRR explanation and noted that secondary-region restores use vault-tier data because snapshots are not replicated to the secondary region.
- The performance section included fixed restore-duration estimates for specific disk sizes. Replaced them with a more accurate statement that restore duration depends on disk size, tier, storage configuration, and service throughput.
- The snapshot-tier description said snapshot data is stored in the resource group. Updated this to match Microsoft documentation: snapshot-tier recovery points are stored with the disks and avoid vault copy-back wait time.

## Review Notes
Azure CLI was not installed in the local environment, so command validation was performed against current official Microsoft Learn CLI reference pages rather than local `az --help` output.
