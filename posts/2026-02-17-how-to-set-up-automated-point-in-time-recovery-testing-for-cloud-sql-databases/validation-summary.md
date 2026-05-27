# Validation Summary: How to Set Up Automated Point-in-Time Recovery Testing for Cloud SQL Databases

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud SQL
- Cloud SQL point-in-time recovery
- Google Cloud CLI
- Cloud Functions / Cloud Run functions 2nd gen
- Cloud Scheduler
- Pub/Sub
- Cloud Monitoring custom metrics
- Secret Manager
- Python
- PostgreSQL
- MySQL

## Sources Consulted
- Cloud SQL for PostgreSQL: Configure point-in-time recovery: https://cloud.google.com/sql/docs/postgres/backup-recovery/configure-pitr
- Cloud SQL for MySQL: Configure point-in-time recovery: https://cloud.google.com/sql/docs/mysql/backup-recovery/configure-pitr
- Cloud SQL: Clone instances: https://cloud.google.com/sql/docs/postgres/clone-instance
- Cloud SQL Admin API: instances.clone: https://cloud.google.com/sql/docs/postgres/admin-api/rest/v1/instances/clone
- Cloud SQL Admin API: instances resource / IP address fields: https://cloud.google.com/sql/docs/postgres/admin-api/rest/v1/instances
- Google Cloud CLI: gcloud sql instances patch: https://cloud.google.com/sdk/gcloud/reference/sql/instances/patch
- Google Cloud CLI: gcloud functions deploy: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud CLI: gcloud scheduler jobs create pubsub: https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/pubsub
- Cloud Functions 2nd gen Pub/Sub CloudEvent sample: https://cloud.google.com/functions/docs/samples/functions-cloudevent-pubsub
- Cloud Monitoring write time series sample: https://cloud.google.com/monitoring/docs/samples/monitoring-write-timeseries
- Secret Manager access secret version sample: https://cloud.google.com/secret-manager/docs/access-secret-version

## Issues Found
- The Cloud Function deployment command specified `--entry-point=run_test`, but the Python snippet did not define `run_test`. Added a Pub/Sub CloudEvent entry point that decodes the scheduler message and calls `PITRTester`.
- The orchestration snippet referenced undefined helper methods: `validate_restored_database`, `cleanup_test_instance`, and `report_failure`. Added minimal implementations for instance lookup, validation, cleanup, and failure logging.
- The PITR clone code formatted `point_in_time` as a string while the Python client field maps to the Cloud SQL Admin API timestamp field. Updated the snippet to pass a timezone-aware `datetime` value.
- The timestamp code used naive `datetime.utcnow()` values. Replaced these with timezone-aware UTC timestamps.
- The database validator called an undefined `get_secret()` function. Added a Secret Manager helper using `access_secret_version`.
- MySQL support was incomplete: the recent-data check used PostgreSQL interval syntax and the index check queried `pg_indexes`. Added MySQL branches using `INTERVAL 24 HOUR` and `information_schema.statistics`.
- The Scheduler message did not include the database engine even though the validator supports multiple engines. Added `db_type` to the sample payload.
- The Cloud Monitoring custom metric snippet omitted the required `project_id` label for the `global` monitored resource and used a less complete point construction pattern. Added the `project_id` label and explicit `TimeInterval` / `Point` construction.

## Review Notes
The examples assume the Cloud Function has network access to the restored Cloud SQL instance IP and that the service account has the necessary Cloud SQL Admin, Monitoring, and Secret Manager permissions. The post does not include IAM setup or VPC connectivity setup; that is a future improvement rather than a correctness blocker for the shown PITR workflow.
