# How to Deploy a Django + PostgreSQL Stack via Portainer - Postgres

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Django, PostgreSQL, Python, Docker Compose, Web Framework

Description: Deploy a Django web application with PostgreSQL database using Docker Compose through Portainer, including static file serving, database migrations, and Celery worker support.

## Introduction

Django is Python's most popular web framework, and PostgreSQL is its preferred database backend. Deploying them together via Portainer gives you a production-ready environment with automated database migrations, static file management, and Celery task queue support. This guide covers a complete Django + PostgreSQL deployment using Portainer Stacks.

## Prerequisites

- Portainer CE or BE with Docker Engine 20.10+
- A Django project (or create one fresh)
- Basic knowledge of Django and Python

## Step 1: Prepare the Django Dockerfile

```dockerfile
# Dockerfile (in your Django project root)

FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev gcc postgresql-client && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

EXPOSE 8000

# Start Gunicorn for production
CMD ["gunicorn", "myproject.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
```

```text
# requirements.txt
Django==5.2.13
gunicorn==21.2.0
psycopg2-binary==2.9.9
django-environ==0.13.0
celery==5.3.6
redis==5.0.1
```

## Step 2: Create the Docker Compose File in Portainer

Navigate to **Stacks** → **Add Stack** → **Web Editor** and name it `django-app`:

```yaml
version: "3.8"

services:
  # PostgreSQL database
  db:
    image: postgres:16-alpine
    container_name: django-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-djangodb}
      POSTGRES_USER: ${POSTGRES_USER:-djangouser}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-djangopassword}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - django-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-djangouser} -d ${POSTGRES_DB:-djangodb}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis (for Celery and caching)
  redis:
    image: redis:7-alpine
    container_name: django-redis
    restart: unless-stopped
    networks:
      - django-net

  # Django web application
  web:
    image: ${DJANGO_IMAGE:-myapp:latest}
    container_name: django-web
    restart: unless-stopped
    command: >
      sh -c "python manage.py migrate --noinput &&
             python manage.py collectstatic --noinput &&
             gunicorn myproject.wsgi:application --bind 0.0.0.0:8000 --workers 3"
    environment:
      DEBUG: "False"
      SECRET_KEY: ${DJANGO_SECRET_KEY}
      DATABASE_URL: postgres://${POSTGRES_USER:-djangouser}:${POSTGRES_PASSWORD:-djangopassword}@db:5432/${POSTGRES_DB:-djangodb}
      REDIS_URL: redis://redis:6379/0
      ALLOWED_HOSTS: ${ALLOWED_HOSTS:-localhost,127.0.0.1}
      DJANGO_SETTINGS_MODULE: myproject.settings
    ports:
      - "8000:8000"
    volumes:
      - static_files:/app/staticfiles
      - media_files:/app/media
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - django-net

  # Celery worker for background tasks
  worker:
    image: ${DJANGO_IMAGE:-myapp:latest}
    container_name: django-worker
    restart: unless-stopped
    command: celery -A myproject worker -l info
    environment:
      SECRET_KEY: ${DJANGO_SECRET_KEY}
      DATABASE_URL: postgres://${POSTGRES_USER:-djangouser}:${POSTGRES_PASSWORD:-djangopassword}@db:5432/${POSTGRES_DB:-djangodb}
      REDIS_URL: redis://redis:6379/0
      DJANGO_SETTINGS_MODULE: myproject.settings
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - django-net

  # Nginx reverse proxy + static file serving
  nginx:
    image: nginx:alpine
    container_name: django-nginx
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - static_files:/app/staticfiles:ro
      - media_files:/app/media:ro
      - /opt/portainer/django/nginx/django.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - web
    networks:
      - django-net

volumes:
  postgres_data:
  static_files:
  media_files:

networks:
  django-net:
    driver: bridge
```

## Step 3: Nginx Configuration for Django

Create the following file on the Docker host at `/opt/portainer/django/nginx/django.conf`:

```nginx
# /opt/portainer/django/nginx/django.conf
upstream django {
    server web:8000;
}

server {
    listen 80;
    server_name localhost;

    # Static files served directly by Nginx
    location /static/ {
        alias /app/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Media files
    location /media/ {
        alias /app/media/;
    }

    # Proxy all other requests to Django/Gunicorn
    location / {
        proxy_pass http://django;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Step 4: Django Settings for Docker

```python
# myproject/settings.py (relevant Docker sections)
import environ
import os

env = environ.Env()

# Read .env file if present
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

SECRET_KEY = env('SECRET_KEY')
DEBUG = env.bool('DEBUG', default=False)
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1'])

# Database - uses DATABASE_URL env var
DATABASES = {
    'default': env.db('DATABASE_URL', default='sqlite:///db.sqlite3')
}

# Static and media files
STATIC_URL = '/static/'
STATIC_ROOT = '/app/staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = '/app/media'

# Celery configuration
CELERY_BROKER_URL = env('REDIS_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = env('REDIS_URL', default='redis://localhost:6379/0')
```

## Step 5: Manage Django via Portainer Console

```bash
# Run management commands via Portainer container console
# Or via CLI:

# Run migrations manually
docker exec django-web python manage.py migrate

# Create superuser
docker exec -it django-web python manage.py createsuperuser

# Collect static files
docker exec django-web python manage.py collectstatic --noinput

# Django shell for debugging
docker exec -it django-web python manage.py shell

# Check for database issues
docker exec -it django-web python manage.py dbshell
```

## Step 6: Set Environment Variables in Portainer

In the Stack editor, add **Environment Variables**:

| Key | Value |
|-----|-------|
| `DJANGO_SECRET_KEY` | `your-50-char-secret-key` |
| `POSTGRES_PASSWORD` | `your-secure-db-password` |
| `ALLOWED_HOSTS` | `yourdomain.com,www.yourdomain.com` |
| `DJANGO_IMAGE` | `your-registry/myapp:latest` |

## Conclusion

Deploying Django with PostgreSQL via Portainer provides a complete web application stack with automated database migrations and static file collection on startup, static file serving via Nginx, and Celery workers for background task processing. The health check on the PostgreSQL service ensures Django only starts after the database is ready. For production, ensure `DEBUG=False`, use a strong `SECRET_KEY`, and serve the application behind an SSL-terminating reverse proxy.
