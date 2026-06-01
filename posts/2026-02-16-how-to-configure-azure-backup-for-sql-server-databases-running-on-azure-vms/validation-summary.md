# Validation Summary: How to Configure Azure Backup for SQL Server Databases Running on Azure VMs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Backup
- Recovery Services vaults
- SQL Server on Azure Virtual Machines
- Azure CLI
- Az.RecoveryServices PowerShell module
- SQL Server Always On availability groups
- Transparent Data Encryption

## Sources Consulted
- Microsoft Learn: About SQL Server Backup in Azure VMs - https://learn.microsoft.com/en-us/azure/backup/backup-azure-sql-database
- Microsoft Learn: Back up multiple SQL Server VMs from the Recovery Services vault - https://learn.microsoft.com/en-us/azure/backup/backup-sql-server-database-azure-vms
- Microsoft Learn: Support matrix for SQL Server Backup in Azure VMs - https://learn.microsoft.com/en-us/azure/backup/sql-support-matrix
- Microsoft Learn: Back up SQL databases in Azure VM using Azure CLI - https://learn.microsoft.com/en-us/azure/backup/backup-azure-sql-backup-cli
- Microsoft Learn: Manage SQL server databases in Azure VMs using Azure Backup via CLI - https://learn.microsoft.com/en-us/azure/backup/backup-azure-sql-manage-cli
- Microsoft Learn: az backup policy CLI reference - https://learn.microsoft.com/en-us/cli/azure/backup/policy
- Microsoft Learn: Register-AzRecoveryServicesBackupContainer - https://learn.microsoft.com/en-us/powershell/module/az.recoveryservices/register-azrecoveryservicesbackupcontainer
- Microsoft Learn: Enable-AzRecoveryServicesBackupAutoProtection - https://learn.microsoft.com/en-us/powershell/module/az.recoveryservices/enable-azrecoveryservicesbackupautoprotection
- Microsoft Learn: Restore SQL Server databases on Azure VMs - https://learn.microsoft.com/en-us/azure/backup/restore-sql-database-azure-vm
- Microsoft Learn: About Azure VM backup - https://learn.microsoft.com/en-us/azure/backup/backup-azure-vms-introduction
- Microsoft Learn: Back up SQL Server Always On availability groups - https://learn.microsoft.com/en-us/azure/backup/backup-sql-server-on-availability-groups
- Microsoft Learn: Manage Azure Monitor based alerts for Azure Backup - https://learn.microsoft.com/en-us/azure/backup/backup-azure-monitoring-alerts

## Issues Found
- Corrected VM-level backup wording. Azure VM Backup can produce application-consistent VSS snapshots and can restore VMs, disks, or files, but it does not provide SQL database-level point-in-time recovery using transaction logs.
- Corrected SQL backup policy schedule details. Azure Backup supports daily full backups by default, weekly full backups when differential backups are used, and differential backups up to once per day, not every 12 hours.
- Corrected the Azure CLI policy example to reference a policy JSON file and added a valid policy JSON structure with `properties`, `workLoadType`, compression settings, schedule policies, retention policies, and `protectedItemsCount`.
- Corrected prerequisites to match the support matrix: SQL Server 2012 or later on Windows Azure VMs, .NET Framework 4.6.2 or later, Azure VM Agent, required endpoint connectivity, and SQL sysadmin permissions for the workload extension service account.
- Added retrieval of `$backupPolicy` in the PowerShell auto-protection snippet so the example defines the policy object before passing it to `Enable-AzRecoveryServicesBackupAutoProtection`.
- Corrected point-in-time recovery wording to say restore time can be selected to the second within the retained log chain, with RPO up to the configured log backup interval.
- Corrected Always On availability group behavior. Full and differential backups run on the primary replica; copy-only full and log backups use the AG backup preference. Also added the `AUTOMATED_BACKUP_PREFERENCE` setting to the SQL example.
- Corrected monitoring examples to use Azure Backup alert scenarios such as backup failures, restore failures, and backup data deletion.
- Corrected log chain break wording. A manual log backup outside Azure Backup, recovery model changes, or database offline events can interrupt the log chain; a manual full backup alone is not the typical cause.
- Added the system database caveat that differential backup is not supported for the `master` database.

## Review Notes
Azure CLI and Az PowerShell were not installed in the local environment, so command validation was performed against current Microsoft Learn command references and Azure Backup documentation. The embedded JSON policy was checked locally with `jq`.
