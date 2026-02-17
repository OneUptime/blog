# How to Configure App Engine Request Timeout Settings for Long-Running API Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, App Engine, Request Timeout, API, Performance

Description: Learn how to configure and work around App Engine request timeout limits for long-running API endpoints across Standard and Flexible environments.

---

Every request to an App Engine application has a timeout. If your code does not finish processing within that limit, App Engine terminates the request and returns an error to the client. For quick API endpoints this is never an issue, but when you have endpoints that generate reports, process file uploads, or call slow external services, timeouts become a real concern.

The timeout behavior is different between App Engine Standard and Flexible, and it also depends on your scaling configuration. Let me break down the limits, show you how to configure them, and cover strategies for handling work that takes longer than the timeout allows.

## Timeout Limits by Environment

Here are the timeout limits for each environment and scaling type:

```
App Engine Standard Environment:
  - Automatic scaling: 10 minutes (600 seconds)
  - Basic scaling: 24 hours
  - Manual scaling: 24 hours

App Engine Flexible Environment:
  - All scaling types: 60 minutes (3600 seconds)
```

The 10-minute limit on Standard automatic scaling is the one that catches most people off guard. It sounds generous until you have an endpoint that queries a slow database, processes results, and generates a PDF.

## Configuring Timeouts in app.yaml

For App Engine Standard with automatic scaling, the 10-minute limit is hard. You cannot increase it. But you can work with different scaling types to get longer timeouts.

If you need longer timeouts, use basic scaling:

```yaml
# app.yaml - Basic scaling for longer timeouts (up to 24 hours)
runtime: python312

basic_scaling:
  max_instances: 5
  idle_timeout: 10m

# No explicit timeout setting needed - basic scaling allows up to 24 hours
```

For App Engine Flexible, you can configure the timeout in the health check and network settings:

```yaml
# app.yaml - App Engine Flex with custom timeout
runtime: custom
env: flex

# Network timeout configuration
network:
  session_affinity: false

# Health checks with appropriate timeouts
readiness_check:
  path: "/_ah/ready"
  check_interval_sec: 5
  timeout_sec: 4
  failure_threshold: 2
  success_threshold: 2
  app_start_timeout_sec: 300

# The request timeout is controlled at the application level
env_variables:
  REQUEST_TIMEOUT: "3600"  # 60 minutes in seconds
```

## Handling Timeouts in Your Application

Even when App Engine allows long-running requests, your application framework has its own timeout settings. Configure these to match:

For Python with Gunicorn:

```python
# gunicorn.conf.py - Increase worker timeout for long requests
# This is used in App Engine Flex with custom runtime
timeout = 3600  # 60 minutes
graceful_timeout = 30
keep_alive = 5
workers = 2
threads = 4
```

For Node.js with Express:

```javascript
// server.js - Configure server timeout for long-running requests
const express = require("express");
const app = express();

const server = app.listen(process.env.PORT || 8080, () => {
  console.log("Server started");
});

// Increase the server timeout (default is 2 minutes in Node.js)
server.timeout = 600000; // 10 minutes in milliseconds

// For specific routes that need longer timeouts
app.post("/api/generate-report", (req, res) => {
  // Increase timeout for this specific response
  req.setTimeout(600000);
  res.setTimeout(600000);

  // ... long-running processing
});
```

## Strategy 1: Background Processing with Cloud Tasks

The most common solution for long-running operations is to move them to background tasks. Instead of processing synchronously in the request handler, enqueue a task and return immediately:

```python
# api.py - Offload long work to a background task
from google.cloud import tasks_v2
from flask import Flask, jsonify
import json

app = Flask(__name__)
tasks_client = tasks_v2.CloudTasksClient()

@app.route("/api/generate-report", methods=["POST"])
def generate_report():
    """Accept the request and queue it for background processing."""
    report_params = request.get_json()

    # Create a unique report ID for tracking
    report_id = str(uuid.uuid4())

    # Save initial status to the database
    save_report_status(report_id, "queued")

    # Enqueue the actual processing work
    task = {
        "app_engine_http_request": {
            "http_method": tasks_v2.HttpMethod.POST,
            "relative_uri": "/tasks/process-report",
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
                "report_id": report_id,
                "params": report_params
            }).encode(),
            "app_engine_routing": {
                "service": "worker"  # Route to a worker service with basic scaling
            }
        }
    }

    queue_path = tasks_client.queue_path("project-id", "us-central1", "reports")
    tasks_client.create_task(request={"parent": queue_path, "task": task})

    # Return immediately with the report ID
    return jsonify({
        "report_id": report_id,
        "status": "queued",
        "status_url": f"/api/reports/{report_id}/status"
    }), 202

@app.route("/api/reports/<report_id>/status")
def check_report_status(report_id):
    """Check if the report is ready."""
    status = get_report_status(report_id)
    return jsonify(status)
```

The worker service uses basic scaling so it can process tasks for up to 24 hours:

```yaml
# worker/app.yaml - Worker service with extended timeout
runtime: python312
service: worker

basic_scaling:
  max_instances: 3
  idle_timeout: 15m
```

## Strategy 2: Streaming Responses

For endpoints that aggregate data, streaming the response keeps the connection alive and avoids timeouts:

```python
# Streaming response to avoid timeout
from flask import Response, stream_with_context

@app.route("/api/export-data")
def export_data():
    """Stream large dataset as CSV to avoid timeout."""
    def generate():
        # Write CSV header
        yield "id,name,email,created_at\n"

        # Process in chunks to keep the response flowing
        offset = 0
        batch_size = 1000
        while True:
            rows = fetch_batch(offset, batch_size)
            if not rows:
                break

            for row in rows:
                yield f"{row.id},{row.name},{row.email},{row.created_at}\n"

            offset += batch_size

    return Response(
        stream_with_context(generate()),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=export.csv"}
    )
```

Streaming keeps the connection active as long as data is being sent. Each chunk resets the idle timeout, so even a 10-minute overall process works on Standard automatic scaling as long as data keeps flowing.

## Strategy 3: Chunked Processing

Break long operations into smaller chunks and process them across multiple requests:

```python
# Chunked processing with state tracking
@app.route("/api/process-batch", methods=["POST"])
def process_batch():
    """Process a chunk of work, then queue the next chunk."""
    data = request.get_json()
    batch_id = data["batch_id"]
    offset = data.get("offset", 0)
    chunk_size = data.get("chunk_size", 100)

    # Process this chunk (should complete well within timeout)
    items = get_items(batch_id, offset, chunk_size)
    results = process_items(items)
    save_results(batch_id, results)

    # Check if there is more work to do
    total_items = get_total_count(batch_id)
    next_offset = offset + chunk_size

    if next_offset < total_items:
        # Queue the next chunk
        enqueue_task("/api/process-batch", {
            "batch_id": batch_id,
            "offset": next_offset,
            "chunk_size": chunk_size
        })
        return jsonify({
            "status": "processing",
            "progress": f"{next_offset}/{total_items}"
        })
    else:
        # All chunks processed
        mark_batch_complete(batch_id)
        return jsonify({"status": "complete"})
```

## Strategy 4: Using DeadlineExceededError

In App Engine Standard, you can catch the timeout before it kills your request:

```python
# Catch timeout and save partial progress
from google.appengine.runtime import DeadlineExceededError

@app.route("/api/long-process", methods=["POST"])
def long_process():
    """Process as much as possible within the timeout."""
    items = get_pending_items()
    processed = 0

    try:
        for item in items:
            process_item(item)
            mark_item_complete(item.id)
            processed += 1
    except DeadlineExceededError:
        # App Engine is about to kill this request
        # Save progress and return what we have
        return jsonify({
            "status": "partial",
            "processed": processed,
            "remaining": len(items) - processed
        }), 200

    return jsonify({
        "status": "complete",
        "processed": processed
    })
```

Note that `DeadlineExceededError` is raised a few seconds before the actual deadline, giving you time to save state and return a response.

## Client-Side Timeout Handling

Whatever strategy you use on the server, make sure your clients handle timeouts gracefully:

```python
# Client-side timeout handling
import requests
from requests.exceptions import Timeout, ConnectionError

def call_long_api(params):
    """Call the API with appropriate timeout and retry logic."""
    try:
        response = requests.post(
            "https://your-app.appspot.com/api/generate-report",
            json=params,
            timeout=30  # Client timeout - shorter than server timeout
        )
        return response.json()
    except Timeout:
        # The server is still processing - check status later
        print("Request timed out, checking status...")
        return {"status": "pending"}
    except ConnectionError:
        print("Connection lost, will retry")
        return None
```

## Summary

App Engine Standard with automatic scaling gives you a 10-minute request timeout, while basic/manual scaling extends that to 24 hours. App Engine Flex allows up to 60 minutes. For most long-running operations, the best approach is not to increase the timeout but to restructure the work. Move heavy processing to background tasks with Cloud Tasks, use streaming responses for data exports, or break large jobs into chunks. These patterns work within the timeout limits while providing a better user experience since clients do not have to wait for a response.
