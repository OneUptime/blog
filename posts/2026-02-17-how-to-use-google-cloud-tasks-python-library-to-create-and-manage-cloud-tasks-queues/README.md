# How to Use the google-cloud-tasks Python Library to Create and Manage Cloud Tasks Queues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Tasks, Python, Task Queues, Serverless

Description: Learn how to create and manage Cloud Tasks queues using the google-cloud-tasks Python library for reliable task scheduling and execution on GCP.

---

Cloud Tasks is Google Cloud's managed task queue service. It lets you offload work from your main application by adding tasks to a queue, and Cloud Tasks handles dispatching those tasks to your worker service with guaranteed delivery, rate limiting, and retry logic. I find it especially useful for things like sending notifications after an order, processing uploaded files, or making third-party API calls that might be slow or unreliable.

## How Cloud Tasks Differs from Pub/Sub

Both Cloud Tasks and Pub/Sub handle asynchronous processing, but they serve different purposes. Cloud Tasks is for task execution - you create a task that targets a specific HTTP endpoint, and Cloud Tasks makes sure that endpoint gets called. Pub/Sub is for event distribution - you publish an event, and multiple subscribers can react to it independently. Use Cloud Tasks when you need explicit rate limiting, scheduled execution, or exactly-once delivery to a specific handler.

## Installation

Install the Cloud Tasks client library.

```bash
# Install the Cloud Tasks Python client
pip install google-cloud-tasks
```

## Creating a Queue

Before creating tasks, you need a queue. You can create queues programmatically or through the console.

```python
from google.cloud import tasks_v2

def create_queue(project_id, location, queue_id):
    """Create a new Cloud Tasks queue with custom settings."""
    client = tasks_v2.CloudTasksClient()

    # Build the parent resource path
    parent = client.common_location_path(project_id, location)

    # Configure the queue with rate limiting and retry policies
    queue = tasks_v2.Queue(
        name=client.queue_path(project_id, location, queue_id),
        rate_limits=tasks_v2.RateLimits(
            max_dispatches_per_second=100,  # Max tasks dispatched per second
            max_concurrent_dispatches=10,   # Max tasks running simultaneously
        ),
        retry_config=tasks_v2.RetryConfig(
            max_attempts=5,                           # Retry up to 5 times
            min_backoff={"seconds": 10},              # Wait 10s before first retry
            max_backoff={"seconds": 300},              # Max wait of 5 minutes
            max_doublings=4,                           # Double backoff 4 times
        ),
    )

    try:
        response = client.create_queue(parent=parent, queue=queue)
        print(f"Created queue: {response.name}")
        return response
    except Exception as e:
        print(f"Error creating queue: {e}")
        raise

# Create the queue
create_queue("my-gcp-project", "us-central1", "email-queue")
```

## Creating HTTP Tasks

The most common type of task is an HTTP task that calls a URL when executed.

```python
from google.cloud import tasks_v2
import json

def create_http_task(project_id, location, queue_id, url, payload, task_id=None):
    """Create an HTTP task in the specified queue."""
    client = tasks_v2.CloudTasksClient()

    # Build the queue path
    parent = client.queue_path(project_id, location, queue_id)

    # Build the task configuration
    task = tasks_v2.Task(
        http_request=tasks_v2.HttpRequest(
            http_method=tasks_v2.HttpMethod.POST,
            url=url,
            headers={"Content-Type": "application/json"},
            body=json.dumps(payload).encode("utf-8"),
        ),
    )

    # Optionally set a specific task ID for deduplication
    if task_id:
        task.name = client.task_path(project_id, location, queue_id, task_id)

    # Create the task
    response = client.create_task(parent=parent, task=task)
    print(f"Created task: {response.name}")
    return response

# Create a task to send an email
create_http_task(
    project_id="my-gcp-project",
    location="us-central1",
    queue_id="email-queue",
    url="https://my-service-abc123.run.app/send-email",
    payload={
        "to": "user@example.com",
        "subject": "Order Confirmation",
        "order_id": "ORD-12345",
    },
)
```

## Scheduling Tasks for Later

One of Cloud Tasks' strengths is scheduling tasks to run at a specific time.

```python
from google.cloud import tasks_v2
from google.protobuf import timestamp_pb2
import json
import datetime

def create_scheduled_task(project_id, location, queue_id, url, payload, schedule_time):
    """Create a task that will execute at a specified time."""
    client = tasks_v2.CloudTasksClient()
    parent = client.queue_path(project_id, location, queue_id)

    # Convert the schedule time to a protobuf timestamp
    timestamp = timestamp_pb2.Timestamp()
    timestamp.FromDatetime(schedule_time)

    task = tasks_v2.Task(
        http_request=tasks_v2.HttpRequest(
            http_method=tasks_v2.HttpMethod.POST,
            url=url,
            headers={"Content-Type": "application/json"},
            body=json.dumps(payload).encode("utf-8"),
        ),
        schedule_time=timestamp,  # Task will not execute before this time
    )

    response = client.create_task(parent=parent, task=task)
    print(f"Scheduled task for {schedule_time}: {response.name}")
    return response

# Schedule a reminder email for tomorrow at 9 AM
tomorrow_9am = datetime.datetime.now(tz=datetime.timezone.utc) + datetime.timedelta(days=1)
tomorrow_9am = tomorrow_9am.replace(hour=9, minute=0, second=0, microsecond=0)

create_scheduled_task(
    project_id="my-gcp-project",
    location="us-central1",
    queue_id="email-queue",
    url="https://my-service.run.app/send-reminder",
    payload={"user_id": "user-123", "reminder": "Complete your profile"},
    schedule_time=tomorrow_9am,
)
```

## Tasks with OIDC Authentication

When your task target is a Cloud Run service that requires authentication, include OIDC tokens.

```python
from google.cloud import tasks_v2
import json

def create_authenticated_task(project_id, location, queue_id, url, payload, service_account_email):
    """Create a task with OIDC authentication for protected endpoints."""
    client = tasks_v2.CloudTasksClient()
    parent = client.queue_path(project_id, location, queue_id)

    task = tasks_v2.Task(
        http_request=tasks_v2.HttpRequest(
            http_method=tasks_v2.HttpMethod.POST,
            url=url,
            headers={"Content-Type": "application/json"},
            body=json.dumps(payload).encode("utf-8"),
            # Include OIDC token for authenticated Cloud Run services
            oidc_token=tasks_v2.OidcToken(
                service_account_email=service_account_email,
                audience=url,
            ),
        ),
    )

    response = client.create_task(parent=parent, task=task)
    print(f"Created authenticated task: {response.name}")
    return response

# Create a task targeting a private Cloud Run service
create_authenticated_task(
    project_id="my-gcp-project",
    location="us-central1",
    queue_id="processing-queue",
    url="https://my-private-service.run.app/process",
    payload={"job_id": "job-789", "action": "process_report"},
    service_account_email="task-invoker@my-gcp-project.iam.gserviceaccount.com",
)
```

## Managing Queues

You can pause, resume, purge, and update queues programmatically.

```python
from google.cloud import tasks_v2

client = tasks_v2.CloudTasksClient()

def pause_queue(project_id, location, queue_id):
    """Pause a queue - tasks remain but stop being dispatched."""
    queue_path = client.queue_path(project_id, location, queue_id)
    response = client.pause_queue(name=queue_path)
    print(f"Queue paused: {response.name} (state: {response.state.name})")

def resume_queue(project_id, location, queue_id):
    """Resume a paused queue."""
    queue_path = client.queue_path(project_id, location, queue_id)
    response = client.resume_queue(name=queue_path)
    print(f"Queue resumed: {response.name} (state: {response.state.name})")

def purge_queue(project_id, location, queue_id):
    """Delete all tasks from a queue."""
    queue_path = client.queue_path(project_id, location, queue_id)
    response = client.purge_queue(name=queue_path)
    print(f"Queue purged: {response.name}")

def list_queues(project_id, location):
    """List all queues in a location."""
    parent = client.common_location_path(project_id, location)
    queues = client.list_queues(parent=parent)

    for queue in queues:
        print(f"Queue: {queue.name}")
        print(f"  State: {queue.state.name}")
        print(f"  Rate: {queue.rate_limits.max_dispatches_per_second}/s")
        print(f"  Max retries: {queue.retry_config.max_attempts}")
        print()

# Usage examples
list_queues("my-gcp-project", "us-central1")
pause_queue("my-gcp-project", "us-central1", "email-queue")
resume_queue("my-gcp-project", "us-central1", "email-queue")
```

## Building the Task Handler

Your task handler is a regular HTTP endpoint that receives the task payload.

```python
# handler.py - Cloud Run service that handles tasks
from fastapi import FastAPI, Request, HTTPException
import logging

app = FastAPI()
logger = logging.getLogger(__name__)

@app.post("/send-email")
async def handle_send_email(request: Request):
    """Handle email sending tasks from Cloud Tasks."""
    payload = await request.json()

    to = payload.get("to")
    subject = payload.get("subject")
    order_id = payload.get("order_id")

    logger.info(f"Sending email to {to}: {subject}")

    try:
        # Your email sending logic here
        send_email(to, subject, f"Order {order_id} confirmed!")
        return {"status": "sent"}
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        # Return 500 to trigger a retry
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process")
async def handle_process(request: Request):
    """Handle processing tasks from Cloud Tasks."""
    # Verify the request comes from Cloud Tasks (optional but recommended)
    task_name = request.headers.get("X-CloudTasks-TaskName", "unknown")
    retry_count = request.headers.get("X-CloudTasks-TaskRetryCount", "0")

    logger.info(f"Processing task {task_name} (retry {retry_count})")

    payload = await request.json()
    # Process the task...

    return {"status": "processed"}
```

## Monitoring Cloud Tasks

Task queue health is critical for asynchronous workflows. If tasks are failing or backing up, downstream processes stall. OneUptime (https://oneuptime.com) can monitor your task handler endpoints and alert you when tasks start failing, helping you catch queue processing issues before they affect your users.

## Summary

Cloud Tasks gives you reliable, managed task queuing with features that matter in production: rate limiting, retry policies, scheduled execution, and authentication. The Python client library makes it straightforward to create queues, add tasks, and manage queue lifecycle. Start with simple HTTP tasks, add scheduling when you need delayed execution, and use OIDC tokens for authenticated endpoints. The combination of Cloud Tasks with Cloud Run services gives you a robust background processing system with minimal operational overhead.
