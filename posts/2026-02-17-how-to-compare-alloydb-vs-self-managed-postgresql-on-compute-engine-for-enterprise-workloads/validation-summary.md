# Validation Summary: How to Compare AlloyDB vs Self-Managed PostgreSQL on Compute Engine

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud AlloyDB for PostgreSQL
- PostgreSQL
- Compute Engine
- Google Cloud CLI
- Database Migration Service
- pgBackRest
- Patroni and pg_auto_failover
- PgBouncer and PgPool

## Sources Consulted
- Google Cloud AlloyDB overview: https://docs.cloud.google.com/alloydb/docs/overview
- Google Cloud AlloyDB database version policies: https://docs.cloud.google.com/alloydb/docs/db-version-policies
- Google Cloud AlloyDB columnar engine overview: https://docs.cloud.google.com/alloydb/docs/columnar-engine/about
- Google Cloud AlloyDB columnar engine configuration: https://docs.cloud.google.com/alloydb/docs/columnar-engine/configure
- Google Cloud AlloyDB manual column store management: https://docs.cloud.google.com/alloydb/docs/columnar-engine/manage-content-manually
- Google Cloud AlloyDB supported extensions: https://docs.cloud.google.com/alloydb/docs/reference/extensions
- Google Cloud AlloyDB backup and recovery overview: https://docs.cloud.google.com/alloydb/docs/backup/overview
- Google Cloud SDK reference for `gcloud alloydb clusters create`: https://docs.cloud.google.com/sdk/gcloud/reference/alloydb/clusters/create
- Google Cloud SDK reference for `gcloud alloydb instances create`: https://docs.cloud.google.com/sdk/gcloud/reference/alloydb/instances/create
- Google Cloud SDK reference for `gcloud alloydb backups create`: https://docs.cloud.google.com/sdk/gcloud/reference/alloydb/backups/create
- Google Cloud SDK reference for `gcloud alloydb clusters restore`: https://docs.cloud.google.com/sdk/gcloud/reference/alloydb/clusters/restore
- Google Cloud SDK reference for `gcloud database-migration migration-jobs create`: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/migration-jobs/create
- Google Cloud Database Migration Service PostgreSQL to AlloyDB quickstart: https://docs.cloud.google.com/database-migration/docs/postgresql-to-alloydb/quickstart

## Issues Found
- The AlloyDB PostgreSQL compatibility information was outdated. Updated the feature table from PostgreSQL 14/15 compatibility to the currently documented supported versions, PostgreSQL 14 through PostgreSQL 18.
- The PostgreSQL version row understated AlloyDB's supported versions and implied self-managed examples only through PostgreSQL 17. Updated the row to reflect Google's supported releases and self-managed flexibility for beta releases and custom builds.
- The feature comparison described AlloyDB connection pooling as simply built-in. Updated it to "Managed, configurable" and added `--enable-connection-pooling` to the sample instance command because managed connection pooling is a configurable instance option.
- The feature comparison gave conflicting fixed monthly cost ranges. Replaced the row with configuration-dependent wording to avoid presenting stale or contradictory pricing as a technical fact.
- The columnar engine example used invalid table-level syntax: `ALTER TABLE ... SET (google_columnar_engine.enabled = true)`. Replaced it with a documented `google_columnar_engine_add()` example and clarified that the engine itself is enabled with the instance database flag.
- The AlloyDB failover comment claimed a typical under-60-second failover. Replaced it with the documented behavior that failover is automatic for HA primary instances, without an unsupported time guarantee.
- The self-managed synchronous replication snippet set `synchronous_standby_names = 'standby1'` but omitted the matching standby `application_name`. Added `application_name=standby1` to `primary_conninfo`.
- The AlloyDB point-in-time restore command used the wrong flag, `--restore-point-in-time`. Updated it to the documented `--point-in-time` flag.

## Review Notes
The local environment did not have the `gcloud` CLI installed, so CLI validation was performed against the official Google Cloud SDK command reference rather than local `--help` output. Pricing examples remain illustrative; exact costs should be recalculated with the Google Cloud pricing calculator before publication.
