# Validation Summary: How to Migrate an On-Premises PostgreSQL Database to Cloud SQL Using DMS

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud Database Migration Service
- Cloud SQL for PostgreSQL
- PostgreSQL logical replication
- pglogical
- Google Cloud CLI
- Cloud DNS

## Sources Consulted
- Google Cloud Database Migration Service for PostgreSQL: Configure your source: https://docs.cloud.google.com/database-migration/docs/postgres/configure-source-database
- Google Cloud Database Migration Service for PostgreSQL: Supported source and destination databases: https://docs.cloud.google.com/database-migration/docs/postgres/migration-src-and-dest
- Google Cloud Database Migration Service for PostgreSQL: Create a migration job to a new destination instance: https://docs.cloud.google.com/database-migration/docs/postgres/create-migration-job
- Google Cloud Database Migration Service for PostgreSQL: Create a migration job to an existing destination instance: https://docs.cloud.google.com/database-migration/docs/postgres/create-migration-job-existing-instance
- Google Cloud Database Migration Service for PostgreSQL: Known limitations: https://cloud.google.com/database-migration/docs/postgres/known-limitations
- Google Cloud Database Migration Service for PostgreSQL: Migration fidelity: https://docs.cloud.google.com/database-migration/docs/postgres/migration-fidelity
- Google Cloud SDK reference: gcloud database-migration connection-profiles create: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/connection-profiles/create
- Google Cloud SDK reference: gcloud database-migration connection-profiles create postgresql: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/connection-profiles/create/postgresql
- Google Cloud SDK reference: gcloud database-migration migration-jobs create: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/migration-jobs/create
- Google Cloud SDK reference: gcloud database-migration migration-jobs verify: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/migration-jobs/verify
- Google Cloud SDK reference: gcloud database-migration migration-jobs promote: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/migration-jobs/promote
- Google Cloud SDK reference: gcloud dns record-sets update: https://docs.cloud.google.com/sdk/gcloud/reference/dns/record-sets/update
- Cloud SQL for PostgreSQL logical replication documentation: https://docs.cloud.google.com/sql/docs/postgres/replication/configure-logical-replication
- Cloud SQL for PostgreSQL database flags documentation: https://docs.cloud.google.com/sql/docs/postgres/flags

## Issues Found
- The post stated that PostgreSQL sources must be version 9.6 or later. Updated this to self-managed PostgreSQL 9.4 or later, matching current DMS support.
- The post implied that DMS uses native logical replication automatically for PostgreSQL 10+. Updated the wording to reflect the documented `pglogical` setup and note that native logical replication is an option for PostgreSQL 10+ migration jobs.
- The source configuration omitted `shared_preload_libraries = 'pglogical'` and `wal_sender_timeout = 0`. Added both settings.
- The pglogical installation section was limited to PostgreSQL 9.6 and said PostgreSQL 10+ does not need the extension. Updated it to use version-specific package examples and added the PostgreSQL 9.4-only `pglogical_origin` extension note.
- The migration user grants only covered tables in the `public` schema. Added sequence privileges and a note to repeat grants for every migrated non-system schema.
- The source connection profile commands used obsolete generic syntax with `--provider=POSTGRESQL`. Updated them to `gcloud database-migration connection-profiles create postgresql`.
- The SSL connection profile command used an invalid `--ssl-ca-certificate` flag and passed a file path. Replaced it with `--ssl-type=SERVER_ONLY` and `--ca-certificate="$(<server-ca.pem)"`, which passes the certificate contents as required.
- The destination connection profile command used obsolete generic syntax with `--provider=CLOUDSQL`. Updated it to the current PostgreSQL connection profile syntax for an existing Cloud SQL destination.
- The migration job command did not specify whether PostgreSQL should migrate all databases or selected databases. Added `--all-databases`.
- The sequence section implied DMS handles sequence state sufficiently during the snapshot. Updated it to reflect that destination sequence state might differ and should be verified and adjusted.
- The rollback section said redirecting traffic back to the source within minutes has no data loss. Updated it to clarify that this is only true if no writes reached the Cloud SQL destination after cutover.

## Review Notes
The guide is technically relevant and mostly accurate after correction. Future improvements could add a stricter consistency-check method than comparing `pg_stat_user_tables.n_live_tup`, because those row counts are planner statistics and can be approximate.
