# Validation Summary: How to Configure Failover Groups in Azure SQL Database for High Availability

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure SQL Database
- Azure SQL failover groups
- Azure SQL active geo-replication
- Azure CLI
- T-SQL dynamic management views

## Sources Consulted
- Microsoft Learn: Failover groups overview & best practices for Azure SQL Database - https://learn.microsoft.com/en-us/azure/azure-sql/database/failover-group-sql-db
- Microsoft Learn: Configure a failover group for Azure SQL Database - https://learn.microsoft.com/en-us/azure/azure-sql/database/failover-group-configure-sql-db
- Microsoft Learn: Azure CLI `az sql failover-group` reference - https://learn.microsoft.com/en-us/cli/azure/sql/failover-group
- Microsoft Learn: `sys.dm_geo_replication_link_status` for Azure SQL Database - https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-geo-replication-link-status-azure-sql-database
- Microsoft Learn: Reliability in Azure SQL Database - https://learn.microsoft.com/en-us/azure/reliability/reliability-sql-database

## Issues Found
- The post described failover groups as providing automatic failover without manual intervention. Microsoft documents `Automatic` as Microsoft-managed failover for widespread outages, while customer-managed/manual failover is recommended for production DR plans. Updated the explanation, recommendation, summary, and related wording.
- The post said both failover group listener endpoints point to whichever server is currently primary. Updated this to clarify that the read-write listener points to the current primary and the read-only listener points to the current secondary.
- The post labeled the grace period as minutes, but Azure CLI documents `--grace-period` as an interval in hours with a default/minimum of 1 hour. Updated the portal wording and related notes to hours.
- The prerequisites claimed the secondary server must be empty and that databases must be Standard S3 or General Purpose or above. Microsoft documentation requires the secondary to be in a different region and, if it already exists, to have matching login/firewall settings; secondary database configuration should match the primary. Updated the prerequisites and limitation to avoid the unsupported tier and empty-server claims.
- The monitoring T-SQL query joined `sys.dm_geo_replication_link_status` to `sys.databases` using `resource_id`, which is not a documented column for this DMV pattern. Replaced it with a query against `sys.dm_geo_replication_link_status` from each primary database using `DB_NAME()`.

## Review Notes
The Azure CLI command shapes for creating, updating, and failing over a failover group match the current Azure CLI documentation. The post could later add `ApplicationIntent=ReadOnly` for read-only connection strings, which Microsoft recommends for read-only workloads, but the existing read-only listener example is technically valid.
