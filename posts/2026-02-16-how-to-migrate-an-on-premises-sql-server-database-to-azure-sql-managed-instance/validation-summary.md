# Validation Summary: How to Migrate an On-Premises SQL Server Database to Azure SQL Managed Instance

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Azure SQL Managed Instance
- SQL Server
- Azure Database Migration Service
- Log Replay Service
- Azure CLI
- Transact-SQL backup and restore
- Azure Blob Storage and SAS tokens
- Microsoft Entra ID authentication

## Sources Consulted
- Microsoft Learn: Quickstart: Restore a database to Azure SQL Managed Instance with SSMS - https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/restore-sample-database-quickstart?view=azuresql
- Microsoft Learn: T-SQL differences between SQL Server and Azure SQL Managed Instance - https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/transact-sql-tsql-differences-sql-server?view=azuresql
- Microsoft Learn: Migrate databases from SQL Server by using Log Replay Service - Azure SQL Managed Instance - https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/log-replay-service-migrate?view=azuresql
- Microsoft Learn: az sql midb log-replay CLI reference - https://learn.microsoft.com/en-us/cli/azure/sql/midb/log-replay?view=azure-cli-latest
- Microsoft Learn: Migrate SQL Server to Azure SQL using the migration component in SSMS - https://learn.microsoft.com/en-us/ssms/migrate/migrate-sql-server-azure-sql
- Microsoft Learn: Azure Database Migration Service classic SQL scenarios retirement notice - https://learn.microsoft.com/en-us/answers/questions/1190831/retirement-notice-database-migration-service-%28clas
- Microsoft Learn: BACKUP (Transact-SQL) - https://learn.microsoft.com/en-us/sql/t-sql/statements/backup-transact-sql?view=sql-server-ver17

## Issues Found
- The migration-method table and decision diagram stated that native backup/restore was limited to 2 TB and that DMS/LRS had no limit. Updated this to say target restore limits apply, because SQL Managed Instance restore limits depend on tier and database characteristics.
- The SQL Managed Instance `RESTORE DATABASE` examples used `WITH STATS = 10`. Removed `WITH STATS` because SQL Managed Instance does not support `WITH` options on restore from URL and restore attempts with options such as `STATS` fail.
- The DMS section used the legacy `az dms create` flow. Replaced it with current supported migration workflows through the Azure portal or SSMS, and noted that Azure Database Migration Service classic is retired for SQL Server scenarios.
- The compatibility assessment step referenced Azure Data Studio and Data Migration Assistant as the primary path. Updated it to current supported Azure SQL migration assessment options, including Azure portal/Arc and SSMS.
- The DMS selection step said to select databases and tables. Changed it to databases, which matches SQL Managed Instance migration workflows.
- The LRS example reused a general read/write/list SAS token and pointed at the container root. Updated it to require a per-database backup folder and a read/list-only SAS token, because extra SAS permissions cause LRS startup to fail.
- Updated Azure AD references to the current Microsoft Entra ID name.

## Review Notes
- The post remains a high-level migration guide rather than a complete runbook. Future improvements could add Managed Instance link as a separate migration method and call out tier-specific restore limitations in more detail.
