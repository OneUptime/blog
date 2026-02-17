# How to Fix Zombie Tasks and Scheduler Lag in Cloud Composer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Composer, Airflow, Troubleshooting, Scheduler

Description: Diagnose and resolve zombie tasks and scheduler lag in Cloud Composer that cause pipeline delays, missed SLAs, and unreliable DAG execution.

---

Zombie tasks and scheduler lag are two of the most disruptive problems in Cloud Composer. Zombie tasks are tasks that the scheduler thinks are running, but the worker has actually lost track of them. They sit in the "running" state forever, consuming pool slots and blocking downstream tasks. Scheduler lag means the scheduler is falling behind on processing DAG files and scheduling tasks, causing delays across all your pipelines.

Both problems tend to snowball. A few zombie tasks consume pool slots, which slows scheduling, which creates more zombies. This article covers how to identify, fix, and prevent both issues.

## Understanding Zombie Tasks

A zombie task occurs when:

1. A worker starts executing a task
2. The worker process crashes, gets killed (OOM), or loses its connection
3. The task stays in the "running" state in the metadata database
4. The scheduler does not immediately detect that the task has died

Airflow has a built-in zombie detection mechanism. The scheduler periodically checks for tasks that have not sent a heartbeat within the expected interval and marks them as "zombie" before cleaning them up.

## Diagnosing Zombie Tasks

### Check for Long-Running Tasks

Look for tasks that have been running much longer than expected:

```bash
# List running tasks and check their duration
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  tasks states-for-dag-run -- my_dag_id 2025-01-15
```

In the Airflow UI, go to **Browse** > **Task Instances** and filter by state = "running". Sort by start date. Tasks that started hours or days ago and are still "running" are likely zombies.

### Check the Scheduler Logs for Zombie Detection

```bash
# Search for zombie-related log entries
gcloud logging read \
  'resource.type="cloud_composer_environment" AND textPayload=~"zombie|Detected zombie"' \
  --project=my-project \
  --limit=30 \
  --format="table(timestamp, textPayload)"
```

### Check Worker Heartbeats

If workers are not sending heartbeats, the scheduler will eventually detect their tasks as zombies:

```bash
# Check worker health
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  celery inspect ping

# Check active tasks on each worker
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  celery inspect active
```

## Fixing Existing Zombie Tasks

### Manual Cleanup via the Airflow UI

1. Go to **Browse** > **Task Instances**
2. Filter for state = "running" with old start dates
3. Select the zombie tasks
4. Use the **Actions** dropdown to mark them as "failed" or "success"

### Clear Zombie Tasks via the CLI

```bash
# Mark specific zombie tasks as failed
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  tasks clear -- my_dag_id -t my_task_id -s 2025-01-15 -e 2025-01-15 -d

# Clear all task instances for a specific DAG run
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  tasks clear -- my_dag_id -s 2025-01-15 -e 2025-01-15
```

### Programmatic Zombie Cleanup

For recurring zombie issues, create a maintenance DAG that cleans them up:

```python
# zombie_cleanup_dag.py - Automatically detect and clean up zombie tasks
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.models import TaskInstance
from airflow.utils.state import TaskInstanceState
from airflow.utils.session import create_session

default_args = {
    "owner": "platform",
    "retries": 0,
}

dag = DAG(
    dag_id="zombie_cleanup",
    default_args=default_args,
    schedule_interval="*/30 * * * *",  # Run every 30 minutes
    start_date=datetime(2025, 1, 1),
    catchup=False,
    tags=["maintenance"],
)


def detect_and_clean_zombies(**context):
    """Find and clean up tasks that have been running too long."""
    max_running_hours = 4  # Tasks running longer than this are likely zombies
    cutoff = datetime.utcnow() - timedelta(hours=max_running_hours)

    with create_session() as session:
        # Find tasks in running state that started before the cutoff
        zombie_candidates = session.query(TaskInstance).filter(
            TaskInstance.state == TaskInstanceState.RUNNING,
            TaskInstance.start_date < cutoff,
        ).all()

        if not zombie_candidates:
            print("No zombie tasks found")
            return

        print(f"Found {len(zombie_candidates)} potential zombie tasks:")
        for ti in zombie_candidates:
            running_hours = (datetime.utcnow() - ti.start_date).total_seconds() / 3600
            print(f"  {ti.dag_id}.{ti.task_id} - running for {running_hours:.1f} hours")

            # Mark as failed so they can be retried
            ti.state = TaskInstanceState.FAILED
            session.merge(ti)

        session.commit()
        print(f"Cleaned up {len(zombie_candidates)} zombie tasks")


cleanup = PythonOperator(
    task_id="cleanup_zombies",
    python_callable=detect_and_clean_zombies,
    dag=dag,
)
```

## Preventing Zombie Tasks

### Tune Heartbeat Settings

The scheduler uses heartbeats to detect dead tasks. Tune these settings for faster detection:

```bash
# Configure faster zombie detection
gcloud composer environments update my-composer-env \
  --location=us-central1 \
  --update-airflow-configs="\
scheduler-scheduler_zombie_task_threshold=300,\
scheduler-zombie_detection_interval=60,\
celery-worker_concurrency=12"
```

Settings explained:
- `scheduler_zombie_task_threshold` - Seconds since last heartbeat before a task is considered a zombie (default 300)
- `zombie_detection_interval` - How often the scheduler checks for zombies (default 10 seconds)

### Set Task Timeouts

Prevent tasks from running forever by setting execution timeouts:

```python
# Set timeouts on your tasks to prevent zombie situations
from datetime import timedelta

task = PythonOperator(
    task_id="time_limited_task",
    python_callable=my_function,
    execution_timeout=timedelta(hours=2),  # Kill the task after 2 hours
    dag=dag,
)
```

Set a default timeout for all tasks in a DAG:

```python
default_args = {
    "execution_timeout": timedelta(hours=1),  # Default timeout for all tasks
}
```

### Increase Worker Memory

Many zombies are caused by workers running out of memory and being killed:

```bash
# Increase worker memory to prevent OOM kills
gcloud composer environments update my-composer-env \
  --location=us-central1 \
  --worker-memory=8 \
  --worker-cpu=2
```

## Understanding Scheduler Lag

Scheduler lag happens when the scheduler cannot process DAG files and schedule tasks fast enough to keep up with the pipeline demands. Symptoms include:

- DAGs not starting on time
- Tasks staying in "scheduled" state before moving to "queued"
- The `dag_processing.last_duration` metric increasing over time
- Import errors going unnoticed because the scheduler has not parsed the file yet

## Diagnosing Scheduler Lag

### Check DAG Processing Time

```bash
# Check how long DAG processing takes
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  dags report
```

This shows how long each DAG file takes to parse. Files taking more than a few seconds are candidates for optimization.

### Monitor Scheduler Metrics

Look at these metrics in Cloud Monitoring:

- `composer.googleapis.com/environment/scheduler/running` - Is the scheduler running?
- `composer.googleapis.com/environment/dag_processing/total_parse_time` - Total time to parse all DAGs
- `composer.googleapis.com/environment/scheduler_heartbeat` - Scheduler heartbeat interval

### Check Scheduler Logs

```bash
# Look for scheduler warning and error messages
gcloud logging read \
  'resource.type="cloud_composer_environment" AND severity>=WARNING AND textPayload=~"scheduler"' \
  --project=my-project \
  --limit=30 \
  --format="table(timestamp, severity, textPayload)"
```

## Fixing Scheduler Lag

### Increase Scheduler Resources

The most direct fix is giving the scheduler more CPU and memory:

```bash
# Increase scheduler resources
gcloud composer environments update my-composer-env \
  --location=us-central1 \
  --scheduler-cpu=4 \
  --scheduler-memory=8
```

### Add More Schedulers

Running multiple scheduler instances distributes the parsing workload:

```bash
# Run multiple schedulers
gcloud composer environments update my-composer-env \
  --location=us-central1 \
  --scheduler-count=3
```

### Optimize DAG Parsing

Reduce the scheduler's workload by optimizing your DAG files:

```python
# Before: Slow DAG file with heavy top-level imports
import pandas as pd
import numpy as np
import tensorflow as tf  # Very slow to import
from google.cloud import bigquery

# Heavy computation during parsing
client = bigquery.Client()
tables = list(client.list_tables("my_dataset"))

dag = DAG(...)

# After: Fast DAG file with deferred imports
from airflow import DAG
from airflow.operators.python import PythonOperator

dag = DAG(...)

def my_task():
    # Move heavy imports inside the task function
    import pandas as pd
    import numpy as np
    # Process data here
```

### Adjust Parsing Intervals

If the scheduler is spending too much time reparsing unchanged files:

```bash
# Reduce parsing frequency for stable environments
gcloud composer environments update my-composer-env \
  --location=us-central1 \
  --update-airflow-configs="\
scheduler-dag_dir_list_interval=120,\
scheduler-min_file_process_interval=90,\
scheduler-parsing_processes=4"
```

### Clean Up the Metadata Database

A bloated metadata database slows down all scheduler queries:

```bash
# Clean up old task instances and DAG runs
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  db clean -- --clean-before-timestamp "2024-06-01T00:00:00+00:00" -y
```

### Remove Unused DAGs

Delete DAG files that are no longer needed. Every file the scheduler has to parse adds to the processing time:

```bash
# Remove a DAG file from the environment
gcloud composer environments storage dags delete \
  --environment=my-composer-env \
  --location=us-central1 \
  unused_dag.py

# Clean up deleted DAG metadata
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  dags delete -- unused_dag_id
```

## Setting Up Monitoring and Alerts

Proactive monitoring catches zombies and lag before they impact your pipelines:

```bash
# Alert on scheduler heartbeat lag
gcloud monitoring policies create --policy-from-file=- << 'EOF'
{
  "displayName": "Composer Scheduler Heartbeat Alert",
  "conditions": [{
    "displayName": "Scheduler heartbeat > 60s",
    "conditionThreshold": {
      "filter": "resource.type=\"cloud_composer_environment\" AND metric.type=\"composer.googleapis.com/environment/scheduler_heartbeat\"",
      "comparison": "COMPARISON_GT",
      "thresholdValue": 60,
      "duration": "300s"
    }
  }]
}
EOF
```

## Wrapping Up

Zombie tasks and scheduler lag are related problems that feed into each other. Zombies consume resources and pool slots, which puts pressure on the scheduler, which leads to more scheduling delays. The fix is a combination of resource scaling (more CPU, memory, and scheduler instances), configuration tuning (heartbeat intervals, parsing settings), and code optimization (lightweight DAG files, task timeouts). Set up monitoring to catch these issues early, and consider a maintenance DAG that automatically cleans up zombie tasks. With these measures in place, your Composer environment will stay healthy even under heavy workloads.
