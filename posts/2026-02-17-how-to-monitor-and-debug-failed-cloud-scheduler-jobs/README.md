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
- `status`: The target response status from the last attempted execution
- `scheduleTime`: When the next execution is planned, which might be a retry

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
# View detailed log entries with status and debug information
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

Cloud Scheduler publishes execution logs that you can turn into logs-based metrics for alerting:

- `logging.googleapis.com/user/scheduler_failures` - Failed attempts counted from Cloud Scheduler error logs
- `logging.googleapis.com/user/scheduler_warnings` - Warning-level execution events, if you want earlier signals
- Target service metrics, such as Cloud Run request count and latency, for downstream behavior

### Creating an Alert Policy with gcloud

After you create the logs-based metric in the next section, you can alert on it:

```bash
# Create an alert policy that fires when the logs-based failure metric increments
gcloud monitoring policies create \
  --display-name="Cloud Scheduler Job Failure" \
  --condition-display-name="Scheduler job error rate" \
  --condition-filter='resource.type = "cloud_scheduler_job" AND metric.type = "logging.googleapis.com/user/scheduler_failures"' \
  --if="> 0" \
  --duration="0s" \
  --aggregation='{"alignmentPeriod":"300s","perSeriesAligner":"ALIGN_DELTA"}' \
  --notification-channels="projects/YOUR_PROJECT/notificationChannels/CHANNEL_ID" \
  --documentation="A Cloud Scheduler job has failed. Check the job logs for details."
```

### Log-Based Alert

You can also create alerts based on log entries.

```bash
# Create a log-based metric for scheduler failures
gcloud logging metrics create scheduler_failures \
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
4. Each attempt shows the timestamp, status, and available execution details

This is useful for spotting patterns - for example, if a job fails at certain times but succeeds at others, it might indicate a load-related issue on the target.

## Setting Up a Status Dashboard

Create a Cloud Monitoring dashboard to track all your scheduler jobs.

```bash
# Query scheduler metrics via the API for dashboard data
gcloud monitoring dashboards create \
  --config-from-file=scheduler-dashboard.json
```

A useful dashboard includes:
- Logs-based failure counts per job
- Target service request count and latency
- Recent warning and error log volume
- Current job status from `gcloud scheduler jobs describe` or the Cloud Scheduler API

## Wrapping Up

Monitoring Cloud Scheduler jobs comes down to three things: check job status regularly with `gcloud scheduler jobs describe`, use Cloud Logging for detailed error information, and set up alerting so you get notified on failures. When debugging, work through the common issues systematically - authentication, timeouts, URL correctness, and target health. With proper monitoring in place, you can catch and fix issues before they impact your downstream systems.
