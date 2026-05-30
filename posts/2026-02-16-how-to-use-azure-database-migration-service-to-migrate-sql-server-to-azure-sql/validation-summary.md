# Validation Summary: How to Use Azure Database Migration Service to Migrate SQL Server to Azure SQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Database Migration Service
- Azure SQL Database
- SQL Server
- Azure CLI
- SQL Server Management Studio
- sqlpackage
- Azure Monitor

## Sources Consulted
- Microsoft Learn: Tutorial: Migrate SQL Server to Azure SQL Database (offline), https://learn.microsoft.com/en-us/data-migration/sql-server/database/database-migration-service
- Microsoft Learn: What is Azure Database Migration Service?, https://learn.microsoft.com/en-us/azure/dms/dms-overview
- Microsoft Learn: Azure Database Migration Service FAQ, https://learn.microsoft.com/en-us/azure/dms/faq
- Microsoft Learn: Azure CLI `az dms`, https://learn.microsoft.com/en-gb/cli/azure/dms?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az dms project`, https://learn.microsoft.com/en-us/cli/azure/dms/project?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az dms project task`, https://learn.microsoft.com/en-us/cli/azure/dms/project/task?view=azure-cli-latest
- Microsoft Learn: SQL Server to Azure SQL Database migration guide, https://learn.microsoft.com/en-us/data-migration/sql-server/database/guide
- Microsoft Learn: Migrate SQL Server to Azure SQL using SSMS, https://learn.microsoft.com/en-us/ssms/migrate/migrate-sql-server-azure-sql
- Microsoft Learn: Azure SQL migration extension for Azure Data Studio retirement notice, https://learn.microsoft.com/en-us/previous-versions/azure-data-studio/extensions/azure-sql-migration-extension?view=sql-server-ver16
- Microsoft Download Center: Data Migration Assistant retirement notice, https://www.microsoft.com/en-us/download/details.aspx?id=53595
- Microsoft Learn: Assessment rules for SQL Server to Azure SQL Database migration, https://learn.microsoft.com/en-us/data-migration/sql-server/database/assessment-rules
- Microsoft Learn: SQL Insights retirement and database watcher recommendation, https://learn.microsoft.com/en-us/azure/azure-sql/database/sql-insights-overview?view=azuresql

## Issues Found
- The post described online DMS migrations and Premium-tier DMS as an option for SQL Server to Azure SQL Database. Microsoft documentation currently states that online migrations for Azure SQL Database targets are not available with DMS, so the post now presents DMS for this target as an offline migration path and recommends transactional replication or another continuous sync option when downtime is not acceptable.
- The prerequisites listed SQL Server 2005 or later as a DMS source. Microsoft DMS FAQ lists SQL Server 2008 and later, so the prerequisite was corrected.
- The assessment workflow used Data Migration Assistant, which Microsoft now lists as retired and unavailable to download. The post now recommends SSMS 22 or Azure Migrate and gives SSMS assessment steps.
- The post mentioned Azure Data Studio for assessment even though Azure Data Studio and its Azure SQL migration extension retired on February 28, 2026. This was replaced with SSMS 22 or Azure Migrate guidance.
- The post used the older "Azure AD" name. This was updated to Microsoft Entra authentication.
- The DMS CLI example used `Standard_1vCores`; current Azure CLI documentation examples use supported SKU names such as `Basic_2vCores`, and availability should be checked with `az dms list-skus`. The example was updated.
- The `az dms project create` example omitted the required `--location` parameter. It was added.
- The DMS task database options JSON used camelCase keys `targetDatabaseName` and `tableMap`; Azure CLI documentation specifies `target_database_name` and `table_map`. The JSON was corrected.
- The portal instruction used "New Migration Activity"; current DMS portal docs use "New migration". The step was updated.
- The monitoring recommendation mentioned Azure SQL Analytics, which is not the current recommended monitoring path. It now recommends Azure Monitor or database watcher.

## Review Notes
The post is technically relevant and remains a useful DMS offline migration guide. Future maintenance should periodically re-check DMS portal and CLI behavior because Microsoft has been moving SQL migration experiences across SSMS, Azure portal, Azure Arc, Azure Migrate, and command-line tooling.
