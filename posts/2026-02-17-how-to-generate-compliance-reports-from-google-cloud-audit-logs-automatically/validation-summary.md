# Validation Summary: How to Generate Compliance Reports from Google Cloud Audit Logs Automatically

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Google Cloud Audit Logs
- Cloud Logging log sinks
- BigQuery datasets, routed log tables, scheduled queries, and GoogleSQL
- BigQuery Data Transfer Service / Terraform scheduled query configuration
- Cloud Functions for Python
- Cloud Scheduler HTTP jobs with OIDC
- Cloud Storage bucket retention policies
- Cloud Monitoring alerting policies and logs-based metrics

## Sources Consulted
- Cloud Logging routed logs to BigQuery schema and table organization: https://cloud.google.com/logging/docs/export/bigquery
- `gcloud logging sinks create` reference: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Cloud Logging sink destination permissions: https://cloud.google.com/logging/docs/export/configure_export_v2
- BigQuery scheduled queries documentation: https://cloud.google.com/bigquery/docs/scheduling-queries
- BigQuery `bq` CLI reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- BigQuery Data Transfer `TransferConfig` schedule format: https://cloud.google.com/bigquery/docs/reference/datatransfer/rest/v1/projects.locations.transferConfigs
- App Engine cron-style schedule format used by BigQuery transfer schedules: https://cloud.google.com/appengine/docs/flexible/scheduling-jobs-with-cron-yaml#the_schedule_format
- Cloud Scheduler HTTP target authentication: https://cloud.google.com/scheduler/docs/http-target-auth
- `gcloud scheduler jobs create http` reference: https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- `gcloud monitoring policies create` reference: https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- `gcloud storage buckets create` reference: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/create
- `gcloud storage buckets update` reference: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/update

## Issues Found
- The post created BigQuery partitioned log tables with `--use-partitioned-tables` but queried date-sharded wildcard tables with `_TABLE_SUFFIX`. Updated the queries to use the partitioned table names without wildcards and filter by `DATE(timestamp)`.
- The access review query treated `protoPayload.request` as a nested BigQuery record. Routed audit logs store `request` as `protopayload_auditlog.requestJson`, so the query now uses `JSON_QUERY`.
- The access review query referenced the IAM policy delta under an incorrect `servicedata` path. Updated it to `protopayload_auditlog.servicedata_v1_iam.policyDelta.bindingDeltas`, matching Cloud Logging's routed audit log field shortening rules.
- The status code filters used `protopayload_auditlog.status.code`, but Cloud Logging maps audit log status code to `protopayload_auditlog.statuscode` in BigQuery. Updated the status code selections and filters.
- The scheduled query examples wrote to `compliance_reports` without first creating that dataset. Added the dataset creation command.
- The `bq query` examples used `@access_review_report.sql` and `@data_access_report.sql` as if `bq query` accepted SQL file arguments that way. Updated them to pass SQL files with shell input redirection, which is the documented pattern.
- The architecture diagram said the Cloud Function generated "PDF Report / Email", while the code generates CSV and metadata files. Updated the diagram label to "CSV Report / Email".
- The alerting policy command used obsolete or invalid threshold flags. Replaced them with current `gcloud monitoring policies create` flags: `--if='> 0'` and `--duration=0s`.
- The logs-based metric filter used exact equality for `SetIamPolicy`, which can miss fully qualified method names. Changed it to a substring match with `protoPayload.methodName:"SetIamPolicy"`.
- Added a note that Data Access audit logs usually must be explicitly enabled, while Admin Activity audit logs are enabled by default.

## Review Notes
The overall architecture is valid for an automated compliance evidence pipeline. In production, the Cloud Scheduler OIDC audience should be set carefully for URLs with query parameters, and second-generation Cloud Functions require the invoking service account to have the appropriate Cloud Run invoker permission.
