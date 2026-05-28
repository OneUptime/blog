# Validation Summary: How to Migrate Amazon RDS PostgreSQL to Cloud SQL

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Google Cloud Database Migration Service
- Google Cloud SQL for PostgreSQL
- Amazon RDS for PostgreSQL
- PostgreSQL logical replication and pglogical
- Terraform AWS and Google providers
- Google Cloud CLI
- Python google-cloud-dms client
- psycopg2

## Sources Consulted
- Google Cloud Database Migration Service PostgreSQL source configuration: https://docs.cloud.google.com/database-migration/docs/postgres/configure-source-database
- Google Cloud Database Migration Service source connection profiles: https://cloud.google.com/database-migration/docs/postgres/create-source-connection-profile
- Google Cloud Database Migration Service migration job for an existing destination: https://docs.cloud.google.com/database-migration/docs/postgres/create-migration-job-existing-instance
- Google Cloud CLI `connection-profiles create postgresql`: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/connection-profiles/create/postgresql
- Google Cloud CLI `connection-profiles create cloudsql`: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/connection-profiles/create/cloudsql
- Google Cloud CLI `migration-jobs create`: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/migration-jobs/create
- Terraform `google_sql_database_instance` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance
- Amazon RDS for PostgreSQL logical replication: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.FeatureSupport.LogicalReplication.html
- PostgreSQL `shared_buffers` documentation: https://www.postgresql.org/docs/current/runtime-config-resource.html
- PostgreSQL `pg_sequences` documentation: https://www.postgresql.org/docs/current/view-pg-sequences.html
- Google Cloud Python DMS `MigrationJob` reference: https://cloud.google.com/python/docs/reference/datamigration/latest/google.cloud.clouddms_v1.types.MigrationJob

## Issues Found
- The RDS prerequisite section did not include pglogical setup, which Google Database Migration Service requires for PostgreSQL sources. Added a `shared_preload_libraries` check, added `pglogical` to the RDS parameter group snippet, and added the required extension and migration-user grants including `rds_replication`.
- The Cloud SQL Terraform snippet used legacy `require_ssl`. Replaced it with the current `ssl_mode = "ENCRYPTED_ONLY"` setting.
- The Cloud SQL `shared_buffers` comment was mathematically incorrect: `4096` 8KB pages is 32MB, not 32GB. Changed the example to `524288`, which is 4GB.
- The `gcloud database-migration connection-profiles create` commands were missing the required engine-specific `postgresql` subcommand, and the source command used an invalid `--provider=RDS` flag. Updated the commands to match the current Google Cloud CLI syntax.
- The destination connection profile command used the generic create form with `--provider=CLOUDSQL`. Updated it to create a PostgreSQL connection profile for an existing Cloud SQL instance with `--cloudsql-instance`.
- The migration job workflow omitted the required demotion step for an existing Cloud SQL destination and did not start the job. Added `demote-destination`, `verify`, and `start` commands.
- The pre-cutover row-count validation used `pg_stat_user_tables.n_live_tup`, which is an estimate rather than an exact validation count. Replaced it with generated exact `count(*)` statements and updated the Python script to perform exact counts safely with `psycopg2.sql.Identifier`.
- The sequence validation query referenced `last_value` through `information_schema.sequences`, which does not expose that column. Replaced it with a query against PostgreSQL's `pg_sequences` view.

## Review Notes
- The VPN Terraform snippet is illustrative and omits provider, route, forwarding-rule, and AWS-side resources needed for a full production VPN. It is acceptable as a shortened connectivity example but should not be treated as a complete standalone VPN configuration.
- The Python monitoring script reports migration phase and state correctly, but it does not fetch a numeric replication-lag metric. The surrounding text now remains accurate as a simple job monitor.
