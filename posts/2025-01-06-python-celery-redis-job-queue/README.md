# How to Build a Job Queue in Python with Celery and Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Celery, Redis, Job Queue, Background Tasks, Async, Reliability

Description: Learn how to build a robust job queue in Python using Celery and Redis. This guide covers delayed jobs, retries, dead letter queues, and production best practices for reliable background processing.

---

> Background jobs are essential for any production application. Email sending, report generation, data processing - these should all happen asynchronously. Celery with Redis provides a battle-tested solution for reliable job processing in Python.

Celery handles the complexity of distributed task execution, while Redis provides fast, reliable message brokering. Together, they form the backbone of many production systems.

---

## Getting Started

### Installation

```bash
pip install celery[redis] redis
```

### Basic Configuration

Create the Celery application with Redis as both the message broker and result backend. The configuration below optimizes for reliability in production:

```python
# celery_app.py
from celery import Celery
import os

# Create Celery app with Redis broker and backend
app = Celery(
    'myapp',  # App name for identification
    broker=os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0'),    # Message queue
    backend=os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0'), # Result storage
    include=['tasks']  # Auto-discover tasks from these modules
)

# Configuration for production reliability
app.conf.update(
    # Serialization settings - JSON for security (no pickle)
    task_serializer='json',
    accept_content=['json'],    # Only accept JSON to prevent code injection
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,

    # Reliability settings
    task_acks_late=True,              # Acknowledge after task completes (not before)
    task_reject_on_worker_lost=True,  # Requeue task if worker crashes
    worker_prefetch_multiplier=1,     # Fetch one task at a time for fair distribution

    # Result backend settings
    result_expires=3600,  # Clean up results after 1 hour to save memory
)
```

### Basic Tasks

Define tasks using the @app.task decorator. Tasks can be called asynchronously with .delay() or apply_async():

```python
# tasks.py
from celery_app import app
import time

@app.task
def add(x, y):
    """Simple synchronous task - result is stored in backend"""
    return x + y

@app.task
def send_email(to: str, subject: str, body: str):
    """Send an email asynchronously - offload from web request"""
    # Email sending logic would go here
    print(f"Sending email to {to}: {subject}")
    time.sleep(2)  # Simulate SMTP communication
    return {"status": "sent", "to": to}

@app.task
def process_upload(file_path: str, user_id: str):
    """Process an uploaded file in background"""
    print(f"Processing {file_path} for user {user_id}")
    # Heavy processing logic (resize images, parse CSV, etc.)
    return {"processed": True, "path": file_path}

# Usage examples:
# .delay() is shorthand for .apply_async()
# result = add.delay(4, 4)                    # Returns AsyncResult
# result = send_email.delay("user@example.com", "Hello", "World")
# result.get(timeout=10)                      # Wait for result (blocking)
```

---

## Delayed and Scheduled Tasks

### Countdown and ETA

```python
from datetime import datetime, timedelta
from celery_app import app

@app.task
def send_reminder(user_id: str, message: str):
    """Send a reminder to a user"""
    print(f"Reminder for {user_id}: {message}")
    return {"sent": True}

# Execute in 60 seconds
send_reminder.apply_async(
    args=['user123', 'Your trial expires tomorrow'],
    countdown=60
)

# Execute at specific time
eta = datetime.utcnow() + timedelta(hours=1)
send_reminder.apply_async(
    args=['user123', 'Meeting in 1 hour'],
    eta=eta
)
```

### Periodic Tasks with Celery Beat

```python
# celery_app.py
from celery.schedules import crontab

app.conf.beat_schedule = {
    # Run every 10 minutes
    'cleanup-expired-sessions': {
        'task': 'tasks.cleanup_expired_sessions',
        'schedule': 600.0,  # Every 10 minutes
    },

    # Run daily at midnight UTC
    'generate-daily-report': {
        'task': 'tasks.generate_daily_report',
        'schedule': crontab(hour=0, minute=0),
    },

    # Run every Monday at 9 AM
    'send-weekly-digest': {
        'task': 'tasks.send_weekly_digest',
        'schedule': crontab(hour=9, minute=0, day_of_week=1),
    },

    # Run every hour on weekdays
    'sync-external-data': {
        'task': 'tasks.sync_external_data',
        'schedule': crontab(minute=0, hour='9-17', day_of_week='mon-fri'),
    },
}

# tasks.py
@app.task
def cleanup_expired_sessions():
    """Clean up expired sessions"""
    deleted = delete_expired_sessions()
    return {"deleted_count": deleted}

@app.task
def generate_daily_report():
    """Generate daily report"""
    report = create_report()
    return {"report_id": report.id}
```

Run Celery Beat:
```bash
celery -A celery_app beat --loglevel=info
```

---

## Retry Logic

### Basic Retries

Use bind=True to access the task instance (self), which provides retry capabilities. This pattern handles transient failures gracefully:

```python
from celery_app import app
from celery.exceptions import Retry
import requests

@app.task(
    bind=True,              # Gives access to self.retry()
    max_retries=5,          # Maximum retry attempts
    default_retry_delay=60  # Wait 60 seconds between retries
)
def call_external_api(self, endpoint: str, data: dict):
    """Call external API with automatic retry on failure"""
    try:
        response = requests.post(endpoint, json=data, timeout=30)
        response.raise_for_status()  # Raises exception for 4xx/5xx
        return response.json()
    except requests.RequestException as exc:
        # self.retry() re-queues the task with the same arguments
        # exc parameter preserves the exception for logging
        raise self.retry(exc=exc)
```

### Exponential Backoff

Celery's built-in exponential backoff prevents overwhelming failing services. Each retry waits longer than the previous:

```python
@app.task(
    bind=True,
    autoretry_for=(requests.RequestException,),  # Auto-retry on these exceptions
    retry_backoff=True,           # Enable exponential backoff (2, 4, 8, 16... seconds)
    retry_backoff_max=600,        # Cap maximum wait at 10 minutes
    retry_jitter=True,            # Add randomness to prevent thundering herd
    max_retries=5                 # Give up after 5 attempts
)
def robust_api_call(self, endpoint: str, data: dict):
    """API call with automatic exponential backoff on failure"""
    # No try/except needed - autoretry_for handles it
    response = requests.post(endpoint, json=data, timeout=30)
    response.raise_for_status()
    return response.json()
```

### Custom Retry Logic

```python
@app.task(bind=True, max_retries=10)
def process_payment(self, payment_id: str):
    """Process payment with custom retry logic"""
    try:
        result = charge_customer(payment_id)
        return {"success": True, "payment_id": payment_id}

    except TransientError as exc:
        # Retry with increasing delays
        countdown = min(2 ** self.request.retries * 60, 3600)  # Max 1 hour
        raise self.retry(exc=exc, countdown=countdown)

    except PermanentError as exc:
        # Don't retry permanent failures
        return {"success": False, "error": str(exc), "payment_id": payment_id}

    except Exception as exc:
        # Log unexpected errors and retry
        logger.exception(f"Unexpected error processing payment {payment_id}")
        raise self.retry(exc=exc, countdown=60)
```

---

## Dead Letter Queue Pattern

Handle tasks that permanently fail:

```python
# tasks.py
from celery_app import app
import logging

logger = logging.getLogger(__name__)

@app.task
def dead_letter_handler(task_name: str, task_args: list, task_kwargs: dict, exception: str):
    """Handle permanently failed tasks"""
    logger.error(f"Task permanently failed: {task_name}")
    logger.error(f"Args: {task_args}, Kwargs: {task_kwargs}")
    logger.error(f"Exception: {exception}")

    # Store in database for manual review
    save_failed_task(task_name, task_args, task_kwargs, exception)

    # Send alert
    send_alert(f"Task {task_name} permanently failed: {exception}")

@app.task(
    bind=True,
    max_retries=3,
    autoretry_for=(TransientError,)
)
def process_order(self, order_id: str):
    """Process order with dead letter handling"""
    try:
        # Processing logic
        return process(order_id)

    except PermanentError as exc:
        # Send to dead letter queue
        dead_letter_handler.delay(
            task_name='process_order',
            task_args=[order_id],
            task_kwargs={},
            exception=str(exc)
        )
        return {"success": False, "error": str(exc)}
```

### Using Task Failure Signals

```python
from celery.signals import task_failure

@task_failure.connect
def handle_task_failure(sender=None, task_id=None, exception=None,
                        args=None, kwargs=None, traceback=None, einfo=None, **kw):
    """Global handler for task failures"""
    logger.error(f"Task {sender.name} failed: {exception}")

    # Check if max retries exceeded
    task = sender
    if hasattr(task, 'request') and task.request.retries >= task.max_retries:
        # Task has exhausted retries
        dead_letter_handler.delay(
            task_name=sender.name,
            task_args=list(args) if args else [],
            task_kwargs=kwargs or {},
            exception=str(exception)
        )
```

---

## Task Chaining and Workflows

### Chaining Tasks

```python
from celery import chain, group, chord

# Chain: Execute tasks sequentially
workflow = chain(
    fetch_data.s(url),
    process_data.s(),
    save_results.s()
)
result = workflow.apply_async()

# Group: Execute tasks in parallel
workflow = group(
    process_chunk.s(chunk) for chunk in chunks
)
results = workflow.apply_async()

# Chord: Parallel tasks followed by callback
workflow = chord(
    [process_chunk.s(chunk) for chunk in chunks],
    aggregate_results.s()
)
result = workflow.apply_async()
```

### Complex Workflow Example

```python
from celery import chain, group, chord

@app.task
def fetch_user_data(user_id: str):
    """Fetch user data from database"""
    return get_user(user_id)

@app.task
def fetch_order_history(user_id: str):
    """Fetch user's order history"""
    return get_orders(user_id)

@app.task
def fetch_recommendations(user_id: str):
    """Fetch product recommendations"""
    return get_recommendations(user_id)

@app.task
def compile_email_data(results: list):
    """Compile data from multiple sources"""
    user_data, orders, recommendations = results
    return {
        "user": user_data,
        "orders": orders,
        "recommendations": recommendations
    }

@app.task
def send_personalized_email(data: dict):
    """Send personalized email with compiled data"""
    send_email(data)
    return {"sent": True}

def create_email_workflow(user_id: str):
    """Create workflow for personalized email"""
    return chain(
        chord(
            [
                fetch_user_data.s(user_id),
                fetch_order_history.s(user_id),
                fetch_recommendations.s(user_id),
            ],
            compile_email_data.s()
        ),
        send_personalized_email.s()
    )

# Execute workflow
workflow = create_email_workflow('user123')
result = workflow.apply_async()
```

---

## Priority Queues

```python
# celery_app.py
from kombu import Queue

app.conf.task_queues = (
    Queue('high', routing_key='high'),
    Queue('default', routing_key='default'),
    Queue('low', routing_key='low'),
)

app.conf.task_default_queue = 'default'
app.conf.task_default_routing_key = 'default'

# Route specific tasks to queues
app.conf.task_routes = {
    'tasks.send_urgent_notification': {'queue': 'high'},
    'tasks.generate_report': {'queue': 'low'},
}

# tasks.py
@app.task(queue='high')
def send_urgent_notification(user_id: str, message: str):
    """High priority notification"""
    pass

@app.task(queue='low')
def generate_report(report_type: str):
    """Low priority report generation"""
    pass

# Or specify at call time
send_email.apply_async(args=[...], queue='high')
```

Run workers for specific queues:
```bash
# High priority worker
celery -A celery_app worker -Q high --concurrency=4

# Default worker
celery -A celery_app worker -Q default --concurrency=8

# Low priority worker
celery -A celery_app worker -Q low --concurrency=2
```

---

## Rate Limiting

```python
@app.task(rate_limit='10/m')  # 10 tasks per minute
def rate_limited_api_call(data: dict):
    """Rate limited external API call"""
    return call_api(data)

@app.task(rate_limit='100/s')  # 100 tasks per second
def high_volume_task(item_id: str):
    """High volume but rate limited"""
    return process_item(item_id)

# Global rate limit for a queue
app.conf.task_annotations = {
    'tasks.call_stripe_api': {'rate_limit': '100/m'},
    'tasks.send_sms': {'rate_limit': '1/s'},
}
```

---

## Monitoring and Observability

### Flower Web UI

```bash
pip install flower
celery -A celery_app flower --port=5555
```

### Task Events

```python
from celery.signals import (
    task_prerun, task_postrun, task_success,
    task_failure, task_retry
)
import time

@task_prerun.connect
def task_prerun_handler(task_id, task, args, kwargs, **kw):
    """Called before task execution"""
    task.start_time = time.time()
    logger.info(f"Task {task.name} starting")

@task_postrun.connect
def task_postrun_handler(task_id, task, args, kwargs, retval, **kw):
    """Called after task execution"""
    duration = time.time() - task.start_time
    logger.info(f"Task {task.name} completed in {duration:.2f}s")

@task_success.connect
def task_success_handler(sender, result, **kwargs):
    """Called on task success"""
    metrics.increment(f"celery.task.{sender.name}.success")

@task_failure.connect
def task_failure_handler(sender, task_id, exception, **kwargs):
    """Called on task failure"""
    metrics.increment(f"celery.task.{sender.name}.failure")
    logger.error(f"Task {sender.name} failed: {exception}")
```

### Prometheus Metrics

```python
from prometheus_client import Counter, Histogram, Gauge

task_started = Counter('celery_task_started_total', 'Tasks started', ['task'])
task_succeeded = Counter('celery_task_succeeded_total', 'Tasks succeeded', ['task'])
task_failed = Counter('celery_task_failed_total', 'Tasks failed', ['task'])
task_duration = Histogram('celery_task_duration_seconds', 'Task duration', ['task'])
active_tasks = Gauge('celery_active_tasks', 'Active tasks', ['task'])

@task_prerun.connect
def on_task_prerun(task_id, task, **kwargs):
    task_started.labels(task=task.name).inc()
    active_tasks.labels(task=task.name).inc()

@task_postrun.connect
def on_task_postrun(task_id, task, **kwargs):
    active_tasks.labels(task=task.name).dec()

@task_success.connect
def on_task_success(sender, **kwargs):
    task_succeeded.labels(task=sender.name).inc()

@task_failure.connect
def on_task_failure(sender, **kwargs):
    task_failed.labels(task=sender.name).inc()
```

---

## Production Configuration

```python
# celery_config.py
import os

# Broker settings
broker_url = os.environ['REDIS_URL']
result_backend = os.environ['REDIS_URL']

# Task settings
task_serializer = 'json'
accept_content = ['json']
result_serializer = 'json'
timezone = 'UTC'
enable_utc = True

# Reliability
task_acks_late = True
task_reject_on_worker_lost = True
worker_prefetch_multiplier = 1

# Concurrency
worker_concurrency = int(os.getenv('CELERY_CONCURRENCY', 8))

# Memory management
worker_max_tasks_per_child = 1000
worker_max_memory_per_child = 200000  # 200MB

# Timeouts
task_soft_time_limit = 300  # 5 minutes
task_time_limit = 600       # 10 minutes

# Result backend
result_expires = 86400  # 24 hours

# Queues
task_queues = (
    Queue('high', routing_key='high'),
    Queue('default', routing_key='default'),
    Queue('low', routing_key='low'),
)
task_default_queue = 'default'
```

---

## Best Practices

1. **Use `bind=True`** for access to task instance
2. **Set `acks_late=True`** for reliability
3. **Implement idempotency** - tasks may run multiple times
4. **Use proper serialization** - JSON for safety
5. **Monitor queue depth** - detect backlogs early
6. **Set timeouts** - prevent stuck tasks

---

## Conclusion

Celery with Redis provides a robust foundation for background job processing. Key takeaways:

- **Retries with backoff** handle transient failures
- **Dead letter queues** catch permanent failures
- **Priority queues** ensure important tasks run first
- **Rate limiting** protects external services
- **Monitoring** keeps you informed

---

*Need to monitor your Celery workers? [OneUptime](https://oneuptime.com) provides comprehensive monitoring for background job systems with queue depth tracking and failure alerting.*
