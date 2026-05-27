# Validation Summary: How to Set Up Automated Backup and Restore Procedures for Cloud SQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud SQL for PostgreSQL
- Cloud SQL Admin API
- Cloud Scheduler
- Cloud Run functions / Cloud Functions Gen 2
- Cloud Storage
- Google Cloud CLI
- Python
- SQLAlchemy

## Sources Consulted
- Cloud SQL backups overview: https://docs.cloud.google.com/sql/docs/postgres/backup-recovery/backups
- Cloud SQL backup options: https://docs.cloud.google.com/sql/docs/postgres/backup-recovery/backup-options
- Cloud SQL Admin API backupRuns.insert: https://docs.cloud.google.com/sql/docs/postgres/admin-api/rest/v1beta4/backupRuns/insert
- Cloud SQL Admin API BackupRun resource: https://docs.cloud.google.com/sql/docs/postgres/admin-api/rest/v1beta4/backupRuns
- Cloud SQL Admin API instances.export: https://docs.cloud.google.com/sql/docs/postgres/admin-api/rest/v1beta4/instances/export
- Cloud SQL import/export SQL dump guide: https://docs.cloud.google.com/sql/docs/postgres/import-export/import-export-sql
- Cloud SQL roles and permissions: https://docs.cloud.google.com/sql/docs/postgres/roles-and-permissions
- Cloud SQL Admin API operations.get: https://docs.cloud.google.com/sql/docs/postgres/admin-api/rest/v1beta4/operations/get
- gcloud functions deploy reference: https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy
- gcloud scheduler jobs create http reference: https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- Cloud Scheduler HTTP target authentication: https://docs.cloud.google.com/scheduler/docs/http-target-auth
- Cloud Run functions authenticated invocation: https://docs.cloud.google.com/functions/docs/securing/authenticating
- Cloud Run service-to-service authentication: https://docs.cloud.google.com/run/docs/authenticating/service-to-service

## Issues Found
- The built-in backup limitations were outdated. The post claimed automated backups always run once per day and retain up to 365 backups. I updated this to distinguish standard backups from enhanced backups, which support additional scheduling and retention options.
- The export example used an empty `databases` list and described it as exporting all databases. For PostgreSQL SQL dump exports to a single `.sql.gz` file, the official examples use an explicit database, and all-user-database export is only available for directory-formatted parallel export. I added `DATABASE_NAME` and exported that database explicitly.
- The restore example imported a SQL dump without a `database` field. I added `DATABASE_NAME` to the import context to match the Cloud SQL PostgreSQL import API examples.
- The restore test code called `wait_for_operation()` but did not define it. I added the missing helper so the example is runnable.
- The restore test's latest-export lookup built an unused and incorrect prefix. I changed it to list exports under the configured source instance path.
- The backup Cloud Function deployment timeout was shorter than the function's Cloud SQL operation wait timeout. I increased the deployment timeout so the sample does not time out before its own polling logic.
- The lifecycle cleanup comment claimed both primary and DR retention rules, but the command only configured the primary bucket. I added a second lifecycle command for the DR bucket.
- The IAM section granted Storage permissions only to the backup function service account. Cloud SQL export/import operations also require the Cloud SQL instance service account to have Storage permissions on the bucket. I added the instance service account bucket binding.
- The Scheduler jobs target authenticated Gen 2 HTTP functions, but the post did not grant the Scheduler service account invoker access. I added `roles/run.invoker` bindings for the underlying Cloud Run services.

## Review Notes
The code is written for Cloud SQL for PostgreSQL, as shown by the PostgreSQL connection string and SQL dump import/export semantics. The post title remains broadly worded, but the examples should be treated as PostgreSQL-specific unless adapted for MySQL or SQL Server.
