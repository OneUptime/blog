# How to Use Buildpacks with Procfile to Deploy a Django Application to Cloud Run Without a Dockerfile

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Buildpacks, Django, Python, Cloud Run, Procfile, Serverless

Description: Learn how to deploy a Django application to Google Cloud Run using Buildpacks and a Procfile, eliminating the need to write and maintain a Dockerfile.

---

Django applications have a specific set of requirements for production deployment: a WSGI server, static file handling, database migrations, and environment configuration. Traditionally, you would encode all of this into a Dockerfile. But with Google Cloud Buildpacks, you can skip the Dockerfile entirely. Buildpacks detect your Django application, install dependencies, and the Procfile tells it how to start the application.

This approach works well for teams that want to focus on writing Django code rather than maintaining Docker infrastructure.

## Setting Up the Django Project

Let me start with a typical Django project structure.

```text
my-django-app/
  manage.py
  myproject/
    __init__.py
    settings.py
    urls.py
    wsgi.py
    asgi.py
  myapp/
    __init__.py
    models.py
    views.py
    urls.py
  requirements.txt
  Procfile
  runtime.txt
```

Here is a simple view.

```python
# myapp/views.py - API views for our Django application
from django.http import JsonResponse
from django.views import View
import os

class IndexView(View):
    """Root endpoint returning service info."""
    def get(self, request):
        return JsonResponse({
            "service": "django-buildpacks-demo",
            "environment": os.environ.get("DJANGO_ENV", "development"),
            "debug": os.environ.get("DEBUG", "False")
        })

class HealthView(View):
    """Health check endpoint for Cloud Run."""
    def get(self, request):
        return JsonResponse({"status": "healthy"})
```

Wire up the URLs.

```python
# myproject/urls.py - URL configuration
from django.urls import path
from myapp.views import IndexView, HealthView

urlpatterns = [
    path('', IndexView.as_view(), name='index'),
    path('health/', HealthView.as_view(), name='health'),
]
```

## The Procfile

The Procfile tells Buildpacks how to start your application. For Django, you want gunicorn as the WSGI server.

```text
web: gunicorn myproject.wsgi --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120
```

Buildpacks reads this file and uses the `web` process type as the container's entrypoint. The `$PORT` variable is provided by Cloud Run at runtime.

## The runtime.txt File

This file tells Buildpacks which Python version to use.

```text
python-3.12.1
```

## The requirements.txt File

Include all production dependencies.

```text
# requirements.txt - Production dependencies
Django==5.0
gunicorn==21.2.0
psycopg2-binary==2.9.9
whitenoise==6.6.0
django-environ==0.11.2
```

## Django Settings for Cloud Run

Configure your Django settings for a production Cloud Run environment.

```python
# myproject/settings.py - Production-ready settings
import os
import environ

env = environ.Env(
    DEBUG=(bool, False)
)

# Build paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Security settings
SECRET_KEY = env('SECRET_KEY', default='change-me-in-production')
DEBUG = env('DEBUG')
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['*'])

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'myapp',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    # WhiteNoise serves static files without a CDN
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.middleware.common.CommonMiddleware',
]

ROOT_URLCONF = 'myproject.urls'

# Database configuration
DATABASES = {
    'default': env.db('DATABASE_URL', default='sqlite:///db.sqlite3')
}

# Static files with WhiteNoise
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Cloud Run specific settings
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
```

## Deploying Directly from Source

The simplest deployment path is using `gcloud run deploy --source`.

```bash
# Deploy Django app directly from source using Buildpacks
gcloud run deploy django-app \
    --source=. \
    --region=us-central1 \
    --platform=managed \
    --allow-unauthenticated \
    --set-env-vars="DJANGO_ENV=production,DEBUG=False,SECRET_KEY=your-production-secret" \
    --memory=512Mi \
    --cpu=1
```

Cloud Build automatically uses Buildpacks to build the image. The Buildpack detects the `requirements.txt` file, recognizes it as a Python project, installs dependencies, and uses the Procfile for the entrypoint.

## Running Database Migrations

Cloud Run does not have a built-in way to run one-off commands like migrations. You have a few options.

**Option 1: Run migrations on startup.** Create a custom entrypoint script.

```text
# Procfile - Run migrations before starting the server
web: python manage.py migrate --noinput && gunicorn myproject.wsgi --bind 0.0.0.0:$PORT --workers 2 --threads 4
```

This works for simple cases but can cause issues if multiple instances start simultaneously.

**Option 2: Use Cloud Run Jobs for migrations.**

```bash
# Create a Cloud Run job for migrations
gcloud run jobs create django-migrate \
    --image=us-central1-docker.pkg.dev/my-project/my-repo/django-app:latest \
    --region=us-central1 \
    --command="python" \
    --args="manage.py,migrate,--noinput" \
    --set-env-vars="DATABASE_URL=postgres://..."

# Run the migration job before deploying the new version
gcloud run jobs execute django-migrate --region=us-central1 --wait
```

**Option 3: Run migrations in Cloud Build.**

```yaml
# cloudbuild.yaml - Build, migrate, and deploy
steps:
  # Build with Buildpacks using pack
  - name: 'gcr.io/k8s-skaffold/pack'
    args:
      - 'build'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/django-app:$SHORT_SHA'
      - '--builder=gcr.io/buildpacks/builder:v1'
      - '--publish'

  # Run migrations using the built image
  - name: 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/django-app:$SHORT_SHA'
    entrypoint: 'python'
    args: ['manage.py', 'migrate', '--noinput']
    env:
      - 'DATABASE_URL=postgres://...'

  # Collect static files
  - name: 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/django-app:$SHORT_SHA'
    entrypoint: 'python'
    args: ['manage.py', 'collectstatic', '--noinput']

  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'django-app'
      - '--image=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/django-app:$SHORT_SHA'
      - '--region=us-central1'
      - '--platform=managed'
```

## Handling Static Files

For production Django on Cloud Run, WhiteNoise is the simplest solution. It serves static files directly from your Python process without needing Nginx or a CDN.

Make sure to collect static files as part of your build. You can do this with a `bin/post_compile` script that Buildpacks will run after installing dependencies.

```bash
#!/bin/bash
# bin/post_compile - Runs after pip install during Buildpacks build
python manage.py collectstatic --noinput
```

Make the script executable.

```bash
chmod +x bin/post_compile
```

## Connecting to Cloud SQL

For database connectivity, use the Cloud SQL Auth Proxy built into Cloud Run.

```bash
# Deploy with Cloud SQL connection
gcloud run deploy django-app \
    --source=. \
    --region=us-central1 \
    --set-env-vars="DATABASE_URL=postgres://user:password@/dbname" \
    --add-cloudsql-instances=my-project:us-central1:my-db-instance \
    --set-env-vars="INSTANCE_UNIX_SOCKET=/cloudsql/my-project:us-central1:my-db-instance"
```

Update your Django settings to use the Cloud SQL socket.

```python
# myproject/settings.py - Cloud SQL configuration
import os

if os.environ.get('INSTANCE_UNIX_SOCKET'):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME', 'mydb'),
            'USER': os.environ.get('DB_USER', 'postgres'),
            'PASSWORD': os.environ.get('DB_PASSWORD', ''),
            'HOST': os.environ.get('INSTANCE_UNIX_SOCKET'),
        }
    }
```

## Testing Locally with Pack

Before deploying, you can test the Buildpacks build locally.

```bash
# Build locally using pack CLI
pack build django-app \
    --builder=gcr.io/buildpacks/builder:v1 \
    --env GOOGLE_RUNTIME_VERSION=3.12

# Run locally
docker run -p 8080:8080 \
    -e PORT=8080 \
    -e DEBUG=True \
    -e SECRET_KEY=dev-secret \
    django-app
```

## Wrapping Up

Deploying Django to Cloud Run with Buildpacks and a Procfile is the lowest-friction path to production. You do not need to write a Dockerfile, figure out base images, or manage Python installation in containers. The Procfile gives you control over how gunicorn runs, and the runtime.txt file pins your Python version. For most Django applications, this is all you need to get from code to production.
