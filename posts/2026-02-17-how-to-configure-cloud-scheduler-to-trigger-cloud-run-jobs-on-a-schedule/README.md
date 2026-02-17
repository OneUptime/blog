# How to Configure Cloud Scheduler to Trigger Cloud Run Jobs on a Schedule

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Scheduler, Cloud Run Jobs, Cron, Batch Processing

Description: Learn how to set up Cloud Scheduler to trigger Cloud Run jobs on a recurring schedule for batch processing, data pipelines, and automated maintenance tasks.

---

Cloud Run jobs are designed for tasks that run to completion - batch processing, database migrations, report generation, data exports, and similar workloads. Unlike Cloud Run services that handle HTTP requests continuously, jobs execute once and exit. Pairing them with Cloud Scheduler lets you run these batch tasks on a reliable, managed schedule without maintaining any infrastructure.

In this post, I will show you how to connect Cloud Scheduler to Cloud Run jobs, including the IAM setup, scheduler configuration, and some practical patterns.

## Cloud Run Services vs. Cloud Run Jobs

Before we dive in, it is worth clarifying the difference:

- **Cloud Run services** handle HTTP requests and stay running to serve traffic
- **Cloud Run jobs** run a container to completion and then stop. They are ideal for batch workloads

When you trigger a Cloud Run job, it creates an execution. Each execution runs one or more tasks (containers) in parallel if configured, and the job is complete when all tasks finish.

## Prerequisites

Enable the required APIs.

```bash
# Enable Cloud Run and Cloud Scheduler APIs
gcloud services enable run.googleapis.com cloudscheduler.googleapis.com
```

## Step 1: Create a Cloud Run Job

First, let me create a simple Cloud Run job. Here is a Python script that processes data and exits.

```python
# main.py
# Batch job that processes pending records and generates a summary report
import os
import json
from datetime import datetime
from google.cloud import bigquery
from google.cloud import storage

def main():
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "my-project")
    task_index = int(os.environ.get("CLOUD_RUN_TASK_INDEX", 0))
    task_count = int(os.environ.get("CLOUD_RUN_TASK_COUNT", 1))

    print(f"Starting batch job - task {task_index} of {task_count}")
    print(f"Execution time: {datetime.utcnow().isoformat()}")

    # Initialize clients
    bq_client = bigquery.Client(project=project_id)
    storage_client = storage.Client(project=project_id)

    # Run the batch query
    query = """
        SELECT
            DATE(created_at) as date,
            COUNT(*) as event_count,
            COUNT(DISTINCT user_id) as unique_users
        FROM `analytics.events`
        WHERE created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
        GROUP BY date
        ORDER BY date
    """

    results = bq_client.query(query).result()

    # Build the report
    report = {
        "generated_at": datetime.utcnow().isoformat(),
        "task_index": task_index,
        "data": [dict(row) for row in results]
    }

    # Save report to Cloud Storage
    bucket = storage_client.bucket("my-reports-bucket")
    blob = bucket.blob(f"daily-reports/{datetime.utcnow().strftime('%Y-%m-%d')}/report.json")
    blob.upload_from_string(json.dumps(report, default=str))

    print(f"Report saved. Processed {len(report['data'])} date entries.")

if __name__ == "__main__":
    main()
```

Build and deploy the container.

```bash
# Build the container image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/daily-report-job .

# Create the Cloud Run job
gcloud run jobs create daily-report-job \
  --image=gcr.io/YOUR_PROJECT_ID/daily-report-job \
  --region=us-central1 \
  --task-timeout=600s \
  --max-retries=2 \
  --memory=512Mi \
  --cpu=1 \
  --service-account=job-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID"
```

Test the job manually first.

```bash
# Execute the job to make sure it works
gcloud run jobs execute daily-report-job --region=us-central1

# Check the execution status
gcloud run jobs executions list --job=daily-report-job --region=us-central1 --limit=3
```

## Step 2: Set Up IAM Permissions

Create a service account that Cloud Scheduler will use to trigger the Cloud Run job.

```bash
# Create a service account for the scheduler
gcloud iam service-accounts create scheduler-job-runner \
  --display-name="Scheduler Job Runner"

# Grant it permission to invoke Cloud Run jobs
gcloud run jobs add-iam-policy-binding daily-report-job \
  --region=us-central1 \
  --member="serviceAccount:scheduler-job-runner@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.invoker"
```

## Step 3: Create the Cloud Scheduler Job

Cloud Scheduler triggers Cloud Run jobs through the Cloud Run REST API. Here is the command.

```bash
# Create a scheduler job that triggers the Cloud Run job daily at 6 AM UTC
gcloud scheduler jobs create http daily-report-schedule \
  --location=us-central1 \
  --schedule="0 6 * * *" \
  --uri="https://us-central1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/YOUR_PROJECT_ID/jobs/daily-report-job:run" \
  --http-method=POST \
  --oauth-service-account-email=scheduler-job-runner@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --oauth-token-scope="https://www.googleapis.com/auth/cloud-platform" \
  --time-zone="UTC" \
  --attempt-deadline="30s" \
  --description="Triggers daily report generation Cloud Run job"
```

The key elements here:
- The URI follows the pattern: `https://REGION-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/PROJECT_ID/jobs/JOB_NAME:run`
- Use OAuth authentication (not OIDC) because you are calling a Google API
- The `--attempt-deadline` is for the scheduler's HTTP request, not the job's execution time

## Step 4: Verify the Setup

Run the scheduler job manually to make sure everything is connected.

```bash
# Trigger the scheduler job immediately
gcloud scheduler jobs run daily-report-schedule \
  --location=us-central1

# Wait a few seconds, then check for new Cloud Run job executions
gcloud run jobs executions list --job=daily-report-job \
  --region=us-central1 \
  --limit=3 \
  --format="table(name.basename(), status.completionTime, status.succeededCount, status.failedCount)"
```

## Passing Environment Overrides

You can override environment variables for specific executions by including them in the scheduler's request body.

```bash
# Create a scheduler with override configuration
gcloud scheduler jobs create http weekly-full-report \
  --location=us-central1 \
  --schedule="0 8 * * 1" \
  --uri="https://us-central1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/YOUR_PROJECT_ID/jobs/daily-report-job:run" \
  --http-method=POST \
  --message-body='{
    "overrides": {
      "containerOverrides": [{
        "env": [
          {"name": "REPORT_MODE", "value": "full"},
          {"name": "LOOKBACK_DAYS", "value": "7"}
        ]
      }]
    }
  }' \
  --headers="Content-Type=application/json" \
  --oauth-service-account-email=scheduler-job-runner@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --oauth-token-scope="https://www.googleapis.com/auth/cloud-platform" \
  --time-zone="UTC"
```

Your job code can then read these environment variables.

```python
# Read the environment variable overrides in your job
import os

report_mode = os.environ.get("REPORT_MODE", "incremental")
lookback_days = int(os.environ.get("LOOKBACK_DAYS", "1"))

print(f"Running {report_mode} report with {lookback_days} day lookback")
```

## Multiple Schedule Patterns

Here are some common patterns for scheduling Cloud Run jobs.

```bash
# Every 6 hours for data sync
gcloud scheduler jobs create http sync-every-6h \
  --location=us-central1 \
  --schedule="0 */6 * * *" \
  --uri="https://us-central1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/PROJECT/jobs/data-sync-job:run" \
  --http-method=POST \
  --oauth-service-account-email=scheduler-sa@PROJECT.iam.gserviceaccount.com \
  --oauth-token-scope="https://www.googleapis.com/auth/cloud-platform"

# Weekdays at 5 PM for end-of-day processing
gcloud scheduler jobs create http eod-processing \
  --location=us-central1 \
  --schedule="0 17 * * 1-5" \
  --uri="https://us-central1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/PROJECT/jobs/eod-job:run" \
  --http-method=POST \
  --oauth-service-account-email=scheduler-sa@PROJECT.iam.gserviceaccount.com \
  --oauth-token-scope="https://www.googleapis.com/auth/cloud-platform" \
  --time-zone="America/New_York"

# First of the month for billing reconciliation
gcloud scheduler jobs create http monthly-billing \
  --location=us-central1 \
  --schedule="0 3 1 * *" \
  --uri="https://us-central1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/PROJECT/jobs/billing-reconcile:run" \
  --http-method=POST \
  --oauth-service-account-email=scheduler-sa@PROJECT.iam.gserviceaccount.com \
  --oauth-token-scope="https://www.googleapis.com/auth/cloud-platform"
```

## Monitoring and Troubleshooting

Check both the scheduler and the Cloud Run job for issues.

```bash
# Check scheduler job status
gcloud scheduler jobs describe daily-report-schedule \
  --location=us-central1

# Check Cloud Run job execution history
gcloud run jobs executions list --job=daily-report-job \
  --region=us-central1 \
  --limit=10

# View logs from the most recent execution
gcloud run jobs executions logs daily-report-job \
  --region=us-central1 \
  --limit=50
```

Common issues to watch for:
- **403 errors**: The scheduler service account does not have the `run.invoker` role on the job
- **Job not starting**: Make sure you are using OAuth authentication (not OIDC) since you are calling the Cloud Run API
- **Job failing**: Check the Cloud Run job logs, not the scheduler logs, for execution errors

## Wrapping Up

Cloud Scheduler paired with Cloud Run jobs gives you a fully managed batch processing platform. You define your batch work in a container, configure how often it should run, and let Google handle the scheduling, execution, and infrastructure. The key steps are: create your Cloud Run job, set up IAM with the invoker role, and create a scheduler job targeting the Cloud Run API endpoint. With environment variable overrides, you can reuse the same job for different schedule patterns with different configurations.
