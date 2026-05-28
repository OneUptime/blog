# Validation Summary: How to Deploy a Google Cloud Function with Terraform Including Pub/Sub Triggers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Functions / Cloud Run functions
- Google Cloud Pub/Sub
- Eventarc
- Terraform Google provider
- Google Cloud Storage
- Google Cloud IAM
- Python Functions Framework
- Google Cloud CLI

## Sources Consulted
- Google Cloud Run functions runtime support: https://cloud.google.com/functions/docs/runtime-support
- Google Cloud Run functions Pub/Sub/Eventarc tutorial: https://docs.cloud.google.com/run/docs/tutorials/pubsub-eventdriven
- Google Cloud Run Pub/Sub triggers documentation: https://cloud.google.com/run/docs/triggering/pubsub-triggers
- Terraform Google provider `google_cloudfunctions2_function` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudfunctions2_function
- Terraform Google provider `google_cloudfunctions_function` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudfunctions_function
- Terraform Google provider `google_pubsub_subscription` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription
- Google Cloud Pub/Sub dead-letter topics documentation: https://docs.cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud SDK `gcloud functions logs read` reference: https://docs.cloud.google.com/sdk/gcloud/reference/functions/logs/read
- Google Cloud local CloudEvent Pub/Sub function sample: https://docs.cloud.google.com/functions/docs/running/direct

## Issues Found
- The required API list for Gen 2 / Cloud Run functions was incomplete. Added Artifact Registry and Cloud Logging APIs, and included the API dependencies in the Gen 2 function resource.
- The archive output path used a `tmp` directory that the snippet did not create. Changed the archive path to write beside the Terraform module to avoid a missing-directory failure.
- The Gen 2 Eventarc trigger identity was missing required invocation roles. Added `roles/eventarc.eventReceiver` and `roles/run.invoker` for the service account used by `event_trigger.service_account_email`.
- The Python example imported `google.cloud.storage` without using it and called undefined placeholder functions for known event types. Removed the unused import and added minimal placeholder handlers so the example runs.
- The Gen 1 Terraform example pointed at the Gen 2 CloudEvent handler. Updated the entry point and added the correct Gen 1 Pub/Sub background function signature using `event, context`.
- The dead-letter section implied that a manually created subscription would control the Cloud Functions trigger subscription. Clarified that Cloud Functions Pub/Sub triggers create their own managed subscriptions and that the dead-letter policy applies only to explicit Pub/Sub subscriptions.
- The dead-letter IAM example granted Pub/Sub permission to publish to the dead-letter topic but omitted the subscriber permission required to acknowledge messages on the source subscription. Added the subscription IAM binding for `roles/pubsub.subscriber`.
- The dead-letter handler referenced an undefined `google_storage_bucket_object.dead_letter_source`. Updated it to use the defined source object.
- The Terraform output used a non-existent top-level `url` attribute for `google_cloudfunctions2_function`. Updated it to `service_config[0].uri`.
- The best-practice statement about always using dead-letter topics was too broad for managed Cloud Functions trigger subscriptions. Narrowed it to explicit subscriptions.

## Review Notes
- Python 3.12 is currently supported for both 1st gen and Cloud Run functions, with deprecation listed for 2028-10-02 and decommission for 2029-04-02 in Google Cloud runtime support documentation.
- The `gcloud functions logs read` command and its `--gen2`, `--region`, `--project`, and `--limit` flags are current according to the Google Cloud SDK reference.
