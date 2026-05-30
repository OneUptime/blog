# Validation Summary: How to Troubleshoot Failed Migrations in Azure Database Migration Service

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Database Migration Service
- Azure CLI
- Azure Monitor metrics
- Azure SQL Database
- SQL Server
- SQL Server transaction log backups
- SQL Server change data capture concepts
- Azure Virtual Network and VPN connectivity

## Sources Consulted
- Microsoft Learn: Azure CLI `az dms` command reference, https://learn.microsoft.com/en-gb/cli/azure/dms?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az dms project task` command reference, https://learn.microsoft.com/en-us/cli/azure/dms/project/task?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az monitor metrics` command reference, https://learn.microsoft.com/en-us/cli/azure/monitor/metrics?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az sql server vnet-rule` command reference, https://learn.microsoft.com/en-us/cli/azure/sql/server/vnet-rule?view=azure-cli-lts
- Microsoft Learn: Azure CLI `az network vnet subnet` command reference, https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet?view=azure-cli-lts
- Microsoft Learn: Azure Database Migration Service documentation, https://learn.microsoft.com/en-us/azure/dms/
- Microsoft Learn: Azure Database Migration Service FAQ, https://learn.microsoft.com/en-us/azure/dms/faq
- Microsoft Learn: Tutorial: Migrate SQL Server to Azure SQL Database (offline), https://learn.microsoft.com/en-gb/data-migration/sql-server/database/database-migration-service
- Microsoft Learn: Tutorial: Migrate SQL Server to SQL Server on an Azure Virtual Machine with Azure DMS (online), https://learn.microsoft.com/en-us/data-migration/sql-server/virtual-machines/database-migration-service-online
- Microsoft Learn: Troubleshoot DMS errors when connecting to source databases, https://learn.microsoft.com/en-us/azure/dms/known-issues-troubleshooting-dms-source-connectivity
- Microsoft Learn: SQL Server transaction log backups, https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/transaction-log-backups-sql-server
- Microsoft Learn: Create a full database backup, https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/create-a-full-database-backup-sql-server

## Issues Found
- The post used a `FailedMigrations` Azure Monitor metric as if it were a documented DMS platform metric. Changed the command to `az monitor metrics list-definitions` and clarified that per-migration failures should be checked through migration monitoring or task output.
- The post did not clarify that the shown `az dms` commands are for the DMS classic command group. Added that note.
- The subnet query used the older singular `addressPrefix` field. Updated it to query `addressPrefixes[]`.
- The post stated that DMS never creates the target database. Narrowed this to Azure SQL Database migrations, where the target database must be prepared before migration.
- The post incorrectly generalized primary-key and CDC requirements to all online migrations. Clarified that this applies to some replication-based online migration modes, while SQL Server online migrations to SQL Server on Azure VMs and Azure SQL Managed Instance use backup and transaction-log restore.
- The post recommended `BACKUP DATABASE ... TO DISK = 'NUL'` to initialize the log chain. Replaced it with a real backup file destination.
- The post described log truncation as if DMS must read the log before backups truncate it. Updated this to the more accurate backup-chain/access problem for backup-based SQL Server online migrations.
- The post used `az dms update --sku-name`, which is not in the current documented DMS classic CLI command set. Replaced it with `az dms list-skus` and guidance to create or use a larger DMS instance.
- The data truncation SQL example selected `COLUMN_NAME` while checking a concrete column value, which would not work as described. Replaced it with a valid `MAX(LEN(CustomerName))` query.
- The final checklist and wrap-up repeated the overgeneralized online migration requirements. Updated those lines to be source/target-specific.

## Review Notes
The article remains a broad troubleshooting guide and does not specify one exact DMS source-target pair throughout. Future improvements could split SQL Server to Azure SQL Database, SQL Server to Azure SQL Managed Instance, SQL Server to Azure VM, and open-source database migrations into separate sections because DMS behavior and prerequisites differ by scenario.
