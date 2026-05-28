# Validation Summary: How to Compare Cloud Run Jobs vs Cloud Functions vs Cloud Scheduler

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Run Jobs
- Cloud Run functions / Cloud Functions 2nd gen
- Cloud Scheduler
- Eventarc
- Workflows
- BigQuery
- Cloud Storage
- Vision API
- Google Cloud CLI
- Python
- Docker

## Sources Consulted
- Cloud Run task timeout documentation: https://cloud.google.com/run/docs/configuring/task-timeout
- Cloud Run jobs quotas and limits: https://cloud.google.com/run/quotas
- Cloud Run jobs CPU and memory limits: https://cloud.google.com/run/docs/configuring/jobs/cpu and https://cloud.google.com/run/docs/configuring/jobs/memory-limits
- Cloud Run jobs scheduled execution documentation: https://cloud.google.com/run/docs/execute/jobs-on-schedule
- Cloud Run pricing: https://cloud.google.com/run/pricing
- Cloud Run functions quotas and time limits: https://cloud.google.com/functions/quotas
- Cloud Run functions version comparison: https://cloud.google.com/functions/docs/concepts/version-comparison
- Cloud Scheduler overview and target types: https://cloud.google.com/scheduler/docs/overview
- Cloud Scheduler authenticated HTTP targets: https://cloud.google.com/scheduler/docs/http-target-auth
- Cloud Scheduler pricing: https://cloud.google.com/scheduler/pricing
- Google Cloud CLI reference for Cloud Run jobs and Cloud Scheduler HTTP jobs: https://cloud.google.com/sdk/gcloud/reference/run/jobs/create and https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- Workflows tutorial for executing Cloud Run jobs from Eventarc-driven workflows: https://cloud.google.com/workflows/docs/tutorials/execute-cloud-run-jobs

## Issues Found
- Cloud Run Jobs maximum task timeout was listed as 24 hours. Updated it to 168 hours (7 days), with the comparison phrased as per-task execution time.
- Cloud Functions maximum execution time was stated too broadly as 60 minutes for 2nd gen. Updated the comparison to note that 60 minutes applies to 2nd gen HTTP functions and that some trigger types have lower limits.
- The Cloud Functions container-support row implied arbitrary container image deployment. Updated it to clarify that 2nd gen functions are deployed from source and built into containers.
- Cloud Scheduler was described as directly triggering Cloud Run jobs. Updated the text to clarify that Cloud Scheduler targets HTTP, Pub/Sub, and App Engine, and can call the Cloud Run Admin API over HTTP to run a job.
- The Cloud Run Job Scheduler URL used an older v1-style regional API endpoint. Updated the command to the current v2 Cloud Run Admin API `jobs:run` endpoint.
- The Cloud Function deployment command used a deployed function name that does not match the Python handler. Added `--entry-point=process_uploaded_image`.
- The decision guide suggested "Cloud Run Jobs + Eventarc" for event-triggered long-running work. Updated it to "Cloud Run Jobs + Workflows/Eventarc" because Eventarc can trigger Workflows, which can execute Cloud Run jobs.
- Cost examples were materially higher than current us-central1-style Cloud Run pricing. Recalculated the illustrative values and added a note that they exclude free tier credits and other related service costs.

## Review Notes
The post is technically relevant and now aligns with current Google Cloud documentation as of 2026-05-28. The pricing examples remain illustrative because Google Cloud pricing varies by region, free tier usage, billing model, and downstream services.
