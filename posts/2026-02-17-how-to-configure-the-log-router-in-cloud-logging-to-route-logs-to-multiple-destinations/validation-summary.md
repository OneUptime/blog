# Validation Summary: Configure the Log Router in Cloud Logging to Route Logs to Multiple Destinations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Logging
- Cloud Logging Log Router
- Log sinks and sink filters
- BigQuery
- Cloud Storage
- Pub/Sub
- Google Cloud CLI
- BigQuery bq CLI
- Terraform Google provider

## Sources Consulted
- Google Cloud Logging routing overview: https://cloud.google.com/logging/docs/routing/overview
- Google Cloud Logging route logs to supported destinations: https://cloud.google.com/logging/docs/export/configure_export_v2
- gcloud logging sinks create reference: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- BigQuery bq command-line tool reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- BigQuery IAM access control documentation: https://cloud.google.com/bigquery/docs/control-access-to-resources-iam
- Cloud Storage uniform bucket-level access documentation: https://cloud.google.com/storage/docs/uniform-bucket-level-access
- Google Cloud Observability pricing: https://cloud.google.com/stackdriver/pricing
- Terraform google_logging_project_sink resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_project_sink

## Issues Found
- The post described sinks as having an "inclusion or exclusion type." Cloud Logging sinks have an inclusion filter and can have exclusion filters, so this was corrected to "optional exclusions."
- The BigQuery IAM example used `bq add-iam-policy-binding` on a dataset. The official bq CLI reference states that this command does not support datasets, so the example was changed to a supported SQL `GRANT` statement for dataset-level access.
- The IAM examples used a hard-coded sink service account. These were changed to read the actual `writerIdentity` from the relevant sink so the commands work with the generated sink identity.
- The Terraform example used `writer_identity` and `bigquery_options` without explicitly setting `unique_writer_identity`. The snippet was updated to set `unique_writer_identity = true` on the sinks whose writer identity is granted destination access.
- The cost section said ingestion charges still apply when routing logs externally. Current Cloud Logging pricing states that routing is not charged by Cloud Logging and that charges apply to logs stored in `_Default` or user-defined log buckets after the free allotment, so the wording was corrected.

## Review Notes
The examples assume that destination resources already exist where required and that the caller has permission to update IAM policies on those destinations. The local workspace did not have `gcloud` or `bq` installed, so CLI syntax was verified against official Google Cloud documentation rather than local command help.
