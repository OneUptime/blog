# Validation Summary: How to Set Up Object Change Notifications Using Google Cloud Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Storage
- Cloud Run functions / Cloud Functions 2nd gen
- Eventarc Cloud Storage triggers
- Python 3.12
- Node.js 20
- Google Cloud CLI
- Terraform Google provider

## Sources Consulted
- Google Cloud: Cloud Storage CloudEvent function samples, https://cloud.google.com/functions/docs/samples/functions-cloudevent-storage
- Google Cloud: Write event-driven Cloud Run functions, https://cloud.google.com/run/docs/write-event-driven-functions
- Google Cloud SDK: `gcloud functions deploy`, https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud SDK: `gcloud functions logs read`, https://cloud.google.com/sdk/gcloud/reference/functions/logs/read
- Google Cloud: Create triggers from Cloud Storage events, https://cloud.google.com/run/docs/triggering/storage-triggers
- Google Cloud: Enable event-driven function retries, https://cloud.google.com/functions/docs/bestpractices/retries
- Google Cloud Eventarc: Understand path patterns, https://cloud.google.com/eventarc/docs/path-patterns
- Terraform Registry: `google_cloudfunctions2_function`, https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudfunctions2_function

## Issues Found
- The Node.js CloudEvent example exported the handler directly. Current Google Cloud documentation for Node.js event-driven Cloud Run functions registers CloudEvent handlers with `@google-cloud/functions-framework`, so the example was changed to `functions.cloudEvent('processGcsEvent', async (cloudEvent) => { ... })`.
- The post said Cloud Functions retries failed invocations by default. For functions deployed through the Cloud Functions v2 API, retries are disabled by default and must be enabled with `--retry`, so the retry section was corrected.
- The Python idempotency snippet used `datetime.utcnow()` without importing `datetime`. The snippet now imports `datetime` and `timezone` and uses `datetime.now(timezone.utc).isoformat()`.
- The logging section labeled a bounded `gcloud functions logs read` query as following logs in real time. The label was corrected to describe reading logs since a specific time.
- The file filtering section said extension filtering cannot be done at the trigger level. Eventarc path pattern filters can support suffix-style filtering for Cloud Storage object resource names, so the statement was narrowed to recommend in-function filtering when path pattern filters are not configured.

## Review Notes
The deployment commands and Terraform resource shape match current Google Cloud and Terraform provider documentation. The local environment did not have `gcloud` installed, so CLI validation was performed against the official Google Cloud SDK reference.
