# Validation Summary: How to Build BigQuery Remote Functions That Call Cloud Functions

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google BigQuery remote functions
- BigQuery Cloud Resource connections
- Cloud Run functions / Cloud Functions Gen2
- Cloud Run IAM invocation permissions
- GoogleSQL
- Python Functions Framework
- gcloud CLI and bq CLI

## Sources Consulted
- BigQuery remote functions documentation: https://docs.cloud.google.com/bigquery/docs/remote-functions
- BigQuery GoogleSQL CREATE FUNCTION DDL reference: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language
- Cloud Run functions authentication documentation: https://docs.cloud.google.com/functions/docs/securing/authenticating
- Cloud Run functions deployment documentation: https://docs.cloud.google.com/functions/docs/deploy
- Cloud Run functions writing HTTP functions documentation: https://docs.cloud.google.com/run/docs/write-http-functions

## Issues Found
- Added the required Python `requirements.txt` dependency snippet for `functions-framework==3.*`, because Cloud Run functions Python source directories require the Functions Framework dependency.
- Changed the `bq show` command to use `jq -r` and corrected the sample BigQuery connection service account format from `bqcx-...` to `connection-...@gcp-sa-bigquery-condel.iam.gserviceaccount.com`, matching BigQuery connection output.
- Corrected the Gen2 IAM guidance to grant `roles/run.invoker` on the Cloud Run service, rather than granting `roles/cloudfunctions.invoker` first. Cloud Functions v2 / Cloud Run functions use Cloud Run Invoker for authenticated invocation.
- Removed an unused `requests` import from the geocoding function example, which would require an undeclared dependency.
- Fixed `RETURNS JSON` response examples so each `replies` element is a JSON object or `null`, rather than a JSON-encoded string. This makes BigQuery receive actual JSON values and allows `JSON_VALUE` extraction to work.
- Replaced the cache/materialization query that attempted to `CREATE OR REPLACE` a table while reading from the same destination table with a `MERGE` example that only computes sentiment for missing rows.

## Review Notes
The main remote function request/response shape, `REMOTE WITH CONNECTION` syntax, `endpoint` option, `max_batching_rows` option, and US multi-region connection with a `us-central1` function endpoint are consistent with current Google Cloud documentation. BigQuery treats remote functions as non-deterministic for query-result caching, so materializing outputs remains the correct caching strategy.
