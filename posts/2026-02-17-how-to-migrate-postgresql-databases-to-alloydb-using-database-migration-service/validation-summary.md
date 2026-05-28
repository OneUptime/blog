# Validation Summary: How to Migrate PostgreSQL Databases to AlloyDB Using Database Migration Service

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud Database Migration Service
- AlloyDB for PostgreSQL
- PostgreSQL logical replication
- pglogical
- Google Cloud CLI
- PostgreSQL SQL and configuration

## Sources Consulted
- Google Cloud Database Migration Service: Configure your PostgreSQL source for AlloyDB migrations: https://docs.cloud.google.com/database-migration/docs/postgresql-to-alloydb/configure-source-database
- Google Cloud Database Migration Service: Supported PostgreSQL sources and AlloyDB destinations: https://docs.cloud.google.com/database-migration/docs/postgresql-to-alloydb/migration-src-and-dest
- Google Cloud Database Migration Service: Create a migration job to an existing AlloyDB destination instance: https://docs.cloud.google.com/database-migration/docs/postgresql-to-alloydb/create-migration-job-existing-instance
- Google Cloud SDK reference: `gcloud database-migration connection-profiles create postgresql`: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/connection-profiles/create/postgresql
- Google Cloud SDK reference: `gcloud database-migration migration-jobs create`: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/migration-jobs/create
- Google Cloud SDK reference: `gcloud alloydb clusters create`: https://docs.cloud.google.com/sdk/gcloud/reference/alloydb/clusters/create
- Google Cloud SDK reference: `gcloud alloydb clusters update`: https://docs.cloud.google.com/sdk/gcloud/reference/alloydb/clusters/update
- Google Cloud Database Migration Service: PostgreSQL to AlloyDB known limitations: https://docs.cloud.google.com/database-migration/docs/postgresql-to-alloydb/known-limitations
- Google Cloud AlloyDB: Manage column store content manually: https://docs.cloud.google.com/alloydb/docs/columnar-engine/manage-content-manually
- PostgreSQL documentation: `pg_sequences` system view: https://www.postgresql.org/docs/current/view-pg-sequences.html

## Issues Found
- The post described PostgreSQL-to-AlloyDB DMS replication as native logical replication only. Updated the wording and prerequisites to reflect Google Cloud's documented `pglogical` requirement for this migration path.
- The supported source version list was outdated and incomplete. Updated it to include the currently documented supported self-managed, Amazon RDS, Amazon Aurora, and Cloud SQL PostgreSQL versions.
- The PostgreSQL source configuration omitted required DMS settings, including `shared_preload_libraries = 'pglogical'`, `wal_sender_timeout = 0`, and `max_worker_processes`. Added those settings and removed the generic WAL retention example.
- The source privilege example omitted the `pglogical` extension and required privileges on the `pglogical` schema. Added `CREATE EXTENSION IF NOT EXISTS pglogical`, usage/select grants, and an Amazon RDS-specific replication role note.
- The `pg_hba.conf` example used `0.0.0.0/0`, which is not the documented connectivity-specific allowlist. Replaced it with a `DMS_OUTGOING_CIDR` placeholder.
- The connection profile commands used obsolete/nonexistent `--provider`, `--postgresql-host`, `--postgresql-port`, `--postgresql-username`, `--postgresql-password`, and `--postgresql-database` flags. Updated them to the current `create postgresql` subcommand and current flag names, including the documented destination profile form for an existing AlloyDB cluster.
- The migration job flow created an existing AlloyDB cluster but omitted the required `demote-destination` step before starting a migration to an existing destination. Added the command and clarified why it is required.
- The migration job example did not specify the database to migrate even though the rest of the post uses `mydb`. Added `--databases-filter=mydb`.
- The monitoring section claimed the sample `describe` format included replication lag, but the fields shown did not include lag. Updated the wording to say it checks state and errors.
- The sequence validation query selected `last_value` from `information_schema.sequences`, which is not a PostgreSQL column in that view. Changed it to use `pg_sequences`.
- The AlloyDB columnar engine SQL used an invalid `ALTER TABLE ... SET (google_columnar_engine.enabled = true)` example and queried a non-documented status view. Replaced it with `google_columnar_engine_add(...)` and `g_columnar_relations` after noting that the columnar engine database flag must be enabled on the instance.
- The automated backup command used a nonexistent `--automated-backup-enabled` flag and omitted the required backup window policy flag. Replaced it with the documented automated backup policy flags.

## Review Notes
The local environment did not have `gcloud` installed, so Google Cloud CLI command validation was performed against the official Google Cloud SDK reference pages instead of local `--help` output.
