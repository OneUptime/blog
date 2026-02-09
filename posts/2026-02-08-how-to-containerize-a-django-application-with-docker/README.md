# How to Containerize a Django Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Django, Python, Containerization, Backend, DevOps, Gunicorn

Description: A comprehensive guide to containerizing Django applications with Docker, Gunicorn, PostgreSQL, and production best practices

---

Django is the most popular Python web framework, powering everything from small APIs to massive content platforms. Docker brings consistency to Django deployments by packaging the application, its Python dependencies, and system libraries into a single portable unit. This guide covers the complete containerization process, from writing the Dockerfile through database integration, static file serving, and production hardening with Gunicorn.

## Prerequisites

You need:

- Python 3.11+
- Docker Engine 20.10+
- pip and virtualenv (for local development)
- An existing Django project or willingness to create one

## Creating a Django Project

If you need a fresh project:

```bash
# Create a virtual environment and install Django
python -m venv venv
source venv/bin/activate
pip install django gunicorn psycopg2-binary

# Start a new Django project
django-admin startproject myproject .
```

Create a `requirements.txt` file listing your dependencies:

```
Django>=5.0,<6.0
gunicorn>=22.0
psycopg2-binary>=2.9
```

Or use pip freeze:

```bash
pip freeze > requirements.txt
```

## Understanding Django in Production

Django's built-in development server (`manage.py runserver`) is not suitable for production. It handles one request at a time and lacks proper security features. In production, you need:

- Gunicorn (or uWSGI) as the WSGI server
- A reverse proxy like Nginx for static files and SSL termination
- A proper database like PostgreSQL instead of SQLite

## Writing the Dockerfile

Create a `Dockerfile` in your project root.

This Dockerfile installs dependencies and configures Gunicorn:

```dockerfile
# Use Python slim image for smaller footprint
FROM python:3.12-slim

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies needed for psycopg2 and other packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Copy and install Python dependencies first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the Django project
COPY . .

# Collect static files during build
RUN python manage.py collectstatic --noinput

# Set ownership
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# Run with Gunicorn, binding to 0.0.0.0 for Docker networking
CMD ["gunicorn", "myproject.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
```

## The .dockerignore File

Python projects can have large virtual environments and cache directories:

```
venv
__pycache__
*.pyc
.git
.gitignore
.vscode
*.md
.env
.env.*
db.sqlite3
media/
staticfiles/
```

## Building and Running

Build and test:

```bash
# Build the image
docker build -t my-django-app:latest .

# Run the container
docker run -d -p 8000:8000 --name django-app my-django-app:latest

# Verify
curl http://localhost:8000
```

## Docker Compose with PostgreSQL

Django in production needs a real database. Here is a full Compose setup with PostgreSQL.

This Compose file connects Django to PostgreSQL with proper dependency management:

```yaml
version: "3.8"

services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DJANGO_SETTINGS_MODULE=myproject.settings
      - DATABASE_URL=postgresql://django:secret@postgres:5432/djangodb
      - SECRET_KEY=your-production-secret-key
      - DEBUG=False
      - ALLOWED_HOSTS=localhost,127.0.0.1
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: django
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: djangodb
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U django -d djangodb"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

## Database Configuration

Update your Django settings to read database configuration from environment variables. Install `dj-database-url` for cleaner configuration:

```bash
pip install dj-database-url
```

Update `settings.py`:

```python
# myproject/settings.py
import os
import dj_database_url

# Read the database URL from environment, fall back to SQLite for local dev
DATABASES = {
    'default': dj_database_url.config(
        default='sqlite:///db.sqlite3',
        conn_max_age=600,
    )
}

# Read other settings from environment variables
SECRET_KEY = os.environ.get('SECRET_KEY', 'insecure-dev-key')
DEBUG = os.environ.get('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost').split(',')
```

## Running Migrations

Migrations need to run before the app serves requests. There are several approaches.

Run migrations as a one-off command:

```bash
# Run migrations inside the running container
docker compose exec web python manage.py migrate
```

Or create an entrypoint script that handles migrations automatically:

```bash
#!/bin/sh
# entrypoint.sh - Run migrations and start Gunicorn

# Wait for the database to be available
echo "Waiting for database..."
python manage.py check --database default

# Run migrations
echo "Running migrations..."
python manage.py migrate --noinput

# Start Gunicorn
echo "Starting Gunicorn..."
exec gunicorn myproject.wsgi:application --bind 0.0.0.0:8000 --workers 3
```

Add it to the Dockerfile:

```dockerfile
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]
```

## Static Files and Media

Django needs `collectstatic` to gather all static files into one directory. The Dockerfile already runs this during the build.

For serving static files in production, add Nginx as a reverse proxy:

```yaml
version: "3.8"

services:
  nginx:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
    volumes:
      - static:/var/www/static
      - media:/var/www/media
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - web

  web:
    build: .
    expose:
      - "8000"
    volumes:
      - static:/app/staticfiles
      - media:/app/media
    environment:
      - STATIC_ROOT=/app/staticfiles
      - MEDIA_ROOT=/app/media

volumes:
  pgdata:
  static:
  media:
```

Nginx configuration for proxying to Django:

```nginx
server {
    listen 80;

    # Serve static files directly
    location /static/ {
        alias /var/www/static/;
        expires 30d;
    }

    # Serve media files directly
    location /media/ {
        alias /var/www/media/;
        expires 7d;
    }

    # Proxy everything else to Django/Gunicorn
    location / {
        proxy_pass http://web:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Gunicorn Configuration

Fine-tune Gunicorn for your container's resources. Create a `gunicorn.conf.py`:

```python
# gunicorn.conf.py
import multiprocessing

# Number of worker processes (2 * CPU cores + 1 is a good starting point)
workers = multiprocessing.cpu_count() * 2 + 1

# Bind to all interfaces on port 8000
bind = "0.0.0.0:8000"

# Worker timeout in seconds
timeout = 120

# Access logging to stdout for Docker log collection
accesslog = "-"
errorlog = "-"

# Graceful shutdown timeout
graceful_timeout = 30
```

Update the CMD in your Dockerfile:

```dockerfile
CMD ["gunicorn", "myproject.wsgi:application", "-c", "gunicorn.conf.py"]
```

## Development Workflow

For development, you want Django's dev server with auto-reload:

```yaml
version: "3.8"

services:
  web-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "8000:8000"
    volumes:
      - .:/app
    environment:
      - DEBUG=True
      - DATABASE_URL=postgresql://django:secret@postgres:5432/djangodb
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: django
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: djangodb
    ports:
      - "5432:5432"
```

Development Dockerfile:

```dockerfile
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000

# Use Django's development server with auto-reload
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
```

## Creating a Superuser

After the container is running, create a Django admin superuser:

```bash
# Create a superuser interactively
docker compose exec web python manage.py createsuperuser
```

Or set it up non-interactively through environment variables:

```bash
docker compose exec web python manage.py createsuperuser \
  --noinput \
  --username admin \
  --email admin@example.com
```

Set the `DJANGO_SUPERUSER_PASSWORD` environment variable for the password.

## Conclusion

Django and Docker work well together once you understand the moving parts. Use Gunicorn instead of the development server, connect to PostgreSQL through Docker Compose networking, handle migrations through entrypoint scripts or one-off commands, and serve static files with Nginx. The multi-service Docker Compose setup gives you a complete production stack that mirrors what you would run on real servers, all reproducible from a single `docker compose up` command.
