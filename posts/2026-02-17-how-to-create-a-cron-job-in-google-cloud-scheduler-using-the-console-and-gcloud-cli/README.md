# How to Create a Cron Job in Google Cloud Scheduler Using the Console and gcloud CLI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Scheduler, Cron, Automation, gcloud

Description: Learn how to create and manage cron jobs in Google Cloud Scheduler using both the Google Cloud Console and the gcloud CLI with practical examples.

---

Google Cloud Scheduler is a fully managed cron job service. It lets you schedule virtually any job, including batch data processing, infrastructure operations, and API calls. If you have ever set up a cron job on a Linux server, Cloud Scheduler is the managed equivalent, but without having to maintain a VM just to run cron.

In this post, I will show you how to create scheduler jobs using both the Google Cloud Console and the gcloud CLI, covering HTTP targets, Pub/Sub targets, and App Engine targets.

## Prerequisites

Before you start, make sure the Cloud Scheduler API is enabled.

```bash
# Enable the Cloud Scheduler API
gcloud services enable cloudscheduler.googleapis.com
```

You also need an App Engine application in your project (even if you are not targeting App Engine). Cloud Scheduler requires it for the region configuration.

```bash
# Create an App Engine app if you do not have one
gcloud app create --region=us-central
```

## Creating a Scheduler Job via the Console

Open the Google Cloud Console and navigate to Cloud Scheduler (you can find it under Tools or just search for "Scheduler" in the search bar).

Click "Create Job" and fill in the following:

1. **Name**: Give your job a descriptive name like `daily-backup-trigger`
2. **Region**: Pick the region closest to your target service
3. **Description**: Optional but helpful for team visibility
4. **Frequency**: Enter a cron expression like `0 2 * * *` for daily at 2 AM
5. **Timezone**: Select your preferred timezone
6. **Target type**: Choose HTTP, Pub/Sub, or App Engine HTTP

For an HTTP target, you will also need:
- The URL to call
- The HTTP method (GET, POST, PUT, DELETE)
- Optional headers and body
- Authentication configuration (OAuth token or OIDC token)

Click "Create" and your job is ready.

## Creating an HTTP Target Job via gcloud

The command line approach is faster and scriptable. Here is how to create an HTTP target job.

```bash
# Create a scheduler job that sends a POST request every hour
gcloud scheduler jobs create http hourly-health-check \
  --location=us-central1 \
  --schedule="0 * * * *" \
  --uri="https://my-api.example.com/health" \
  --http-method=GET \
  --time-zone="UTC" \
  --description="Hourly health check against production API" \
  --attempt-deadline="300s"
```

For authenticated endpoints, add a service account.

```bash
# Create a job with OAuth authentication for calling Google Cloud APIs
gcloud scheduler jobs create http trigger-dataflow \
  --location=us-central1 \
  --schedule="0 3 * * *" \
  --uri="https://dataflow.googleapis.com/v1b3/projects/my-project/locations/us-central1/templates:launch" \
  --http-method=POST \
  --message-body='{"jobName": "nightly-etl", "parameters": {"input": "gs://data/input", "output": "gs://data/output"}}' \
  --oauth-service-account-email=scheduler-sa@my-project.iam.gserviceaccount.com \
  --oauth-token-scope="https://www.googleapis.com/auth/cloud-platform" \
  --time-zone="America/New_York"
```

For endpoints that need OIDC tokens (like Cloud Run or Cloud Functions), use the OIDC flag instead.

```bash
# Create a job with OIDC authentication for calling Cloud Run
gcloud scheduler jobs create http invoke-cloud-run \
  --location=us-central1 \
  --schedule="*/30 * * * *" \
  --uri="https://my-service-abc123-uc.a.run.app/process" \
  --http-method=POST \
  --message-body='{"action": "sync"}' \
  --oidc-service-account-email=scheduler-sa@my-project.iam.gserviceaccount.com \
  --oidc-token-audience="https://my-service-abc123-uc.a.run.app" \
  --time-zone="UTC"
```

## Creating a Pub/Sub Target Job

Instead of calling an HTTP endpoint, you can publish a message to a Pub/Sub topic on a schedule.

```bash
# Create a scheduler job that publishes to a Pub/Sub topic
gcloud scheduler jobs create pubsub nightly-export-trigger \
  --location=us-central1 \
  --schedule="0 1 * * *" \
  --topic=projects/my-project/topics/export-trigger \
  --message-body='{"export_type": "full", "format": "parquet"}' \
  --time-zone="UTC" \
  --description="Triggers nightly data export via Pub/Sub"
```

You can also include attributes on the message.

```bash
# Pub/Sub job with message attributes
gcloud scheduler jobs create pubsub weekly-report \
  --location=us-central1 \
  --schedule="0 9 * * 1" \
  --topic=projects/my-project/topics/report-requests \
  --message-body='{"report": "weekly-summary"}' \
  --attributes="priority=high,source=scheduler" \
  --time-zone="America/Los_Angeles"
```

## Understanding Cron Expressions

Cloud Scheduler uses the standard Unix-cron format with five fields.

```
# Field layout:
# Minute (0-59)  Hour (0-23)  Day of Month (1-31)  Month (1-12)  Day of Week (0-6, Sun=0)

# Practical examples:
# Every 5 minutes
*/5 * * * *

# Every hour at minute 0
0 * * * *

# Every day at midnight
0 0 * * *

# Every Monday at 8:30 AM
30 8 * * 1

# First day of every month at 6 AM
0 6 1 * *

# Every weekday at 9 AM
0 9 * * 1-5

# Every 15 minutes during business hours on weekdays
*/15 9-17 * * 1-5

# Quarterly: first day of Jan, Apr, Jul, Oct
0 0 1 1,4,7,10 *
```

## Managing Existing Jobs

Once you have created jobs, here are the common management commands.

```bash
# List all scheduler jobs in a region
gcloud scheduler jobs list --location=us-central1

# View details of a specific job
gcloud scheduler jobs describe hourly-health-check --location=us-central1

# Update the schedule of an existing job
gcloud scheduler jobs update http hourly-health-check \
  --location=us-central1 \
  --schedule="*/30 * * * *"

# Pause a job (stops it from running but keeps the configuration)
gcloud scheduler jobs pause hourly-health-check --location=us-central1

# Resume a paused job
gcloud scheduler jobs resume hourly-health-check --location=us-central1

# Manually trigger a job right now (useful for testing)
gcloud scheduler jobs run hourly-health-check --location=us-central1

# Delete a job
gcloud scheduler jobs delete hourly-health-check --location=us-central1
```

## Setting Retry Configuration

Cloud Scheduler can automatically retry failed jobs. Configure retry behavior with these flags.

```bash
# Create a job with custom retry settings
gcloud scheduler jobs create http resilient-job \
  --location=us-central1 \
  --schedule="0 */4 * * *" \
  --uri="https://my-api.example.com/important-task" \
  --http-method=POST \
  --max-retry-attempts=5 \
  --min-backoff="10s" \
  --max-backoff="300s" \
  --max-doublings=4 \
  --attempt-deadline="180s" \
  --time-zone="UTC"
```

The retry parameters work like this:
- `max-retry-attempts`: How many times to retry on failure (0-5)
- `min-backoff`: Starting delay between retries
- `max-backoff`: Maximum delay between retries
- `max-doublings`: How many times the backoff doubles before becoming linear
- `attempt-deadline`: How long to wait for a response before considering it failed

## Monitoring Scheduler Jobs

Check the status and history of your jobs through the Console or CLI.

```bash
# View the last execution time and status
gcloud scheduler jobs describe my-job \
  --location=us-central1 \
  --format="table(name, state, lastAttemptTime, status.code)"
```

You can also view scheduler logs in Cloud Logging.

```bash
# Query Cloud Logging for scheduler execution logs
gcloud logging read 'resource.type="cloud_scheduler_job"' \
  --limit=20 \
  --format="table(timestamp, jsonPayload.jobName, jsonPayload.status)"
```

## Wrapping Up

Cloud Scheduler gives you a reliable, managed way to run cron jobs without maintaining infrastructure. Whether you need to trigger HTTP endpoints, publish Pub/Sub messages, or invoke App Engine handlers, the setup process is the same: define a cron schedule, configure your target, set up authentication if needed, and optionally configure retries. The gcloud CLI makes it easy to script the creation and management of scheduler jobs, which is especially useful when you need to manage dozens of scheduled tasks across environments.
