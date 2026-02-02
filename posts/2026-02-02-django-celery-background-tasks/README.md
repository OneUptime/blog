# How to Use Celery with Django for Background Tasks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Python, Django, Celery, Background Tasks, Redis

Description: A practical guide to integrating Celery with Django for background task processing, including task definition, scheduling, monitoring, and error handling.

---

If you've ever had a Django request timeout because it was sending emails, processing images, or hitting an external API, you know the pain. Users don't want to wait, and your web server shouldn't be tied up doing heavy lifting. That's where Celery comes in.

Celery is a distributed task queue that lets you offload work to background workers. Your Django view returns instantly, and the actual work happens asynchronously. It's been the go-to solution for Python developers for years, and for good reason - it just works.

## Prerequisites

Before we dive in, make sure you have:
- Python 3.8+
- Django 4.0+
- Redis (we'll use it as our message broker)

## Installation and Initial Setup

First, install Celery and Redis support:

```bash
pip install celery redis django-celery-beat django-celery-results
```

Now let's set up the project structure. Create a `celery.py` file in your main Django project directory (next to `settings.py`):

```python
# myproject/celery.py
import os
from celery import Celery

# Set the default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')

# Create the Celery app instance
app = Celery('myproject')

# Load config from Django settings, using the CELERY_ prefix
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks in all installed apps
app.autodiscover_tasks()
```

Update your `__init__.py` to make sure Celery loads when Django starts:

```python
# myproject/__init__.py
from .celery import app as celery_app

__all__ = ('celery_app',)
```

Add these settings to your `settings.py`:

```python
# settings.py

# Celery Configuration
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'django-db'  # Store results in Django database
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

# Add to INSTALLED_APPS
INSTALLED_APPS = [
    # ... your other apps
    'django_celery_beat',
    'django_celery_results',
]
```

Run migrations to create the necessary database tables:

```bash
python manage.py migrate
```

## Defining Your First Task

Tasks live in a `tasks.py` file inside your Django app. Here's a practical example:

```python
# myapp/tasks.py
from celery import shared_task
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def send_welcome_email(self, user_id):
    """
    Send a welcome email to a newly registered user.
    Uses bind=True so we can access self for retries.
    """
    User = get_user_model()

    try:
        user = User.objects.get(pk=user_id)
        send_mail(
            subject='Welcome to Our Platform',
            message=f'Hi {user.first_name}, thanks for signing up!',
            from_email='noreply@example.com',
            recipient_list=[user.email],
        )
        logger.info(f'Welcome email sent to {user.email}')
        return {'status': 'success', 'email': user.email}

    except User.DoesNotExist:
        logger.error(f'User {user_id} not found')
        return {'status': 'error', 'message': 'User not found'}

    except Exception as exc:
        # Retry with exponential backoff
        logger.warning(f'Email failed, retrying: {exc}')
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
```

## Calling Tasks from Your Views

There are several ways to call a task. Here's how to use them:

```python
# myapp/views.py
from django.http import JsonResponse
from django.contrib.auth import get_user_model
from .tasks import send_welcome_email

def register_user(request):
    # Create the user (simplified for this example)
    User = get_user_model()
    user = User.objects.create_user(
        username=request.POST['username'],
        email=request.POST['email'],
        password=request.POST['password']
    )

    # Queue the email task - this returns immediately
    task = send_welcome_email.delay(user.id)

    return JsonResponse({
        'message': 'Registration successful',
        'task_id': task.id  # Client can use this to check status
    })
```

Here's a quick reference for the different ways to call tasks:

| Method | Description | Use Case |
|--------|-------------|----------|
| `task.delay(arg1, arg2)` | Shortcut for apply_async | Most common, simple calls |
| `task.apply_async(args=[arg1], countdown=60)` | Full control over execution | Delayed execution, custom options |
| `task.apply_async(args=[arg1], eta=datetime)` | Run at specific time | Scheduled one-off tasks |
| `task.s(arg1).apply_async()` | Create a signature | Building task chains |

## Task Options Reference

When defining tasks, you can customize their behavior:

| Option | Default | Description |
|--------|---------|-------------|
| `bind` | False | Pass task instance as first argument (enables self.retry) |
| `max_retries` | 3 | Maximum number of retry attempts |
| `default_retry_delay` | 180 | Seconds to wait before retry |
| `autoretry_for` | () | Tuple of exceptions to automatically retry |
| `rate_limit` | None | Rate limit (e.g., '10/m' for 10 per minute) |
| `time_limit` | None | Hard time limit in seconds |
| `soft_time_limit` | None | Soft time limit (raises SoftTimeLimitExceeded) |
| `ignore_result` | False | Don't store the result |

## Periodic Tasks with Celery Beat

Celery Beat handles scheduled tasks. You can configure them in code or through the Django admin.

Here's how to set them up in `settings.py`:

```python
# settings.py
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    # Run every morning at 7:30 AM
    'send-daily-digest': {
        'task': 'myapp.tasks.send_daily_digest',
        'schedule': crontab(hour=7, minute=30),
    },
    # Run every 5 minutes
    'cleanup-expired-sessions': {
        'task': 'myapp.tasks.cleanup_sessions',
        'schedule': 300.0,  # 300 seconds
    },
    # Run every Monday at midnight
    'generate-weekly-report': {
        'task': 'myapp.tasks.generate_report',
        'schedule': crontab(hour=0, minute=0, day_of_week='monday'),
        'args': ('weekly',),  # Pass arguments to the task
    },
}
```

The corresponding tasks:

```python
# myapp/tasks.py
from celery import shared_task
from django.utils import timezone

@shared_task
def send_daily_digest():
    """Send daily email digest to all subscribed users."""
    from .models import Subscriber
    from .services import EmailService

    subscribers = Subscriber.objects.filter(daily_digest=True)
    for subscriber in subscribers:
        EmailService.send_digest(subscriber)

    return f'Sent digest to {subscribers.count()} subscribers'

@shared_task
def cleanup_sessions():
    """Remove expired sessions from the database."""
    from django.contrib.sessions.models import Session

    expired = Session.objects.filter(expire_date__lt=timezone.now())
    count = expired.count()
    expired.delete()

    return f'Cleaned up {count} expired sessions'
```

## Running the Workers

Start the Celery worker in one terminal:

```bash
celery -A myproject worker --loglevel=info
```

If you're using periodic tasks, start Celery Beat in another terminal:

```bash
celery -A myproject beat --loglevel=info
```

For development, you can run both together:

```bash
celery -A myproject worker --beat --loglevel=info
```

## Monitoring and Error Handling

Checking task status from your code:

```python
# Check if a task completed
from celery.result import AsyncResult

def check_task_status(request, task_id):
    result = AsyncResult(task_id)

    response = {
        'task_id': task_id,
        'status': result.status,
        'ready': result.ready(),
    }

    if result.ready():
        # Task finished - could be success or failure
        if result.successful():
            response['result'] = result.result
        else:
            response['error'] = str(result.result)

    return JsonResponse(response)
```

For production monitoring, Flower is your friend:

```bash
pip install flower
celery -A myproject flower --port=5555
```

This gives you a web UI at `http://localhost:5555` where you can see active workers, task history, and even revoke running tasks.

## Production Tips

A few things I've learned the hard way:

1. **Always pass IDs, not objects.** Django model instances don't serialize well. Pass the primary key and fetch the object inside the task.

2. **Set time limits.** A hung task can block a worker forever. Always set `time_limit` and `soft_time_limit`.

3. **Use separate queues.** Don't let slow report generation block quick email sends:

```python
@shared_task(queue='emails')
def send_email(user_id):
    pass

@shared_task(queue='reports')
def generate_report():
    pass
```

Then run workers for specific queues:

```bash
celery -A myproject worker -Q emails --concurrency=4
celery -A myproject worker -Q reports --concurrency=2
```

4. **Handle signals for graceful shutdown.** When deploying, you want workers to finish current tasks:

```bash
celery -A myproject worker --loglevel=info --pool=prefork
```

The prefork pool handles SIGTERM properly, finishing current tasks before shutting down.

## Conclusion

Celery transforms Django from a synchronous web framework into something that can handle real-world async workloads. The setup takes a bit of effort, but once it's running, you'll wonder how you ever lived without it.

Start simple with just a few background tasks, get comfortable with the worker and beat processes, and then gradually add more sophisticated features like task chains and priority queues. The Celery documentation is excellent once you get past the initial learning curve.

Happy tasking!
