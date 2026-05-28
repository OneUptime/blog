# Validation Summary: How to Build a Serverless Scheduled Job System on GCP Using Cloud Scheduler

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Scheduler
- Google Cloud Functions / Cloud Run functions
- Google Cloud IAM
- Google Cloud Monitoring
- Google Cloud Logging
- Firestore
- BigQuery
- Cloud Storage
- Pub/Sub
- Python
- gcloud CLI

## Sources Consulted
- Google Cloud Functions deploy documentation: https://docs.cloud.google.com/functions/docs/deploy
- Google Cloud Functions runtime support: https://cloud.google.com/functions/docs/runtime-support
- Google Cloud Functions IAM roles: https://cloud.google.com/functions/docs/reference/iam/roles
- Google Cloud SDK `gcloud config set` reference for `functions/gen2`: https://docs.cloud.google.com/sdk/gcloud/reference/config/set
- Google Cloud SDK `gcloud scheduler jobs create http` reference: https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- Cloud Scheduler overview and retry behavior: https://docs.cloud.google.com/scheduler/docs/overview
- Cloud Scheduler retry jobs documentation: https://docs.cloud.google.com/scheduler/docs/configuring/retry-jobs
- Cloud Scheduler authenticated HTTP targets: https://docs.cloud.google.com/scheduler/docs/http-target-auth
- Cloud Scheduler logs documentation: https://docs.cloud.google.com/scheduler/docs/viewing-logs
- Google Cloud SDK `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud SDK `gcloud logging metrics create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- Cloud Logging log-based metrics overview: https://docs.cloud.google.com/logging/docs/logs-based-metrics

## Issues Found
- The deployment commands used 1st gen Cloud Functions IAM semantics (`roles/cloudfunctions.invoker`) but did not pin the function generation. Added `--no-gen2` to each `gcloud functions deploy` command and clarified that the examples target 1st gen Cloud Functions.
- The Monitoring alert command used obsolete `gcloud monitoring policies create` flags such as `--condition-threshold-value` and relied on a questionable Scheduler metric filter. Replaced it with a current, documented log-based metric plus a current `gcloud monitoring policies create` command using `--if` and `--duration`.
- The Pub/Sub chaining snippet called `json.dumps()` without importing `json`. Added the missing `import json`.

## Review Notes
- The Python examples are illustrative and still assume normal deployment files such as `requirements.txt` are present in each function source directory.
- For Cloud Run functions / 2nd gen functions, the invoker role is `roles/run.invoker`; the post now explicitly keeps the examples on 1st gen to match the `roles/cloudfunctions.invoker` command.
