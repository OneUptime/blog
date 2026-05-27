# Validation Summary: How to Use Cloud Run with Eventarc to Auto Process Files Uploaded to Cloud

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run
- Eventarc Standard
- Cloud Storage
- Cloud Audit Logs
- Artifact Registry
- Cloud Build
- Google Cloud CLI
- Python
- Flask
- CloudEvents SDK for Python
- Google Cloud Storage client library for Python
- Firestore

## Sources Consulted
- Google Cloud Eventarc: Route Cloud Storage events to Cloud Run: https://docs.cloud.google.com/eventarc/standard/docs/run/route-trigger-cloud-storage
- Google Cloud Eventarc: Route audit log events to Cloud Run: https://docs.cloud.google.com/eventarc/standard/docs/run/route-trigger-cloud-audit-logs
- Google Cloud Eventarc: Roles and permissions for Cloud Run targets: https://docs.cloud.google.com/eventarc/docs/roles-permissions
- Google Cloud Eventarc: Retry events: https://docs.cloud.google.com/eventarc/docs/retry-events
- Google Cloud Eventarc: Path patterns: https://docs.cloud.google.com/eventarc/docs/path-patterns
- Google Cloud Pub/Sub: Push subscriptions: https://docs.cloud.google.com/pubsub/docs/push
- Google Cloud Pub/Sub: Subscription properties: https://docs.cloud.google.com/pubsub/docs/subscription-properties
- Google Cloud Artifact Registry: Create standard repositories: https://docs.cloud.google.com/artifact-registry/docs/repositories/create-repos

## Issues Found
- The post used an Artifact Registry image path but did not enable the Artifact Registry API or create the Docker repository. Added `artifactregistry.googleapis.com` to the API enablement command and added a `gcloud artifacts repositories create` command before `gcloud builds submit`.
- The Python example parsed the Cloud Audit Logs `resourceName` with `split("/")[3]`, which extracts the wrong segment for Cloud Storage object resource names. Replaced it with parsing based on `/buckets/` and `/objects/`, and URL-decodes the object name.
- The IAM example granted `roles/run.invoker` to the Eventarc service agent instead of the trigger service account. Updated the command to grant `roles/run.invoker` to the same service account used by `--service-account`.
- The retry section stated a 24-hour default retry period and claimed most 4xx responses would not be retried. Updated it to reflect Eventarc Standard's Pub/Sub-backed retry behavior: successful acknowledgments are specific success status codes, other status codes are negative acknowledgments, default retry backoff starts at 10 seconds and can grow to 600 seconds, and unacknowledged messages are retained for 7 days by default.

## Review Notes
- Google recommends direct Cloud Storage events when both direct and audit-log events are supported, but the audit-log based approach in this post remains supported after the corrections.
- The Dockerfile runs Flask's development server even though `gunicorn` is listed in `requirements.txt`. This can work on Cloud Run for a tutorial, but using Gunicorn would be preferable for production deployments.
