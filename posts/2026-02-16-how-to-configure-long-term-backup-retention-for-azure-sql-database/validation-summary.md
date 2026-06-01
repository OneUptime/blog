# Validation Summary: How to Configure Long-Term Backup Retention for Azure SQL Database

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure SQL Database
- Azure SQL Database long-term retention (LTR) backups
- Azure Blob Storage backup storage
- Azure CLI
- Azure PowerShell Az.Sql module

## Sources Consulted
- Microsoft Learn: Long-term retention backups - Azure SQL Database and Azure SQL Managed Instance - https://learn.microsoft.com/en-us/azure/azure-sql/database/long-term-retention-overview
- Microsoft Learn: Manage Azure SQL Database long-term backup retention - https://learn.microsoft.com/en-us/azure/azure-sql/database/long-term-backup-retention-configure
- Microsoft Learn: Azure CLI `az sql db ltr-policy` reference - https://learn.microsoft.com/en-us/cli/azure/sql/db/ltr-policy
- Microsoft Learn: Azure CLI `az sql db ltr-backup` reference - https://learn.microsoft.com/en-us/cli/azure/sql/db/ltr-backup
- Microsoft Learn: `Set-AzSqlDatabaseBackupLongTermRetentionPolicy` PowerShell reference - https://learn.microsoft.com/en-us/powershell/module/az.sql/set-azsqldatabasebackuplongtermretentionpolicy
- Microsoft Learn: `Get-AzSqlDatabaseLongTermRetentionBackup` PowerShell reference - https://learn.microsoft.com/en-us/powershell/module/az.sql/get-azsqldatabaselongtermretentionbackup
- Microsoft Learn: `Restore-AzSqlDatabase` PowerShell reference - https://learn.microsoft.com/en-us/powershell/module/az.sql/restore-azsqldatabase
- Microsoft Learn: Change automated backup settings in Azure SQL Database - https://learn.microsoft.com/en-us/azure/azure-sql/database/automated-backups-change-settings
- Microsoft Learn: Backup immutability for long-term retention backups in Azure SQL Database - https://learn.microsoft.com/en-us/azure/azure-sql/database/backup-immutability

## Issues Found
- The post stated that LTR backups are always geo-redundant and stored in the paired Azure region. Microsoft documents geo-redundant backup storage as the default, with other backup storage redundancy options available. Updated the wording and diagram to describe redundant backup storage accurately.
- The Azure CLI `az sql db ltr-backup list` examples omitted the required `--location` parameter. Added `--location eastus` to each LTR backup list example.
- The portal configuration section said the policy takes effect immediately and the next eligible backup is retained. Microsoft documents that first-time LTR enablement copies the most recent full backup and that the first LTR backup can take up to 7 days to appear. Updated the text accordingly.
- The post said deleting the SQL server deletes all LTR backups. Microsoft documents that LTR backups are not deleted when a logical server is deleted and can be restored to a different server in the same subscription. Corrected the server deletion note.
- The summary repeated the absolute geo-redundancy claim. Reworded it to say the backups are stored in redundant Azure Blob Storage.

## Review Notes
Azure CLI was not installed in the local workspace, so CLI validation was performed against the official Microsoft Learn CLI reference rather than local `az --help` output. Microsoft also documents immutable LTR backups; for Azure SQL Database, immutable LTR backups can affect deletion behavior, but the post does not cover immutability configuration.
