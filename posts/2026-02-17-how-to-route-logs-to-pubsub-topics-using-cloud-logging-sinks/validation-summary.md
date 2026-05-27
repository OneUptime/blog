# Validation Summary: How to Route Logs to Pub/Sub Topics Using Cloud Logging Sinks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Logging
- Cloud Logging sinks and log filters
- Pub/Sub topics and subscriptions
- Cloud Functions for Python
- Dataflow Pub/Sub to BigQuery template
- Terraform Google provider
- Splunk and Datadog log forwarding patterns

## Sources Consulted
- Google Cloud Logging: Route logs to supported destinations: https://cloud.google.com/logging/docs/export/configure_export_v2
- Google Cloud Logging: View logs routed to Pub/Sub: https://cloud.google.com/logging/docs/export/pubsub
- Google Cloud Logging query language: https://cloud.google.com/logging/docs/view/logging-query-language
- Google Cloud SDK: gcloud logging sinks create: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Google Cloud SDK: gcloud pubsub topics create: https://cloud.google.com/sdk/gcloud/reference/pubsub/topics/create
- Google Cloud SDK: gcloud pubsub subscriptions create: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- Google Cloud SDK: gcloud functions deploy: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud Functions runtime support: https://cloud.google.com/functions/docs/runtime-support
- Google Cloud Pub/Sub subscription properties: https://cloud.google.com/pubsub/docs/subscription-properties
- Google Cloud Pub/Sub dead-letter topics: https://cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud Dataflow Pub/Sub to BigQuery template: https://cloud.google.com/dataflow/docs/guides/templates/provided/pubsub-to-bigquery
- Terraform Google provider: google_logging_project_sink: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_project_sink
- Terraform Google provider: google_pubsub_subscription: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription
- Terraform Google provider: google_project_service_identity: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/project_service_identity

## Issues Found
- The Pub/Sub buffering claim implied messages are always held for 31 days. Updated it to state that subscription retention is configurable up to 31 days.
- The security sink filter used `logName:"iam.googleapis.com"`, which is not the normal way to match IAM audit log entries. Updated it to filter on `protoPayload.serviceName="iam.googleapis.com"`.
- The Dataflow Pub/Sub to BigQuery example omitted the requirement that the BigQuery table must already exist with a schema matching the JSON message data. Added that caveat before the command.
- The Terraform dead-letter policy omitted the IAM grants required for Pub/Sub to publish to the dead-letter topic and acknowledge forwarded messages. Added `google_pubsub_topic_iam_member` and `google_pubsub_subscription_iam_member` resources using the project Pub/Sub service account.

## Review Notes
`gcloud` and `terraform` were not installed in the local environment, so CLI and Terraform validation were checked against official documentation rather than local command execution. The Cloud Functions Python 3.11 runtime is currently supported for 1st gen and Cloud Run functions. The Dataflow template example is technically valid as a pattern, but production deployments should pin a Dataflow template version instead of using `latest` to avoid unexpected template changes.
