# How to Set Up a Django + PostgreSQL + Redis Stack with Docker Compose

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Django, PostgreSQL, Redis, Docker Compose, Python, Celery, Web Development

Description: Build a complete Django development and production stack with PostgreSQL, Redis, and Celery using Docker Compose for a fully containerized workflow.

---

Django is one of the most productive web frameworks available, but setting up a proper development environment with PostgreSQL, Redis, and background workers takes effort. Docker Compose packages all of these services into a single configuration file. Run one command, and your entire stack starts up with matching versions and configurations. This guide builds a production-grade Django stack from scratch.

## Stack Components

Here is what the complete stack includes:

- **Django** - the web application framework
- **PostgreSQL** - the production database
- **Redis** - caching and Celery message broker
- **Celery Worker** - processes background tasks
- **Celery Beat** - schedules periodic tasks
- **Nginx** - reverse proxy for production deployments

## Project Structure

```
myproject/
  docker-compose.yml
  docker-compose.prod.yml
  Dockerfile
  requirements.txt
  manage.py
  myproject/
    __init__.py
    settings.py
    celery.py
    urls.py
    wsgi.py
  apps/
    core/
      __init__.py
      models.py
      tasks.py
      views.py
  nginx/
    nginx.conf
```

## The Dockerfile

Build a Docker image for the Django application:

```dockerfile
# Dockerfile - Django application with all dependencies
FROM python:3.12-slim

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies needed by psycopg2 and other packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first for better Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application source code
COPY . .

# Collect static files for production serving
RUN python manage.py collectstatic --noinput 2>/dev/null || true

EXPOSE 8000

CMD ["gunicorn", "myproject.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
```

## Requirements

```txt
# requirements.txt - Django stack dependencies
django==5.0.2
psycopg2-binary==2.9.9
django-redis==5.4.0
celery[redis]==5.3.6
gunicorn==21.2.0
whitenoise==6.6.0
django-environ==0.11.2
```

## Docker Compose for Development

```yaml
# docker-compose.yml - Full Django development stack
version: "3.8"

services:
  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: myproject
      POSTGRES_USER: django
      POSTGRES_PASSWORD: djangopass
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U django -d myproject"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - appnet

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - appnet

  web:
    build: .
    # Override CMD for development with auto-reload
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      # Mount source code for live reload during development
      - .:/app
    ports:
      - "8000:8000"
    environment:
      DEBUG: "true"
      DATABASE_URL: postgres://django:djangopass@db:5432/myproject
      REDIS_URL: redis://redis:6379/0
      CELERY_BROKER_URL: redis://redis:6379/1
      SECRET_KEY: dev-secret-key-change-in-production
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - appnet

  celery-worker:
    build: .
    command: celery -A myproject worker -l info --concurrency=2
    volumes:
      - .:/app
    environment:
      DATABASE_URL: postgres://django:djangopass@db:5432/myproject
      REDIS_URL: redis://redis:6379/0
      CELERY_BROKER_URL: redis://redis:6379/1
      SECRET_KEY: dev-secret-key-change-in-production
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - appnet

  celery-beat:
    build: .
    command: celery -A myproject beat -l info --schedule=/tmp/celerybeat-schedule
    volumes:
      - .:/app
    environment:
      DATABASE_URL: postgres://django:djangopass@db:5432/myproject
      REDIS_URL: redis://redis:6379/0
      CELERY_BROKER_URL: redis://redis:6379/1
      SECRET_KEY: dev-secret-key-change-in-production
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - appnet

volumes:
  pgdata:
  redisdata:

networks:
  appnet:
    driver: bridge
```

## Django Settings

Configure Django to use environment variables for database and cache connections:

```python
# myproject/settings.py - Django settings configured for Docker
import os
import environ

env = environ.Env(DEBUG=(bool, False))

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["*"])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "apps.core",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
]

ROOT_URLCONF = "myproject.urls"

# Database configuration from environment variable
DATABASES = {
    "default": env.db("DATABASE_URL", default="postgres://django:djangopass@db:5432/myproject")
}

# Redis cache configuration
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": env("REDIS_URL", default="redis://redis:6379/0"),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
    }
}

# Session storage in Redis for better performance
SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "default"

# Celery configuration
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default="redis://redis:6379/1")
CELERY_RESULT_BACKEND = env("CELERY_BROKER_URL", default="redis://redis:6379/1")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"

# Static files
STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]
```

## Celery Configuration

Set up Celery for background task processing:

```python
# myproject/celery.py - Celery application configuration
import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "myproject.settings")

app = Celery("myproject")

# Load Celery settings from Django settings with the CELERY_ prefix
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks from all installed Django apps
app.autodiscover_tasks()

# Define periodic tasks (Celery Beat schedule)
app.conf.beat_schedule = {
    "cleanup-expired-sessions": {
        "task": "apps.core.tasks.cleanup_expired_sessions",
        "schedule": crontab(hour=2, minute=0),
    },
    "generate-daily-report": {
        "task": "apps.core.tasks.generate_daily_report",
        "schedule": crontab(hour=6, minute=0),
    },
}
```

Make sure Celery loads when Django starts:

```python
# myproject/__init__.py - Load Celery when Django starts
from .celery import app as celery_app

__all__ = ("celery_app",)
```

## Example Tasks

```python
# apps/core/tasks.py - Background tasks executed by Celery workers
from celery import shared_task
from django.core.mail import send_mail
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_welcome_email(self, user_email, username):
    """Send a welcome email to a new user with automatic retries."""
    try:
        send_mail(
            subject="Welcome!",
            message=f"Hello {username}, welcome to our platform.",
            from_email="noreply@example.com",
            recipient_list=[user_email],
        )
        logger.info(f"Welcome email sent to {user_email}")
    except Exception as exc:
        logger.error(f"Failed to send email to {user_email}: {exc}")
        raise self.retry(exc=exc)


@shared_task
def cleanup_expired_sessions():
    """Remove expired sessions from the database."""
    from django.contrib.sessions.models import Session
    count = Session.objects.filter(expire_date__lt=timezone.now()).delete()[0]
    logger.info(f"Cleaned up {count} expired sessions")
    return count


@shared_task
def generate_daily_report():
    """Generate and cache a daily summary report."""
    from django.core.cache import cache
    report = {
        "generated_at": timezone.now().isoformat(),
        "status": "complete"
    }
    cache.set("daily_report", report, timeout=86400)
    logger.info("Daily report generated and cached")
    return report
```

## Running the Stack

Start the full development environment:

```bash
# Build and start all services
docker compose up --build -d

# Run database migrations
docker compose exec web python manage.py migrate

# Create a superuser for the admin panel
docker compose exec web python manage.py createsuperuser

# Check that all services are running
docker compose ps
```

Your application is now available at `http://localhost:8000` and the Django admin at `http://localhost:8000/admin`.

## Running Management Commands

Execute Django management commands inside the container:

```bash
# Run migrations
docker compose exec web python manage.py migrate

# Create a new app
docker compose exec web python manage.py startapp users

# Open a Django shell
docker compose exec web python manage.py shell

# Run tests
docker compose exec web python manage.py test
```

## Production Configuration

For production, add Nginx as a reverse proxy:

```nginx
# nginx/nginx.conf - Production reverse proxy configuration
upstream django {
    server web:8000;
}

server {
    listen 80;
    server_name example.com;

    location /static/ {
        alias /app/staticfiles/;
    }

    location / {
        proxy_pass http://django;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Wrapping Up

Docker Compose transforms the Django development experience. Instead of installing PostgreSQL, Redis, and Celery on your local machine, a single `docker compose up` starts everything. The configuration lives in version control, so every developer on the team gets an identical environment. When you are ready for production, the same images run behind Nginx with gunicorn, giving you a clean path from development to deployment.
