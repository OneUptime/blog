# Validation Summary: How to Enable Geo-Replication for Azure SQL Database

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure SQL Database
- Active geo-replication
- Azure CLI
- T-SQL
- Azure Portal
- Azure Monitor

## Sources Consulted
- Microsoft Learn: Active geo-replication overview for Azure SQL Database, https://learn.microsoft.com/en-us/azure/azure-sql/database/active-geo-replication-overview?view=azuresql-db
- Microsoft Learn: Tutorial: Configure active geo-replication and failover for Azure SQL Database, https://learn.microsoft.com/en-us/azure/azure-sql/database/active-geo-replication-configure-portal?view=azuresql
- Microsoft Learn: Azure CLI `az sql db replica`, https://learn.microsoft.com/en-us/cli/azure/sql/db/replica?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az sql server`, https://learn.microsoft.com/en-us/cli/azure/sql/server?view=azure-cli-latest
- Microsoft Learn: ALTER DATABASE Transact-SQL syntax for Azure SQL Database, https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-database-transact-sql
- Microsoft Learn: `sys.dm_geo_replication_link_status`, https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-geo-replication-link-status-azure-sql-database?view=azuresqldb-current

## Issues Found
- The post stated that the secondary did not need to match the primary's tier and that Basic tier was not available. Updated this to reflect current Microsoft documentation: the primary and geo-secondary must use the same service tier, while compute size can differ.
- The post said primary performance is not affected by asynchronous replication. Updated this because Azure SQL Database can throttle the primary transaction log rate when a geo-secondary cannot keep up.
- The Azure CLI replica creation example did not explicitly set `--secondary-type Geo`. Added it to make the command unambiguous and aligned with current Azure CLI examples.
- The portal failover instructions directed readers to start from the secondary database. Updated them to match Microsoft Learn's portal flow: start from the primary database's Replicas page and select the secondary to promote.
- The replication lag query was described as running on the secondary database. Updated it to run on the primary database, where `last_replication` and `replication_lag_sec` are available.
- The T-SQL `sys.geo_replication_links` example was described as checking lag, but that view reports replication state and role details rather than lag. Updated the comment accordingly.

## Review Notes
The article is technically relevant and contains working Azure Portal, Azure CLI, and T-SQL guidance after the corrections above. Future improvements could mention license-free standby replicas for disaster-recovery-only secondaries and authentication/firewall synchronization requirements, but those are optional additions rather than correctness issues.
