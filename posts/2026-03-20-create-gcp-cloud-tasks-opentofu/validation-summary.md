# Validation Summary: How to Create GCP Cloud Tasks with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- Google Cloud Platform (GCP)
- GCP Cloud Tasks
- Terraform `hashicorp/google` provider (v5)
- GCP IAM (roles/cloudtasks.enqueuer, roles/run.invoker)
- GCP Cloud Run (v1) and App Engine (as Cloud Tasks dispatch targets)

## Sources Consulted
- Terraform `hashicorp/google` provider documentation for `google_cloud_tasks_queue`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_tasks_queue
- Provider docs source on GitHub: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/cloud_tasks_queue.html.markdown
- GCP Cloud Tasks documentation (queue configuration, rate limits, retry policy)
- GCP IAM predefined roles for Cloud Tasks (`roles/cloudtasks.enqueuer`) and Cloud Run (`roles/run.invoker`)

## Issues Found
No technical issues found.

All resource names, argument names, and nested block fields match the official Terraform Google provider documentation:
- `google_cloud_tasks_queue` with `name`, `location`, `rate_limits`, `retry_config`, `app_engine_routing_override`, and `stackdriver_logging_config` blocks are all valid.
- `rate_limits` fields (`max_concurrent_dispatches`, `max_dispatches_per_second`) are correct.
- `retry_config` fields (`max_attempts`, `max_retry_duration`, `min_backoff`, `max_backoff`, `max_doublings`) are correct.
- `app_engine_routing_override` fields (`service`, `version`) are correct.
- `stackdriver_logging_config.sampling_ratio` (0.0–1.0) is correct.
- IAM resources (`google_cloud_run_service_iam_member`, `google_project_iam_member`) and roles (`roles/run.invoker`, `roles/cloudtasks.enqueuer`) are valid.
- HCL syntax (`for_each`, `locals`, interpolation) is correct.

## Review Notes
- The post uses the legacy Cloud Run v1 resource (`google_cloud_run_service` / `google_cloud_run_service_iam_member`). For new deployments, the v2 resources (`google_cloud_run_v2_service` / `google_cloud_run_v2_service_iam_member`) are generally recommended, but v1 remains valid and supported in provider v5.
- The `google_cloud_tasks_queue` resource also supports an `http_target` block (as of more recent provider versions) for setting default HTTP target configuration on the queue. The post does not mention this — not an error, just a feature that could be highlighted in the future.
- The provider version constraint `~> 5.0` is reasonable as of the post date; readers should be aware that provider v6 is the current major line and may introduce changes.
