# Validation Summary: How to Trigger a Cloud Function on a Schedule Using Cloud Scheduler

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Functions / Cloud Run functions
- Google Cloud Scheduler
- Google Cloud CLI (`gcloud`)
- OIDC authentication and IAM invoker roles
- Node.js
- Firestore Node.js client library
- Cron schedules

## Sources Consulted
- Google Cloud SDK reference for `gcloud functions deploy`: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud SDK reference for `gcloud functions add-invoker-policy-binding`: https://cloud.google.com/sdk/gcloud/reference/functions/add-invoker-policy-binding
- Google Cloud Functions authentication documentation: https://cloud.google.com/functions/docs/securing/authenticating
- Google Cloud Scheduler HTTP target authentication documentation: https://cloud.google.com/scheduler/docs/http-target-auth
- Google Cloud SDK reference for `gcloud scheduler jobs create http`: https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- Google Cloud Scheduler REST reference for HTTP targets and scheduler headers: https://cloud.google.com/scheduler/docs/reference/rest/v1/projects.locations.jobs
- Google Cloud SDK reference for `gcloud functions logs read`: https://cloud.google.com/sdk/gcloud/reference/functions/logs/read
- Cloud Run functions runtime support schedule: https://cloud.google.com/run/docs/runtimes/function-runtimes
- Firestore Node.js client library reference for `WriteBatch`: https://cloud.google.com/nodejs/docs/reference/firestore/latest/firestore/writebatch

## Issues Found
- The deployment command used `--runtime=nodejs20`, but Node.js 20 for Cloud Run functions is deprecated as of 2026-04-30. Updated the command to `--runtime=nodejs22`, which remains supported.
- The service account setup described `gcloud functions add-invoker-policy-binding` as granting the Cloud Functions Invoker role and said 2nd gen functions may also need a separate Cloud Run Invoker binding. Updated the wording because, for 2nd gen functions, `add-invoker-policy-binding` grants Cloud Run Invoker on the underlying Cloud Run service.
- The retry explanation said retries happen when the function returns a 5xx error. Updated it to say Cloud Scheduler treats non-2xx responses and timeouts as failed attempts for HTTP targets.
- The `--attempt-deadline` note said it gives the function 3 minutes to complete, even though the example function timeout is 120 seconds. Updated it to say Cloud Scheduler waits up to 3 minutes for a response from each attempt.

## Review Notes
The JavaScript examples are syntactically valid CommonJS functions for the Cloud Functions/Functions Framework request handler style. The Firestore batch delete pattern is valid, and the 500-document limit aligns with Firestore batched write limits. The Cloud Scheduler headers used in the example are documented headers; Express exposes request header names in lowercase, so the lowercase lookups are appropriate.
