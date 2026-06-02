# Validation Summary: How to Migrate from Self-Managed PostgreSQL to RDS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon RDS for PostgreSQL
- PostgreSQL
- PostgreSQL logical replication
- pg_dump
- pg_restore
- psql
- AWS CLI
- CloudWatch

## Sources Consulted
- PostgreSQL logical replication quick setup: https://www.postgresql.org/docs/current/logical-replication-quick-setup.html
- PostgreSQL `pg_hba.conf` documentation: https://www.postgresql.org/docs/current/auth-pg-hba-conf.html
- PostgreSQL `CREATE SUBSCRIPTION` documentation: https://www.postgresql.org/docs/current/sql-createsubscription.html
- PostgreSQL `pg_dump` documentation: https://www.postgresql.org/docs/current/app-pgdump.html
- PostgreSQL `pg_restore` documentation: https://www.postgresql.org/docs/current/app-pgrestore.html
- PostgreSQL `pg_replication_slots` view documentation: https://www.postgresql.org/docs/current/view-pg-replication-slots.html
- PostgreSQL administrative functions documentation: https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL logical replication restrictions: https://www.postgresql.org/docs/current/logical-replication-restrictions.html
- AWS RDS for PostgreSQL logical replication documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.FeatureSupport.LogicalReplication.html
- AWS CLI `rds create-db-instance` reference: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
- AWS CLI `rds modify-db-instance` reference: https://docs.aws.amazon.com/cli/latest/reference/rds/modify-db-instance.html
- AWS RDS PostgreSQL extensions documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.PostgreSQL.CommonDBATasks.Extensions.html
- AWS RDS PostgreSQL `rds_superuser` role documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.PostgreSQL.CommonDBATasks.Roles.rds_superuser.html

## Issues Found
- Updated the description and introductory wording to remove the claim that the post walks through AWS DMS. The post lists AWS DMS as a migration option but only provides executable procedures for `pg_dump`/`pg_restore` and logical replication.
- Corrected the `pg_hba.conf` entry for logical replication from `replication` to the actual source database name. PostgreSQL documents that the `replication` database keyword matches physical replication connections, while logical replication connections specify a database.
- Changed the logical replication initial-load workflow to restore schema only and let `CREATE SUBSCRIPTION` perform the initial table copy. The prior workflow manually restored data and then created the subscription with `copy_data = false`, which could miss writes made during the dump.
- Replaced the invalid replication lag query that subtracted a `pg_lsn` from `now()` with a `pg_wal_lsn_diff()` query against `confirmed_flush_lsn`, reporting lag in bytes.
- Removed `pg_drop_replication_slot('my_migration_sub')` from normal cleanup. A subscription-created slot is normally dropped when the subscription is dropped, so this command can fail during the documented cutover path.

## Review Notes
- PostgreSQL 10 introduced native logical replication, but PostgreSQL 10 is no longer a supported upstream PostgreSQL version as of the current PostgreSQL documentation. A real migration should use currently supported source and target versions where possible.
- The AWS CLI and PostgreSQL client binaries were not installed in the workspace, so CLI syntax was validated against official AWS CLI and PostgreSQL documentation instead of local `--help` output.
