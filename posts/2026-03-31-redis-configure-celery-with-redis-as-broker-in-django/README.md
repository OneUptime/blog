# How to Configure Celery with Redis as Broker in Django

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Django, Celery, Task Queue, Python

Description: Set up Celery with Redis as the message broker and result backend in a Django project to run background tasks asynchronously.

---

## Introduction

Celery is a distributed task queue that lets Django offload time-consuming work to background workers. Redis serves as both the message broker (where tasks are queued) and the result backend (where task results are stored). This guide covers the complete setup from installation to running your first background task.

## Installation

```bash
pip install celery redis
```

## Project Structure

```text
myproject/
  myproject/
    __init__.py
    celery.py
    settings.py
  myapp/
    tasks.py
```

## Celery Application Setup

Create `myproject/celery.py`:

```python
import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "myproject.settings")

app = Celery("myproject")

# Load config from Django settings, using CELERY_ prefix
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks in all installed apps
app.autodiscover_tasks()
```

Update `myproject/__init__.py` to load Celery at Django startup:

```python
from .celery import app as celery_app

__all__ = ("celery_app",)
```

## Django Settings

```python
# Redis broker URL
CELERY_BROKER_URL = "redis://127.0.0.1:6379/0"

# Redis result backend
CELERY_RESULT_BACKEND = "redis://127.0.0.1:6379/0"

# Optional but recommended settings
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "UTC"

# Result expiry (24 hours)
CELERY_RESULT_EXPIRES = 86400
```

## Defining Tasks

In `myapp/tasks.py`:

```python
from celery import shared_task
from django.core.mail import send_mail
import time

@shared_task
def send_welcome_email(user_id):
    from .models import User
    user = User.objects.get(pk=user_id)
    send_mail(
        subject="Welcome!",
        message=f"Hi {user.first_name}, welcome to our platform.",
        from_email="noreply@example.com",
        recipient_list=[user.email],
    )
    return f"Email sent to {user.email}"

@shared_task
def process_report(report_id):
    # Simulate long-running task
    time.sleep(5)
    return f"Report {report_id} processed"
```

## Calling Tasks from Views

```python
from django.http import JsonResponse
from .tasks import send_welcome_email, process_report

def register_user(request):
    # ... create the user ...
    user_id = 42

    # Queue the email task asynchronously
    send_welcome_email.delay(user_id)

    return JsonResponse({"status": "registered"})

def trigger_report(request, report_id):
    task = process_report.delay(report_id)
    return JsonResponse({"task_id": task.id})
```

## Checking Task Status

```python
from celery.result import AsyncResult
from django.http import JsonResponse

def task_status(request, task_id):
    result = AsyncResult(task_id)
    return JsonResponse({
        "task_id": task_id,
        "status": result.status,
        "result": result.result if result.ready() else None,
    })
```

## Running the Celery Worker

```bash
# Start a worker with 4 concurrency processes
celery -A myproject worker --loglevel=info --concurrency=4

# Start the worker in the background
celery -A myproject worker --loglevel=info --detach
```

## Configuring Task Routing

Route different tasks to different queues:

```python
CELERY_TASK_ROUTES = {
    "myapp.tasks.send_welcome_email": {"queue": "emails"},
    "myapp.tasks.process_report": {"queue": "reports"},
}
```

```bash
# Start workers for specific queues
celery -A myproject worker -Q emails --concurrency=2
celery -A myproject worker -Q reports --concurrency=1
```

## Summary

Configuring Celery with Redis in Django requires creating a `celery.py` application file, setting `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND` to your Redis instance, and decorating task functions with `@shared_task`. Workers pick up tasks from Redis, execute them, and store results back in Redis. This setup enables Django to offload email sending, report generation, and other long-running operations without blocking web requests.
