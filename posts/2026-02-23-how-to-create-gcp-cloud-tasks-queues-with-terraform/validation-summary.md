# Validation Summary: How to Create GCP Cloud Tasks Queues with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (hashicorp/google provider ~> 5.0)
- Google Cloud Tasks (`google_cloud_tasks_queue`)
- Google Cloud IAM (`google_cloud_tasks_queue_iam_member`, `google_service_account`, `google_service_account_iam_member`, `google_cloud_run_service_iam_member`)
- Google Cloud Run v2 (`google_cloud_run_v2_service`)
- HCL configuration language

## Sources Consulted
- [Terraform Registry — google_cloud_tasks_queue](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_tasks_queue)
- [Terraform Registry — google_cloud_tasks_queue_iam](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_tasks_queue_iam)
- [Google Cloud — Configure Cloud Tasks queues](https://cloud.google.com/tasks/docs/configuring-queues)
- [Google Cloud — Create HTTP target tasks](https://cloud.google.com/tasks/docs/creating-http-target-tasks)
- [Google Cloud — Cloud Tasks IAM roles and permissions](https://cloud.google.com/iam/docs/roles-permissions/cloudtasks)
- terraform-provider-google source: cloud_tasks_queue.html.markdown

## Issues Found

1. **`max_burst_size` set as an input on `rate_limits`** — The post originally set `max_burst_size` inside the `rate_limits` block in the "Queue with Rate Limiting" and "Webhook Processing Queue" examples. In the `google_cloud_tasks_queue` Terraform resource, `max_burst_size` is an **output-only/computed** attribute (Cloud Tasks calculates it automatically from `max_dispatches_per_second`); attempting to set it would cause a Terraform configuration error. Removed the `max_burst_size = 50` and `max_burst_size = 100` lines from both rate_limits blocks, and reworded the explanatory paragraph to clarify that `max_burst_size` exists but is computed automatically rather than configurable.

2. **Incorrect explanation of `max_doublings` behavior** — The post stated that after `max_doublings` doublings have been reached, "the backoff stays at 16s for remaining retries." This is incorrect. Per the official Google Cloud documentation and the Terraform resource docs, after the doublings phase the interval *grows linearly* by `2^max_doublings * min_backoff` each subsequent retry until it caps at `max_backoff`. Rewrote the paragraph to describe the correct sequence (1s, 2s, 4s, 8s, 16s, then linear growth 32s, 48s, 64s, 80s, …, capped at 300s) and adjusted the inline comment on `max_doublings = 4` accordingly.

## Review Notes

- The IAM section uses `google_cloud_run_service_iam_member` (v1 IAM resource) while the example task handler is defined using `google_cloud_run_v2_service` (v2 service resource). The v1 IAM resource still works against services managed by the v2 API because both APIs target the same underlying service, but using the matching `google_cloud_run_v2_service_iam_member` would be more idiomatic when paired with v2 services. Left as-is since the two snippets are independent example sections and the v1 IAM resource is not technically incorrect.
- The HTTP dispatch deadline claim ("default 10 minutes for HTTP tasks") is correct. The configurable range is 15 seconds to 30 minutes.
- The `roles/cloudtasks.enqueuer` role and the `roles/iam.serviceAccountUser` pattern for granting OIDC token impersonation are both accurate and represent current best practice.
- The provider version pin `~> 5.0` is fine; google provider 6.x is also available but 5.x remains supported and the resource fields used are compatible across both.
- The post correctly notes that pausing/resuming queues is not exposed by the Terraform resource and must be done via `gcloud tasks queues pause/resume`.
