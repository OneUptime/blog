# Validation Summary: How to Set Up Azure NetApp Files Backup and Restore

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Azure NetApp Files
- Azure NetApp Files backup vaults, manual backups, policy-based backups, and restore
- Azure CLI
- Azure Monitor metric alerts
- Windows DNS and SMB client remount commands

## Sources Consulted
- Azure NetApp Files backup overview: https://learn.microsoft.com/en-us/azure/azure-netapp-files/backup-introduction
- Configure policy-based backups for Azure NetApp Files: https://learn.microsoft.com/en-us/azure/azure-netapp-files/backup-configure-policy-based
- Configure manual backups for Azure NetApp Files: https://learn.microsoft.com/en-us/azure/azure-netapp-files/backup-configure-manual
- Restore a backup to a new Azure NetApp Files volume: https://learn.microsoft.com/en-us/azure/azure-netapp-files/backup-restore-new-volume
- Manage backup vaults for Azure NetApp Files: https://learn.microsoft.com/en-us/azure/azure-netapp-files/backup-vault-manage
- Azure CLI `az netappfiles account backup-vault`: https://learn.microsoft.com/en-us/cli/azure/netappfiles/account/backup-vault
- Azure CLI `az netappfiles account backup-vault backup`: https://learn.microsoft.com/en-us/cli/azure/netappfiles/account/backup-vault/backup
- Azure CLI `az netappfiles account backup-policy`: https://learn.microsoft.com/en-us/cli/azure/netappfiles/account/backup-policy
- Azure CLI `az netappfiles volume`: https://learn.microsoft.com/en-us/cli/azure/netappfiles/volume
- Azure CLI `az netappfiles volume latest-backup-status`: https://learn.microsoft.com/en-us/cli/azure/netappfiles/volume/latest-backup-status
- Azure NetApp Files metrics: https://learn.microsoft.com/en-us/azure/azure-netapp-files/azure-netapp-files-metrics
- Azure Monitor supported metrics for Azure NetApp Files volumes: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-netapp-netappaccounts-capacitypools-volumes-metrics
- Register the Microsoft.NetApp resource provider: https://learn.microsoft.com/en-us/azure/azure-netapp-files/azure-netapp-files-register

## Issues Found
- The post used the deprecated/incorrect `ANFBackupPreview` feature registration flow. Replaced it with Microsoft.NetApp resource provider registration, which is the documented prerequisite.
- The backup vault command used `az netappfiles vault create`, which is not the current documented command group. Replaced it with `az netappfiles account backup-vault create`.
- The volume backup commands used `az netappfiles volume backup ...`, which does not match the current Azure CLI command group for backup vault backups. Replaced manual backup, list, and show commands with `az netappfiles account backup-vault backup ...`.
- The post claimed a volume must already have a snapshot before backup. Updated it because manual backups can create the point-in-time snapshot automatically, while an existing snapshot is optional.
- The policy assignment used `--backup-enabled` and `--vault-id`. Replaced them with the documented `--backup-vault-id`, `--backup-policy-id`, and `--policy-enforced` volume update parameters.
- The restore command used the old backup resource ID path and included an unsupported restore throughput estimate. Updated the backup ID path to the backup vault resource path and replaced the throughput claim with Microsoft guidance that large restores can take multiple hours.
- The Azure Monitor alert used a non-documented `BackupHealth` metric and scoped the alert to the NetApp account. Replaced it with the documented volume-level metric `CbsVolumeOperationComplete` scoped to the volume resource.
- The post described backups as regional disaster protection and implied standard Azure Storage billing. Updated the wording to say backups restore within the same region and that Azure NetApp Files backup has its own backup/restore capacity pricing model.
- Removed a conditional immutable-backup recommendation because it was not supported by the consulted Azure NetApp Files backup documentation.

## Review Notes
The Azure CLI was not installed in the local workspace, so command verification was performed against current Microsoft Learn CLI reference pages and Azure NetApp Files product documentation.
