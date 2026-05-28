# Validation Summary: How to Configure Pub/Sub Message Retention and Replay for Reprocessing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Pub/Sub
- Pub/Sub message retention
- Pub/Sub seek and snapshots
- Google Cloud CLI
- Terraform Google provider
- Python Pub/Sub and BigQuery client libraries
- Cloud Monitoring API

## Sources Consulted
- Google Cloud Pub/Sub replay and seek documentation: https://cloud.google.com/pubsub/docs/replay-overview
- Google Cloud Pub/Sub subscription REST reference: https://cloud.google.com/pubsub/docs/reference/rest/v1/projects.subscriptions
- Google Cloud Pub/Sub snapshot REST reference: https://cloud.google.com/pubsub/docs/reference/rest/v1/Snapshot
- Google Cloud SDK `gcloud pubsub topics update` reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/topics/update
- Google Cloud SDK `gcloud pubsub subscriptions update` reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/update
- Google Cloud Monitoring `projects.timeSeries.list` API reference: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/list
- Terraform Google provider `google_pubsub_topic` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_topic
- Terraform Google provider `google_pubsub_subscription` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription
- Google Terraform provider source generated from Magic Modules for Pub/Sub resources: https://github.com/GoogleCloudPlatform/magic-modules/tree/main/mmv1/products/pubsub
- Google Cloud Pub/Sub pricing documentation: https://cloud.google.com/pubsub/pricing

## Issues Found
- The post said a subscription's message retention duration cannot exceed the topic's retention duration. This is incorrect. Pub/Sub configures subscription retention independently, and subscription retention can be up to 31 days. I corrected the explanation and noted that unacknowledged message retention uses the longer topic/subscription window when topic retention is configured.
- The Python BigQuery example inserted `processed_at` as the string `"AUTO"`, which is not a valid automatic timestamp value for `insert_rows_json`. I changed it to use `datetime.now(timezone.utc).isoformat()`.
- The post said snapshot lifetime equals the subscription's message retention duration, or 7 days if acknowledged-message retention is disabled. Pub/Sub snapshots have a maximum lifetime of 7 days, with exact lifetime calculated as 7 days minus the age of the oldest unacknowledged message. I corrected the snapshot lifetime description.
- The Terraform snapshot example used a `google_pubsub_snapshot` resource. The current Terraform Google provider documentation and generated Pub/Sub resource definitions do not expose a Pub/Sub snapshot resource. I replaced the invalid Terraform block with guidance to create snapshots using `gcloud pubsub snapshots create` or the Pub/Sub API.
- The replay automation script used `gcloud monitoring read`, which is not a current stable Google Cloud CLI command for reading time-series data. I replaced it with a Cloud Monitoring `projects.timeSeries.list` API call authenticated through `gcloud auth print-access-token` and parsed with `jq`.

## Review Notes
- `gcloud` and `terraform` were not installed in the local environment, so CLI validation was performed against official Google Cloud SDK and Terraform provider documentation instead of local `--help` or provider schema output.
- The idempotency example is intentionally simplified. In production, the BigQuery duplicate check and insert should be made atomic or backed by a stronger deduplication mechanism to avoid races under concurrent processing.
