# Validation Summary: How to Schedule Recurring Batch Jobs Using Cloud Scheduler

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Batch
- Cloud Scheduler
- Cloud Functions Gen 2
- Google Cloud IAM service accounts and roles
- Google Cloud CLI
- Python Google Cloud Batch client library
- Cloud Logging
- Compute Engine Spot VMs
- Cloud Storage volumes for Batch

## Sources Consulted
- Google Cloud Batch REST API reference: https://docs.cloud.google.com/batch/docs/reference/rest
- Google Cloud Batch jobs REST resource and schema: https://docs.cloud.google.com/batch/docs/reference/rest/v1/projects.locations.jobs
- Google Cloud Batch create job method: https://docs.cloud.google.com/batch/docs/reference/rest/v1/projects.locations.jobs/create
- Google Cloud Batch create and run a basic job guide: https://docs.cloud.google.com/batch/docs/create-run-basic-job
- Google Cloud Scheduler `gcloud scheduler jobs create http` reference: https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- Google Cloud Scheduler authenticated HTTP targets guide: https://docs.cloud.google.com/scheduler/docs/http-target-auth
- Google Cloud Batch Python client library reference: https://docs.cloud.google.com/python/docs/reference/batch/latest/google.cloud.batch_v1.types
- Compute Engine Spot VMs documentation: https://docs.cloud.google.com/compute/docs/instances/spot

## Issues Found
- The direct Cloud Scheduler example used `job_id` in the Batch REST URL. The Batch create method uses the `jobId` query parameter, and if it is omitted the API generates a job ID. I changed the direct Scheduler example to omit the query parameter so recurring runs can create unique jobs without relying on unsupported URL-time shell substitution.
- The post granted `roles/iam.serviceAccountUser` on `batch-runner-sa`, but the Batch job examples did not set that runner service account. I added `allocationPolicy.serviceAccount.email` in the JSON template and the equivalent Python client configuration.
- The authenticated Gen 2 Cloud Function deployment used `--no-allow-unauthenticated`, but the Scheduler service account was not granted permission to invoke the function. I added the required `gcloud functions add-iam-policy-binding` command with `roles/run.invoker`.
- The monitoring snippet claimed to filter jobs from the last 24 hours, but it only filtered by job ID prefix. I added a `create_time` cutoff check using a timezone-aware UTC timestamp.
- The Cloud Function used `datetime.utcnow()`. I changed it to `datetime.now(timezone.utc)` to keep timestamps timezone-aware.

## Review Notes
The post remains a valid tutorial after corrections. `gcloud` was not installed in the local environment, so CLI flags were verified against the official Google Cloud SDK reference rather than local `--help` output.
