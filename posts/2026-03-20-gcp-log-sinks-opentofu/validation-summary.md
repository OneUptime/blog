# Validation Summary: How to Create GCP Log Sinks with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform HCL
- Google Cloud Logging
- Log Router / log sinks
- BigQuery
- Cloud Storage
- Pub/Sub
- Google Cloud IAM

## Sources Consulted
- Cloud Logging overview: https://cloud.google.com/logging/docs/overview
- Route logs to supported destinations: https://cloud.google.com/logging/docs/export/configure_export_v2
- Collate and route organization- and folder-level logs to supported destinations: https://cloud.google.com/logging/docs/export/aggregated_sinks
- Logging query language: https://cloud.google.com/logging/docs/view/logging-query-language
- View logs routed to BigQuery: https://cloud.google.com/logging/docs/export/bigquery
- HashiCorp Google provider documentation for `google_logging_project_sink`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/logging_project_sink.html.markdown
- HashiCorp Google provider documentation for `google_logging_organization_sink`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/logging_organization_sink.html.markdown
- HashiCorp Google provider documentation for `google_bigquery_dataset_iam`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/bigquery_dataset_iam.html.markdown
- HashiCorp Google provider source for sink resource behavior: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/google/services/logging/resource_logging_project_sink.go
- HashiCorp Google provider source for organization sink behavior: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/google/services/logging/resource_logging_organization_sink.go

## Issues Found
- The introduction overstated Cloud Logging coverage by saying it collects logs from "all GCP services automatically." I changed this to "Google Cloud resources," which matches the official product overview more closely.
- The provider version pin was outdated. I updated the example from `hashicorp/google ~> 5.10` to `~> 7.0` so the sample reflects the current major version while keeping the same resource syntax.
- The `unique_writer_identity` explanation was too strong. Current Cloud Logging documentation describes managed writer identities/service agents rather than a guaranteed dedicated per-sink service account in all cases, so I revised the inline comment and best-practice note.
- The organization-level sink example referenced an undefined `google_storage_bucket.central_archive` resource and omitted the IAM grant required for the sink writer to write to Cloud Storage. I added the bucket resource and a `google_storage_bucket_iam_member` grant so the snippet is complete and workable.
- The cost note called out egress costs specifically, which is too narrow for these sink destinations. I changed it to storage and downstream processing costs.

## Review Notes
- Google currently recommends Log Analytics with a linked BigQuery dataset for analytics-heavy workflows, but routing logs directly to BigQuery with a sink is still supported and technically valid.
- `tofu` and `terraform` CLIs were not installed in the workspace, so the review was validated against official documentation and provider source rather than by running local CLI validation commands.
