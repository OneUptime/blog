# How to Connect a Django App to Cloud SQL for PostgreSQL Using the Cloud SQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, Django, PostgreSQL, Python Connector

Description: Learn how to connect a Django application to Cloud SQL for PostgreSQL using the Cloud SQL Python Connector for secure, IAM-based database connections without IP allowlists.

---

Connecting Django to Cloud SQL traditionally involved either the Cloud SQL Auth Proxy or IP-based connections with SSL certificates. The Cloud SQL Python Connector offers a cleaner alternative for code that can supply its own connection creator - it is a pure Python library that handles Cloud SQL IAM authorization and encryption directly in your application code. No sidecar proxy, no IP allowlists, no certificate management.

This post covers setting up the Cloud SQL Python Connector with Django, configuring it for both local development and Cloud Run deployment, and handling connection pooling correctly.

## Why the Python Connector

The Cloud SQL Python Connector has several advantages over the traditional proxy approach:

- No sidecar process to manage
- IAM-based authorization, with optional IAM database authentication when configured
- Automatic TLS encryption
- Works with connection pooling libraries such as SQLAlchemy
- Works the same way locally and in production

## Installation

```bash
# Install Django, the PostgreSQL adapter, and the Cloud SQL Python Connector

pip install django psycopg2-binary sqlalchemy "cloud-sql-python-connector[pg8000]"
```

Note the `[pg8000]` extra - this installs the pg8000 driver which the connector uses for PostgreSQL connections. The connector supports `pg8000` and `asyncpg` for PostgreSQL. Django's built-in PostgreSQL backend still requires `psycopg` or `psycopg2`, so keep `psycopg2-binary` or install `psycopg` if you use Django's ORM directly.

## Setting Up Cloud SQL

If you do not have a Cloud SQL instance yet:

```bash
# Create a Cloud SQL PostgreSQL instance
gcloud sql instances create my-django-db \
  --database-version=POSTGRES_15 \
  --tier=db-custom-2-8192 \
  --region=us-central1 \
  --project=my-project

# Create a database
gcloud sql databases create djangodb \
  --instance=my-django-db \
  --project=my-project

# Create a database user
gcloud sql users create django_user \
  --instance=my-django-db \
  --password=your-secure-password \
  --project=my-project
```

Get the instance connection name (you will need this for the connector):

```bash
# Get the connection name
gcloud sql instances describe my-django-db \
  --project=my-project \
  --format="value(connectionName)"
```

This returns something like `my-project:us-central1:my-django-db`.

## Configuring Django Settings

The Cloud SQL Python Connector exposes a Python connection creator. This works directly with libraries such as SQLAlchemy, but Django's built-in PostgreSQL backend does not accept a `pg8000` connection creator in `DATABASES['default']['OPTIONS']`.

```python
# settings.py - Django database configuration with Cloud SQL Python Connector
import os
from google.cloud.sql.connector import Connector, IPTypes

# Cloud SQL instance connection name
INSTANCE_CONNECTION_NAME = os.environ.get(
    'INSTANCE_CONNECTION_NAME',
    'my-project:us-central1:my-django-db'
)

# Database credentials
DB_USER = os.environ.get('DB_USER', 'django_user')
DB_PASS = os.environ.get('DB_PASS', '')
DB_NAME = os.environ.get('DB_NAME', 'djangodb')

# Initialize the Cloud SQL Python Connector
connector = Connector()

def getconn():
    """Create a connection to Cloud SQL using the Python Connector."""
    conn = connector.connect(
        INSTANCE_CONNECTION_NAME,
        "pg8000",
        user=DB_USER,
        password=DB_PASS,
        db=DB_NAME,
        ip_type=IPTypes.PUBLIC,  # Use IPTypes.PRIVATE for private IP
    )
    return conn

# Use getconn with SQLAlchemy, or use a custom Django database backend
# that knows how to create connections through the connector.
```

However, to properly integrate the connector with Django's ORM, you need a custom database backend. If you want to keep Django's built-in PostgreSQL backend, use the Cloud SQL Auth Proxy, Cloud Run's Cloud SQL integration, or a direct TCP/private IP connection instead:

```python
# settings.py - Production-ready Django settings with Cloud SQL Connector
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'change-me-in-production')
DEBUG = os.environ.get('DJANGO_DEBUG', 'False').lower() == 'true'

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '*').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'myapp',
]

# Database configuration
# For local development, use a direct connection or local PostgreSQL
# For Cloud Run/GCP with Django's ORM, use the Cloud SQL Unix socket
if os.environ.get('USE_CLOUD_SQL_SOCKET', 'false').lower() == 'true':
    # Cloud Run Cloud SQL integration mounts a Unix socket at /cloudsql.
    # Keep using Django's built-in PostgreSQL backend with psycopg/psycopg2.
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ['DB_NAME'],
            'USER': os.environ['DB_USER'],
            'PASSWORD': os.environ['DB_PASS'],
            'HOST': f"/cloudsql/{os.environ['INSTANCE_CONNECTION_NAME']}",
            'PORT': '5432',
            'CONN_MAX_AGE': 600,
            'CONN_HEALTH_CHECKS': True,
        }
    }
else:
    # Standard PostgreSQL connection for local development
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME', 'djangodb'),
            'USER': os.environ.get('DB_USER', 'django_user'),
            'PASSWORD': os.environ.get('DB_PASS', 'localpassword'),
            'HOST': os.environ.get('DB_HOST', 'localhost'),
            'PORT': os.environ.get('DB_PORT', '5432'),
        }
    }
```

## Using SQLAlchemy as the Connection Bridge

The most reliable way to use the Cloud SQL Python Connector in Python code is by using SQLAlchemy's `create_engine` with the connector. Use this for application code that uses SQLAlchemy directly; Django's ORM still needs a Django database backend:

```python
# db_connector.py - Bridge between Cloud SQL Connector and Django
from google.cloud.sql.connector import Connector
import sqlalchemy
import os

def create_sqlalchemy_engine():
    """Create a SQLAlchemy engine using the Cloud SQL Python Connector."""
    connector = Connector(refresh_strategy="LAZY")

    def getconn():
        conn = connector.connect(
            os.environ['INSTANCE_CONNECTION_NAME'],
            "pg8000",
            user=os.environ['DB_USER'],
            password=os.environ['DB_PASS'],
            db=os.environ['DB_NAME'],
        )
        return conn

    engine = sqlalchemy.create_engine(
        "postgresql+pg8000://",
        creator=getconn,
        pool_size=5,          # Maintain 5 connections in the pool
        max_overflow=2,       # Allow up to 2 additional connections
        pool_timeout=30,      # Wait 30s for a connection from the pool
        pool_recycle=1800,    # Recycle connections after 30 minutes
    )

    return engine
```

## IAM Database Authentication

Instead of using passwords, you can use IAM database authentication. First enable IAM database authentication on the Cloud SQL instance, grant the service account both `roles/cloudsql.client` and `roles/cloudsql.instanceUser`, and create the IAM database user:

```bash
# Grant the Cloud SQL Client and Cloud SQL Instance User roles to your service account
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:my-app-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:my-app-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/cloudsql.instanceUser"

# Create an IAM database user
gcloud sql users create my-app-sa@my-project.iam \
  --instance=my-django-db \
  --type=cloud_iam_service_account \
  --project=my-project
```

Then configure the connector for IAM auth:

```python
# IAM-authenticated connection - no password needed
from google.cloud.sql.connector import Connector, IPTypes

connector = Connector()

def getconn():
    conn = connector.connect(
        os.environ['INSTANCE_CONNECTION_NAME'],
        "pg8000",
        user=os.environ['DB_IAM_USER'],  # e.g. my-app-sa@my-project.iam
        db=os.environ['DB_NAME'],
        enable_iam_auth=True,  # Use IAM authentication instead of password
        ip_type=IPTypes.PRIVATE,
    )
    return conn
```

## Deploying to Cloud Run

Create the Dockerfile:

```dockerfile
# Dockerfile for Django with Cloud SQL
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

# Start the server. Run migrations as a separate job in production.
CMD ["sh", "-c", "gunicorn myproject.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --threads 4"]
```

If you use `--set-secrets`, create the database password secret before deploying:

```bash
# Create the secret
echo -n "your-secure-password" | gcloud secrets create django-db-password \
  --data-file=- \
  --project=my-project

# Grant the service account access to the secret
gcloud secrets add-iam-policy-binding django-db-password \
  --member="serviceAccount:my-app-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=my-project
```

Grant the Cloud SQL Client role to the Cloud Run service account:

```bash
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:my-app-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

Deploy to Cloud Run:

```bash
# Build and deploy
gcloud run deploy django-app \
  --source=. \
  --region=us-central1 \
  --platform=managed \
  --memory=512Mi \
  --add-cloudsql-instances=my-project:us-central1:my-django-db \
  --set-env-vars="USE_CLOUD_SQL_SOCKET=true,INSTANCE_CONNECTION_NAME=my-project:us-central1:my-django-db,DB_NAME=djangodb,DB_USER=django_user,DJANGO_SECRET_KEY=your-secret" \
  --set-secrets="DB_PASS=django-db-password:latest" \
  --service-account=my-app-sa@my-project.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --project=my-project
```

If you connect by private IP from Cloud Run, also configure Cloud Run networking so the service has a VPC path to the Cloud SQL instance.

## Connection Pooling Best Practices

Cloud SQL has connection limits. For PostgreSQL, check the actual `max_connections` value on your instance because it depends on the instance configuration and database flags. With Gunicorn workers, each worker maintains its own persistent Django connections or its own SQLAlchemy pool:

```python
# Optimal pool settings for Cloud Run with Gunicorn
# With 2 workers and 4 threads each, plan for up to 8 concurrent Django request threads per instance
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'CONN_MAX_AGE': 600,       # Keep connections alive for 10 minutes
        'CONN_HEALTH_CHECKS': True, # Check connection health before using
        'OPTIONS': {
            'connect_timeout': 10,
        },
    }
}
```

## Running Migrations

Run migrations as a separate step, not in the startup command for production:

```bash
# Run migrations using a Cloud Build step or a one-off Cloud Run job
gcloud run jobs create django-migrate \
  --image=us-central1-docker.pkg.dev/my-project/my-repo/django-app:latest \
  --region=us-central1 \
  --set-cloudsql-instances=my-project:us-central1:my-django-db \
  --set-env-vars="USE_CLOUD_SQL_SOCKET=true,INSTANCE_CONNECTION_NAME=my-project:us-central1:my-django-db,DB_NAME=djangodb,DB_USER=django_user" \
  --set-secrets="DB_PASS=django-db-password:latest" \
  --service-account=my-app-sa@my-project.iam.gserviceaccount.com \
  --command=python \
  --args=manage.py,migrate \
  --project=my-project

# Execute the migration job
gcloud run jobs execute django-migrate \
  --region=us-central1 \
  --project=my-project
```

## Summary

The Cloud SQL Python Connector simplifies connecting Python code to Cloud SQL by handling Cloud SQL IAM authorization and encryption in your application code. No proxy sidecar needed. Use pg8000 as the connector's PostgreSQL driver, configure connection pooling to match your Gunicorn worker count when using SQLAlchemy, and consider IAM database authentication to eliminate database passwords entirely. For Django's ORM, use a Django PostgreSQL backend through Cloud Run's Cloud SQL integration, the Cloud SQL Auth Proxy, direct private IP, or a custom backend. Store any remaining secrets in Secret Manager and reference them in your Cloud Run deployment. Run migrations as a separate job rather than in your application startup.
