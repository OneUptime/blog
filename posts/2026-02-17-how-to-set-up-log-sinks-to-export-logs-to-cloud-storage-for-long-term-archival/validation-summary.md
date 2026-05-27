# Validation Summary: How to Set Up Log Sinks to Export Logs to Cloud Storage for Long-Term Archival

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Logging
- Cloud Logging log sinks and filters
- Google Cloud Storage
- Cloud Storage lifecycle management
- Cloud Storage retention policies and Bucket Lock
- Google Cloud CLI
- Terraform Google provider
- BigQuery external tables

## Sources Consulted
- Google Cloud Logging: Route logs to supported destinations: https://cloud.google.com/logging/docs/export/configure_export_v2
- Google Cloud Logging: View logs routed to Cloud Storage: https://cloud.google.com/logging/docs/export/storage
- Google Cloud Logging: Store log entries and retention: https://cloud.google.com/logging/docs/store-log-entries
- Google Cloud Storage: gcloud storage buckets create: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/create
- Google Cloud Storage: gcloud storage buckets update: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/update
- Google Cloud Storage: Object Lifecycle Management: https://cloud.google.com/storage/docs/lifecycle
- Google Cloud Storage: Use and lock retention policies: https://cloud.google.com/storage/docs/using-bucket-lock
- Google Cloud Storage: IAM policy bindings for buckets: https://cloud.google.com/storage/docs/access-control/using-iam-permissions
- BigQuery: Create Cloud Storage external tables: https://cloud.google.com/bigquery/docs/external-data-cloud-storage
- Terraform Registry: google_storage_bucket: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
- Terraform Registry: google_logging_project_sink: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_project_sink

## Issues Found
- The introduction said Cloud Logging's default retention is 30 days. This is accurate for the `_Default` log bucket, but not for `_Required`, which has a separate fixed retention period. Changed the wording to specify the `_Default` bucket.
- The Cloud Storage bucket command used `--public-access-prevention=enforced`. Current `gcloud storage buckets create` documentation exposes this as a boolean flag, so the example now uses `--public-access-prevention`.
- The compliance bullet used the term "Object locks", which is not the Google Cloud Storage feature name. Changed it to "Bucket Lock, retention policies, and object holds".
- The Cloud Storage export path example showed `cloudaudit.googleapis.com%2Factivity`. Official Cloud Logging documentation describes routed Cloud Storage object prefixes by log type and date using compound log IDs as path components, so the example now uses `cloudaudit.googleapis.com/activity`.

## Review Notes
The local environment does not have `gcloud` or `terraform` installed, so command validation was performed against official Google Cloud SDK and Terraform provider documentation instead of local CLI help. The BigQuery external table example is syntactically aligned with BigQuery DDL, but production usage may need an explicit schema or schema autodetection checks depending on the exact exported log payloads selected.
