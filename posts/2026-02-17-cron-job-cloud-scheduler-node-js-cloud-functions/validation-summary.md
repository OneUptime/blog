# Validation Summary: How to Build a Cron Job Service with Cloud Scheduler and Node.js Cloud Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Scheduler
- Google Cloud Functions / Cloud Run functions Gen2
- Node.js
- Firestore
- BigQuery
- Cloud Storage
- Pub/Sub
- Cloud Monitoring and Cloud Logging
- Google Cloud CLI

## Sources Consulted
- Google Cloud Functions / Cloud Run functions runtime support: https://cloud.google.com/functions/docs/runtime-support
- Google Cloud Functions / Cloud Run functions quotas and timeout limits: https://cloud.google.com/functions/quotas
- gcloud functions deploy reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Cloud Scheduler cron job creation guide: https://cloud.google.com/scheduler/docs/creating
- Cloud Scheduler HTTP target authentication guide: https://cloud.google.com/scheduler/docs/http-target-auth
- gcloud scheduler jobs create http reference: https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- gcloud scheduler jobs create pubsub reference: https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/pubsub

## Issues Found
- The deployment commands used `nodejs20`, which is deprecated as of 2026-04-30. Updated the examples to `nodejs22`, which is a supported Cloud Run functions runtime.
- The authenticated HTTP Scheduler setup omitted the required invoker IAM binding. Added a `gcloud functions add-iam-policy-binding` command granting `roles/run.invoker` to the Scheduler service account for the Gen2 function.
- The Scheduler retry flags used `--min-backoff-duration` and `--max-backoff-duration`, which are API field-style names, not the current `gcloud scheduler jobs create http` flags. Updated them to `--min-backoff` and `--max-backoff`.
- The long-running jobs section stated that Gen2 Cloud Functions have a maximum timeout of 9 minutes. Corrected this to explain that the sample uses a 540-second configured timeout and that Gen2 maximums vary by trigger type.

## Review Notes
The examples remain illustrative and assume required dependencies such as `@google-cloud/firestore`, `@google-cloud/bigquery`, `@google-cloud/storage`, and `@google-cloud/functions-framework` are present in each function source package. The Pub/Sub topic and Cloud Scheduler service account must also exist before running the commands.
