# Validation Summary: How to Create GCP Budget Alerts with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- Google Cloud Platform (GCP)
- Cloud Billing Budgets API (`billingbudgets.googleapis.com`)
- `google_billing_budget` Terraform resource
- `google_billing_account` Terraform data source
- `google_monitoring_notification_channel` (email, Slack)
- `google_pubsub_topic`
- `google_cloudfunctions_function` (Cloud Functions Gen 1)
- GCP service IDs for budget filtering (Compute Engine, Cloud SQL)

## Sources Consulted
- Terraform Google provider — `google_billing_budget`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/billing_budget
- Terraform Google provider — `google_billing_account` data source: https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/billing_account
- Terraform Google provider — `google_monitoring_notification_channel`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_notification_channel
- Terraform Google provider — `google_pubsub_topic`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_topic
- Terraform Google provider — `google_cloudfunctions_function`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudfunctions_function
- GCP Cloud Billing Budgets docs: https://cloud.google.com/billing/docs/how-to/budgets
- GCP Cloud Billing Budgets API reference (Budget, BudgetFilter, ThresholdRule, AllUpdatesRule): https://cloud.google.com/billing/docs/reference/budget/rest
- GCP Cloud Billing — SKU/service IDs (Compute Engine `6F81-5844-456A`, Cloud SQL `9662-B51E-5089`)
- GCP Cloud Functions runtime support schedule: https://cloud.google.com/functions/docs/runtime-support

## Issues Found
- **Outdated Python runtime**: The Cloud Function example used `runtime = "python310"`. Python 3.10 reached end of support for Cloud Functions Gen 1 around January 2026. Updated to `python312`, which is currently supported. This is the only correction made.

## Review Notes
- `google_cloudfunctions_function` is the Cloud Functions Gen 1 resource. While still functional, Google now recommends Cloud Functions (2nd gen) via `google_cloudfunctions2_function`, which uses an `event_trigger` block with `event_type = "google.cloud.pubsub.topic.v1.messaged"` and the Eventarc service. The current Gen 1 example is technically correct but worth flagging for future updates.
- The Cloud Function example references `google_storage_bucket.functions` and `google_storage_bucket_object.function_code` that are not defined in the snippet. This is intentional brevity, but readers will need to define those resources separately.
- The `budget_filter.projects` field accepts both project IDs and project numbers in the form `projects/{project_id_or_number}`. The example using `projects/${var.project_id}` is valid.
- `monitoring_notification_channels` expects the full resource name `projects/{project_id}/notificationChannels/{channel_id}`. Using `google_monitoring_notification_channel.email.name` returns exactly that format and is correct.
- `pubsub_topic` in `all_updates_rule` expects `projects/{project_id}/topics/{topic_id}`. Using `google_pubsub_topic.budget_alerts.id` is correct since the `id` attribute is in that exact form.
- Combining `pubsub_topic` and `monitoring_notification_channels` in the same `all_updates_rule` is supported by the API.
- Service IDs `6F81-5844-456A` (Compute Engine) and `9662-B51E-5089` (Cloud SQL) verified as correct GCP service identifiers.
- `last_period_amount {}` (empty block) is the correct syntax for auto-adjusting budgets based on the previous billing period.
- The Slack notification channel uses `auth_token` as a sensitive label, which is the correct legacy approach. Some GCP setups now prefer Slack webhook-based integrations, but the auth_token approach remains supported.
