# Validation Summary: How to Create GCP Budget Alerts with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / HCL
- Google Cloud Billing Budgets
- Terraform Google provider (`hashicorp/google`)
- Cloud Monitoring notification channels
- Google Cloud Pub/Sub

## Sources Consulted
- Terraform Google provider `google_billing_budget`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/billing_budget
- Terraform Google provider `google_monitoring_notification_channel`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_notification_channel
- Terraform Google provider configuration reference: https://registry.terraform.io/providers/hashicorp/google/latest/docs/guides/provider_reference
- Create, edit, or delete budgets and budget alerts: https://cloud.google.com/billing/docs/how-to/budgets
- Cloud Billing Budget API reference: https://cloud.google.com/billing/docs/reference/budget/rest/v1/billingAccounts.budgets
- Set up programmatic notifications: https://cloud.google.com/billing/docs/how-to/budgets-programmatic-notifications
- Disable billing usage with notifications: https://cloud.google.com/billing/docs/how-to/disable-billing-with-notifications
- Create and manage notification channels: https://cloud.google.com/monitoring/support/notification-options
- Cloud Monitoring notification channels API reference: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.notificationChannels
- BigQuery SKU Groups / service ID reference: https://cloud.google.com/skus/sku-groups/bigquery

## Issues Found
- The post pinned the Google provider to `~> 5.0`, which was outdated relative to the current official provider docs. I updated it to `~> 7.0`.
- The provider configuration omitted `user_project_override = true`, even though the current `google_billing_budget` docs warn that User ADC usage requires both `billing_project` and `user_project_override`. I added `user_project_override = true`.
- The budget filter examples used `projects/${var.project_id}`. The current provider docs require project resource names in the form `projects/{project_number}`. I added `google_project` data sources and switched the filters to project numbers.
- The project budget attempted to use a Slack Monitoring notification channel in `monitoring_notification_channels`. Cloud Billing budget alerts only support Cloud Monitoring email notification channels. I removed the Slack channel from the budget example and kept email plus Pub/Sub.
- The comment on `disable_default_iam_recipients = false` incorrectly claimed it would automatically disable billing at 100%. That field only controls default email recipients. I corrected the comment and updated the surrounding prose to describe automation through Pub/Sub handlers instead.
- The service-specific budget used `services/95FF-2EF5-5EA1` as the BigQuery service ID. That service ID belongs to Cloud Storage. I corrected it to `services/24E6-581D-38E5`, which is BigQuery.
- The service-specific budget attached a `pubsub_topic` without `schema_version`. The Cloud Billing Budget API requires `schemaVersion` when `pubsubTopic` is set. I added `schema_version = "1.0"`.

## Review Notes
- No period is explicitly set in the examples, so the budgets default to a monthly calendar period. That matches the post's monthly wording.
- Pub/Sub budget notifications are sent at regular intervals and Pub/Sub delivery is at-least-once, so any automation handler should be idempotent.
