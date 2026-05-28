# Validation Summary: How to Build Event-Driven Microservices on GCP Using Eventarc and Cloud Run

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Eventarc
- Google Cloud Run
- Cloud Storage
- Pub/Sub
- Cloud Vision API
- Firestore
- Python
- Flask
- Docker
- Google Cloud CLI

## Sources Consulted
- Google Cloud Run documentation: Create triggers from Cloud Storage events: https://docs.cloud.google.com/run/docs/triggering/storage-triggers
- Google Eventarc Standard documentation: Route Cloud Storage events to Cloud Run: https://docs.cloud.google.com/eventarc/standard/docs/run/route-trigger-cloud-storage
- Google Eventarc Standard documentation: Route Cloud Pub/Sub events to Cloud Run: https://docs.cloud.google.com/eventarc/standard/docs/run/route-trigger-cloud-pubsub
- Google Eventarc documentation: CloudEvents format - HTTP protocol binding: https://docs.cloud.google.com/eventarc/docs/cloudevents
- Google Eventarc documentation: Event format: https://cloud.google.com/eventarc/docs/event-format
- Google Eventarc documentation: Retry events: https://docs.cloud.google.com/eventarc/docs/retry-events
- Google Cloud SDK reference: gcloud eventarc triggers create: https://docs.cloud.google.com/sdk/gcloud/reference/eventarc/triggers/create
- Google Cloud Run documentation: Deploy services from source code: https://docs.cloud.google.com/run/docs/deploying-source-code
- Google Cloud Vision API documentation: Detect explicit content / SafeSearch: https://docs.cloud.google.com/vision/docs/detecting-safe-search
- Google Cloud Vision Python client reference: SafeSearchAnnotation: https://docs.cloud.google.com/python/docs/reference/vision/latest/google.cloud.vision_v1.types.SafeSearchAnnotation

## Issues Found
- The setup commands enabled Cloud Run, Eventarc, Cloud Build, and Storage APIs, but the later examples also use Artifact Registry, Pub/Sub, Vision API, and Firestore. Added the missing API enablement commands.
- The IAM setup granted `roles/eventarc.eventReceiver` but did not grant the trigger service account `roles/run.invoker`, which authenticated Cloud Run services require for Eventarc delivery. Added the missing IAM binding.
- The image resizer wrote resized images back into the same bucket under `resized/`, which would generate new Cloud Storage finalized events and recursively trigger the resizer. Added a prefix check to skip generated files.
- The custom events section said the Eventarc trigger filters on the custom event type. For Eventarc Standard with Pub/Sub, the trigger filters on the CloudEvent type `google.cloud.pubsub.topic.v1.messagePublished`; custom domain event type data should be carried in the Pub/Sub payload or attributes and handled by the receiver. Updated the wording to match the actual Eventarc Pub/Sub behavior.

## Review Notes
- The Cloud Run and Eventarc trigger commands use current documented flags.
- The Python examples are syntactically valid and use current Google Cloud Python client APIs.
- The Dockerfile references a `requirements.txt` file that the post does not show. This is not technically incorrect, but a future improvement would be to include the required package list for a complete copy-paste tutorial.
