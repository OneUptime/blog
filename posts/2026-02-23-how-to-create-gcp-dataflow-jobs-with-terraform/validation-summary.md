# Validation Summary: How to Create GCP Dataflow Jobs with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (hashicorp/google provider)
- Google Cloud Dataflow
- Apache Beam (Flex Templates and classic templates)
- Google Cloud Storage (staging buckets)
- Google Cloud IAM (service accounts and roles)
- Google Cloud BigQuery (as a Dataflow sink)
- Google Cloud Pub/Sub (as a streaming source)
- Google Cloud VPC networking (firewall rules, Cloud Router, Cloud NAT)

## Sources Consulted
- Terraform `google_dataflow_job` resource docs: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/dataflow_job.html.markdown
- Terraform `google_dataflow_flex_template_job` resource docs: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/dataflow_flex_template_job.html.markdown
- Terraform `google_storage_bucket` resource docs: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/storage_bucket.html.markdown
- GCP Dataflow routes and firewall guide: https://cloud.google.com/dataflow/docs/guides/routes-firewall
- GCP Pub/Sub to BigQuery template docs: https://cloud.google.com/dataflow/docs/guides/templates/provided/pubsub-to-bigquery
- GCP Dataflow Google-provided templates reference (regional bucket layout)

## Issues Found

1. **Incorrect `terraform import` syntax for `google_dataflow_job`.** The post showed
   `terraform import google_dataflow_job.my_job projects/my-project/locations/us-central1/jobs/job-id`,
   but the current Google provider expects just the bare job `id` — project and region are
   taken from the resource/provider config. Updated the command to
   `terraform import google_dataflow_job.my_job job-id` and added a clarifying comment.

2. **Wrong Flex Template GCS path.** The post used
   `gs://dataflow-templates/latest/flex/PubSub_to_BigQuery`. The Google-provided template
   bucket is regionalized and the PubSub-to-BigQuery flex template name has a `_Flex`
   suffix. Updated to `gs://dataflow-templates-${var.region}/latest/flex/PubSub_to_BigQuery_Flex`.

3. **Classic template bucket path should be regionalized.** Google-provided classic
   templates live at `gs://dataflow-templates-REGION/latest/...`. Updated the
   `GCS_Text_to_BigQuery` path from `gs://dataflow-templates/latest/GCS_Text_to_BigQuery`
   to `gs://dataflow-templates-${var.region}/latest/GCS_Text_to_BigQuery`.

## Review Notes
- All Terraform resource arguments used (`template_gcs_path`, `temp_gcs_location`,
  `service_account_email`, `ip_configuration`, `machine_type`, `max_workers`, `on_delete`,
  `additional_experiments`, `container_spec_gcs_path`, etc.) are valid in current provider
  versions.
- `google_storage_bucket.url` correctly returns the `gs://` URL — interpolations like
  `"${google_storage_bucket.dataflow_staging.url}/temp"` are accurate.
- Firewall ports TCP 12345–12346 are correct for Dataflow worker-to-worker communication
  (12345 = streaming, 12346 = batch). The single range syntax is valid GCP firewall
  notation, though strictly speaking the two ports serve different runners. Left as-is
  since both are needed and the range form is concise.
- `on_delete` is still valid; newer Google provider versions also expose `deletion_policy`
  as a complement, but `on_delete` continues to work. No change needed.
- The post's distinction between `google_dataflow_job` (classic templates) and
  `google_dataflow_flex_template_job` (Flex Templates) is accurate. The wording around
  streaming "use Flex Templates" is slightly suggestive — Flex vs. classic is independent
  of batch vs. streaming — but it reads as a topic transition rather than a hard rule,
  so left untouched.
- `google_dataflow_flex_template_job` does not support `terraform import`. The post's
  import tip is correctly scoped to `google_dataflow_job`, so no change needed, but worth
  noting for future readers.
