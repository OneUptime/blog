# How to Migrate from App Engine Task Queues to Cloud Tasks for Push Queue Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, App Engine, Cloud Tasks, Task Queues, Migration

Description: Step-by-step guide to migrating from the deprecated App Engine Task Queue API to Cloud Tasks for reliable push queue processing in your applications.

---

The App Engine Task Queue API was one of the original bundled services that came with App Engine. It provided push queues for asynchronous processing and pull queues for batch work. Google deprecated these bundled services as part of the push toward standalone GCP products, and Cloud Tasks is the direct replacement for push queues.

If your App Engine application uses the Task Queue API for push queues, this guide walks through the migration to Cloud Tasks with code examples and configuration changes.

## What Changes and What Stays the Same

The core concept is identical: you enqueue a task, and it gets delivered as an HTTP request to a handler in your application. What changes is the API you use to create tasks and how you configure queues.

Things that stay the same:
- Tasks are delivered as HTTP requests to your application
- You can set delays, retries, and rate limits
- Task handlers run in your App Engine service
- At-least-once delivery semantics

Things that change:
- Queue configuration moves from `queue.yaml` to the Cloud Tasks API
- Task creation uses the Cloud Tasks client library instead of the bundled API
- Queue management is done through gcloud CLI or the API
- Task routing configuration syntax is different

## Step 1: Enable the Cloud Tasks API

```bash
# Enable Cloud Tasks API
gcloud services enable cloudtasks.googleapis.com --project=your-project-id
```

## Step 2: Create Cloud Tasks Queues

In the old system, queues were defined in `queue.yaml`. With Cloud Tasks, you create queues using the gcloud CLI or API.

Here is what the old `queue.yaml` might look like:

```yaml
# OLD - queue.yaml (deprecated)
queue:
  - name: email-queue
    rate: 10/s
    retry_parameters:
      task_retry_limit: 5
      min_backoff_seconds: 10
      max_backoff_seconds: 300
      max_doublings: 5

  - name: export-queue
    rate: 1/s
    retry_parameters:
      task_retry_limit: 3
```

Create the equivalent queues with Cloud Tasks:

```bash
# Create the email queue
gcloud tasks queues create email-queue \
  --location=us-central1 \
  --max-dispatches-per-second=10 \
  --max-concurrent-dispatches=100 \
  --max-attempts=5 \
  --min-backoff=10s \
  --max-backoff=300s \
  --max-doublings=5 \
  --project=your-project-id

# Create the export queue with lower throughput
gcloud tasks queues create export-queue \
  --location=us-central1 \
  --max-dispatches-per-second=1 \
  --max-concurrent-dispatches=10 \
  --max-attempts=3 \
  --project=your-project-id
```

The location should match your App Engine region. You can check your region with:

```bash
# Find your App Engine region
gcloud app describe --project=your-project-id --format="value(locationId)"
```

## Step 3: Update Task Creation Code - Python

Install the Cloud Tasks client library:

```
# requirements.txt
google-cloud-tasks==2.15.0
```

Here is the old task creation code using the bundled API:

```python
# OLD CODE - Using App Engine Task Queue API (deprecated)
from google.appengine.api import taskqueue

def send_welcome_email(user_id, email):
    taskqueue.add(
        url="/tasks/send-email",
        queue_name="email-queue",
        params={
            "user_id": user_id,
            "email": email,
            "template": "welcome"
        },
        countdown=60  # Delay 60 seconds
    )
```

And here is the new version using Cloud Tasks:

```python
# NEW CODE - Using Cloud Tasks API
from google.cloud import tasks_v2
import json

# Create a reusable client
tasks_client = tasks_v2.CloudTasksClient()

# Build the queue path once
PROJECT = "your-project-id"
LOCATION = "us-central1"

def get_queue_path(queue_name):
    """Build the full queue resource path."""
    return tasks_client.queue_path(PROJECT, LOCATION, queue_name)

def send_welcome_email(user_id, email):
    """Enqueue an email sending task."""
    # Build the task payload
    payload = json.dumps({
        "user_id": user_id,
        "email": email,
        "template": "welcome"
    })

    # Create the task configuration
    task = {
        "app_engine_http_request": {
            "http_method": tasks_v2.HttpMethod.POST,
            "relative_uri": "/tasks/send-email",
            "headers": {
                "Content-Type": "application/json"
            },
            "body": payload.encode()
        },
        # Schedule 60 seconds from now
        "schedule_time": {
            "seconds": int(time.time()) + 60
        }
    }

    # Create the task in the queue
    response = tasks_client.create_task(
        request={
            "parent": get_queue_path("email-queue"),
            "task": task
        }
    )
    return response.name
```

## Step 4: Update Task Creation Code - Node.js

```javascript
// OLD CODE - Using App Engine Task Queue (deprecated)
const { TaskQueue } = require("appengine-api");
const queue = new TaskQueue("email-queue");
await queue.add({
  url: "/tasks/send-email",
  params: { user_id: userId, email: email },
  countdownMillis: 60000
});
```

```javascript
// NEW CODE - Using Cloud Tasks API
const { CloudTasksClient } = require("@google-cloud/tasks");

const client = new CloudTasksClient();
const PROJECT = "your-project-id";
const LOCATION = "us-central1";

async function enqueueEmail(userId, email) {
  const parent = client.queuePath(PROJECT, LOCATION, "email-queue");

  // Build the task payload
  const payload = JSON.stringify({
    user_id: userId,
    email: email,
    template: "welcome"
  });

  // Create the task
  const task = {
    appEngineHttpRequest: {
      httpMethod: "POST",
      relativeUri: "/tasks/send-email",
      headers: { "Content-Type": "application/json" },
      body: Buffer.from(payload).toString("base64"),
    },
    // Schedule 60 seconds from now
    scheduleTime: {
      seconds: Math.floor(Date.now() / 1000) + 60,
    },
  };

  const [response] = await client.createTask({ parent, task });
  console.log(`Task created: ${response.name}`);
  return response.name;
}
```

## Step 5: Update Task Handlers

The task handler code usually does not need significant changes. Cloud Tasks delivers the task as an HTTP POST request, just like the old Task Queue. However, the request headers are different:

```python
# Task handler - works with both old and new task systems
@app.route("/tasks/send-email", methods=["POST"])
def handle_send_email():
    # Cloud Tasks sends these headers
    task_name = request.headers.get("X-CloudTasks-TaskName", "unknown")
    queue_name = request.headers.get("X-CloudTasks-QueueName", "unknown")
    retry_count = int(request.headers.get("X-CloudTasks-TaskRetryCount", "0"))

    # Parse the task payload
    data = request.get_json()
    user_id = data["user_id"]
    email = data["email"]
    template = data["template"]

    try:
        # Process the task
        send_email(email, template, user_id=user_id)
        return "OK", 200
    except Exception as e:
        logging.error(f"Task {task_name} failed (retry {retry_count}): {e}")
        # Return 500 to trigger a retry
        return "Failed", 500
```

The key header changes:
- Old: `X-AppEngine-TaskName` becomes `X-CloudTasks-TaskName`
- Old: `X-AppEngine-QueueName` becomes `X-CloudTasks-QueueName`
- Old: `X-AppEngine-TaskRetryCount` becomes `X-CloudTasks-TaskRetryCount`

## Step 6: Route Tasks to Specific Services

If you are running multiple App Engine services, specify which service should handle the task:

```python
# Route task to a specific App Engine service
task = {
    "app_engine_http_request": {
        "http_method": tasks_v2.HttpMethod.POST,
        "relative_uri": "/tasks/process-export",
        "app_engine_routing": {
            "service": "worker",      # Target service
            "version": "v2",          # Optional: specific version
        },
        "body": payload.encode()
    }
}
```

## Step 7: Secure Task Handlers

Cloud Tasks requests come from Google's infrastructure. Verify that task handlers only accept requests from Cloud Tasks:

```python
# Middleware to verify Cloud Tasks requests
def require_cloud_tasks(f):
    """Decorator to ensure requests come from Cloud Tasks."""
    from functools import wraps

    @wraps(f)
    def decorated(*args, **kwargs):
        # Cloud Tasks sets this header - it cannot be spoofed from external requests
        task_name = request.headers.get("X-CloudTasks-TaskName")
        if not task_name:
            # Check for App Engine cron header as well
            if not request.headers.get("X-Appengine-Cron"):
                return "Forbidden", 403
        return f(*args, **kwargs)

    return decorated

@app.route("/tasks/send-email", methods=["POST"])
@require_cloud_tasks
def handle_send_email():
    # Only Cloud Tasks can reach this handler
    data = request.get_json()
    # ... process task
```

## Managing Queues

Monitor and manage your queues with gcloud:

```bash
# List all queues
gcloud tasks queues list --location=us-central1

# View queue details
gcloud tasks queues describe email-queue --location=us-central1

# Pause a queue (tasks stop being dispatched)
gcloud tasks queues pause email-queue --location=us-central1

# Resume a paused queue
gcloud tasks queues resume email-queue --location=us-central1

# Purge all tasks from a queue
gcloud tasks queues purge email-queue --location=us-central1

# List tasks in a queue
gcloud tasks list --queue=email-queue --location=us-central1
```

## Migration Strategy

For a smooth migration, consider this phased approach:

1. Create Cloud Tasks queues that mirror your existing queue.yaml queues
2. Update your task creation code to use Cloud Tasks, but keep the old code behind a feature flag
3. Deploy and test with the new queues
4. Once verified, remove the old Task Queue code
5. Delete the queue.yaml file

You can run both systems in parallel during the transition period. Tasks created with the old API still get delivered to the same handlers as tasks created with Cloud Tasks.

## Summary

Migrating from App Engine Task Queues to Cloud Tasks is a manageable effort. The queue configuration moves from `queue.yaml` to gcloud commands, and the task creation code switches from the bundled API to the Cloud Tasks client library. Task handlers need minimal changes - mainly updating the header names you check. The behavior and delivery guarantees remain the same. Plan for a day or two of development plus testing time for a typical application.
