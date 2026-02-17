# How to Deploy a Django Application to Azure App Service with PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Django, Python, App Service, PostgreSQL, Deployment, Web Development

Description: Step-by-step guide to deploying a Django application to Azure App Service with an Azure Database for PostgreSQL backend.

---

Deploying Django to a cloud platform used to mean configuring Nginx, Gunicorn, systemd services, and managing your own server. Azure App Service handles all of that infrastructure for you. Paired with Azure Database for PostgreSQL, you get a fully managed stack where you can focus on writing Django code instead of managing servers.

In this post, I will walk through deploying a Django app to Azure App Service with a PostgreSQL database, covering everything from project configuration to deployment.

## Project Setup

I will assume you already have a Django project. If not, here is a quick setup.

```bash
# Create a project directory and virtual environment
mkdir django-azure-demo && cd django-azure-demo
python -m venv venv
source venv/bin/activate

# Install Django and database adapter
pip install django psycopg2-binary gunicorn whitenoise

# Start a new Django project
django-admin startproject mysite .
python manage.py startapp core
```

## Configuring Django for Production

Before deploying, your Django settings need to be production-ready. Create a separate settings approach or use environment variables.

Here is what needs to change in your settings.py for Azure deployment.

```python
# mysite/settings.py
import os

# Read from environment variables, with sensible defaults for local dev
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "change-me-in-production")
DEBUG = os.environ.get("DJANGO_DEBUG", "True").lower() == "true"
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

# Database configuration
# Uses PostgreSQL in production (from environment), SQLite locally
if "DATABASE_URL" in os.environ:
    import urllib.parse
    db_url = urllib.parse.urlparse(os.environ["DATABASE_URL"])
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": db_url.path[1:],  # Remove leading slash
            "USER": db_url.username,
            "PASSWORD": db_url.password,
            "HOST": db_url.hostname,
            "PORT": db_url.port or 5432,
            "OPTIONS": {
                "sslmode": "require"  # Azure PostgreSQL requires SSL
            }
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": os.path.join(BASE_DIR, "db.sqlite3"),
        }
    }

# Static files with WhiteNoise
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # Serve static files
    # ... rest of middleware
]

STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}
```

WhiteNoise serves static files directly from your application, which is the simplest approach for App Service. For high-traffic sites, you might want to use Azure CDN or Blob Storage instead.

## Creating the Requirements File

```bash
# Generate requirements.txt
pip freeze > requirements.txt
```

Make sure these packages are in your requirements.txt:

```
Django>=4.2
psycopg2-binary>=2.9
gunicorn>=21.2
whitenoise>=6.5
```

## Creating Azure Resources

Now set up the Azure infrastructure.

```bash
# Create a resource group
az group create --name django-rg --location eastus

# Create an Azure Database for PostgreSQL Flexible Server
az postgres flexible-server create \
    --name django-db-server \
    --resource-group django-rg \
    --location eastus \
    --admin-user dbadmin \
    --admin-password "YourStr0ngP@ssword!" \
    --sku-name Standard_B1ms \
    --tier Burstable \
    --storage-size 32 \
    --version 15

# Create the database
az postgres flexible-server db create \
    --resource-group django-rg \
    --server-name django-db-server \
    --database-name djangodb
```

Now create the App Service.

```bash
# Create an App Service plan (Linux, Python)
az appservice plan create \
    --name django-plan \
    --resource-group django-rg \
    --is-linux \
    --sku B1

# Create the web app
az webapp create \
    --name my-django-app \
    --resource-group django-rg \
    --plan django-plan \
    --runtime "PYTHON:3.11"
```

## Configuring Environment Variables

Set the environment variables your Django app needs.

```bash
# Build the DATABASE_URL
DB_HOST="django-db-server.postgres.database.azure.com"
DB_USER="dbadmin"
DB_PASS="YourStr0ngP@ssword!"
DB_NAME="djangodb"
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:5432/${DB_NAME}"

# Set app settings
az webapp config appsettings set \
    --name my-django-app \
    --resource-group django-rg \
    --settings \
    DATABASE_URL="$DATABASE_URL" \
    DJANGO_SECRET_KEY="$(python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')" \
    DJANGO_DEBUG="False" \
    DJANGO_ALLOWED_HOSTS="my-django-app.azurewebsites.net"
```

## Configuring the Startup Command

App Service needs to know how to start your Django app. Configure a custom startup command that runs migrations and starts Gunicorn.

```bash
# Set the startup command
az webapp config set \
    --name my-django-app \
    --resource-group django-rg \
    --startup-file "gunicorn mysite.wsgi --bind=0.0.0.0:8000 --workers=2 --timeout=120"
```

For running migrations automatically on deployment, create a startup script.

```bash
#!/bin/bash
# startup.sh - Runs on every deployment

# Run database migrations
python manage.py migrate --noinput

# Collect static files
python manage.py collectstatic --noinput

# Start Gunicorn
gunicorn mysite.wsgi --bind=0.0.0.0:8000 --workers=2 --timeout=120
```

Then point App Service to this script.

```bash
az webapp config set \
    --name my-django-app \
    --resource-group django-rg \
    --startup-file "startup.sh"
```

## Deploying the Code

There are several ways to deploy. I will cover the two most common: Git deployment and ZIP deployment.

### Option 1: Local Git Deployment

```bash
# Configure local Git deployment
az webapp deployment source config-local-git \
    --name my-django-app \
    --resource-group django-rg

# Get the deployment URL (something like https://...@my-django-app.scm.azurewebsites.net/my-django-app.git)
az webapp deployment list-publishing-credentials \
    --name my-django-app \
    --resource-group django-rg \
    --query scmUri -o tsv

# Add Azure as a Git remote and push
git remote add azure <deployment-url>
git push azure main
```

### Option 2: ZIP Deployment

```bash
# Package your project
zip -r deploy.zip . -x "venv/*" ".git/*" "__pycache__/*" "*.pyc"

# Deploy the ZIP
az webapp deployment source config-zip \
    --name my-django-app \
    --resource-group django-rg \
    --src deploy.zip
```

### Option 3: Azure CLI (simplest)

```bash
# One-command deployment
az webapp up \
    --name my-django-app \
    --resource-group django-rg \
    --runtime "PYTHON:3.11" \
    --sku B1
```

## Allowing App Service to Connect to PostgreSQL

Azure Database for PostgreSQL has a firewall. You need to allow your App Service to connect.

```bash
# Allow Azure services to connect
az postgres flexible-server firewall-rule create \
    --resource-group django-rg \
    --name django-db-server \
    --rule-name AllowAzureServices \
    --start-ip-address 0.0.0.0 \
    --end-ip-address 0.0.0.0
```

For better security, use VNet integration to keep traffic on the Azure private network.

## Running Migrations

If you did not include migrations in your startup script, run them manually via SSH.

```bash
# SSH into the App Service container
az webapp ssh --name my-django-app --resource-group django-rg

# Inside the container:
python manage.py migrate
python manage.py createsuperuser
```

## Setting Up Custom Domain and HTTPS

```bash
# Add a custom domain
az webapp config hostname add \
    --webapp-name my-django-app \
    --resource-group django-rg \
    --hostname www.mysite.com

# Enable free managed SSL certificate
az webapp config ssl create \
    --name my-django-app \
    --resource-group django-rg \
    --hostname www.mysite.com
```

## Logging and Monitoring

Enable application logging to troubleshoot issues.

```bash
# Enable application logging
az webapp log config \
    --name my-django-app \
    --resource-group django-rg \
    --application-logging filesystem \
    --level information

# Stream logs in real time
az webapp log tail \
    --name my-django-app \
    --resource-group django-rg
```

In your Django settings, configure logging to write to stdout so App Service can capture it.

```python
# mysite/settings.py
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}
```

## Scaling

App Service makes scaling easy.

```bash
# Scale up (bigger machine)
az appservice plan update \
    --name django-plan \
    --resource-group django-rg \
    --sku P1v2

# Scale out (more instances)
az webapp scale \
    --name my-django-app \
    --resource-group django-rg \
    --instance-count 3
```

## Wrapping Up

Deploying Django to Azure App Service with PostgreSQL gives you a fully managed production environment. The key steps are: configure your settings for production (environment variables, WhiteNoise for static files, PostgreSQL), create the Azure resources, set the environment variables, and deploy your code. The startup script handles migrations and starts Gunicorn automatically. From there, Azure handles the infrastructure - SSL certificates, scaling, logging, and health monitoring.
