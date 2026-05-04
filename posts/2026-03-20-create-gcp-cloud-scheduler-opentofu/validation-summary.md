# Validation Summary: How to Create GCP Cloud Scheduler Jobs with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- HashiCorp Google provider (`hashicorp/google` ~> 5.0)
- GCP Cloud Scheduler (`google_cloud_scheduler_job`)
- GCP Pub/Sub (`google_pubsub_topic`)
- GCP Cloud Run (`google_cloud_run_service`, `google_cloud_run_service_iam_member`)
- GCP IAM (`google_service_account`, `google_project_iam_member`)
- OIDC token authentication
- Cron expressions

## Sources Consulted
- HashiCorp Google provider documentation for `google_cloud_scheduler_job`: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/cloud_scheduler_job.html.markdown
- Terraform Registry: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_scheduler_job
- GCP Cloud Scheduler official documentation (cron format, attempt deadlines, retry semantics)
- HashiCorp Google provider docs for `google_pubsub_topic`, `google_service_account`, `google_cloud_run_service_iam_member`, `google_project_iam_member`

## Issues Found
No technical issues found.

Verified specifically:
- `region`, `name`, `description`, `schedule`, `time_zone`, `attempt_deadline`, `retry_config`, `http_target`, `pubsub_target` are all valid top-level arguments.
- `headers` is correctly written as a map using `=` (not a block).
- `body` (in `http_target`) and `data` (in `pubsub_target`) are correctly base64-encoded via `base64encode(...)`.
- `topic_name` in `pubsub_target` expects the full resource name `projects/{project}/topics/{name}`, which `google_pubsub_topic.scheduled_tasks.id` resolves to.
- `oidc_token.audience` is optional and falls back to the target URI — the omission in the `for_each` example is valid.
- `attempt_deadline = "320s"` is the correct string-with-suffix format and falls within the 15s–1800s allowed range.
- `retry_config` fields (`retry_count`, `max_retry_duration`, `min_backoff_duration`, `max_backoff_duration`, `max_doublings`) and their value formats are correct. `max_retry_duration = "0s"` is the correct way to indicate no maximum.
- For Cloud Run authentication, OIDC with `audience` set to the service URL is correct.
- IAM bindings (`roles/run.invoker`, `roles/pubsub.publisher`) are the correct least-privilege roles for the demonstrated targets.
- Cron expressions used (`0 2 * * *`, `0 9 * * 1`, `0 * * * *`, `*/5 * * * *`) are valid POSIX cron syntax, which Cloud Scheduler accepts.
- `account_id = "cloud-scheduler"` satisfies the 6–30 character `[a-z]([-a-z0-9]*[a-z0-9])` regex for service accounts.

## Review Notes
- The post's description and conclusion mention "App Engine targets," but App Engine is not actually demonstrated in the post. App Engine targets in Cloud Scheduler are configured via the dedicated `app_engine_http_target` block (not `http_target` with OIDC). This is a minor scoping inconsistency rather than a technical error — the existing examples remain correct — so no edit was made.
- `google_cloud_run_service` is the v1 (Cloud Run "Anthos/legacy") resource. New deployments often prefer `google_cloud_run_v2_service`, but the v1 resource and its `status[0].url` / `location` attributes referenced here are still valid and supported.
- Cloud Scheduler's `Content-Type` header defaults to `application/octet-stream`; explicitly setting `application/json` (as the post does) is correct and recommended when the body is JSON.
