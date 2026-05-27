# How to Monitor Batch Job Progress and Debug Failures with Cloud Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Batch, Cloud Logging, Monitoring, Debugging

Description: Monitor Google Cloud Batch job progress and debug task failures using Cloud Logging with structured queries and alerting for batch workloads.

---

When a batch job has 100 tasks running in parallel and something goes wrong, you need fast answers. Which tasks failed? Why did they fail? How far did the job get before the failure? Google Cloud Batch integrates with Cloud Logging to give you detailed visibility into job execution, task progress, and failure details.

This guide covers how to configure logging for Batch jobs, query logs effectively, build monitoring dashboards, and set up alerts for job failures.

## Enabling Logging for Batch Jobs

If you create a job using the Google Cloud console, Cloud Logging is enabled for Batch job logs. If you create a job using the gcloud CLI or Batch API, enable Cloud Logging explicitly in your job definition.

```python
# Logging configuration in a Batch job

from google.cloud import batch_v1

job = batch_v1.Job()

# Set the logging destination
job.logs_policy = batch_v1.LogsPolicy(
    destination=batch_v1.LogsPolicy.Destination.CLOUD_LOGGING
)
```

With this configuration, everything your task writes to stdout and stderr is captured in Cloud Logging.

## Structured Logging from Your Tasks

Plain text logs work, but structured JSON logs give you much better filtering and analysis capabilities. Write your task output as JSON objects.

```python
# task_with_structured_logging.py - Task that outputs structured logs
import json
import sys
import os
from datetime import datetime, timezone

TASK_INDEX = int(os.environ.get("BATCH_TASK_INDEX", 0))
TASK_COUNT = int(os.environ.get("BATCH_TASK_COUNT", 1))


def log(severity, message, **kwargs):
    """Write a structured log entry to stdout."""
    entry = {
        "severity": severity,
        "message": message,
        "task_index": TASK_INDEX,
        "task_count": TASK_COUNT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    entry.update(kwargs)
    print(json.dumps(entry))
    sys.stdout.flush()  # Ensure logs are written immediately


def process_chunk():
    """Process a data chunk with progress logging."""
    log("Info", "Task starting", phase="init")

    total_records = 10000
    processed = 0
    errors = 0

    for i in range(total_records):
        try:
            # Process one record
            process_record(i)
            processed += 1

            # Log progress every 1000 records
            if processed % 1000 == 0:
                progress = (processed / total_records) * 100
                log("Info", f"Progress: {progress:.1f}%",
                    phase="processing",
                    records_processed=processed,
                    records_total=total_records,
                    errors_so_far=errors)

        except Exception as e:
            errors += 1
            log("Warning", f"Record {i} failed: {str(e)}",
                phase="processing",
                record_index=i,
                error_type=type(e).__name__)

            if errors > total_records * 0.1:  # Fail if error rate exceeds 10%
                log("Error", "Error rate exceeded threshold, aborting",
                    phase="processing",
                    error_rate=errors / processed if processed > 0 else 1,
                    records_processed=processed,
                    total_errors=errors)
                sys.exit(1)

    log("Info", "Task completed successfully",
        phase="complete",
        records_processed=processed,
        total_errors=errors,
        error_rate=errors / processed if processed > 0 else 0)


def process_record(index):
    """Process a single record. Replace with your actual logic."""
    if index % 7777 == 0:
        raise ValueError(f"Simulated error for record {index}")


if __name__ == "__main__":
    process_chunk()
```

## Querying Batch Job Logs

Cloud Logging lets you filter logs by job, task, severity, and any structured fields you include.

### View All Logs for a Specific Job

```text
# Cloud Logging query - all logs for a specific Batch job
resource.type="batch.googleapis.com/Job"
logName="projects/PROJECT_ID/logs/batch_task_logs"
labels.job_uid="JOB_UID_HERE"
```

### Filter by Task Index

```text
# Logs for a specific task within the job
resource.type="batch.googleapis.com/Job"
logName="projects/PROJECT_ID/logs/batch_task_logs"
labels.job_uid="JOB_UID_HERE"
labels.task_id:"JOB_UID_HERE-group0-0"
```

### Find Failed Tasks

```text
# All error-level logs from a job
resource.type="batch.googleapis.com/Job"
logName="projects/PROJECT_ID/logs/batch_task_logs"
labels.job_uid="JOB_UID_HERE"
severity>=ERROR
```

### Search Structured Log Fields

```text
# Find tasks that exceeded the error threshold
resource.type="batch.googleapis.com/Job"
logName="projects/PROJECT_ID/logs/batch_task_logs"
jsonPayload.phase="processing"
jsonPayload.error_rate>0.05
```

## Using gcloud to Query Logs

You can also query logs from the command line.

```bash
# View recent logs for a specific Batch job
gcloud logging read \
  'logName="projects/PROJECT_ID/logs/batch_task_logs" AND labels.job_uid="abc123"' \
  --limit=100 \
  --format="table(timestamp, severity, jsonPayload.message)"

# Find error logs from the last hour
gcloud logging read \
  'logName="projects/PROJECT_ID/logs/batch_task_logs" AND severity>=ERROR AND timestamp>="2026-02-17T00:00:00Z"' \
  --limit=50 \
  --format=json

# Count failures per task
gcloud logging read \
  'logName="projects/PROJECT_ID/logs/batch_task_logs" AND severity=ERROR AND labels.job_uid="abc123"' \
  --format="value(labels.task_id)" \
  | sort | uniq -c | sort -rn
```

## Building a Monitoring Dashboard

Create a Cloud Monitoring dashboard that shows batch job health at a glance.

```python
# create_dashboard.py - Create a monitoring dashboard for Batch jobs
from google.cloud import monitoring_dashboard_v1

def create_batch_monitoring_dashboard(project_id):
    """Create a dashboard for monitoring Cloud Batch jobs."""
    client = monitoring_dashboard_v1.DashboardsServiceClient()

    dashboard = monitoring_dashboard_v1.Dashboard(
        display_name="Cloud Batch Job Monitor",
        grid_layout=monitoring_dashboard_v1.GridLayout(
            columns=2,
            widgets=[
                # Widget 1: Batch task log entries
                monitoring_dashboard_v1.Widget(
                    title="Batch Task Log Entries",
                    scorecard=monitoring_dashboard_v1.Scorecard(
                        time_series_query=monitoring_dashboard_v1.TimeSeriesQuery(
                            time_series_filter=monitoring_dashboard_v1.TimeSeriesFilter(
                                filter='metric.type="logging.googleapis.com/log_entry_count" AND resource.type="batch.googleapis.com/Job" AND metric.labels.log="batch_task_logs"',
                            )
                        ),
                    ),
                ),
                # Widget 2: Error logs
                monitoring_dashboard_v1.Widget(
                    title="Batch Error Logs",
                    scorecard=monitoring_dashboard_v1.Scorecard(
                        time_series_query=monitoring_dashboard_v1.TimeSeriesQuery(
                            time_series_filter=monitoring_dashboard_v1.TimeSeriesFilter(
                                filter='metric.type="logging.googleapis.com/log_entry_count" AND resource.type="batch.googleapis.com/Job" AND metric.labels.log="batch_task_logs" AND metric.labels.severity="ERROR"',
                            )
                        ),
                    ),
                ),
                # Widget 3: Task log volume over time
                monitoring_dashboard_v1.Widget(
                    title="Task Log Volume",
                    xy_chart=monitoring_dashboard_v1.XyChart(
                        data_sets=[
                            monitoring_dashboard_v1.XyChart.DataSet(
                                time_series_query=monitoring_dashboard_v1.TimeSeriesQuery(
                                    time_series_filter=monitoring_dashboard_v1.TimeSeriesFilter(
                                        filter='metric.type="logging.googleapis.com/log_entry_count" AND resource.type="batch.googleapis.com/Job" AND metric.labels.log="batch_task_logs"',
                                    )
                                ),
                            )
                        ],
                    ),
                ),
                # Widget 4: Log-based metric for errors
                monitoring_dashboard_v1.Widget(
                    title="Error Log Entries",
                    xy_chart=monitoring_dashboard_v1.XyChart(
                        data_sets=[
                            monitoring_dashboard_v1.XyChart.DataSet(
                                time_series_query=monitoring_dashboard_v1.TimeSeriesQuery(
                                    time_series_filter=monitoring_dashboard_v1.TimeSeriesFilter(
                                        filter='metric.type="logging.googleapis.com/user/batch-job-failures" AND resource.type="batch.googleapis.com/Job"',
                                    )
                                ),
                            )
                        ],
                    ),
                ),
            ],
        ),
    )

    result = client.create_dashboard(
        parent=f"projects/{project_id}",
        dashboard=dashboard,
    )

    print(f"Dashboard created: {result.name}")
    return result
```

## Setting Up Alerts

Create alerts that notify you when batch jobs fail.

```bash
# Create a log-based metric for batch job failures
gcloud logging metrics create batch-job-failures \
  --description="Count of Batch job task failures" \
  --log-filter='logName="projects/PROJECT_ID/logs/batch_task_logs" AND severity>=ERROR'

# Create an alert policy based on the metric
gcloud monitoring policies create \
  --display-name="Batch Job Failure Alert" \
  --notification-channels=YOUR_CHANNEL_ID \
  --condition-display-name="Batch task failures detected" \
  --condition-filter='metric.type="logging.googleapis.com/user/batch-job-failures" AND resource.type="batch.googleapis.com/Job"' \
  --if='> 0' \
  --duration=60s
```

## Checking Job Status Programmatically

Query the Batch API directly to check job and task status.

```python
# check_job_status.py - Monitor a running Batch job
from google.cloud import batch_v1
import time
import logging

logger = logging.getLogger(__name__)


def monitor_job(project_id, region, job_id, poll_interval=30):
    """Monitor a Batch job until it completes."""
    client = batch_v1.BatchServiceClient()
    job_name = f"projects/{project_id}/locations/{region}/jobs/{job_id}"

    while True:
        job = client.get_job(name=job_name)
        state = job.status.state

        # Count tasks by state
        task_group_status = job.status.task_groups
        run_duration = job.status.run_duration

        logger.info(
            f"Job {job_id}: state={state.name}, "
            f"duration={run_duration}, "
            f"task_groups={dict(task_group_status)}"
        )

        # Check task group progress
        for tg in job.task_groups:
            logger.info(f"  Task group: count={tg.task_count}, parallelism={tg.parallelism}")

        if state == batch_v1.JobStatus.State.SUCCEEDED:
            logger.info(f"Job {job_id} completed successfully")
            return "success"
        elif state == batch_v1.JobStatus.State.FAILED:
            logger.error(f"Job {job_id} failed")
            # Get failure details from status events
            for event in job.status.status_events:
                logger.error(f"  Event: {event.description}")
            return "failed"
        elif state in (batch_v1.JobStatus.State.DELETION_IN_PROGRESS,):
            logger.warning(f"Job {job_id} is being deleted")
            return "deleted"

        time.sleep(poll_interval)


def get_task_details(project_id, region, job_id):
    """Get detailed status for each task in a job."""
    client = batch_v1.BatchServiceClient()
    parent = f"projects/{project_id}/locations/{region}/jobs/{job_id}/taskGroups/group0"

    tasks = client.list_tasks(parent=parent)

    summary = {"succeeded": 0, "failed": 0, "running": 0, "pending": 0}
    failed_tasks = []

    for task in tasks:
        state_name = task.status.state.name.lower()
        if state_name in summary:
            summary[state_name] += 1

        if task.status.state == batch_v1.TaskStatus.State.FAILED:
            failed_tasks.append({
                "task": task.name.split("/")[-1],
                "events": [e.description for e in task.status.status_events[-3:]],
            })

    logger.info(f"Task summary: {summary}")
    if failed_tasks:
        logger.error(f"Failed tasks: {failed_tasks}")

    return summary, failed_tasks
```

## Debugging Common Failures

Here are the most common Batch job failures and how to find them in logs.

**Task timeout**: Look for tasks that stopped logging near the timeout limit. The last log entry often shows where the task was when it timed out.

```text
resource.type="batch.googleapis.com/Job"
logName="projects/PROJECT_ID/logs/batch_task_logs"
labels.job_uid="abc123"
jsonPayload.phase="processing"
```

**Out of memory**: Tasks that crash without logging an error often hit OOM. Check the task status events for OOM signals.

**Permission errors**: Usually appear early in the task execution. Search for "permission denied" or "403" in the logs.

```text
resource.type="batch.googleapis.com/Job"
logName="projects/PROJECT_ID/logs/batch_task_logs"
textPayload=~"permission denied|403|AccessDenied"
```

## Wrapping Up

Effective monitoring and debugging of Batch jobs comes down to three things: structured logging from your tasks, well-crafted queries in Cloud Logging, and alerts that tell you when something goes wrong. The structured JSON logging pattern pays for itself when you need to debug a failure at 2 AM - instead of reading through thousands of lines of text, you can filter by task index, error type, or processing phase to find the root cause quickly. Set up your monitoring before your first production job runs, not after the first failure.
