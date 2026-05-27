# Validation Summary: How to Use Cloud Workflows to Orchestrate a Data Processing Pipeline

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Workflows
- Google Cloud CLI
- Cloud Storage JSON API
- Cloud Functions HTTP invocation
- BigQuery REST API
- Slack incoming webhooks

## Sources Consulted
- Google Cloud Workflows syntax overview: https://cloud.google.com/workflows/docs/reference/syntax
- Google Cloud Workflows conditions syntax: https://cloud.google.com/workflows/docs/reference/syntax/conditions
- Google Cloud Workflows standard library overview: https://cloud.google.com/workflows/docs/reference/stdlib/overview
- Google Cloud Workflows `text.url_encode`: https://cloud.google.com/workflows/docs/reference/stdlib/text/url_encode
- Google Cloud Workflows `text.match_regex`: https://cloud.google.com/workflows/docs/reference/stdlib/text/match_regex
- Google Cloud Workflows `sys.get_env`: https://cloud.google.com/workflows/docs/reference/stdlib/sys/get_env
- Google Cloud Workflows `http.post`: https://cloud.google.com/workflows/docs/reference/stdlib/http/post
- Cloud Storage JSON API `objects.get`: https://cloud.google.com/storage/docs/json_api/v1/objects/get
- Cloud Storage JSON API `objects.copy`: https://cloud.google.com/storage/docs/json_api/v1/objects/copy
- Cloud Storage JSON API `objects.delete`: https://cloud.google.com/storage/docs/json_api/v1/objects/delete
- BigQuery REST API `jobs.insert`: https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/insert
- BigQuery REST API `jobs.query`: https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query
- BigQuery loading newline-delimited JSON from Cloud Storage: https://cloud.google.com/bigquery/docs/loading-data-cloud-storage-json
- BigQuery schema auto-detection: https://cloud.google.com/bigquery/docs/schema-detect
- `gcloud workflows deploy`: https://cloud.google.com/sdk/gcloud/reference/workflows/deploy
- `gcloud workflows execute`: https://cloud.google.com/sdk/gcloud/reference/workflows/execute
- `gcloud services enable`: https://cloud.google.com/sdk/gcloud/reference/services/enable

## Issues Found
- The `validate_extension` workflow step combined `assign` and `switch` in one step. Workflows steps should use the appropriate step structure, so I split the extension check into a separate `check_extension` switch step.
- Cloud Storage object names were interpolated directly into JSON API URLs. Object names such as `incoming/events-2026-02-17.csv` contain `/` and should be URL-encoded when used as path parameters, so I changed the object metadata and quarantine copy/delete URLs to use `text.url_encode`.
- The quarantine subworkflow only copied invalid files, but the post describes moving them so they are not processed repeatedly. I added a `http.delete` call after the copy to remove the original object.
- The BigQuery load job set `autodetect: false` while providing no schema. BigQuery requires either schema auto-detection or an explicit schema for CSV/JSON loads into a new table, so I changed it to `autodetect: true`.

## Review Notes
The workflow still assumes supporting resources exist, including the `analytics` dataset, the Cloud Function named `transform-csv`, an authenticated Slack webhook URL, and suitable IAM permissions on the workflow service account. The BigQuery quality-check calls use `jobs.query`, which is valid for synchronous queries, but longer-running quality checks should handle `jobComplete: false` with `jobs.getQueryResults`.
