# How to Connect a Django Application to Cloud SQL for PostgreSQL Using the Cloud SQL Python Connector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, Django, PostgreSQL, Python Connector

Description: Learn how to connect a Django application to Cloud SQL for PostgreSQL using the Cloud SQL Python Connector for secure, IAM-based database connections without IP allowlists.

---

Connecting Django to Cloud SQL traditionally involved either the Cloud SQL Auth Proxy or IP-based connections with SSL certificates. The Cloud SQL Python Connector offers a cleaner alternative - it is a pure Python library that handles authentication and encryption directly in your application code. No sidecar proxy, no IP allowlists, no certificate management.

This post covers setting up the Cloud SQL Python Connector with Django, configuring it for both local development and Cloud Run deployment, and handling connection pooling correctly.

## Why the Python Connector

The Cloud SQL Python Connector has several advantages over the traditional proxy approach:

- No sidecar process to manage
- IAM-based authentication (no database passwords needed)
- Automatic TLS encryption
- Built-in connection pooling support
- Works the same way locally and in production

## Installation

```bash
# Install Django, the PostgreSQL adapter, and the Cloud SQL Python Connector
pip install django psycopg2-binary "cloud-sql-python-connector[pg8000]"
```

Note the `[pg8000]` extra - this installs the pg8000 driver which the connector uses for PostgreSQL connections. You can also use psycopg2, but pg8000 is the recommended driver for the connector.

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

Here is the Django settings configuration using the Cloud SQL Python Connector:

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

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': DB_NAME,
        'USER': DB_USER,
        'PASSWORD': DB_PASS,
        'OPTIONS': {
            # Use the connector's getconn function
        },
    }
}
```

However, to properly integrate the connector with Django, you need a custom database backend or use SQLAlchemy as a bridge. The cleanest approach uses django-environ with the connector:

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
# For Cloud Run/GCP, use the Cloud SQL Python Connector
if os.environ.get('USE_CLOUD_SQL_CONNECTOR', 'false').lower() == 'true':
    # Cloud SQL Python Connector configuration
    from google.cloud.sql.connector import Connector

    connector = Connector()

    def getconn():
        return connector.connect(
            os.environ['INSTANCE_CONNECTION_NAME'],
            "pg8000",
            user=os.environ['DB_USER'],
            password=os.environ['DB_PASS'],
            db=os.environ['DB_NAME'],
            ip_type="private" if os.environ.get('USE_PRIVATE_IP') else "public",
        )

    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ['DB_NAME'],
            'USER': os.environ['DB_USER'],
            'PASSWORD': os.environ['DB_PASS'],
            'HOST': 'localhost',  # Placeholder, connector handles the actual connection
            'PORT': '5432',
        }
    }

    # Override the connection creator
    # Note: This requires a custom database backend - see below
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

The most reliable way to use the Cloud SQL Python Connector with Django is through the `django-cloud-sql-connector` package or by using SQLAlchemy's create_engine with the connector:

```python
# db_connector.py - Bridge between Cloud SQL Connector and Django
from google.cloud.sql.connector import Connector
import sqlalchemy
import os

def create_sqlalchemy_engine():
    """Create a SQLAlchemy engine using the Cloud SQL Python Connector."""
    connector = Connector()

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

Instead of using passwords, you can use IAM authentication:

```bash
# Grant the Cloud SQL Client role to your service account
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:my-app-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

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
        user=os.environ['IAM_USER'],  # SA email without the .gserviceaccount.com suffix
        db=os.environ['DB_NAME'],
        enable_iam_auth=True,  # Use IAM authentication instead of password
        ip_type=IPTypes.PRIVATE,
    )
    return conn
```

## Deploying to Cloud Run

Create the Dockerfile:

```dockerfile
# Dockerfile for Django with Cloud SQL Python Connector
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

# Run migrations and start the server
CMD ["sh", "-c", "python manage.py migrate && gunicorn myproject.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --threads 4"]
```

Deploy to Cloud Run:

```bash
# Build and deploy
gcloud run deploy django-app \
  --source=. \
  --region=us-central1 \
  --platform=managed \
  --memory=512Mi \
  --set-env-vars="USE_CLOUD_SQL_CONNECTOR=true,INSTANCE_CONNECTION_NAME=my-project:us-central1:my-django-db,DB_NAME=djangodb,DB_USER=django_user,DJANGO_SECRET_KEY=your-secret" \
  --set-secrets="DB_PASS=django-db-password:latest" \
  --service-account=my-app-sa@my-project.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --project=my-project
```

Store the database password in Secret Manager:

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

## Connection Pooling Best Practices

Cloud SQL has connection limits. A db-custom-2-8192 instance supports about 200 concurrent connections. With Gunicorn workers, each worker maintains its own connection pool:

```python
# Optimal pool settings for Cloud Run with Gunicorn
# With 2 workers and 4 threads each, you need at most 8 connections per instance
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
  --set-env-vars="USE_CLOUD_SQL_CONNECTOR=true,INSTANCE_CONNECTION_NAME=my-project:us-central1:my-django-db,DB_NAME=djangodb,DB_USER=django_user" \
  --set-secrets="DB_PASS=django-db-password:latest" \
  --service-account=my-app-sa@my-project.iam.gserviceaccount.com \
  --command="python,manage.py,migrate" \
  --project=my-project

# Execute the migration job
gcloud run jobs execute django-migrate \
  --region=us-central1 \
  --project=my-project
```

## Summary

The Cloud SQL Python Connector simplifies connecting Django to Cloud SQL by handling authentication and encryption in your application code. No proxy sidecar needed. Use pg8000 as the database driver, configure connection pooling to match your Gunicorn worker count, and consider IAM authentication to eliminate database passwords entirely. Store any remaining secrets in Secret Manager and reference them in your Cloud Run deployment. Run migrations as a separate job rather than in your application startup.
