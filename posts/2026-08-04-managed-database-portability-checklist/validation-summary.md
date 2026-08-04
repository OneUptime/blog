# Validation Summary: Check Managed Database Portability Before You Commit

## Status

validated

## Post Type

Technical guide and portability checklist

## Technologies Covered

- PostgreSQL system catalogs and information schema
- PostgreSQL extensions, including PostGIS, `pg_cron`, and `postgres_fdw`
- PostgreSQL logical backup and restore with `pg_dump`, `pg_restore`, and `psql`
- PostgreSQL native logical replication, change data capture, and replica identity
- Amazon RDS for PostgreSQL
- Azure Database for PostgreSQL Flexible Server
- Google Cloud SQL for PostgreSQL
- Managed database snapshots, physical backups, identity, networking, TLS, monitoring, and failover integrations

## Sources Consulted

- [PostgreSQL backup and restore](https://www.postgresql.org/docs/current/backup.html)
- [PostgreSQL SQL dumps](https://www.postgresql.org/docs/current/backup-dump.html)
- [PostgreSQL `pg_dump`](https://www.postgresql.org/docs/current/app-pgdump.html)
- [PostgreSQL `pg_restore`](https://www.postgresql.org/docs/current/app-pgrestore.html)
- [PostgreSQL `pg_dumpall`](https://www.postgresql.org/docs/current/app-pg-dumpall.html)
- [PostgreSQL logical replication restrictions](https://www.postgresql.org/docs/current/logical-replication-restrictions.html)
- [PostgreSQL publications and replica identity](https://www.postgresql.org/docs/current/logical-replication-publication.html)
- [PostgreSQL system administration functions](https://www.postgresql.org/docs/current/functions-admin.html)
- [PostgreSQL `pg_class` catalog](https://www.postgresql.org/docs/current/catalog-pg-class.html)
- [PostgreSQL `pg_index` catalog](https://www.postgresql.org/docs/current/catalog-pg-index.html)
- [PostgreSQL `pg_extension` catalog](https://www.postgresql.org/docs/current/catalog-pg-extension.html)
- [PostgreSQL `pg_collation` catalog](https://www.postgresql.org/docs/current/catalog-pg-collation.html)
- [PostgreSQL information-schema `columns` view](https://www.postgresql.org/docs/current/infoschema-columns.html)
- [PostgreSQL `CREATE SCHEMA`](https://www.postgresql.org/docs/current/sql-createschema.html)
- [Amazon RDS supported PostgreSQL extension versions](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.FeatureSupport.Extensions.html)
- [Amazon RDS logical replication](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.FeatureSupport.LogicalReplication.html)
- [Amazon RDS `rds_superuser` role](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.PostgreSQL.CommonDBATasks.Roles.rds_superuser.html)
- [Amazon RDS snapshot export](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ExportSnapshot.html)
- [Azure Database for PostgreSQL extension versions](https://learn.microsoft.com/en-us/azure/postgresql/extensions/concepts-extensions-versions)
- [Azure Database for PostgreSQL user and administrator privileges](https://learn.microsoft.com/en-us/azure/postgresql/security/security-manage-database-users)
- [Cloud SQL for PostgreSQL extensions](https://cloud.google.com/sql/docs/postgres/extensions)
- [Cloud SQL logical replication and decoding](https://cloud.google.com/sql/docs/postgres/replication/configure-logical-replication)
- [Cloud SQL for PostgreSQL users and roles](https://docs.cloud.google.com/sql/docs/postgres/users)

## Issues Found

- The relation inventory excluded only `pg_catalog` and `information_schema`, so it could include internal schemas such as `pg_toast` and temporary `pg_*` schemas. The filters now exclude all `pg_*` schemas, whose prefix PostgreSQL reserves for system schemas.
- The collation inventory matched `pg_collation` rows only by `collname`, although collation names are qualified by schema. It now matches both `collation_schema` and `collation_name`, reports the schema, excludes internal schemas, and orders the result deterministically.
- The privilege checklist implied that every operation should be replayed through the database role, even though managed-service tasks such as server TLS certificate handling may require the provider control plane. The wording now distinguishes the database role from the control plane.
- The backup list described `pg_dump` and `pg_restore` together as an export mechanism. It now states that `pg_dump` creates the dump, `pg_restore` restores archive formats, and `psql` restores plain-text dumps, with one dump per selected database.
- The restore benchmark referred generically to post-restore analysis. It now explicitly calls out PostgreSQL `ANALYZE`, which refreshes optimizer statistics after a logical restore.

## Review Notes

- Both SQL blocks were executed successfully against a temporary PostgreSQL 14.17 instance, including a schema-qualified custom collation and tables with and without primary keys.
- The `information_schema.columns` view exposes only columns accessible to the current role. Run the inventory with a role that can see every application object in scope.
- The primary-key query is intentionally a screening query, not a declaration that every reported table is unusable for logical replication. Its `relreplident` output identifies tables configured with `FULL` or an alternate replica-identity index for separate evaluation.
- Provider extension versions and logical-replication limitations change over time. The post correctly directs readers to validate the current provider limitation pages and rehearse the migration.
