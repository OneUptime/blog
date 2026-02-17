# How to Run a Scheduled Batch Job on Cloud Run Jobs with Cloud Scheduler

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run Jobs, Cloud Scheduler, Batch Processing, Automation

Description: A practical guide to creating Cloud Run Jobs for batch processing and triggering them on a schedule using Cloud Scheduler for automated data pipelines, reports, and maintenance tasks.

---

Not every workload is an always-on web service. Some tasks need to run once, do their work, and exit - data pipeline ETL jobs, nightly reports, database maintenance, cleanup scripts. Cloud Run Jobs are designed exactly for this pattern. Combine them with Cloud Scheduler, and you have a fully managed cron system that scales from zero and charges only for execution time.

## Cloud Run Jobs vs Cloud Run Services

Cloud Run Services listen for HTTP requests and stay running. Cloud Run Jobs run a container to completion and then stop. Key differences:

- Jobs do not listen on a port
- Jobs have a defined completion (they exit when done)
- Jobs can run multiple parallel tasks
- Jobs can retry failed tasks automatically
- Jobs are not billed when they are not executing

This makes Jobs ideal for batch processing, where you want to run something, process data, and shut down.

## Step 1: Build the Job Container

Here is a Python script that processes data from Cloud Storage and writes results to BigQuery - a typical batch job pattern:

```python
# batch_job.py - Process daily data from Cloud Storage
import os
import sys
import json
from datetime import datetime, timedelta
from google.cloud import storage, bigquery

def process_daily_data():
    """Download yesterday's data files, process them, and load into BigQuery."""
    project_id = os.environ.get('PROJECT_ID')
    source_bucket = os.environ.get('SOURCE_BUCKET')
    bq_dataset = os.environ.get('BQ_DATASET')
    bq_table = os.environ.get('BQ_TABLE')
    task_index = int(os.environ.get('CLOUD_RUN_TASK_INDEX', '0'))
    task_count = int(os.environ.get('CLOUD_RUN_TASK_COUNT', '1'))

    # Calculate yesterday's date for the data partition
    yesterday = (datetime.utcnow() - timedelta(days=1)).strftime('%Y/%m/%d')
    print(f"Processing data for {yesterday}, task {task_index} of {task_count}")

    # Initialize clients
    storage_client = storage.Client()
    bq_client = bigquery.Client()
    bucket = storage_client.bucket(source_bucket)

    # List all files for yesterday's partition
    prefix = f"data/{yesterday}/"
    blobs = list(bucket.list_blobs(prefix=prefix))

    # Divide work among tasks (for parallel execution)
    my_blobs = [b for i, b in enumerate(blobs) if i % task_count == task_index]
    print(f"Task {task_index}: Processing {len(my_blobs)} of {len(blobs)} files")

    # Process each file
    processed_rows = []
    for blob in my_blobs:
        content = blob.download_as_text()
        for line in content.strip().split('\n'):
            try:
                record = json.loads(line)
                # Transform the record
                processed_rows.append({
                    'timestamp': record.get('ts'),
                    'event_type': record.get('type'),
                    'user_id': record.get('uid'),
                    'value': float(record.get('val', 0)),
                    'processed_date': yesterday.replace('/', '-')
                })
            except (json.JSONDecodeError, ValueError) as e:
                print(f"Skipping malformed record: {e}")

    # Load processed data into BigQuery
    if processed_rows:
        table_ref = f"{project_id}.{bq_dataset}.{bq_table}"
        errors = bq_client.insert_rows_json(table_ref, processed_rows)
        if errors:
            print(f"BigQuery insert errors: {errors}")
            sys.exit(1)
        print(f"Task {task_index}: Loaded {len(processed_rows)} rows into BigQuery")
    else:
        print(f"Task {task_index}: No data to process")

    print(f"Task {task_index}: Complete")

if __name__ == '__main__':
    process_daily_data()
```

The Dockerfile:

```dockerfile
# Dockerfile for the batch processing job
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY batch_job.py .
CMD ["python", "batch_job.py"]
```

Requirements:

```
google-cloud-storage==2.*
google-cloud-bigquery==3.*
```

Build and push:

```bash
# Build and push the batch job container
gcloud builds submit . \
  --tag=us-central1-docker.pkg.dev/my-project/my-repo/daily-etl:v1
```

## Step 2: Create the Cloud Run Job

Create the job definition:

```bash
# Create a Cloud Run Job with parallel task execution
gcloud run jobs create daily-etl-job \
  --image=us-central1-docker.pkg.dev/my-project/my-repo/daily-etl:v1 \
  --region=us-central1 \
  --tasks=4 \
  --max-retries=3 \
  --task-timeout=30m \
  --cpu=1 \
  --memory=1Gi \
  --set-env-vars="PROJECT_ID=my-project,SOURCE_BUCKET=my-data-bucket,BQ_DATASET=analytics,BQ_TABLE=daily_events" \
  --service-account=etl-runner@my-project.iam.gserviceaccount.com
```

Key flags explained:
- `--tasks=4` runs 4 parallel tasks (each gets a unique CLOUD_RUN_TASK_INDEX from 0 to 3)
- `--max-retries=3` retries failed tasks up to 3 times
- `--task-timeout=30m` kills tasks that run longer than 30 minutes

## Step 3: Test the Job Manually

Before setting up a schedule, run the job once to verify it works:

```bash
# Execute the job manually
gcloud run jobs execute daily-etl-job --region=us-central1
```

Check the execution status:

```bash
# List recent executions
gcloud run jobs executions list \
  --job=daily-etl-job \
  --region=us-central1 \
  --format="table(name, completionTime, conditions[0].type, conditions[0].status)"
```

View the logs:

```bash
# View logs from the most recent execution
gcloud run jobs executions logs read \
  --job=daily-etl-job \
  --region=us-central1 \
  --limit=50
```

## Step 4: Create a Service Account for Cloud Scheduler

Cloud Scheduler needs a service account with permission to invoke the Cloud Run Job:

```bash
# Create a service account for Cloud Scheduler
gcloud iam service-accounts create scheduler-invoker \
  --display-name="Cloud Scheduler Job Invoker"

# Grant permission to invoke Cloud Run Jobs
gcloud run jobs add-iam-policy-binding daily-etl-job \
  --region=us-central1 \
  --member="serviceAccount:scheduler-invoker@my-project.iam.gserviceaccount.com" \
  --role="roles/run.invoker"
```

## Step 5: Create the Cloud Scheduler Job

Set up the schedule:

```bash
# Create a Cloud Scheduler job that runs the ETL daily at 2 AM UTC
gcloud scheduler jobs create http daily-etl-trigger \
  --location=us-central1 \
  --schedule="0 2 * * *" \
  --time-zone="UTC" \
  --uri="https://us-central1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/my-project/jobs/daily-etl-job:run" \
  --http-method=POST \
  --oauth-service-account-email=scheduler-invoker@my-project.iam.gserviceaccount.com
```

The cron expression `0 2 * * *` means "every day at 2:00 AM UTC."

Other common schedules:

```bash
# Every hour
--schedule="0 * * * *"

# Every 6 hours
--schedule="0 */6 * * *"

# Every Monday at 9 AM
--schedule="0 9 * * 1"

# First day of every month at midnight
--schedule="0 0 1 * *"
```

## Step 6: Verify the Schedule

List your scheduler jobs:

```bash
# List all Cloud Scheduler jobs
gcloud scheduler jobs list --location=us-central1
```

Test the trigger without waiting for the schedule:

```bash
# Manually trigger the scheduled job
gcloud scheduler jobs run daily-etl-trigger --location=us-central1
```

## Monitoring and Alerting

Set up monitoring to know when jobs fail:

```bash
# Create an alert for failed Cloud Run Job executions
gcloud monitoring policies create \
  --display-name="ETL Job Failure Alert" \
  --condition-display-name="Job execution failed" \
  --condition-filter='metric.type="run.googleapis.com/job/completed_task_attempt_count" AND resource.labels.job_name="daily-etl-job" AND metric.labels.result="failed"' \
  --condition-threshold-value=0 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=0s \
  --combiner=OR
```

You can also check job history programmatically:

```bash
#!/bin/bash
# Check if yesterday's ETL job succeeded

LATEST_EXECUTION=$(gcloud run jobs executions list \
  --job=daily-etl-job \
  --region=us-central1 \
  --limit=1 \
  --format="value(name)")

STATUS=$(gcloud run jobs executions describe "${LATEST_EXECUTION}" \
  --region=us-central1 \
  --format="value(conditions[0].type)")

if [ "${STATUS}" != "Completed" ]; then
  echo "WARNING: Latest ETL execution did not complete successfully"
  echo "Status: ${STATUS}"
  exit 1
fi

echo "ETL job completed successfully"
```

## Updating the Job

When you need to deploy a new version of the job:

```bash
# Update the job with a new container image
gcloud run jobs update daily-etl-job \
  --region=us-central1 \
  --image=us-central1-docker.pkg.dev/my-project/my-repo/daily-etl:v2
```

The scheduler continues to trigger the job as before - it just runs the updated container image.

## Cost Efficiency

Cloud Run Jobs are billed only for the time they are executing. If your ETL job runs for 10 minutes per day with 4 parallel tasks at 1 CPU and 1 GB memory, the monthly cost is approximately:

```
Daily: 4 tasks * 10 min * 60 sec = 2,400 vCPU-seconds
Monthly: 2,400 * 30 = 72,000 vCPU-seconds
CPU cost: 72,000 * $0.00002400 = $1.73
Memory cost: 72,000 * $0.00000250 * 1 GiB = $0.18
Total: ~$1.91/month
```

Compare this to running a dedicated VM 24/7 at $25-50/month for the same task. The savings are substantial for jobs that only need to run briefly.

Cloud Run Jobs with Cloud Scheduler give you a managed, scalable, and cost-effective way to run batch workloads. No servers to manage, no idle compute to pay for, and built-in retry logic for reliability.
