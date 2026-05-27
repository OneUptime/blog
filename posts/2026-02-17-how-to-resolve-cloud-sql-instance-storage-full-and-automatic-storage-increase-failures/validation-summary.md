# Validation Summary: How to Resolve Cloud SQL Instance Storage Full

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Google Cloud SQL
- Google Cloud CLI
- Cloud Monitoring
- MySQL
- PostgreSQL
- Bash

## Sources Consulted
- Google Cloud CLI reference for `gcloud sql instances patch`: https://cloud.google.com/sdk/gcloud/reference/sql/instances/patch
- Google Cloud CLI reference for `gcloud alpha sql instances patch`: https://cloud.google.com/sdk/gcloud/reference/alpha/sql/instances/patch
- Google Cloud SQL for MySQL instance settings: https://cloud.google.com/sql/docs/mysql/instance-settings
- Google Cloud SQL for PostgreSQL instance settings: https://cloud.google.com/sql/docs/postgres/instance-settings
- Google Cloud SQL storage shrink documentation: https://cloud.google.com/sql/docs/postgres/about-storage-shrink
- Google Cloud Monitoring metric types for Cloud SQL: https://cloud.google.com/monitoring/api/metrics_gcp_c
- Google Cloud Monitoring alert policy CLI reference: https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Monitoring `timeSeries.list` API documentation: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/list
- PostgreSQL system administration functions: https://www.postgresql.org/docs/current/functions-admin.html
- MySQL `PURGE BINARY LOGS` documentation: https://dev.mysql.com/doc/refman/9.7/en/purge-binary-logs.html

## Issues Found
- The Cloud Monitoring time-series example used `gcloud monitoring time-series list`, but the current stable `gcloud monitoring` surface does not document a `time-series` group. Replaced it with a direct Monitoring API `timeSeries.list` request using `curl` and `gcloud auth print-access-token`.
- The post said automatic storage increase is not on by default for all instances. Current Cloud SQL instance settings document automatic storage increases as on by default, so this was changed to say the setting might have been turned off.
- The examples for changing `--storage-auto-increase-limit` used the stable `gcloud sql instances patch` command, but the current stable command reference does not include that flag. Updated those examples to use `gcloud beta sql instances patch`.
- The post said Cloud SQL disks cannot be shrunk later. Current Cloud SQL documentation describes manual storage shrink with requirements, limitations, and downtime, so the warning was corrected.
- The PostgreSQL table-size query built schema-qualified relation names as plain text and cast only `tablename` to `regclass` in one expression. Updated it to use `format('%I.%I', schemaname, tablename)::regclass` consistently.
- The alert-policy command used obsolete/non-current threshold flags. Updated it to use the current `--if="> 0.8"` flag documented for `gcloud monitoring policies create`.

## Review Notes
The cleanup SQL examples are syntactically valid, but operationally risky in production: `VACUUM FULL`, `OPTIMIZE TABLE`, replication slot removal, and binary log purging can have locking, replication, or recovery implications. The post already includes some caution, but future revisions could add stronger preflight checks and backup guidance.
