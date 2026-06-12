# Validation Summary: How to Configure Pub/Sub Push Subscriptions

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Google Cloud Pub/Sub
- Pub/Sub push subscriptions
- Pub/Sub authenticated push with OIDC
- Cloud Run
- Terraform Google provider
- gcloud CLI
- Node.js / Express
- Python / Flask
- OpenTelemetry metrics
- Cloud Monitoring

## Sources Consulted
- Google Cloud Pub/Sub push subscriptions documentation: https://docs.cloud.google.com/pubsub/docs/push
- Google Cloud Pub/Sub authenticated push subscriptions documentation: https://docs.cloud.google.com/pubsub/docs/authenticate-push-subscriptions
- Google Cloud Run Pub/Sub push tutorial: https://docs.cloud.google.com/run/docs/tutorials/pubsub
- Google Cloud Pub/Sub dead-letter topics documentation: https://docs.cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud Pub/Sub subscription filters documentation: https://docs.cloud.google.com/pubsub/docs/subscription-message-filter
- Google Cloud Pub/Sub monitoring documentation: https://docs.cloud.google.com/pubsub/docs/monitoring
- Google Cloud Monitoring metric type reference for Pub/Sub: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z
- Terraform Google provider `google_pubsub_subscription` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription

## Issues Found
- Authenticated push setup was missing the Pub/Sub service agent permission to create OIDC tokens. Added `roles/iam.serviceAccountTokenCreator` examples for both gcloud and Terraform.
- Dead-letter Terraform examples granted only publish permission to the dead-letter topic. Added the required subscriber permission on the source subscription for the Pub/Sub service agent.
- Retry flow implied messages are dropped after "max retries" without a dead-letter topic. Updated the diagram to reflect that max delivery attempts apply to dead-letter forwarding and otherwise messages retry until expiration.
- Exponential backoff example claimed to show Pub/Sub's exact calculation and added undocumented jitter. Reworded it as a simplified planning illustration.
- Cloud Run timeout comment said the timeout "must" be less than the ack deadline. Changed this to guidance to keep request handling below the ack deadline to avoid retries.
- Python/Flask handler returned `400` for malformed or permanent failures while claiming this prevents retries. Pub/Sub retries non-success push responses, so those branches now return `204` when the message should be acknowledged and not retried.
- Cloud Monitoring alert threshold for `subscription/push_request_latencies` used milliseconds, but the metric is measured in microseconds. Changed `30000` to `30000000`.
- OneUptime metrics Express snippet re-threw async errors after recording metrics, which can fail to produce the intended Pub/Sub push response depending on Express error handling. Updated it to return `500` for retryable errors and `204` for non-retryable errors.
- Terraform snippets used `data.google_project.current` without declaring it. Added `data "google_project" "current" {}` to the relevant snippets.

## Review Notes
The post uses Terraform's older `google_cloud_run_service` resource rather than the newer Cloud Run v2 resource used in current Google examples. It is still a valid provider resource, but a future modernization pass could migrate the Cloud Run snippets to `google_cloud_run_v2_service` for consistency with current Cloud Run documentation.
