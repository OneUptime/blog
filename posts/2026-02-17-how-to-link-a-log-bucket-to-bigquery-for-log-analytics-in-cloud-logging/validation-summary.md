# Validation Summary: How to Link a Log Bucket to BigQuery for Log Analytics in Cloud Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Logging
- Cloud Logging Log Analytics / Observability Analytics
- BigQuery linked datasets
- Google Cloud CLI
- Terraform Google provider
- Looker Studio
- GoogleSQL

## Sources Consulted
- Google Cloud Logging: Analyze log data with BigQuery: https://cloud.google.com/logging/docs/analyze/query-linked-dataset
- Google Cloud Logging: Analyze logs using Logs Explorer and Log Analytics: https://cloud.google.com/logging/docs/log-analytics
- Google Cloud Logging: Configure log buckets: https://cloud.google.com/logging/docs/buckets
- Google Cloud Logging: Sample SQL queries: https://cloud.google.com/logging/docs/analyze/examples
- Google Cloud SDK: gcloud logging buckets create: https://cloud.google.com/sdk/gcloud/reference/logging/buckets/create
- Google Cloud SDK: gcloud logging links create: https://cloud.google.com/sdk/gcloud/reference/logging/links/create
- Google Cloud SDK: gcloud logging sinks create: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Google Cloud Logging API LogEntry reference: https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry
- BigQuery pricing: https://cloud.google.com/bigquery/pricing
- Terraform Google provider google_logging_linked_dataset: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_linked_dataset

## Issues Found
- The post said logs "flow into BigQuery" and that the dataset "mirrors" log data. Updated the wording to clarify that the linked dataset gives BigQuery read access to log data stored in the log bucket, with no BigQuery ingestion or storage copy.
- The linked dataset naming description implied the dataset name itself follows `project_id.linked_dataset_name`. Updated it to clarify that the link ID becomes the BigQuery dataset name and that queries use a fully qualified path such as `project_id.linked_dataset_name._AllLogs`.
- The error-rate query accessed `resource.labels.service_name` directly. Updated it to use `JSON_VALUE(resource.labels.service_name)`, matching Google Cloud's guidance for querying resource labels stored as JSON.
- The error-rate query divided counts directly. Updated it to use `SAFE_DIVIDE` to avoid division errors if the query is adapted to produce empty groups.
- The cost section recommended switching to BigQuery flat-rate pricing. Updated it to recommend capacity pricing with reservations because BigQuery flat-rate pricing is legacy for new customers.
- The gotchas section stated that the `_Required` bucket cannot be linked to BigQuery. Replaced this with the documented constraints that a bucket can have at most one linked BigQuery dataset and must be analytics-enabled before linking.

## Review Notes
The local environment did not have `gcloud` installed, so CLI verification was performed against the official Google Cloud SDK reference pages rather than local `--help` output.
