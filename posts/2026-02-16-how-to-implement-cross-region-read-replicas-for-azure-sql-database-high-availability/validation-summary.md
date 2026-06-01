# Validation Summary: How to Use Cross-Region Read Replicas for Azure SQL Database High Availability

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure SQL Database
- Active geo-replication
- Failover groups
- Azure CLI
- Azure Monitor metrics alerts
- T-SQL dynamic management views
- C# SQL client connection strings
- Polly retry policies

## Sources Consulted
- Microsoft Learn: Active geo-replication for Azure SQL Database - https://learn.microsoft.com/en-us/azure/azure-sql/database/active-geo-replication-overview
- Microsoft Learn: Failover groups overview and best practices for Azure SQL Database - https://learn.microsoft.com/en-us/azure/azure-sql/database/failover-group-sql-db
- Microsoft Learn: Configure a failover group for Azure SQL Database - https://learn.microsoft.com/en-us/azure/azure-sql/database/failover-group-configure-sql-db
- Microsoft Learn Azure CLI reference: az sql db replica - https://learn.microsoft.com/en-us/cli/azure/sql/db/replica
- Microsoft Learn Azure CLI reference: az sql failover-group - https://learn.microsoft.com/en-us/cli/azure/sql/failover-group
- Microsoft Learn: Monitor Azure SQL Database with metrics and alerts - https://learn.microsoft.com/en-us/azure/azure-sql/database/monitoring-metrics-alerts
- Microsoft Learn: sys.dm_geo_replication_link_status - https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-geo-replication-link-status-azure-sql-database

## Issues Found
- Corrected the active geo-replication state explanation. The post had `CATCH_UP` during initial seeding and mentioned `SYNCHRONIZED`; the documented states are `SEEDING` during seeding and `CATCH_UP` after catch-up.
- Corrected the read-only connection string example to use the failover group's read-only listener, `myfailovergroup.secondary.database.windows.net`, with `ApplicationIntent=ReadOnly`.
- Corrected the replication lag DMV query. `last_replication` and `replication_lag_sec` are available on the primary database, so the query should run on the primary and use `replication_lag_sec` directly.
- Clarified that Azure Monitor's `replication_lag_seconds` metric is available on the primary database.
- Corrected the cost guidance. Geo-replicated secondaries must use the same service tier as the primary; cost optimization should refer to supported lower compute sizes within the same service tier or standby replicas, not a lower service tier.

## Review Notes
Azure CLI is not installed in the local environment, so CLI syntax was validated against the official Microsoft Learn Azure CLI reference instead of local `az --help` output.
