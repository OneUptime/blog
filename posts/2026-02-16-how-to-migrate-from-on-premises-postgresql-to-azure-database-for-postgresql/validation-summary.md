# Validation Summary: How to Migrate from On-Premises PostgreSQL to Azure Database for PostgreSQL

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Azure Database for PostgreSQL Flexible Server
- Azure Database Migration Service
- Azure Database for PostgreSQL migration service
- PostgreSQL
- pg_dump and pg_restore
- PostgreSQL logical replication
- Azure CLI
- SQL

## Sources Consulted
- Microsoft Learn: Supported versions of PostgreSQL in Azure Database for PostgreSQL: https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-supported-versions
- Microsoft Learn: Azure CLI `az postgres flexible-server create`: https://learn.microsoft.com/en-us/cli/azure/postgres/flexible-server
- Microsoft Learn: Online migration from on-premises PostgreSQL to Azure Database for PostgreSQL with the migration service: https://learn.microsoft.com/en-us/azure/postgresql/migrate/migration-service/tutorial-migration-service-iaas-online
- Microsoft Learn: DMS classic online PostgreSQL migration tutorial: https://learn.microsoft.com/en-us/azure/dms/tutorial-postgresql-azure-postgresql-online-portal
- Microsoft Learn: Azure Database for PostgreSQL Flexible Server extensions: https://learn.microsoft.com/en-us/azure/postgresql/extensions/concepts-extensions-by-engine
- PostgreSQL documentation: pg_dump: https://www.postgresql.org/docs/current/app-pgdump.html
- PostgreSQL documentation: pg_restore: https://www.postgresql.org/docs/current/app-pgrestore.html
- PostgreSQL documentation: CREATE SUBSCRIPTION: https://www.postgresql.org/docs/current/sql-createsubscription.html
- PostgreSQL documentation: Logical replication restrictions: https://www.postgresql.org/docs/current/logical-replication-restrictions.html

## Issues Found
- The post said Azure Database for PostgreSQL Flexible Server supports PostgreSQL versions 13 through 16. Current Microsoft documentation lists versions 11 through 18, with older supported versions in extended support. Updated the version statement and the related upgrade guidance.
- The per-table size query concatenated schema and table names directly, which can fail for quoted or mixed-case identifiers. Updated the query to use `format('%I.%I', schemaname, tablename)::regclass`.
- The `pg_restore` example passed `sslmode=require` as a separate positional argument, which would be treated as an archive filename or extra argument. Updated the command to use a libpq connection string in `--dbname`.
- The DMS section did not mention that Microsoft now recommends the newer Azure Database for PostgreSQL migration service for Flexible Server migrations. Added a short note while preserving the DMS classic path.
- The DMS online migration preparation did not mention the primary-key requirement for syncing incremental changes. Added a brief requirement note.
- The post described `pg_stat_user_tables.n_live_tup` as row-count comparison data, but it is an estimate from PostgreSQL statistics. Renamed the output alias and added a note to use `COUNT(*)` when exact row counts are required.

## Review Notes
The guide is technically relevant and broadly accurate after the fixes. Some operational guidance, such as database-size thresholds and exact downtime estimates, remains workload-dependent and should be treated as planning guidance rather than a guarantee.
