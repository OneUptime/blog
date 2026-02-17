# How to Build a Django Application with Cloud SQL and Deploy It to Cloud Run with Cloud Build

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Django, Cloud SQL, Cloud Run, Cloud Build

Description: A complete guide to building a Django web application connected to Cloud SQL PostgreSQL and deploying it to Cloud Run using Cloud Build for CI/CD.

---

Django is a solid framework for building web applications, and it works well on Google Cloud. Cloud SQL gives you a managed PostgreSQL (or MySQL) database, Cloud Run handles your application containers, and Cloud Build automates the deployment pipeline. I have set up this combination for several projects, and once you get the pieces connected, it is a reliable and low-maintenance stack.

In this post, I will walk through the full process from a Django project to a deployed application on Cloud Run with Cloud SQL.

## Project Setup

Start with a Django project. If you already have one, skip ahead to the Cloud SQL section.

```bash
# Create a virtual environment and install Django
python -m venv venv
source venv/bin/activate
pip install django psycopg2-binary gunicorn django-environ
```

Initialize a Django project.

```bash
# Create the Django project
django-admin startproject myproject .
django-admin startapp api
```

## Configuring Django for Cloud SQL

The key configuration is the database connection. On Cloud Run, you connect to Cloud SQL through a Unix socket provided by the Cloud SQL Auth Proxy, which Cloud Run includes automatically.

```python
# settings.py - Django settings configured for Cloud SQL
import environ
import os

env = environ.Env()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Read environment variables from .env file in development
environ.Env.read_env(os.path.join(BASE_DIR, ".env"), overwrite=False)

SECRET_KEY = env("DJANGO_SECRET_KEY", default="change-me-in-production")
DEBUG = env.bool("DEBUG", default=False)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["*"])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "api",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "myproject.urls"

# Database configuration for Cloud SQL
# In Cloud Run, the Cloud SQL proxy provides a Unix socket
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_NAME", default="myapp"),
        "USER": env("DB_USER", default="appuser"),
        "PASSWORD": env("DB_PASSWORD", default=""),
        "HOST": env("DB_HOST", default="/cloudsql/my-project:us-central1:my-instance"),
        "PORT": env("DB_PORT", default=""),
    }
}

# Static files configuration
STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
```

The `DB_HOST` setting is the key. On Cloud Run, it points to the Cloud SQL Unix socket path. For local development, you set it to `localhost` or `127.0.0.1`.

## Setting Up Cloud SQL

Create a Cloud SQL PostgreSQL instance and database.

```bash
# Create a Cloud SQL PostgreSQL instance
gcloud sql instances create my-instance \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1

# Create a database
gcloud sql databases create myapp --instance=my-instance

# Create a database user
gcloud sql users create appuser \
    --instance=my-instance \
    --password=your-secure-password
```

## The Dockerfile

Create a Dockerfile that packages your Django application.

```dockerfile
# Use Python 3.11 slim image
FROM python:3.11-slim

# Set environment variables for Python
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the working directory
WORKDIR /app

# Install system dependencies needed for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Collect static files during build
RUN python manage.py collectstatic --noinput

# Cloud Run sets the PORT environment variable
ENV PORT=8080

# Run with gunicorn for production
CMD exec gunicorn myproject.wsgi:application \
    --bind 0.0.0.0:$PORT \
    --workers 2 \
    --threads 4 \
    --timeout 120
```

The requirements file should include everything your application needs.

```
# requirements.txt
Django==5.0.1
psycopg2-binary==2.9.9
gunicorn==21.2.0
django-environ==0.11.2
```

## Cloud Build Configuration

Cloud Build automates building your container and deploying it to Cloud Run. Create a `cloudbuild.yaml` file in your project root.

```yaml
# cloudbuild.yaml - Build and deploy pipeline
steps:
  # Step 1: Build the Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/django-app:$COMMIT_SHA', '.']

  # Step 2: Push the image to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/django-app:$COMMIT_SHA']

  # Step 3: Run database migrations using the Cloud SQL proxy
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'run'
      - '--network=cloudbuild'
      - 'gcr.io/$PROJECT_ID/django-app:$COMMIT_SHA'
      - 'python'
      - 'manage.py'
      - 'migrate'
      - '--noinput'
    env:
      - 'DB_HOST=$$DB_HOST'
      - 'DB_NAME=$$DB_NAME'
      - 'DB_USER=$$DB_USER'
      - 'DB_PASSWORD=$$DB_PASSWORD'
    secretEnv: ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']

  # Step 4: Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'django-app'
      - '--image=gcr.io/$PROJECT_ID/django-app:$COMMIT_SHA'
      - '--region=us-central1'
      - '--platform=managed'
      - '--add-cloudsql-instances=$PROJECT_ID:us-central1:my-instance'
      - '--set-env-vars=DB_HOST=/cloudsql/$PROJECT_ID:us-central1:my-instance,DB_NAME=myapp,DB_USER=appuser'
      - '--set-secrets=DB_PASSWORD=db-password:latest,DJANGO_SECRET_KEY=django-secret-key:latest'
      - '--allow-unauthenticated'
      - '--memory=512Mi'
      - '--min-instances=0'
      - '--max-instances=5'

# Use secrets from Secret Manager for the migration step
availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/db-password/versions/latest
      env: 'DB_PASSWORD'
    - versionName: projects/$PROJECT_ID/secrets/db-host/versions/latest
      env: 'DB_HOST'
    - versionName: projects/$PROJECT_ID/secrets/db-name/versions/latest
      env: 'DB_NAME'
    - versionName: projects/$PROJECT_ID/secrets/db-user/versions/latest
      env: 'DB_USER'

images:
  - 'gcr.io/$PROJECT_ID/django-app:$COMMIT_SHA'

options:
  logging: CLOUD_LOGGING_ONLY
```

## Storing Secrets

Store your database credentials and Django secret key in Secret Manager.

```bash
# Store the database password
echo -n "your-secure-password" | \
    gcloud secrets create db-password --data-file=-

# Store the Django secret key
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())" | \
    gcloud secrets create django-secret-key --data-file=-
```

## Granting Permissions

Cloud Build and Cloud Run need appropriate permissions.

```bash
# Get the Cloud Build service account
PROJECT_NUMBER=$(gcloud projects describe my-project --format='value(projectNumber)')
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Grant Cloud Build permission to deploy to Cloud Run
gcloud projects add-iam-policy-binding my-project \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="roles/run.admin"

# Grant Cloud Build permission to act as the Cloud Run service account
gcloud iam service-accounts add-iam-policy-binding \
    ${PROJECT_NUMBER}-compute@developer.gserviceaccount.com \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="roles/iam.serviceAccountUser"

# Grant Cloud Build access to secrets
gcloud projects add-iam-policy-binding my-project \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="roles/secretmanager.secretAccessor"

# Grant the Cloud Run service account access to Cloud SQL
gcloud projects add-iam-policy-binding my-project \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/cloudsql.client"
```

## Running the Build

Trigger the build manually or set up a trigger on your repository.

```bash
# Run the build manually
gcloud builds submit --config cloudbuild.yaml .

# Or set up a trigger for automatic builds on git push
gcloud builds triggers create github \
    --repo-name=my-django-app \
    --repo-owner=myorg \
    --branch-pattern="^main$" \
    --build-config=cloudbuild.yaml
```

## Local Development

For local development, connect to Cloud SQL through the Cloud SQL Auth Proxy.

```bash
# Download and run the Cloud SQL Auth Proxy
cloud-sql-proxy my-project:us-central1:my-instance &

# Set environment variables for local development
export DB_HOST=127.0.0.1
export DB_PORT=5432
export DB_NAME=myapp
export DB_USER=appuser
export DB_PASSWORD=your-secure-password

# Run Django locally
python manage.py runserver
```

## Monitoring Your Django Application

Once deployed, you want to know if your application is healthy. OneUptime (https://oneuptime.com) can monitor your Cloud Run endpoint, track response times, and alert you when your Django application experiences downtime or performance degradation. This is especially important when your application depends on Cloud SQL, since database connectivity issues can surface as application errors.

## Summary

The Django, Cloud SQL, and Cloud Run combination is a production-ready stack that requires minimal operational overhead. Cloud SQL manages your database, Cloud Run scales your application containers, and Cloud Build automates the deployment. The main things to get right are the database connection configuration (Unix socket on Cloud Run vs TCP locally), secret management through Secret Manager, and IAM permissions for all the service accounts involved. Once these pieces are in place, you push code and everything deploys automatically.
