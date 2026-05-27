# Validation Summary: How to Troubleshoot BigQuery Remote Function Invocation Timeout

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google BigQuery remote functions
- BigQuery connections
- GoogleSQL DDL
- Cloud Functions / Cloud Run functions
- Cloud Run
- Google Cloud CLI and bq CLI
- Python functions-framework HTTP handlers

## Sources Consulted
- BigQuery remote functions documentation: https://docs.cloud.google.com/bigquery/docs/remote-functions
- BigQuery GoogleSQL DDL `CREATE FUNCTION` documentation: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language
- BigQuery Cloud resource connection documentation: https://docs.cloud.google.com/bigquery/docs/create-cloud-resource-connection
- BigQuery `INFORMATION_SCHEMA.ROUTINES` documentation: https://docs.cloud.google.com/bigquery/docs/information-schema-routines
- BigQuery `INFORMATION_SCHEMA.ROUTINE_OPTIONS` documentation: https://docs.cloud.google.com/bigquery/docs/information-schema-routine-options
- bq command-line tool reference: https://docs.cloud.google.com/bigquery/docs/reference/bq-cli-reference
- `gcloud functions add-invoker-policy-binding` reference: https://docs.cloud.google.com/sdk/gcloud/reference/functions/add-invoker-policy-binding
- `gcloud functions deploy` reference: https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy
- `gcloud run services add-iam-policy-binding` reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/services/add-iam-policy-binding

## Issues Found
- The post said the BigQuery remote function timeout can be set when creating the function, but the current BigQuery remote function DDL options do not include a separate timeout setting. Changed the section to explain that `max_batching_rows` can reduce per-request work and help avoid endpoint timeouts.
- The Cloud Function timeout example used `--timeout=540`. Changed it to `--timeout=540s` to match the documented duration format and the 1st gen maximum.
- The invoker-permission text did not distinguish Cloud Functions generations. Updated it to say `roles/cloudfunctions.invoker` applies to 1st gen Cloud Functions, while `roles/run.invoker` applies to 2nd gen Cloud Functions and Cloud Run.
- The example request `caller` value used a routine resource path. Updated it to a BigQuery job resource path, matching the documented remote function request format.
- The `INFORMATION_SCHEMA.ROUTINES` query selected a non-existent `remote_function_options` column. Replaced it with documented columns `ddl` and `connection`.

## Review Notes
The local environment did not have `bq` or `gcloud` installed, so CLI syntax was verified against official Google Cloud CLI and BigQuery documentation rather than local `--help` output.
