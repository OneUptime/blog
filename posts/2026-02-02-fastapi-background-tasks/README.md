# How to Implement Background Tasks in FastAPI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Python, FastAPI, Background Tasks, Async, Performance

Description: Learn how to implement background tasks in FastAPI using BackgroundTasks, Celery integration, and async patterns for non-blocking operations.

---

> Background tasks let you run operations after returning a response to the client. This keeps your API responsive while handling time-consuming work like sending emails, processing files, or updating caches.

When your endpoint needs to do something slow - like sending a notification or writing to a third-party service - you don't want your users waiting. Background tasks solve this problem by deferring work until after the response is sent.

---

## When to Use Background Tasks

| Use Case | Good Fit | Why |
|----------|----------|-----|
| Sending emails/notifications | Yes | User doesn't need to wait |
| File processing | Yes | Can take seconds to minutes |
| Audit logging | Yes | Non-critical for response |
| Database writes (critical) | No | Data must be confirmed |
| Payment processing | No | Must verify completion |
| Cache warming | Yes | Background optimization |

---

## FastAPI's Built-in BackgroundTasks

FastAPI includes a simple `BackgroundTasks` class for lightweight background work. It runs tasks in the same process after the response is sent.

### Basic Usage

```python
# basic_background.py
from fastapi import FastAPI, BackgroundTasks
import time

app = FastAPI()

def send_email(email: str, message: str):
    """Simulate sending an email - this could take a few seconds"""
    time.sleep(2)  # Pretend we're talking to an SMTP server
    print(f"Email sent to {email}: {message}")

def write_log(message: str):
    """Write to an audit log"""
    with open("audit.log", "a") as f:
        f.write(f"{time.time()}: {message}\n")

@app.post("/register")
async def register_user(
    email: str,
    background_tasks: BackgroundTasks
):
    # Do the critical work first
    user_id = create_user(email)  # This is synchronous and blocking

    # Queue background tasks - these run AFTER response is sent
    background_tasks.add_task(send_email, email, "Welcome to our service!")
    background_tasks.add_task(write_log, f"User {user_id} registered")

    # Return immediately - user doesn't wait for email
    return {"user_id": user_id, "status": "registered"}

def create_user(email: str) -> int:
    """Create user in database"""
    return 12345
```

### Multiple Tasks with Dependencies

```python
# chained_tasks.py
from fastapi import FastAPI, BackgroundTasks
from typing import List

app = FastAPI()

def process_image(image_id: str):
    """Resize and optimize uploaded image"""
    print(f"Processing image {image_id}")
    # Image processing logic here
    return f"processed_{image_id}"

def generate_thumbnails(image_id: str, sizes: List[tuple]):
    """Generate multiple thumbnail sizes"""
    for width, height in sizes:
        print(f"Generating {width}x{height} thumbnail for {image_id}")

def update_cdn(image_id: str):
    """Push processed image to CDN"""
    print(f"Pushing {image_id} to CDN")

@app.post("/upload-image")
async def upload_image(
    image_id: str,
    background_tasks: BackgroundTasks
):
    # Tasks run in the order they're added
    background_tasks.add_task(process_image, image_id)
    background_tasks.add_task(
        generate_thumbnails,
        image_id,
        [(100, 100), (300, 300), (800, 600)]
    )
    background_tasks.add_task(update_cdn, image_id)

    return {"status": "upload_received", "image_id": image_id}
```

---

## Async Background Tasks

For I/O-bound operations, use async functions to avoid blocking:

```python
# async_background.py
from fastapi import FastAPI, BackgroundTasks
import asyncio
import httpx

app = FastAPI()

async def notify_webhook(url: str, payload: dict):
    """Send async HTTP request to webhook"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, timeout=10.0)
            print(f"Webhook {url} responded with {response.status_code}")
        except httpx.TimeoutException:
            print(f"Webhook {url} timed out")

async def process_batch(items: list):
    """Process multiple items concurrently"""
    async def process_single(item):
        await asyncio.sleep(0.1)  # Simulate async I/O
        return f"processed_{item}"

    # Process all items concurrently
    results = await asyncio.gather(*[process_single(i) for i in items])
    print(f"Processed {len(results)} items")

@app.post("/batch-process")
async def batch_process(
    items: list,
    webhook_url: str,
    background_tasks: BackgroundTasks
):
    # Queue async background tasks
    background_tasks.add_task(process_batch, items)
    background_tasks.add_task(
        notify_webhook,
        webhook_url,
        {"status": "processing_started", "count": len(items)}
    )

    return {"queued": len(items)}
```

---

## Celery Integration for Heavy Workloads

For production systems with heavy background processing, use Celery. It provides distributed task execution, retries, and monitoring.

### Project Structure

```
myproject/
    app/
        __init__.py
        main.py
        celery_app.py
        tasks.py
```

### Celery Configuration

```python
# celery_app.py
from celery import Celery

# Create Celery instance with Redis as broker and backend
celery_app = Celery(
    "tasks",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/1"
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Retry configuration
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    # Rate limiting
    worker_prefetch_multiplier=1,
)
```

### Define Tasks

```python
# tasks.py
from celery_app import celery_app
import time

@celery_app.task(bind=True, max_retries=3)
def send_email_task(self, email: str, subject: str, body: str):
    """Send email with automatic retries"""
    try:
        # Your email sending logic
        print(f"Sending email to {email}")
        time.sleep(1)  # Simulate sending
        return {"status": "sent", "email": email}
    except Exception as exc:
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)

@celery_app.task(bind=True)
def process_video_task(self, video_id: str, output_format: str):
    """Long-running video processing task"""
    print(f"Processing video {video_id} to {output_format}")

    # Update task state for monitoring
    self.update_state(state="PROCESSING", meta={"progress": 0})

    for i in range(10):
        time.sleep(1)  # Simulate processing
        self.update_state(
            state="PROCESSING",
            meta={"progress": (i + 1) * 10}
        )

    return {"video_id": video_id, "format": output_format, "status": "complete"}

@celery_app.task
def cleanup_temp_files():
    """Periodic cleanup task"""
    print("Cleaning up temporary files")
    # Cleanup logic here
```

### FastAPI Integration

```python
# main.py
from fastapi import FastAPI, HTTPException
from tasks import send_email_task, process_video_task
from celery.result import AsyncResult
from celery_app import celery_app

app = FastAPI()

@app.post("/send-notification")
async def send_notification(email: str, message: str):
    """Queue email via Celery"""
    # delay() sends task to Celery worker
    task = send_email_task.delay(email, "Notification", message)

    return {
        "task_id": task.id,
        "status": "queued"
    }

@app.post("/process-video")
async def process_video(video_id: str, output_format: str = "mp4"):
    """Queue video processing"""
    task = process_video_task.delay(video_id, output_format)

    return {
        "task_id": task.id,
        "status": "processing"
    }

@app.get("/task/{task_id}")
async def get_task_status(task_id: str):
    """Check status of a Celery task"""
    result = AsyncResult(task_id, app=celery_app)

    response = {
        "task_id": task_id,
        "status": result.status,
    }

    if result.status == "PROCESSING":
        response["progress"] = result.info.get("progress", 0)
    elif result.status == "SUCCESS":
        response["result"] = result.result
    elif result.status == "FAILURE":
        response["error"] = str(result.result)

    return response
```

---

## Error Handling in Background Tasks

Background tasks fail silently by default. You need explicit error handling:

```python
# error_handling.py
from fastapi import FastAPI, BackgroundTasks
import logging
import traceback

logger = logging.getLogger(__name__)

app = FastAPI()

async def safe_background_task(func, *args, **kwargs):
    """Wrapper that catches and logs errors"""
    try:
        if asyncio.iscoroutinefunction(func):
            await func(*args, **kwargs)
        else:
            func(*args, **kwargs)
    except Exception as e:
        logger.error(
            f"Background task {func.__name__} failed: {e}\n"
            f"Args: {args}, Kwargs: {kwargs}\n"
            f"{traceback.format_exc()}"
        )
        # Optionally: send to error tracking service
        # sentry_sdk.capture_exception(e)

def risky_operation(data: dict):
    """This might fail"""
    if not data.get("required_field"):
        raise ValueError("Missing required field")
    # Process data

@app.post("/process")
async def process_data(data: dict, background_tasks: BackgroundTasks):
    # Wrap risky tasks for error handling
    background_tasks.add_task(safe_background_task, risky_operation, data)
    return {"status": "queued"}
```

### Celery Error Handling with Retries

```python
# celery_error_handling.py
from celery_app import celery_app
from celery.exceptions import MaxRetriesExceededError
import logging

logger = logging.getLogger(__name__)

@celery_app.task(
    bind=True,
    max_retries=5,
    default_retry_delay=60,  # Wait 60 seconds between retries
    autoretry_for=(ConnectionError, TimeoutError),  # Auto-retry these
    retry_backoff=True,  # Exponential backoff
    retry_backoff_max=600,  # Max 10 minutes between retries
)
def reliable_external_call(self, url: str, payload: dict):
    """Task with comprehensive retry logic"""
    try:
        response = make_api_call(url, payload)
        return response
    except ConnectionError as exc:
        logger.warning(f"Connection failed, retry {self.request.retries + 1}/5")
        raise  # autoretry_for handles this
    except ValueError as exc:
        # Don't retry validation errors - they won't fix themselves
        logger.error(f"Validation error: {exc}")
        raise  # This will mark task as FAILURE
    except Exception as exc:
        try:
            self.retry(exc=exc)
        except MaxRetriesExceededError:
            logger.error(f"Task failed after max retries: {exc}")
            # Send alert, create incident, etc.
            raise
```

---

## Monitoring Background Tasks

### Simple In-Process Monitoring

```python
# monitoring.py
from fastapi import FastAPI
from collections import defaultdict
from datetime import datetime
import threading

app = FastAPI()

# Simple task metrics
task_metrics = {
    "queued": defaultdict(int),
    "completed": defaultdict(int),
    "failed": defaultdict(int),
    "durations": defaultdict(list),
}
metrics_lock = threading.Lock()

def tracked_task(task_name: str):
    """Decorator to track task metrics"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            start = datetime.now()

            with metrics_lock:
                task_metrics["queued"][task_name] += 1

            try:
                result = func(*args, **kwargs)
                with metrics_lock:
                    task_metrics["completed"][task_name] += 1
                    duration = (datetime.now() - start).total_seconds()
                    task_metrics["durations"][task_name].append(duration)
                return result
            except Exception as e:
                with metrics_lock:
                    task_metrics["failed"][task_name] += 1
                raise
        return wrapper
    return decorator

@tracked_task("send_email")
def send_email(email: str, message: str):
    # Email logic here
    pass

@app.get("/metrics/tasks")
async def get_task_metrics():
    """Expose task metrics for monitoring"""
    with metrics_lock:
        return {
            "tasks": {
                name: {
                    "queued": task_metrics["queued"][name],
                    "completed": task_metrics["completed"][name],
                    "failed": task_metrics["failed"][name],
                    "avg_duration": (
                        sum(task_metrics["durations"][name]) /
                        len(task_metrics["durations"][name])
                        if task_metrics["durations"][name] else 0
                    )
                }
                for name in set(
                    list(task_metrics["queued"].keys()) +
                    list(task_metrics["completed"].keys())
                )
            }
        }
```

### Celery Monitoring with Flower

For Celery, use Flower for real-time monitoring:

```bash
# Install Flower
pip install flower

# Start Flower monitoring dashboard
celery -A celery_app flower --port=5555
```

---

## Comparison: BackgroundTasks vs Celery

| Feature | BackgroundTasks | Celery |
|---------|-----------------|--------|
| Setup complexity | Minimal | Requires broker (Redis/RabbitMQ) |
| Distributed workers | No | Yes |
| Task persistence | No | Yes |
| Retries | Manual | Built-in |
| Monitoring | DIY | Flower dashboard |
| Best for | Simple, fast tasks | Heavy processing, reliability |
| Survives restart | No | Yes |

**Use BackgroundTasks when:**
- Tasks complete in seconds
- Failure is acceptable
- Single server deployment
- You want simplicity

**Use Celery when:**
- Tasks take minutes or longer
- You need retries and persistence
- Multiple workers are required
- Task monitoring is critical

---

## Best Practices

1. **Keep background tasks idempotent** - They might run more than once during retries
2. **Set timeouts** - Don't let tasks run forever
3. **Log everything** - Background failures are hard to debug without logs
4. **Monitor queue depth** - Growing queues indicate workers can't keep up
5. **Use dead letter queues** - Capture permanently failed tasks for analysis

---

## Conclusion

FastAPI's `BackgroundTasks` is perfect for simple operations like sending emails or writing logs. For anything more demanding - video processing, reliable delivery, or distributed workers - Celery is the way to go.

Start with `BackgroundTasks` and migrate to Celery when you hit its limits. Both patterns keep your API responsive by deferring work that doesn't need to block the response.

---

*Need visibility into your background task performance? [OneUptime](https://oneuptime.com) monitors your APIs and helps you track task latency, failures, and queue health.*

**Related Reading:**
- [How to Implement Rate Limiting in FastAPI](https://oneuptime.com/blog/post/2025-01-06-fastapi-rate-limiting/view)
