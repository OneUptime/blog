# Validation Summary: How to Create and Configure Custom Log Buckets in Cloud Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Logging
- Cloud Logging log buckets, sinks, views, and retention
- Google Cloud CLI (`gcloud`)
- Cloud KMS and CMEK for log buckets
- Terraform Google provider
- IAM roles for Cloud Logging log views and Cloud KMS

## Sources Consulted
- Google Cloud Logging: Store log entries - https://docs.cloud.google.com/logging/docs/store-log-entries
- Google Cloud Logging: Configure log buckets - https://docs.cloud.google.com/logging/docs/buckets
- Google Cloud Logging: Route logs to supported destinations - https://cloud.google.com/logging/docs/export/configure_export_v2
- Google Cloud Logging: Configure log views on a log bucket - https://cloud.google.com/logging/docs/logs-views
- Google Cloud Logging: Configure CMEK for log buckets - https://docs.cloud.google.com/logging/docs/routing/managed-encryption-storage
- Google Cloud SDK reference: `gcloud logging buckets create` - https://cloud.google.com/sdk/gcloud/reference/logging/buckets/create
- Google Cloud SDK reference: `gcloud logging sinks create` - https://docs.cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Google Cloud SDK reference: `gcloud logging views add-iam-policy-binding` - https://docs.cloud.google.com/sdk/gcloud/reference/logging/views/add-iam-policy-binding
- Google Cloud SDK reference: `gcloud logging settings describe` - https://docs.cloud.google.com/sdk/gcloud/reference/logging/settings/describe
- Terraform Registry: `google_logging_project_bucket_config` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_project_bucket_config
- Terraform Registry: `google_logging_project_sink` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_project_sink
- Terraform Registry: `google_logging_log_view` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_log_view

## Issues Found
- The CMEK setup example used a fixed `service-PROJECT_NUMBER@gcp-sa-logging.iam.gserviceaccount.com` service account placeholder. Current Cloud Logging CMEK guidance says to use the service account returned in the `kmsServiceAccountId` field from `gcloud logging settings describe`. Updated the text and IAM binding placeholder accordingly.
- The delete-bucket section said a custom bucket must be empty before deletion. Current Cloud Logging documentation says unlocked buckets can be deleted, while locked buckets require all log entries to have fulfilled the retention period; buckets with linked BigQuery datasets also require deleting the link first. Updated the deletion prerequisite in the post.

## Review Notes
The remaining CLI examples, destination formats, default bucket retention claims, log view IAM role, retention update examples, and Terraform resource names/fields matched current official documentation. `gcloud` was not installed in the local environment, so command validation was performed against official Google Cloud SDK and Cloud Logging documentation rather than local `--help` output.
