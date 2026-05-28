# Validation Summary: How to Configure Budget Alerts and Cost Controls for a New GCP Project

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Billing budgets and budget notifications
- Google Cloud CLI
- Cloud Billing export to BigQuery
- BigQuery SQL
- Cloud Functions / Cloud Run functions
- Pub/Sub
- Compute Engine
- Cloud SQL
- Cloud Storage
- Cloud Scheduler
- Compute Engine committed use discounts
- Recommender API
- Looker Studio / dashboarding from BigQuery

## Sources Consulted
- Google Cloud CLI: `gcloud billing budgets create` - https://docs.cloud.google.com/sdk/gcloud/reference/billing/budgets/create
- Google Cloud CLI: `gcloud billing budgets update` - https://docs.cloud.google.com/sdk/gcloud/reference/billing/budgets/update
- Cloud Billing programmatic budget notifications - https://docs.cloud.google.com/billing/docs/how-to/budgets-programmatic-notifications
- Cloud Billing BigQuery export tables - https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery-tables
- Cloud Billing detailed usage export schema - https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery-tables/detailed-usage
- Cloud SQL instance labels - https://docs.cloud.google.com/sql/docs/mysql/label-instance
- Cloud Storage bucket labels / `gcloud storage buckets update` - https://cloud.google.com/storage/docs/using-bucket-labels
- Cloud Scheduler HTTP jobs - https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- Compute Engine committed use discounts - https://docs.cloud.google.com/compute/docs/instances/signing-up-committed-use-discounts
- Google Cloud CLI: `gcloud compute commitments create` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/commitments/create
- Recommender IDs - https://cloud.google.com/recommender/docs/recommenders
- Cloud Monitoring dashboard API / metrics catalog - https://cloud.google.com/monitoring/api/ref_v3/rest/v1/projects.dashboards and https://cloud.google.com/monitoring/api/metrics_gcp_a_b
- Cloud Functions Python runtime support and Pub/Sub sample - https://docs.cloud.google.com/functions/docs/runtime-support and https://cloud.google.com/functions/docs/samples/functions-helloworld-pubsub

## Issues Found
- The budget creation examples used older `--all-updates-rule-monitoring-notification-channels` flags. Updated them to the current `--notifications-rule-monitoring-notification-channels` flag and used the full Monitoring notification channel resource-name format required by the CLI.
- The budget update example used `--all-updates-rule-pubsub-topic`. Updated it to the current `--notifications-rule-pubsub-topic` flag.
- The resource-level BigQuery query used the standard billing export table name even though `resource.name` is only available in the detailed export table. Updated that query to use `gcp_billing_export_resource_v1_*`.
- The Cloud Function sample imported `google.cloud.billing_v1` without using it. Removed the import to avoid implying an unnecessary dependency.
- A code comment said billing would be disabled at 100%, while the condition was `percentage >= 120`. Updated the comment to 120%.
- The Cloud SQL label command used the GA `gcloud sql instances patch` command, but Google Cloud documentation shows label updates with `gcloud beta sql instances patch`. Updated the command.
- The committed use discount section used outdated/incorrect CLI values: `--plan=twelve-month`, `--type=GENERAL_PURPOSE`, and a 37-57% savings claim. Updated the plan to `12-month`, the type to `general-purpose`, and the claim to Google's documented "up to 55%" for most Compute Engine resources.
- The Cloud Monitoring dashboard example referenced a non-existent `billing.googleapis.com/billing/gcp/charges` metric. Replaced it with a BigQuery view that can feed Looker Studio or another dashboard tool from the billing export.

## Review Notes
The Cloud Function example remains illustrative and assumes the deployed function has the required IAM permissions and Python dependencies, including `google-cloud-compute`. Budget Pub/Sub notifications are delivered multiple times per day and at least once, so production automation should be idempotent and guarded carefully.
