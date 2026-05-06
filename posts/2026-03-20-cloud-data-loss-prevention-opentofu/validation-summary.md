# Validation Summary: How to Set Up Cloud Data Loss Prevention with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / Terraform-style HCL
- Google Cloud Sensitive Data Protection (Cloud DLP API)
- Google Cloud Storage
- Google Cloud Pub/Sub
- Google Cloud Google provider resources for DLP

## Sources Consulted
- Google Cloud Sensitive Data Protection overview and product naming: https://cloud.google.com/sensitive-data-protection/docs/deidentify-sensitive-data
- Google Cloud job triggers concepts: https://cloud.google.com/sensitive-data-protection/docs/concepts-job-triggers
- Google Cloud actions concepts: https://cloud.google.com/sensitive-data-protection/docs/concepts-actions
- Google Cloud `Action` REST reference: https://cloud.google.com/sensitive-data-protection/docs/reference/rest/v2/Action
- Google Cloud infoType concepts and detector reference: https://cloud.google.com/sensitive-data-protection/docs/concepts-infotypes
- Google Cloud Sensitive Data Protection RPC reference (`CloudStorageOptions.FileSet` and regex file sets): https://cloud.google.com/sensitive-data-protection/docs/reference/rpc/google.privacy.dlp.v2
- Terraform Registry: `google_data_loss_prevention_inspect_template`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/data_loss_prevention_inspect_template
- Terraform Registry: `google_data_loss_prevention_deidentify_template`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/data_loss_prevention_deidentify_template
- Terraform Registry: `google_data_loss_prevention_job_trigger`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/data_loss_prevention_job_trigger

## Issues Found
- The overview said Cloud DLP "automatically discovers" sensitive data. The post's code uses inspection templates and job triggers, which inspect configured repositories rather than perform automatic discovery across resources. I changed the wording to "can inspect and classify" and aligned the product naming with current Google Cloud documentation.
- The job trigger used `gs://${google_storage_bucket.data_bucket.name}/**` inside `file_set.url`. Official documentation supports a trailing wildcard in `url` or a `regex_file_set`; for recursive matching across an entire bucket, `regex_file_set` is the documented option. I replaced the unsupported-looking path pattern with `regex_file_set { bucket_name = var.bucket_name include_regex = [".*"] }`.
- The job trigger example depended on undeclared `google_storage_bucket` and `google_pubsub_topic` resources. I replaced those references with variable-based bucket and topic values so the snippet is self-contained in the same style as the existing `var.project_id` usage.
- The summary said findings are published to Pub/Sub in real time. According to the Sensitive Data Protection action reference, the `pub_sub` action publishes a job-completion notification containing the DLP job name, not the findings payload itself. I corrected the summary and added an inline comment in the code.
- The API enablement snippet relied on an implicit provider project. I added `project = var.project_id` so the example is explicit and consistent with the rest of the post.

## Review Notes
- Cloud DLP is now part of Sensitive Data Protection, but the API name and service endpoint remain `dlp.googleapis.com`.
- The de-identification example uses a transient crypto key for `crypto_hash_config`. This is valid, but it does not produce stable hashes across separate requests. If consistent pseudonymization across runs is required, use an unwrapped or KMS-wrapped key instead.
- The Pub/Sub topic used by the job trigger must already exist, and the Sensitive Data Protection service agent needs publish access to that topic.
