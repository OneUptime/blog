# Validation Summary: How to Set Up Aggregated Log Sinks at the Organization Level in Cloud Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Logging
- Cloud Logging aggregated sinks
- Google Cloud CLI (`gcloud logging sinks`)
- Google Cloud IAM
- BigQuery
- Cloud Storage
- Pub/Sub
- Terraform Google provider

## Sources Consulted
- Google Cloud Logging aggregated sinks overview: https://cloud.google.com/logging/docs/export/aggregated_sinks_overview
- Google Cloud Logging aggregated sinks setup guide: https://cloud.google.com/logging/docs/export/aggregated_sinks
- Google Cloud SDK reference for `gcloud logging sinks create`: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Google Cloud IAM roles and permissions for Cloud Logging: https://cloud.google.com/iam/docs/roles-permissions/logging
- Google Cloud Observability pricing: https://cloud.google.com/stackdriver/pricing
- Terraform Registry, `google_logging_organization_sink`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_organization_sink

## Issues Found
- The post described aggregated sinks as a "pull model." Updated this to describe Cloud Logging's Log Router evaluating log entries against aggregated sinks, matching the official routing model.
- The destination permission examples omitted the current Cloud Logging requirement to grant `roles/logging.logWriter` for routing to destinations in the destination project. Added the role to both CLI and Terraform examples.
- The permission examples did not include the required `roles/logging.bucketWriter` role for Cloud Logging log bucket destinations. Added a CLI example for log bucket destinations.
- The intercepting sink example routed directly to a log bucket. Official documentation states that intercepting aggregated sinks must use a Google Cloud project as the destination. Updated the example destination to `logging.googleapis.com/projects/central-logging-project` and adjusted the surrounding explanation.
- The cost section said ingestion is charged per project and that aggregated sinks do not affect ingestion charges. Updated the section to reflect current pricing language: Log Router has no additional charge, log bucket storage is charged when logs are streamed into log buckets except `_Required`, and downstream destination costs can apply.

## Review Notes
The local environment did not have `gcloud` installed, so CLI verification was performed against official Google Cloud SDK reference documentation rather than local `--help` output.
