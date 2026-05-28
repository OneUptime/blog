# Validation Summary: How to Create Exclusion Filters in Cloud Logging to Reduce Log Ingestion Costs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Logging
- Cloud Logging Log Router and sinks
- Cloud Logging exclusion filters
- Google Cloud CLI
- Cloud Logging API
- Terraform Google provider
- Cloud Monitoring metrics and MQL

## Sources Consulted
- Google Cloud Observability pricing: https://cloud.google.com/products/observability/pricing
- Cloud Logging routing and storage overview: https://cloud.google.com/logging/docs/routing/overview
- Cloud Logging query language: https://cloud.google.com/logging/docs/view/logging-query-language
- Cloud Logging API `projects.exclusions` reference: https://cloud.google.com/logging/docs/reference/v2/rest/v2/projects.exclusions
- Cloud Logging API `exclusions.create` reference: https://cloud.google.com/logging/docs/reference/v2/rest/v2/exclusions/create
- Google Cloud CLI `gcloud logging sinks update` reference: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/update
- Google Cloud CLI `gcloud logging sinks create` reference: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Cloud Logging monitored metrics: https://cloud.google.com/logging/docs/alerting/monitoring-logs
- Terraform Google provider `google_logging_project_exclusion`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_project_exclusion

## Issues Found
- The post described Cloud Logging pricing as a generic ingestion charge. Google now describes the charge as storage for logs streamed into log buckets, with routing itself free. Updated the wording to distinguish log bucket storage from routing.
- The `_Required` bucket description was incomplete. Updated it to note that `_Required` includes more than Admin Activity and System Event audit logs, is free in the `_Required` bucket, and cannot be excluded from that bucket.
- The post referred to Logs Explorer as being in Cloud Monitoring. Updated it to Cloud Logging.
- The "standalone exclusion" example used `gcloud logging sinks create`, which creates a sink with a sink-level exclusion, not a project-level exclusion on the `_Default` sink. Replaced it with the Cloud Logging API `projects/[PROJECT_ID]/exclusions` example and clarified that these exclusions are created on `_Default`.
- The health-check filters used exact `httpRequest.requestUrl` path matches that often fail for full URLs. Updated the examples to use a regex that matches common health-check paths with optional query strings.
- The export sink explanation implied `_Default` exclusions affect all sinks. Clarified that exclusions on `_Default` only affect `_Default`; custom sinks still receive logs excluded only from `_Default`.
- The safety tip implied that percentage-based exclusion is a separate exclusion setting. Updated it to explain that sampling is implemented with the Logging query language `sample()` function.

## Review Notes
- The `gcloud logging sinks update --add-exclusion` examples use current documented flags.
- The Terraform `google_logging_project_exclusion` examples use current provider fields: `name`, `description`, `filter`, and optional `disabled`.
- The Cloud Monitoring metric `logging.googleapis.com/billing/bytes_ingested` remains documented, although Google also documents newer log-bucket-specific ingestion metrics such as `logging.googleapis.com/billing/log_bucket_bytes_ingested`.
