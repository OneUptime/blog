# Validation Summary: How to Migrate from Cloud SQL for PostgreSQL to AlloyDB

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud Database Migration Service
- Cloud SQL for PostgreSQL
- AlloyDB for PostgreSQL
- PostgreSQL logical replication and pglogical
- Google Cloud CLI
- AlloyDB Auth Proxy
- psycopg2

## Sources Consulted
- Google Cloud Database Migration Service for PostgreSQL to AlloyDB - Get set up: https://docs.cloud.google.com/database-migration/docs/postgresql-to-alloydb/setup
- Google Cloud Database Migration Service for PostgreSQL to AlloyDB - Configure your source: https://docs.cloud.google.com/database-migration/docs/postgresql-to-alloydb/configure-source-database
- Google Cloud Database Migration Service for PostgreSQL to AlloyDB - Create source connection profile: https://docs.cloud.google.com/database-migration/docs/postgresql-to-alloydb/create-source-connection-profile
- Google Cloud Database Migration Service for PostgreSQL to AlloyDB - Create migration job to a new destination instance: https://docs.cloud.google.com/database-migration/docs/postgresql-to-alloydb/create-migration-job
- Google Cloud Database Migration Service for PostgreSQL to AlloyDB - Create migration job to an existing destination instance: https://docs.cloud.google.com/database-migration/docs/postgresql-to-alloydb/create-migration-job-existing-instance
- Google Cloud Database Migration Service for PostgreSQL to AlloyDB - Known limitations: https://docs.cloud.google.com/database-migration/docs/postgresql-to-alloydb/known-limitations
- Google Cloud Database Migration Service for PostgreSQL - Migration job metrics: https://docs.cloud.google.com/database-migration/docs/postgres/migration-job-metrics
- Google Cloud CLI reference - `gcloud database-migration connection-profiles create`: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/connection-profiles/create
- Google Cloud CLI reference - `gcloud database-migration connection-profiles create postgresql`: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/connection-profiles/create/postgresql
- Google Cloud CLI reference - `gcloud database-migration connection-profiles create alloydb`: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/connection-profiles/create/alloydb
- Google Cloud CLI reference - `gcloud database-migration migration-jobs create`: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/migration-jobs/create
- AlloyDB for PostgreSQL overview: https://cloud.google.com/alloydb/docs/overview
- AlloyDB columnar engine overview: https://docs.cloud.google.com/alloydb/docs/columnar-engine/about

## Issues Found
- The source Cloud SQL preparation was incomplete. Added `cloudsql.enable_pglogical`, replication slot, WAL sender, and worker process flags, and added the required `pglogical` extension setup.
- The source connection profile command used obsolete/incorrect generic flags. Replaced it with the current `create postgresql` subcommand and required host, port, database, username, and password prompt flags.
- The destination connection profile command for an existing AlloyDB cluster used the wrong provider-style syntax. Replaced it with the current PostgreSQL connection profile syntax using `--alloydb-cluster`.
- The post said DMS-created AlloyDB cluster settings belong in the migration job. Corrected this to use the `create alloydb` destination connection profile command with required cluster settings.
- The migration job VPC peering example used `default` instead of a full VPC resource path. Updated it to `projects/my-project/global/networks/default`.
- The CLI flow for existing AlloyDB destinations missed the required `demote-destination` step before start. Added the command and explanation.
- The replication lag command referenced a non-documented `cdcPosition` field. Replaced it with a valid job-status `describe` command and pointed readers to the DMS job details page or Cloud Monitoring `migration_job/max_replica_sec_lag` metric.
- The post claimed DMS handles most DDL automatically. Corrected this to explain that standard DDL is not replicated automatically and that `pglogical.replicate_ddl_command` or replication set updates are required.
- The cutover-duration and 100 GB timing statements were overly specific without documentation support. Replaced them with dependency-based guidance.
- General AlloyDB benefit claims were tightened to match official wording for transactional performance, columnar engine behavior, and storage architecture.
- The permission troubleshooting note incorrectly focused on service-account admin roles. Updated it to mention Database Migration Admin for the Google Cloud user and required PostgreSQL privileges for the database user.

## Review Notes
The post is now technically accurate as a high-level CLI-oriented guide, but actual migrations still require environment-specific values for Cloud SQL private IP, database user grants on all migrated schemas, selected databases, network connectivity, and sizing of replication-related flags.
