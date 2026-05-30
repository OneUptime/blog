# Validation Summary: How to Implement Read Replicas with Entity Framework Core and Azure SQL Database

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Entity Framework Core
- Azure SQL Database
- Azure SQL read scale-out replicas
- Microsoft.Data.SqlClient connection strings
- .NET 8
- C#
- ASP.NET Core dependency injection and health checks

## Sources Consulted
- Azure SQL Database read scale-out documentation: https://learn.microsoft.com/en-us/azure/azure-sql/database/read-scale-out?view=azuresql
- Azure SQL Database Hyperscale secondary replicas documentation: https://learn.microsoft.com/en-us/azure/azure-sql/database/service-tier-hyperscale-replicas?view=azuresql
- sys.dm_database_replica_states Azure SQL Database DMV documentation: https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-database-replica-states-azure-sql-database?view=azuresqldb-current
- sys.dm_hs_database_replicas documentation: https://learn.microsoft.com/en-us/sql/relational-databases/system-functions/sys-dm-hs-database-replicas?view=azuresqldb-current
- Microsoft.Data.SqlClient ApplicationIntent documentation: https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.applicationintent
- EF Core interceptor documentation: https://learn.microsoft.com/en-us/ef/core/logging-events-diagnostics/interceptors
- EF Core tracking and no-tracking query documentation: https://learn.microsoft.com/en-us/ef/core/querying/tracking

## Issues Found
- The post said Azure SQL Database read replicas were supported through Business Critical and Hyperscale only. Updated this to include Premium and to clarify that Hyperscale read scale-out requires at least one secondary replica.
- The post described synchronization as log shipping and stated replication lag is usually under a second. Updated this to match Azure SQL documentation: replicas apply transaction log records, typical latency ranges from tens of milliseconds to single-digit seconds, and there is no fixed upper bound.
- The interceptor sample attempted to change a command's connection string inside `ReaderExecuting`, which is unsafe because EF Core has already prepared the command for the current connection and the changed connection can persist for later operations on the same context. Replaced it with a guard interceptor for read-only contexts.
- The replica lag health check queried `DATABASEPROPERTYEX(DB_NAME(), 'ReplicaLag')`, which is not a documented Azure SQL Database property. Replaced it with a documented `sys.dm_database_replica_states` query using `redo_queue_size` and `redo_rate` as indicators of data propagation latency.
- The metadata description still emphasized interceptors as the routing mechanism. Updated it to describe the dual-context approach used by the corrected tutorial.

## Review Notes
The code snippets are illustrative and omit entity and DTO class definitions, which is acceptable for this post. The health check now estimates lag from redo queue metrics; production monitoring should account for tier-specific behavior, permissions such as `VIEW DATABASE STATE`, and the fact that Azure SQL documentation presents these fields as indicators rather than an exact freshness SLA.
