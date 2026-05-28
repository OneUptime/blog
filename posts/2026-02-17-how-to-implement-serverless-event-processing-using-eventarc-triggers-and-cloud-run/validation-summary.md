# Validation Summary: How to Use Serverless Event Processing Using Eventarc Triggers and Cloud Run

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Eventarc
- Cloud Run
- CloudEvents
- Cloud Storage events
- Cloud Audit Logs events
- Pub/Sub events
- Firestore events
- Python
- Flask
- Google Cloud CLI
- Firestore client library

## Sources Consulted
- Google Cloud Eventarc Standard overview: https://docs.cloud.google.com/eventarc/standard/docs/overview
- Google Cloud Eventarc CloudEvents HTTP protocol binding: https://docs.cloud.google.com/eventarc/docs/cloudevents
- Google Cloud Eventarc retry events: https://docs.cloud.google.com/eventarc/docs/retry-events
- Google Cloud Eventarc roles and permissions for Cloud Run targets: https://docs.cloud.google.com/eventarc/docs/roles-permissions
- Google Cloud Eventarc route Cloud Storage events to Cloud Run: https://docs.cloud.google.com/eventarc/standard/docs/run/route-trigger-cloud-storage
- Google Cloud Eventarc receive Pub/Sub events using authenticated Cloud Run: https://docs.cloud.google.com/eventarc/standard/docs/run/pubsub-authenticated
- Google Cloud Eventarc route Cloud Firestore events to Cloud Run: https://docs.cloud.google.com/eventarc/standard/docs/run/route-trigger-cloud-firestore
- Google Cloud SDK reference for `gcloud eventarc triggers create`: https://docs.cloud.google.com/sdk/gcloud/reference/eventarc/triggers/create
- Cloud Run trigger functions with Firestore documents: https://docs.cloud.google.com/run/docs/triggering/trigger-functions-with-firestore-documents

## Issues Found
- The post said Eventarc listens for "over 130 Google Cloud sources." Updated the wording to "more than 130 Google providers," matching the current Eventarc overview terminology.
- The Cloud Audit Logs description said it covered any API call made to a GCP service. Updated this to audit log entries from GCP services, which is more accurate because Eventarc routes Cloud Audit Logs events rather than every possible API call directly.
- The post said the consumer is always a Cloud Run service while also listing other destinations. Updated the sentence to list supported destination types accurately.
- The Flask example assumed all Eventarc payloads are JSON. Updated the parser and Firestore handler note because direct Firestore events use `application/protobuf` and arrive as raw bytes.
- Trigger examples used `EVENT_SA@my-project.iam.gserviceaccount.com`, but the service-account setup created `eventarc-sa`. Updated trigger commands to use `eventarc-sa@my-project.iam.gserviceaccount.com`.
- The Cloud Storage trigger setup omitted the required `roles/pubsub.publisher` grant for the Cloud Storage service agent. Added the documented `gcloud storage service-agent` and IAM binding commands.
- The idempotency example used a non-atomic read-then-write pattern that could process concurrent duplicate deliveries. Updated it to atomically claim the event ID with Firestore `create()`, return completed results for already processed events, and allow retries if processing fails.

## Review Notes
The local environment did not have `gcloud` installed, so CLI flags were verified against the official Google Cloud SDK reference and product documentation rather than local `--help` output. The post remains a concise tutorial and does not include optional production hardening such as API enablement commands, least-privilege service-level IAM binding, dead-letter handling, or full protobuf decoding for Firestore payloads.
