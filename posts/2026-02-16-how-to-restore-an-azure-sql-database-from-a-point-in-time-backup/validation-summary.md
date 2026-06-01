# Validation Summary: How to Restore an Azure SQL Database from a Point-in-Time Backup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure SQL Database
- Azure SQL Database automatic backups
- Point-in-time restore
- Azure CLI
- Azure PowerShell
- Transact-SQL
- Long-term retention and geo-restore concepts

## Sources Consulted
- Microsoft Learn: Restore a database from a backup in Azure SQL Database - https://learn.microsoft.com/en-us/azure/azure-sql/database/recovery-using-backups?view=azuresql
- Microsoft Learn: Automatic, geo-redundant backups - Azure SQL Database - https://learn.microsoft.com/en-us/azure/azure-sql/database/automated-backups-overview?view=azuresql-db
- Microsoft Learn: Change automated backup settings for Azure SQL Database - https://learn.microsoft.com/en-us/azure/azure-sql/database/automated-backups-change-settings?view=azuresql
- Microsoft Learn: Azure CLI `az sql db restore` reference - https://learn.microsoft.com/en-us/cli/azure/sql/db?view=azure-cli-latest#az-sql-db-restore
- Microsoft Learn: Azure CLI `az sql db str-policy set` reference - https://learn.microsoft.com/en-us/cli/azure/sql/db/str-policy?view=azure-cli-latest#az-sql-db-str-policy-set
- Microsoft Learn: Azure CLI `az sql db rename` reference - https://learn.microsoft.com/en-us/cli/azure/sql/db?view=azure-cli-latest#az-sql-db-rename
- Microsoft Learn: Restore-AzSqlDatabase cmdlet reference - https://learn.microsoft.com/en-us/powershell/module/az.sql/restore-azsqldatabase
- Microsoft Learn: CREATE DATABASE (Transact-SQL), Azure SQL Database syntax - https://learn.microsoft.com/en-us/sql/t-sql/statements/create-database-transact-sql
- Microsoft Learn: Long-term retention backups - Azure SQL Database and Azure SQL Managed Instance - https://learn.microsoft.com/en-us/azure/azure-sql/database/long-term-retention-overview?view=azuresql

## Issues Found
- The post said default retention depended on tier, with Standard and Premium defaulting to 35 days. Current Microsoft documentation states new, restored, and copied Azure SQL databases retain PITR backups for 7 days by default, with Basic configurable from 1-7 days and other tiers from 1-35 days. Updated the retention section.
- The post described transaction log backups as every 5-10 minutes. Current Azure SQL Database documentation says transaction log backups occur approximately every 10 minutes. Updated the text and diagram.
- The backup overview applied full, differential, and transaction log backup behavior to all tiers including Hyperscale. Microsoft documents that Hyperscale uses a different backup architecture. Added a short caveat while preserving the existing explanation for other tiers.
- The portal and CLI sections implied point-in-time restore could target a different server. Current Azure SQL Database documentation says PITR restores to the same server, and cross-server PITR is not supported. Corrected the portal wording and replaced the unsupported CLI command with accurate alternatives.
- The post included unsupported T-SQL syntax for Azure SQL Database point-in-time restore. Microsoft documentation states Azure SQL Database backup recovery cannot use Transact-SQL. Replaced the example with the documented limitation and noted T-SQL can still be used for post-restore renaming.
- The database swap section had ambiguous wording about connection strings after renaming. Clarified that application connection strings using the original database name will point to the restored database only after it is renamed to the original name.
- The best-practices section said acting quickly affects how close the restore can get to the incident. Clarified that the latest restorable point depends on the latest available transaction log backup.
- The geo-restore note said point-in-time restore works within the same region. Current documentation is more specific: PITR restores to the same server, while geo-restore is used with geo-redundant or geo-zone-redundant backups for regional recovery. Updated the wording.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI syntax was verified against the official Microsoft Learn CLI reference rather than local `az --help` output. Restore duration estimates in the post are rough operational guidance; Microsoft documents the factors that affect restore time but does not publish exact fixed duration bands.
