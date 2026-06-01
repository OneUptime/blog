# Validation Summary: How to Configure Azure VM Backup and Restore with Recovery Services Vault

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Backup
- Azure Virtual Machines
- Recovery Services vault
- Azure CLI
- Azure Monitor alerts
- Cross-region restore

## Sources Consulted
- Microsoft Learn: Quickstart - Back up a virtual machine in Azure with the Azure CLI: https://learn.microsoft.com/en-us/azure/backup/quick-backup-vm-cli
- Microsoft Learn: Tutorial - Restore a VM with Azure CLI: https://learn.microsoft.com/en-us/azure/backup/tutorial-restore-disk
- Microsoft Learn: Azure CLI reference for az backup vault: https://learn.microsoft.com/en-us/cli/azure/backup/vault?view=azure-cli-latest
- Microsoft Learn: Azure CLI reference for az backup vault backup-properties: https://learn.microsoft.com/en-us/cli/azure/backup/vault/backup-properties?view=azure-cli-latest
- Microsoft Learn: Azure CLI reference for az backup protection: https://learn.microsoft.com/en-us/cli/azure/backup/protection?view=azure-cli-latest
- Microsoft Learn: Azure CLI reference for az backup policy: https://learn.microsoft.com/en-us/cli/azure/backup/policy?view=azure-cli-latest
- Microsoft Learn: Azure CLI reference for az backup restore: https://learn.microsoft.com/en-us/cli/azure/backup/restore?view=azure-cli-latest
- Microsoft Learn: Create backup policies via REST API in Azure Backup: https://learn.microsoft.com/en-us/azure/backup/backup-azure-arm-userestapi-createorupdatepolicy
- Microsoft Learn: Architecture - Built-in Azure VM Backup: https://learn.microsoft.com/en-us/azure/backup/backup-architecture
- Microsoft Learn: About Azure Virtual Machine restore: https://learn.microsoft.com/en-us/azure/backup/about-azure-vm-restore
- Microsoft Learn: Recover files from Azure virtual machine backup: https://learn.microsoft.com/en-us/azure/backup/backup-azure-restore-files-from-vm

## Issues Found
- The introduction said Azure Backup provides application-consistent backups of VMs generally. Updated this to "VM-level backups" because Windows VMs can use VSS application-consistent snapshots, but Linux VM backups are file-system consistent unless application-consistent scripts are configured.
- The DefaultPolicy retention list included weekly, monthly, and yearly retention. Corrected it to the documented default daily backup retention of 30 days.
- The custom backup policy JSON omitted the required `properties` wrapper and policy metadata used by Azure Recovery Services backup policy resources. Updated the JSON to include `properties`, `backupManagementType`, and `protectedItemsCount`.
- The on-demand backup command used BSD `date -v+30d` and emitted `YYYY-MM-DD`, while Azure CLI expects `--retain-until` in UTC `d-m-Y` format. Updated it to a GNU/Linux Cloud Shell-compatible `date -u -d "+30 days" +%d-%m-%Y`.
- The "Replace Existing VM Disks" example used `--restore-mode AlternateLocation`, which restores to another location. Changed it to `--restore-mode OriginalLocation` and removed `--target-resource-group` for the in-place restore example.
- The file recovery instructions said to run the recovery script on any machine. Corrected this to require a compatible OS and filesystem support.
- The cross-region restore command used a lowercase boolean and the explanation implied cross-region restore itself doubles storage cost. Updated the flag value to the documented `True` value and clarified that cross-region restore depends on a geo-redundant vault, which costs more than locally redundant storage.
- The backup alert example used `az monitor metrics alert create` with `BackupHealthEvent`, which is not the documented CLI path for built-in vault job-failure alerts. Replaced it with `az backup vault backup-properties set --job-failure-alerts Enable`.

## Review Notes
The Azure CLI was not installed in the local environment, so command verification was performed against Microsoft Learn's current Azure CLI reference and Azure Backup documentation rather than local `az --help` output.
