# Validation Summary: How to Copy an Azure SQL Database to Another Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure SQL Database
- Transact-SQL
- Azure CLI
- BACPAC export/import
- SqlPackage
- Geo-restore

## Sources Consulted
- Microsoft Learn: Copy a transactionally consistent copy of a database in Azure SQL Database - https://learn.microsoft.com/en-us/azure/azure-sql/database/database-copy?view=azuresql
- Microsoft Learn: sys.dm_database_copies (Azure SQL Database) - https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-database-copies-azure-sql-database?view=azuresqldb-current
- Microsoft Learn: az sql db reference - https://learn.microsoft.com/en-us/cli/azure/sql/db?view=azure-cli-lts
- Microsoft Learn: az sql db geo-backup reference - https://learn.microsoft.com/en-us/cli/azure/sql/db/geo-backup?view=azure-cli-latest
- Microsoft Learn: Export to a BACPAC file - Azure SQL Database and Azure SQL Managed Instance - https://learn.microsoft.com/en-us/azure/azure-sql/database/database-export?view=azuresql
- Microsoft Learn: Restore a database from a backup in Azure SQL Database - https://learn.microsoft.com/en-us/azure/azure-sql/database/recovery-using-backups?view=azuresql

## Issues Found
- The post said the online database copy is transactionally consistent when the copy operation completes. Microsoft documentation describes database copy as a transactionally consistent snapshot at the point the copy request is initiated, so the wording was corrected.
- The target-side monitoring query selected `name` and `state_desc` directly from `sys.dm_database_copies`, but those columns are in `sys.databases`, not the DMV. The query now joins `sys.dm_database_copies` to `sys.databases`.
- The cross-server T-SQL section said the target server must have a login matching the source server admin. Microsoft documentation requires a login with the same name and password as the database owner on the source server, with appropriate `dbmanager` or server admin permissions on the target, so the requirement was corrected.
- The post stated or implied that online copy does not work across subscriptions. Microsoft documentation says Azure portal, PowerShell, and Azure CLI do not support cross-subscription copy, but T-SQL can be used when login and permission requirements are met. The affected bullets and cross-subscription section were corrected.
- The Azure CLI service tier wording was too broad. Microsoft CLI documentation says the copy destination must use the same edition as the source database, though service objectives can be specified within supported limits and the edition can be changed after copy. The wording was corrected.
- The geo-restore CLI example used `az sql db restore` with a recoverable database resource ID shape that does not match the current Azure CLI geo-restore command. It was changed to `az sql db geo-backup restore` with `--dest-database`, `--dest-server`, and `--geo-backup-id`.

## Review Notes
The local environment did not have the Azure CLI installed, so CLI syntax was validated against the current Microsoft Learn Azure CLI reference rather than local `az --help` output.
