# Validation Summary: How to Perform an Online Migration Using Azure Database Migration Service

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Azure Database Migration Service
- SQL Server
- Azure SQL Managed Instance
- SQL Server on Azure Virtual Machines
- Azure CLI
- Transact-SQL backups and log backups

## Sources Consulted
- Microsoft Learn: Azure Database Migration Service supported migration scenarios - https://learn.microsoft.com/en-us/azure/dms/resource-scenario-status
- Microsoft Learn: Tutorial: Migrate SQL Server to Azure SQL Database (offline) - https://learn.microsoft.com/en-gb/data-migration/sql-server/database/database-migration-service
- Microsoft Learn: Tutorial: Migrate SQL Server to SQL Server on an Azure Virtual Machine with Azure DMS (online) - https://learn.microsoft.com/en-us/data-migration/sql-server/virtual-machines/database-migration-service-online
- Microsoft Learn: Migration to Azure SQL Managed Instance - SQL Server migration in Azure Arc - https://learn.microsoft.com/en-us/sql/sql-server/azure-arc/migrate-to-azure-sql-managed-instance
- Microsoft Learn: Azure CLI reference for `az dms` - https://learn.microsoft.com/en-us/cli/azure/dms
- Microsoft Learn: Azure CLI reference for `az sql mi create` - https://learn.microsoft.com/en-us/cli/azure/sql/mi
- Microsoft Learn Q&A: Database Migration Service (classic) SQL scenarios retirement notice - https://learn.microsoft.com/en-us/answers/questions/1190831/retirement-notice-database-migration-service-%28clas

## Issues Found
- The original post described online DMS migration from SQL Server to Azure SQL Database. Microsoft documentation states that Azure SQL Database supports DMS offline migrations from SQL Server, but DMS online migrations to Azure SQL Database are not available. I corrected the article to cover supported online targets: Azure SQL Managed Instance and SQL Server on Azure VM.
- The original post described DMS online SQL Server migration as direct CDC from the SQL Server transaction log. Current Microsoft guidance for DMS online SQL Server migrations to SQL Server on Azure VM uses full and transaction log backup files, and SQL Managed Instance migration uses supported online methods such as Managed Instance link or log-shipping-based migration. I changed the explanation to continuous restore/sync rather than CDC.
- The original post required the DMS Premium SKU and included an `az dms create` example. The Azure CLI `az dms` command group manages DMS classic instances, and DMS classic SQL Server scenarios were retired on March 15, 2026. I removed the classic DMS SKU guidance and replaced it with the current portal-based DMS flow.
- The original post created an Azure SQL Database with `az sql db create`, migrated schema with `sqlpackage`, and disabled/re-enabled foreign keys. Those steps do not match current DMS online SQL Server migrations to Managed Instance or SQL Server on Azure VM, which use database backups/restore or replication-based migration. I replaced those sections with target preparation and backup-location preparation.
- The original post stated that all tables need primary keys for the online migration. That requirement applies to some change-capture/data-copy approaches, but it is not a general requirement for DMS backup/log-shipping-based SQL Server online migrations to Managed Instance or SQL Server on Azure VM. I removed that prerequisite and the primary-key audit example.
- The original permissions guidance listed `db_owner` and `VIEW SERVER STATE`. Microsoft's online SQL Server migration guidance requires source logins to be members of `sysadmin` or have `CONTROL SERVER` permission for the documented Azure VM online flow. I corrected the permissions guidance.
- The original cutover flow waited for a CDC pending-changes counter and re-enabled foreign keys. I changed it to take/upload a final log backup for log-shipping-based migrations, wait for DMS to apply remaining changes, and complete cutover in the portal.

## Review Notes
The corrected article intentionally keeps the high-level online migration tutorial format, but narrows the target scope to supported current DMS online SQL Server scenarios. For Azure SQL Database specifically, a separate offline migration article would be more accurate.
