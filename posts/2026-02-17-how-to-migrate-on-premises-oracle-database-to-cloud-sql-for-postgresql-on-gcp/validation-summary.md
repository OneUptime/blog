# Validation Summary: How to Migrate On-Premises Oracle Database to Cloud SQL for PostgreSQL on GCP

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud SQL for PostgreSQL
- Google Cloud Database Migration Service
- Google Cloud CLI
- PostgreSQL SQL and PL/pgSQL
- Oracle Database SQL and PL/SQL

## Sources Consulted
- Google Cloud Database Migration Service Oracle to Cloud SQL for PostgreSQL migration guide: https://docs.cloud.google.com/database-migration/docs/oracle-to-postgresql/guide
- Google Cloud CLI reference for `gcloud database-migration conversion-workspaces create`: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/conversion-workspaces/create
- Google Cloud CLI reference for `gcloud database-migration conversion-workspaces seed`: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/conversion-workspaces/seed
- Google Cloud CLI reference for `gcloud database-migration connection-profiles create oracle`: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/connection-profiles/create/oracle
- Google Cloud CLI reference for `gcloud database-migration connection-profiles create postgresql`: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/connection-profiles/create/postgresql
- Google Cloud CLI reference for `gcloud database-migration migration-jobs create`: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/migration-jobs/create
- Google Cloud CLI reference for `gcloud sql instances create`: https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/create
- PostgreSQL documentation for identity columns: https://www.postgresql.org/docs/17/ddl-identity-columns.html
- PostgreSQL documentation for PL/pgSQL transaction management: https://www.postgresql.org/docs/current/plpgsql-transactions.html
- Oracle Database SQL Language Reference for DATE data type: https://docs.oracle.com/en/database/oracle/oracle-database/21/sqlrf/Data-Types.html

## Issues Found
- The assessment example used `gcloud components install database-migration` and passed connection-profile flags directly to `conversion-workspaces create`. The current CLI uses `conversion-workspaces create` with source and destination engine flags, followed by `conversion-workspaces seed` to pull source schema from a connection profile.
- The Cloud SQL instance example used `--storage-size 500GB`; the `gcloud sql instances create` flag expects the storage size value in GB, so it was changed to `500`.
- The schema example created two tables named `orders` in the same SQL block. The identity-column alternative now uses `orders_with_identity` so the snippet is syntactically runnable as written.
- The PL/pgSQL example implied that `COMMIT` is generally valid in PostgreSQL procedures. The note now clarifies that transaction control is only valid when `CALL` is executed outside an explicit transaction block.
- The DMS connection profile examples used the generic `connection-profiles create` command with a `--type` flag. They were corrected to use the engine-specific `oracle` and `postgresql` subcommands and the destination PostgreSQL connection profile includes Cloud SQL instance, database, user, and connectivity flags.
- The migration job example omitted the conversion workspace required for an Oracle-to-PostgreSQL heterogeneous migration. It now includes `--conversion-workspace my-assessment`.

## Review Notes
The post remains a high-level guide. Production migrations still need environment-specific networking, IAM, source database preparation, destination user privileges, and validation planning beyond the sample commands.
