# Validation Summary: How to Set Up Pub/Sub Notifications for Cloud Storage Object Changes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Storage
- Pub/Sub
- Google Cloud CLI
- Terraform Google provider
- Python Google Cloud client libraries
- Cloud Functions
- Redis-based deduplication

## Sources Consulted
- Google Cloud Storage Pub/Sub notifications overview: https://docs.cloud.google.com/storage/docs/pubsub-notifications
- Google Cloud Storage Pub/Sub notification configuration guide: https://docs.cloud.google.com/storage/docs/reporting-changes
- Google Cloud Storage service agent documentation: https://docs.cloud.google.com/storage/docs/getting-service-agent
- Google Cloud Storage gsutil tool documentation: https://docs.cloud.google.com/storage/docs/gsutil
- Google Cloud SDK reference for `gcloud storage buckets notifications create`: https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/notifications/create
- Terraform Google provider `google_storage_notification` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_notification
- Google Pub/Sub subscription filtering documentation: https://docs.cloud.google.com/pubsub/docs/subscription-message-filter
- Google Pub/Sub Python client library documentation: https://cloud.google.com/python/docs/reference/pubsub/latest
- Google Cloud Storage Python `Blob` client documentation: https://docs.cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.blob.Blob
- Google Cloud Run functions Pub/Sub trigger documentation: https://docs.cloud.google.com/run/docs/tutorials/pubsub-eventdriven

## Issues Found
- The introduction and wrap-up described Pub/Sub notification delivery as real-time or without delay. Google documents at-least-once delivery with typical delivery within seconds, but no delivery-time SLA and possible longer delays. Updated the wording to avoid guaranteeing immediate delivery.
- The setup commands used `gsutil` for Cloud Storage notification management and service-agent lookup. Google now describes `gsutil` as a legacy, minimally maintained Cloud Storage CLI and recommends `gcloud storage` instead. Updated the command examples to `gcloud storage service-agent` and `gcloud storage buckets notifications`.
- The Terraform example comment said the `custom_attributes` block filtered objects by prefix. `custom_attributes` attaches extra attributes to messages; prefix filtering in Terraform uses `object_name_prefix`. Updated the comment to describe the block accurately.
- The Cloud Functions section described the pattern as using a push subscription. The sample code is for a Pub/Sub-triggered function, not an HTTP function receiving a Pub/Sub push request. Updated the description to say Pub/Sub trigger.

## Review Notes
The post keeps the Cloud Functions example in the first-generation `event, context` style. It remains a valid pattern for first-generation Cloud Functions, while newer Cloud Run functions commonly use CloudEvents-style handlers.
