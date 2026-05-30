# Validation Summary: How to Tune Performance Parameters in Azure Database

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Database for PostgreSQL Flexible Server
- PostgreSQL server parameters
- Azure CLI
- PgBouncer
- SQL monitoring queries

## Sources Consulted
- Microsoft Learn: Azure CLI `az postgres flexible-server parameter` documentation, https://learn.microsoft.com/en-us/cli/azure/postgres/flexible-server/parameter
- Microsoft Learn: Set Azure Database for PostgreSQL server parameters, https://learn.microsoft.com/en-us/azure/postgresql/server-parameters/how-to-server-parameters-set-value
- Microsoft Learn: Azure Database for PostgreSQL memory server parameters, https://learn.microsoft.com/en-us/azure/postgresql/server-parameters/param-resource-usage-memory
- Microsoft Learn: Azure Database for PostgreSQL planner cost constants, https://learn.microsoft.com/en-us/azure/postgresql/server-parameters/param-query-tuning-planner-cost-constants
- Microsoft Learn: Azure Database for PostgreSQL asynchronous behavior parameters, https://learn.microsoft.com/en-us/azure/postgresql/server-parameters/param-resource-usage-asynchronous-behavior
- Microsoft Learn: Azure Database for PostgreSQL WAL settings parameters, https://learn.microsoft.com/en-us/azure/postgresql/server-parameters/param-write-ahead-log-settings
- Microsoft Learn: Azure Database for PostgreSQL PgBouncer, https://learn.microsoft.com/azure/postgresql/flexible-server/concepts-pgbouncer
- PostgreSQL Documentation: Resource Consumption, https://www.postgresql.org/docs/current/runtime-config-resource.html
- PostgreSQL Documentation: Query Planning, https://www.postgresql.org/docs/current/runtime-config-query.html
- PostgreSQL Documentation: Write Ahead Log, https://www.postgresql.org/docs/current/runtime-config-wal.html

## Issues Found
- The `effective_io_concurrency` section stated a universal Azure default of 1. Azure documents defaults by supported PostgreSQL version, and newer versions can differ. Updated the wording to make the Azure default version-dependent.
- The `random_page_cost` section used PostgreSQL's upstream default of 4.0 as if it were Azure's default. Azure Flexible Server documents a default of 2.0 for current versions. Updated the default statement while preserving the upstream context.
- The `maintenance_work_mem` section stated a usual default of 64 MB. Azure Flexible Server calculates the default from provisioned server memory. Updated the default statement to match Azure's documented behavior.
- The `wal_buffers` section described the default as PostgreSQL's automatic `shared_buffers` fraction. Azure Flexible Server calculates this value from vCore count at provisioning. Updated the default description and changed the example from 64 MB to 128 MB only when the current value is lower and the workload needs it.

## Review Notes
The Azure CLI examples, parameter names, SQL snippets, and PgBouncer guidance are technically valid. Several recommendations remain workload-dependent and should be benchmarked before production rollout.
