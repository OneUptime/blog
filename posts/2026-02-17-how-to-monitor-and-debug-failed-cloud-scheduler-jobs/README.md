# How to Monitor and Debug Failed Cloud Scheduler Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Scheduler, Monitoring, Debugging, Cloud Logging

Description: A practical guide to monitoring, debugging, and troubleshooting failed Cloud Scheduler jobs using Cloud Logging, Cloud Monitoring, and the gcloud CLI.

---

Cloud Scheduler runs your jobs reliably, but things still break. An endpoint goes down, authentication expires, a service account gets misconfigured, or the target returns unexpected errors. When a scheduled job fails, you need to find out fast, understand why, and fix it before the next scheduled run. This post covers the tools and techniques for monitoring and debugging Cloud Scheduler job failures.

## Checking Job Status with gcloud

The quickest way to see if a job is failing is to check its status.

```bash
# View the current state of a scheduler job
gcloud scheduler jobs describe my-scheduled-job \
  --location=us-central1 \
  --format="yaml(name, state, lastAttemptTime, status, scheduleTime)"
```

The output will show you:
- `state`: Whether the job is ENABLED, PAUSED, or DISABLED
- `lastAttemptTime`: When the last attempt was made
- `status`: The HTTP status code of the last attempt
- `scheduleTime`: When the next execution is planned

If the `status.code` is anything other than 0 (success), something went wrong.

```bash
# List all jobs and their last status in a table format
gcloud scheduler jobs list \
  --location=us-central1 \
  --format="table(name.basename(), state, status.code, lastAttemptTime, scheduleTime)"
```

## Using Cloud Logging for Detailed Diagnostics

Cloud Scheduler writes logs to Cloud Logging for every execution attempt. These logs are your best friend when debugging.

```bash
# View recent scheduler logs for a specific job
gcloud logging read \
  'resource.type="cloud_scheduler_job" AND resource.labels.job_id="my-scheduled-job"' \
  --limit=20 \
  --format="table(timestamp, severity, jsonPayload.@type, jsonPayload.status)"
```

For more detailed information, look at the full log entries.

```bash
# View detailed log entries with the response body
gcloud logging read \
  'resource.type="cloud_scheduler_job" AND resource.labels.job_id="my-scheduled-job" AND severity>=WARNING' \
  --limit=10 \
  --format=json
```

## Common Failure Patterns and How to Fix Them

### Authentication Failures (401/403)

This is the most common issue. The service account either does not exist, does not have the right permissions, or the token has issues.

```bash
# Check which service account the scheduler job is using
gcloud scheduler jobs describe my-scheduled-job \
  --location=us-central1 \
  --format="yaml(httpTarget.oauthToken, httpTarget.oidcToken)"

# Verify the service account exists and is active
gcloud iam service-accounts describe scheduler-sa@YOUR_PROJECT.iam.gserviceaccount.com

# Check what roles it has
gcloud projects get-iam-policy YOUR_PROJECT \
  --flatten="bindings[].members" \
  --filter="bindings.members:scheduler-sa@YOUR_PROJECT.iam.gserviceaccount.com" \
  --format="table(bindings.role)"
```

Common authentication fixes:

```bash
# For Cloud Functions - grant the invoker role
gcloud functions add-invoker-policy-binding my-function \
  --region=us-central1 \
  --member="serviceAccount:scheduler-sa@YOUR_PROJECT.iam.gserviceaccount.com"

# For Cloud Run - grant the invoker role
gcloud run services add-iam-policy-binding my-service \
  --region=us-central1 \
  --member="serviceAccount:scheduler-sa@YOUR_PROJECT.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

# For Google APIs (Workflows, etc.) - use OAuth, not OIDC
# Also make sure the SA has the right API-specific role
```

A critical detail: use OIDC tokens for Cloud Run and Cloud Functions, but use OAuth tokens for Google APIs (like Workflows or BigQuery).

### Timeout Failures

If your target takes too long to respond, the scheduler times out the attempt.

```bash
# Check the current attempt deadline
gcloud scheduler jobs describe my-scheduled-job \
  --location=us-central1 \
  --format="value(attemptDeadline)"

# Increase the attempt deadline
gcloud scheduler jobs update http my-scheduled-job \
  --location=us-central1 \
  --attempt-deadline="300s"
```

Also check that the target itself has a long enough timeout.

```bash
# For Cloud Functions, check the function timeout
gcloud functions describe my-function \
  --region=us-central1 \
  --format="value(serviceConfig.timeoutSeconds)"

# For Cloud Run, check the request timeout
gcloud run services describe my-service \
  --region=us-central1 \
  --format="value(spec.template.spec.containers[0].timeoutSeconds)"
```

### Target Not Found (404)

The URL might be wrong, or the service was deleted/redeployed to a different URL.

```bash
# Check the target URL of your scheduler job
gcloud scheduler jobs describe my-scheduled-job \
  --location=us-central1 \
  --format="value(httpTarget.uri)"

# For Cloud Functions, get the current URL
gcloud functions describe my-function \
  --region=us-central1 \
  --format="value(serviceConfig.uri)"

# For Cloud Run, get the current URL
gcloud run services describe my-service \
  --region=us-central1 \
  --format="value(status.url)"
```

If the URL changed, update the scheduler job.

```bash
# Update the target URL
gcloud scheduler jobs update http my-scheduled-job \
  --location=us-central1 \
  --uri="https://new-url.a.run.app/endpoint"
```

### Connection Refused or DNS Errors

These typically mean the target service is down or unreachable. Check the service status.

```bash
# Test the endpoint manually with curl
curl -v https://my-api.example.com/endpoint

# For Cloud Run, check if the service is running
gcloud run services describe my-service \
  --region=us-central1 \
  --format="yaml(status.conditions)"
```

## Setting Up Alerting for Failed Jobs

Do not rely on manually checking job status. Set up alerts in Cloud Monitoring.

### Using Metrics Explorer

Cloud Scheduler exposes metrics that you can use for alerting:

- `scheduler.googleapis.com/job/attempt_count` - Total attempts including retries
- `scheduler.googleapis.com/job/attempt_dispatch_count` - Dispatched attempts
- `scheduler.googleapis.com/job/error_count` - Failed attempts

### Creating an Alert Policy with gcloud

```bash
# Create an alert policy that fires when a scheduler job fails
gcloud alpha monitoring policies create \
  --display-name="Cloud Scheduler Job Failure" \
  --condition-display-name="Scheduler job error rate" \
  --condition-filter='resource.type = "cloud_scheduler_job" AND metric.type = "scheduler.googleapis.com/job/error_count"' \
  --condition-threshold-value=1 \
  --condition-threshold-comparison="COMPARISON_GT" \
  --condition-threshold-duration="0s" \
  --condition-threshold-aggregations-alignment-period="300s" \
  --condition-threshold-aggregations-per-series-aligner="ALIGN_COUNT" \
  --notification-channels="projects/YOUR_PROJECT/notificationChannels/CHANNEL_ID" \
  --documentation="A Cloud Scheduler job has failed. Check the job logs for details."
```

### Log-Based Alert

You can also create alerts based on log entries.

```bash
# Create a log-based metric for scheduler failures
gcloud logging metrics create scheduler-failures \
  --description="Count of Cloud Scheduler job failures" \
  --log-filter='resource.type="cloud_scheduler_job" AND severity>=ERROR'
```

## Building a Debugging Workflow

When a scheduler job fails, follow this systematic approach.

```bash
# Step 1: Check the job status and last attempt
gcloud scheduler jobs describe FAILING_JOB \
  --location=us-central1

# Step 2: Look at recent logs for error details
gcloud logging read \
  'resource.type="cloud_scheduler_job" AND resource.labels.job_id="FAILING_JOB" AND severity>=WARNING' \
  --limit=5 --format=json

# Step 3: Test the target manually
# Get the URL
URL=$(gcloud scheduler jobs describe FAILING_JOB \
  --location=us-central1 --format="value(httpTarget.uri)")

# Test with auth token
TOKEN=$(gcloud auth print-identity-token)
curl -H "Authorization: Bearer $TOKEN" -X POST "$URL"

# Step 4: Check the target service health
# (depends on target type - Cloud Run, Cloud Functions, etc.)

# Step 5: Run the job manually after fixing the issue
gcloud scheduler jobs run FAILING_JOB --location=us-central1
```

## Viewing Execution History in the Console

The Google Cloud Console provides a visual execution history for each scheduler job:

1. Navigate to Cloud Scheduler in the Console
2. Click on the job name
3. View the "Recent execution attempts" section
4. Each attempt shows the timestamp, status code, and response

This is useful for spotting patterns - for example, if a job fails at certain times but succeeds at others, it might indicate a load-related issue on the target.

## Setting Up a Status Dashboard

Create a Cloud Monitoring dashboard to track all your scheduler jobs.

```bash
# Query scheduler metrics via the API for dashboard data
gcloud monitoring dashboards create \
  --config-from-file=scheduler-dashboard.json
```

A useful dashboard includes:
- Job execution count (success vs. failure)
- Latency of job executions
- Retry count per job
- Current state of all jobs

## Wrapping Up

Monitoring Cloud Scheduler jobs comes down to three things: check job status regularly with `gcloud scheduler jobs describe`, use Cloud Logging for detailed error information, and set up alerting so you get notified on failures. When debugging, work through the common issues systematically - authentication, timeouts, URL correctness, and target health. With proper monitoring in place, you can catch and fix issues before they impact your downstream systems.
