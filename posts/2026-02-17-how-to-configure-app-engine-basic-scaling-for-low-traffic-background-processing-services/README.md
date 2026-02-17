# How to Configure App Engine Basic Scaling for Low-Traffic Background Processing Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, App Engine, Basic Scaling, Background Processing, Cost Optimization

Description: Learn when and how to use App Engine basic scaling for background processing services that need long request timeouts and cost-efficient instance management.

---

App Engine offers three scaling types: automatic, basic, and manual. While automatic scaling gets most of the attention, basic scaling is specifically designed for workloads that do not fit the automatic scaling model - things like long-running background tasks, batch processing, and low-traffic services where you want instances to shut down when idle.

Basic scaling gives you two things that automatic scaling cannot: request timeouts up to 24 hours and the ability to run instances that shut down after a configurable idle period. For background processing services, these two features are exactly what you need.

## When to Use Basic Scaling

Basic scaling makes sense when your service:

- Processes tasks that take longer than 10 minutes (the automatic scaling limit)
- Receives sporadic traffic with long idle periods
- Runs background jobs triggered by Cloud Tasks or cron
- Does batch processing that runs for minutes or hours
- Needs to keep instances alive between bursts of related tasks

Basic scaling does not make sense for:

- User-facing endpoints where latency matters
- High-traffic services that need rapid scaling
- Services that benefit from scaling to zero quickly

## Basic Scaling Configuration

Here is the core `app.yaml` configuration:

```yaml
# app.yaml - Background processing service with basic scaling
runtime: python312
service: worker

basic_scaling:
  max_instances: 5       # Maximum number of instances
  idle_timeout: 10m      # Shut down instances after 10 minutes of idleness

instance_class: B2       # 256MB memory, 600MHz CPU

env_variables:
  TASK_TIMEOUT: "3600"
  WORKER_MODE: "true"
```

The two key settings are `max_instances` and `idle_timeout`.

### max_instances

This caps how many instances App Engine will create for this service. Unlike automatic scaling where instances spin up based on request rate and CPU, basic scaling creates instances on demand - one per incoming request, up to the max. If all instances are busy and a new request comes in, it queues until an instance is available.

For background processing, keep this number low. Each instance costs money, and background tasks usually do not need parallel execution at scale.

### idle_timeout

This controls how long an instance stays alive after it finishes processing its last request. The default is 5 minutes. Setting it higher means instances stay warm for repeat tasks, but you pay for idle time.

Think about your workload pattern:

- If tasks come in steady bursts every few minutes, set `idle_timeout: 15m` to keep instances warm between bursts
- If tasks are truly sporadic with long gaps, set `idle_timeout: 5m` to minimize idle costs
- If tasks come in rapid succession, set `idle_timeout: 10m` to avoid constant cold starts

## Instance Classes for Basic Scaling

Basic scaling uses B-class instances (not F-class like automatic scaling):

```
B1: 256MB memory, 600MHz CPU   - $0.05/hour
B2: 512MB memory, 1.2GHz CPU   - $0.10/hour
B4: 1GB memory, 2.4GHz CPU     - $0.20/hour
B4_1G: 2GB memory, 2.4GHz CPU  - $0.30/hour
B8: 2GB memory, 4.8GHz CPU     - $0.40/hour
```

B-class instances are billed per-instance-hour. You pay for the entire time the instance is running, including idle time. This is different from automatic scaling where you only pay when requests are being processed.

Choose the instance class based on your task requirements:

```yaml
# For lightweight tasks (email sending, webhook processing)
instance_class: B1

# For medium tasks (report generation, data transformation)
instance_class: B2

# For heavy tasks (image processing, ML inference)
instance_class: B4

# For memory-intensive tasks (large dataset processing)
instance_class: B4_1G
```

## Building a Task Processing Service

Here is a complete background processing service that handles Cloud Tasks:

```python
# main.py - Background task processing service
import logging
import time
import json
from flask import Flask, request, jsonify

app = Flask(__name__)
logger = logging.getLogger(__name__)

@app.route("/_ah/start")
def startup():
    """Called when a new instance starts.
    Use this to initialize resources before processing tasks.
    """
    logger.info("Worker instance starting up")
    # Initialize database connections, load models, etc.
    return "OK", 200

@app.route("/_ah/stop")
def shutdown():
    """Called when an instance is about to shut down.
    Clean up resources and save state.
    """
    logger.info("Worker instance shutting down")
    # Close connections, flush buffers, etc.
    return "OK", 200

@app.route("/tasks/process-report", methods=["POST"])
def process_report():
    """Handle report generation tasks.
    This can run for up to 24 hours on basic scaling.
    """
    task_name = request.headers.get("X-CloudTasks-TaskName", "manual")
    retry_count = int(request.headers.get("X-CloudTasks-TaskRetryCount", "0"))

    logger.info(f"Processing report task: {task_name} (retry: {retry_count})")

    try:
        data = request.get_json()
        report_id = data["report_id"]

        # Update status
        update_report_status(report_id, "processing")

        # Do the actual work - this might take a long time
        start_time = time.time()
        result = generate_report(data["parameters"])
        duration = time.time() - start_time

        # Save results
        save_report_result(report_id, result)
        update_report_status(report_id, "complete")

        logger.info(f"Report {report_id} completed in {duration:.1f}s")
        return "OK", 200

    except Exception as e:
        logger.error(f"Task {task_name} failed: {e}")
        if retry_count < 3:
            # Return 500 to trigger a retry
            return "Failed, will retry", 500
        else:
            # Max retries reached, mark as failed
            update_report_status(data.get("report_id", "unknown"), "failed")
            return "Failed permanently", 200  # Return 200 to stop retries

@app.route("/tasks/batch-import", methods=["POST"])
def batch_import():
    """Handle large data import tasks."""
    data = request.get_json()
    file_url = data["file_url"]
    batch_id = data["batch_id"]

    logger.info(f"Starting batch import: {batch_id}")
    update_batch_status(batch_id, "importing")

    try:
        # Download and process the file
        records = download_and_parse(file_url)
        total = len(records)

        # Process records with progress tracking
        for i, record in enumerate(records):
            import_record(record)

            # Log progress every 1000 records
            if (i + 1) % 1000 == 0:
                progress = ((i + 1) / total) * 100
                logger.info(f"Import progress: {progress:.1f}% ({i + 1}/{total})")
                update_batch_status(batch_id, f"importing ({i + 1}/{total})")

        update_batch_status(batch_id, "complete")
        logger.info(f"Batch import {batch_id} complete: {total} records")
        return "OK", 200

    except Exception as e:
        logger.error(f"Batch import {batch_id} failed: {e}")
        update_batch_status(batch_id, "failed")
        return "Failed", 500
```

## The /_ah/start and /_ah/stop Handlers

Basic scaling supports special startup and shutdown handlers:

- `/_ah/start` is called when a new instance starts, before any task requests
- `/_ah/stop` is called when an instance is about to shut down (idle timeout reached)

These are unique to basic scaling and give you hooks for resource management:

```python
# Startup and shutdown lifecycle management
import atexit

# Global resources
db_connection = None
temp_directory = None

@app.route("/_ah/start")
def startup():
    global db_connection, temp_directory
    # Open database connection once, reuse across tasks
    db_connection = create_database_connection()
    # Create temp directory for file processing
    temp_directory = create_temp_directory()
    return "OK", 200

@app.route("/_ah/stop")
def shutdown():
    # Clean up resources
    if db_connection:
        db_connection.close()
    if temp_directory:
        cleanup_temp_directory(temp_directory)
    return "OK", 200
```

## Combining with Cloud Tasks

Cloud Tasks pairs naturally with basic scaling services. Configure your task queue to route to the worker service:

```bash
# Create a queue that routes to the worker service
gcloud tasks queues create background-processing \
  --location=us-central1 \
  --max-dispatches-per-second=5 \
  --max-concurrent-dispatches=5 \
  --max-attempts=3 \
  --min-backoff=60s \
  --max-backoff=3600s
```

The `max-concurrent-dispatches` should not exceed your `max_instances` setting. If you have 5 max instances and 5 max concurrent dispatches, each instance handles one task at a time.

## Combining with App Engine Cron

Use cron jobs to trigger periodic background processing:

```yaml
# cron.yaml - Periodic background tasks
cron:
  - description: "Daily report generation"
    url: /tasks/daily-report
    schedule: every day 02:00
    target: worker
    timezone: America/New_York

  - description: "Hourly data cleanup"
    url: /tasks/cleanup
    schedule: every 1 hours
    target: worker

  - description: "Weekly analytics aggregation"
    url: /tasks/aggregate-analytics
    schedule: every monday 03:00
    target: worker
    timezone: America/New_York
```

Deploy the cron configuration:

```bash
# Deploy cron jobs
gcloud app deploy cron.yaml --project=your-project-id
```

## Cost Comparison with Automatic Scaling

Let me compare costs for a workload that processes 100 tasks per day, each taking 5 minutes:

With automatic scaling (F2 instances):
```
100 tasks x 5 minutes = 500 instance-minutes = 8.3 hours
F2 cost: $0.10/hour
Daily cost: ~$0.83
Plus min_idle_instances cost if any
```

With basic scaling (B2 instances):
```
100 tasks x 5 minutes = 500 active minutes
Plus idle time between tasks (depends on idle_timeout)
With 10-minute idle timeout and tasks spread across the day:
Estimated daily instance hours: ~25 hours
B2 cost: $0.10/hour
Daily cost: ~$2.50
```

Basic scaling costs more for this workload because of idle time. But if tasks take more than 10 minutes each, basic scaling is your only option on Standard. The break-even point depends on your task duration, frequency, and how well they batch together.

## Monitoring Worker Health

Track your worker service health and performance:

```bash
# View worker service instances
gcloud app instances list --service=worker --project=your-project-id

# View worker logs
gcloud app logs read --service=worker --limit=100 --project=your-project-id

# Check queue statistics
gcloud tasks queues describe background-processing --location=us-central1
```

Set up Cloud Monitoring alerts for:
- Task failure rate exceeding a threshold
- Queue depth growing (tasks backing up faster than they are processed)
- Instance count hitting max_instances (might need to increase the limit)

## Summary

Basic scaling is the right choice for App Engine services that process background tasks, run batch jobs, or handle any workload that needs longer than 10 minutes per request. Configure `max_instances` based on your concurrency needs and `idle_timeout` based on your task frequency. Use B-class instance sizes appropriate for your task complexity. Pair it with Cloud Tasks for reliable task delivery and cron.yaml for scheduled jobs. The cost is higher than automatic scaling due to idle time billing, but the 24-hour request timeout makes it the only option for long-running work on App Engine Standard.
