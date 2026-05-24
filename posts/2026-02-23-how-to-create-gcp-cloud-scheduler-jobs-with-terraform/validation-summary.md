# Validation Summary: How to Create GCP Cloud Scheduler Jobs with Terraform

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Terraform (HCL)
- Google Cloud Platform (GCP)
- Cloud Scheduler (`google_cloud_scheduler_job`)
- Cloud Pub/Sub (`google_pubsub_topic`)
- Cloud Run (IAM via `google_cloud_run_service_iam_member`)
- Cloud Functions Gen 2 (IAM via `google_cloudfunctions2_function_iam_member`)
- App Engine targets / `app_engine_routing`
- OIDC token authentication for HTTP targets
- Cron schedule expressions
- `hashicorp/google` Terraform provider (~> 5.0)

## Sources Consulted
- Terraform `google_cloud_scheduler_job` resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_scheduler_job
- terraform-provider-google source markdown: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/cloud_scheduler_job.html.markdown
- Cloud Scheduler overview & Pub/Sub tutorial: https://cloud.google.com/scheduler/docs/overview, https://cloud.google.com/scheduler/docs/tut-pub-sub
- Cloud Scheduler HTTP target auth: https://cloud.google.com/scheduler/docs/http-target-auth
- GCP service agents reference: https://cloud.google.com/iam/docs/service-agents

## Issues Found
- **IAM example for Pub/Sub targets was incorrect.** The original snippet granted `roles/pubsub.publisher` to the user-created `cloud-scheduler-sa` service account. That custom SA is only used for HTTP OIDC/OAuth authentication; Cloud Scheduler publishes to Pub/Sub using its Google-managed service agent `service-{PROJECT_NUMBER}@gcp-sa-cloudscheduler.iam.gserviceaccount.com`, which automatically receives publish permission via `roles/cloudscheduler.serviceAgent` for same-project topics. Replaced the snippet with a `data "google_project" "project" {}` lookup and a member that targets the correct service agent, with a comment clarifying that this grant is only needed for cross-project topics.

## Review Notes
- Resource name `google_cloud_scheduler_job` and all nested blocks (`retry_config`, `http_target`, `pubsub_target`, `app_engine_http_target`, `app_engine_routing`, `oidc_token`) match the current `hashicorp/google` v5 schema.
- `paused = true` is a valid input argument on `google_cloud_scheduler_job` in provider v5.x; the example is correct.
- Retry config fields (`retry_count`, `max_retry_duration`, `min_backoff_duration`, `max_backoff_duration`, `max_doublings`) are all valid duration/integer fields.
- Pub/Sub `data` is correctly base64-encoded; HTTP `body` is also correctly base64-encoded as required by the API.
- The claim about default `time_zone` falling back to UTC (`Etc/UTC`) is correct.
- The `X-CloudScheduler` header used to identify Scheduler-originated traffic is accurate (Cloud Scheduler also adds `X-CloudScheduler-JobName` and `X-CloudScheduler-ScheduleTime`, but mentioning the marker header alone is fine).
- The 1 MB Cloud Scheduler request body limit cited in Best Practices is consistent with documented quotas.
- Cloud Run IAM example uses `google_cloud_run_service_iam_member` (Cloud Run v1). If readers are using Cloud Run v2 services, they will need `google_cloud_run_v2_service_iam_member` instead — worth a future clarification but not technically wrong as written.
