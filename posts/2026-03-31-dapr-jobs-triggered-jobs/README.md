# How to Handle Triggered Jobs in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Job, Trigger, Webhook, Handler, Scheduling, Background Task

Description: Learn how to implement job trigger handlers in your Dapr application, process job payloads, handle errors, and control retry behavior for scheduled job execution.

---

## How Job Triggering Works

When a Dapr job fires, the Dapr Scheduler service calls your application on a specific HTTP endpoint:

```yaml
POST /job/{job-name}
Content-Type: application/json
```

Your application must respond with `200 OK` to acknowledge the job. Any other status code causes Dapr to retry the trigger. Understanding this flow is essential for building reliable job handlers.

## Basic Job Handler

```python
from flask import Flask, request, jsonify
import logging

app = Flask(__name__)
logger = logging.getLogger(__name__)

@app.route("/job/nightly-report", methods=["POST"])
def handle_nightly_report():
    try:
        # The request body contains the job data as plain JSON
        job_data = request.get_json() or {}

        logger.info(f"Job triggered: nightly-report, data: {job_data}")

        # Execute the job
        run_nightly_report(job_data)

        return "", 200  # Acknowledge success

    except Exception as e:
        logger.error(f"Job handler failed: {e}", exc_info=True)
        # Return 500 to signal failure - Dapr may retry
        return jsonify({"error": str(e)}), 500
```

## Accessing Job Metadata

The job name is conveyed through the URL path (`/job/{job-name}`), not in the request body. Use a path parameter to extract it:

```python
@app.route("/job/<job_name>", methods=["POST"])
def handle_job(job_name):
    job_data = request.get_json() or {}

    logger.info(f"Handling job: {job_name}")
    logger.info(f"Job data: {job_data}")

    process_job(job_data)
    return "", 200
```

## Go Job Handler

```go
package main

import (
    "encoding/json"
    "log"
    "net/http"
)

func jobHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        w.WriteHeader(http.StatusMethodNotAllowed)
        return
    }

    var jobData map[string]any
    if err := json.NewDecoder(r.Body).Decode(&jobData); err != nil {
        log.Printf("Failed to decode job payload: %v", err)
        w.WriteHeader(http.StatusBadRequest)
        return
    }

    log.Printf("Job triggered with data: %v", jobData)

    if err := processJob(jobData); err != nil {
        log.Printf("Job processing failed: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusOK)
}

func main() {
    http.HandleFunc("/job/my-job", jobHandler)
    log.Fatal(http.ListenAndServe(":6000", nil))
}
```

## Handling Idempotency

Jobs may be delivered more than once in edge cases. Make handlers idempotent:

```python
import hashlib
from datetime import datetime

# Track recently processed jobs to prevent duplicate execution
processed_jobs = {}

@app.route("/job/send-report", methods=["POST"])
def handle_send_report():
    job_data = request.get_json() or {}

    # Create idempotency key from job data and current hour
    now = datetime.utcnow()
    idempotency_key = hashlib.md5(
        f"{job_data}{now.year}{now.month}{now.day}{now.hour}".encode()
    ).hexdigest()

    if idempotency_key in processed_jobs:
        logger.info(f"Duplicate job detected, skipping: {idempotency_key}")
        return "", 200

    processed_jobs[idempotency_key] = True
    run_report(job_data)
    return "", 200
```

## Long-Running Job Handlers

For jobs that take longer than a few seconds, offload to a background thread and return 200 immediately:

```python
import threading

@app.route("/job/data-export", methods=["POST"])
def handle_data_export():
    job_data = request.get_json() or {}

    # Start processing in background thread
    thread = threading.Thread(target=run_data_export, args=(job_data,))
    thread.daemon = True
    thread.start()

    # Acknowledge immediately - don't block
    return "", 200

def run_data_export(job_data: dict):
    try:
        logger.info(f"Starting export: {job_data}")
        # Long-running export logic here
        export_to_s3(job_data)
        notify_completion(job_data)
    except Exception as e:
        logger.error(f"Export failed: {e}", exc_info=True)
```

## Error Handling and Dead Letter Pattern

```python
@app.route("/job/critical-job", methods=["POST"])
def handle_critical_job():
    job_data = request.get_json() or {}

    try:
        process_critical_job(job_data)
        return "", 200

    except RetryableError as e:
        # Return 500 to trigger Dapr retry
        logger.warning(f"Transient error, will retry: {e}")
        return jsonify({"error": "transient", "message": str(e)}), 500

    except PermanentError as e:
        # Log to dead letter queue, return 200 to stop retries
        logger.error(f"Permanent failure, sending to DLQ: {e}")
        send_to_dlq(job_data, str(e))
        return "", 200
```

## Registering Multiple Job Handlers

```python
# Register all job handlers cleanly
JOB_HANDLERS = {
    "nightly-report": handle_nightly_report_logic,
    "weekly-digest": handle_weekly_digest_logic,
    "hourly-cache-refresh": handle_cache_refresh_logic,
}

@app.route("/job/<job_name>", methods=["POST"])
def dispatch_job(job_name: str):
    handler = JOB_HANDLERS.get(job_name)
    if not handler:
        logger.error(f"Unknown job: {job_name}")
        return jsonify({"error": f"Unknown job: {job_name}"}), 404

    job_data = request.get_json() or {}

    try:
        handler(job_data)
        return "", 200
    except Exception as e:
        logger.error(f"Job {job_name} failed: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
```

## Summary

Handling triggered Dapr jobs requires an HTTP endpoint at `/job/{job-name}` that returns 200 on success and 5xx to trigger retries. For reliability, implement idempotent handlers to handle potential duplicate deliveries, use background threads for long-running operations, and distinguish between retryable and permanent errors to avoid infinite retry loops.
