# Validation Summary: How to Restore Individual Files from an Azure VM Backup Using Instant Restore

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Backup
- Azure VM file recovery
- Recovery Services vault
- Azure Instant Restore / snapshot-tier recovery points
- iSCSI
- Windows PowerShell
- Linux shell commands
- Azure CLI and Azure PowerShell recovery-point unmount operations

## Sources Consulted
- Microsoft Learn: Recover files from Azure virtual machine backup - https://learn.microsoft.com/en-us/azure/backup/backup-azure-restore-files-from-vm
- Microsoft Learn: Restore files to a virtual machine in Azure - https://learn.microsoft.com/en-us/azure/backup/tutorial-restore-files
- Microsoft Learn: Back up and recover Azure VMs with PowerShell - https://learn.microsoft.com/en-us/azure/backup/backup-azure-vms-automation
- Microsoft Learn: Restore encrypted Azure VMs - https://learn.microsoft.com/en-us/azure/backup/restore-azure-encrypted-virtual-machines
- Microsoft Learn: Azure Instant Restore capability - https://learn.microsoft.com/en-us/azure/backup/backup-instant-restore-capability
- Microsoft Learn: Azure CLI backup restore commands - https://learn.microsoft.com/en-us/cli/azure/backup/restore

## Issues Found
- Corrected the generated recovery artifact description. Azure provides a Windows executable or a Linux Python script, not a Windows PowerShell script.
- Corrected recovery machine prerequisites. Microsoft documents OS compatibility requirements, Python 2.6.6+, bash 4+, .NET 4.6.2+ for Windows, and Linux open-iscsi/lshw components.
- Corrected network requirements. File recovery needs access to download.microsoft.com over HTTPS and Recovery Services URLs over outbound port 3260 for iSCSI, not only outbound HTTPS.
- Added the Resource Manager and Recovery Services vault support boundary for file/folder recovery.
- Corrected Azure Disk Encryption guidance. Azure Backup does not support file/folder-level recovery from ADE-encrypted VM backups; users must restore the VM or disks instead.
- Corrected Linux mount path behavior. Microsoft documents that Linux volumes are mounted under the directory where the script is run, not under `/mnt/vmmount/` by default.
- Corrected LVM/RAID handling. For Linux VMs using LVM or software RAID, the script should not be run on the same backed-up VM; the user may need to activate and mount logical volumes manually from script output.
- Corrected large restore guidance. Microsoft recommends file recovery when total recovery size is 10 GB or less and documents expected speeds around 1 GB per hour.
- Corrected unmount instructions. Official cleanup is via the Azure portal's Unmount Disks action, Azure CLI `az backup restore files unmount-rp`, or Azure PowerShell `Disable-AzRecoveryServicesBackupRPMountScript`; the Linux script `clean` parameter only removes orphaned mount paths after access is closed.

## Review Notes
The remaining file copy examples use standard PowerShell, robocopy, rsync, and checksum commands and are syntactically plausible. The example mount paths and file names are illustrative; users must substitute the exact script name and paths printed by Azure Backup.
