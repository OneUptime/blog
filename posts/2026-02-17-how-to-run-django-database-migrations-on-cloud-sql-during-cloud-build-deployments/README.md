# How to Run Django Database Migrations on Cloud SQL During Cloud Build Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Django, Cloud SQL, Cloud Build, Database Migrations

Description: Learn how to safely run Django database migrations on Cloud SQL as part of your Cloud Build deployment pipeline with proper authentication and error handling.

---

Running database migrations during deployment is one of those things that sounds simple but has a few gotchas on GCP. Your Cloud Build job needs to connect to Cloud SQL, which is on a private network. You need credentials for the database, and you need to handle migration failures gracefully so a bad migration does not leave your database in a broken state while also deploying broken code. In this post, I will cover the patterns that work reliably.

## The Challenge

Cloud Build runs in its own isolated environment. It does not have direct network access to Cloud SQL instances. You need the Cloud SQL Auth Proxy to create a connection, and you need database credentials available during the build. There are a few ways to set this up, and I will cover the most reliable approaches.

## Approach 1: Cloud Build with Cloud SQL Proxy Sidecar

The most common approach uses the Cloud SQL proxy as a step in your Cloud Build pipeline.

```yaml
# cloudbuild.yaml - Run migrations with Cloud SQL proxy
steps:
  # Step 1: Build the application image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/my-django-app:$COMMIT_SHA', '.']

  # Step 2: Push the image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/my-django-app:$COMMIT_SHA']

  # Step 3: Run migrations using Cloud SQL proxy in a Docker network
  - name: 'gcr.io/cloud-builders/docker'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Start Cloud SQL proxy in the background
        docker run -d --name cloudsql-proxy --network cloudbuild \
          gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.8.0 \
          --address 0.0.0.0 --port 5432 \
          $PROJECT_ID:us-central1:my-instance

        # Wait for the proxy to be ready
        sleep 5

        # Run migrations using the application image
        docker run --network cloudbuild \
          -e DB_HOST=cloudsql-proxy \
          -e DB_PORT=5432 \
          -e DB_NAME=$$DB_NAME \
          -e DB_USER=$$DB_USER \
          -e DB_PASSWORD=$$DB_PASSWORD \
          gcr.io/$PROJECT_ID/my-django-app:$COMMIT_SHA \
          python manage.py migrate --noinput

        # Clean up the proxy container
        docker stop cloudsql-proxy
        docker rm cloudsql-proxy
    secretEnv: ['DB_NAME', 'DB_USER', 'DB_PASSWORD']

  # Step 4: Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'my-django-app'
      - '--image=gcr.io/$PROJECT_ID/my-django-app:$COMMIT_SHA'
      - '--region=us-central1'
      - '--add-cloudsql-instances=$PROJECT_ID:us-central1:my-instance'
      - '--set-env-vars=DB_HOST=/cloudsql/$PROJECT_ID:us-central1:my-instance,DB_NAME=myapp'
      - '--set-secrets=DB_PASSWORD=db-password:latest,DB_USER=db-user:latest'
      - '--allow-unauthenticated'

availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/db-password/versions/latest
      env: 'DB_PASSWORD'
    - versionName: projects/$PROJECT_ID/secrets/db-user/versions/latest
      env: 'DB_USER'
    - versionName: projects/$PROJECT_ID/secrets/db-name/versions/latest
      env: 'DB_NAME'

images:
  - 'gcr.io/$PROJECT_ID/my-django-app:$COMMIT_SHA'
```

## Approach 2: Migration Script with Direct Connection

If your Cloud SQL instance has a public IP or you have configured private IP access from Cloud Build, you can connect directly.

```python
# run_migrations.py - Migration script for Cloud Build
import subprocess
import sys
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migrations():
    """Run Django migrations with error handling."""
    logger.info("Starting database migrations...")

    # Show which migrations will be applied
    logger.info("Checking pending migrations:")
    result = subprocess.run(
        ["python", "manage.py", "showmigrations", "--plan"],
        capture_output=True,
        text=True,
    )
    logger.info(result.stdout)

    # Check for unapplied migrations
    check_result = subprocess.run(
        ["python", "manage.py", "migrate", "--check"],
        capture_output=True,
        text=True,
    )

    if check_result.returncode == 0:
        logger.info("No pending migrations. Database is up to date.")
        return True

    # Run the migrations
    logger.info("Applying migrations...")
    migrate_result = subprocess.run(
        ["python", "manage.py", "migrate", "--noinput"],
        capture_output=True,
        text=True,
    )

    if migrate_result.returncode != 0:
        logger.error(f"Migration failed!\nstdout: {migrate_result.stdout}\nstderr: {migrate_result.stderr}")
        return False

    logger.info(f"Migrations applied successfully:\n{migrate_result.stdout}")
    return True

if __name__ == "__main__":
    success = run_migrations()
    sys.exit(0 if success else 1)
```

## Approach 3: Cloud Run Job for Migrations

A cleaner approach is to use a Cloud Run job specifically for running migrations. This separates migration execution from the build pipeline.

```yaml
# cloudbuild.yaml - Using Cloud Run jobs for migrations
steps:
  # Step 1: Build and push the image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/my-django-app:$COMMIT_SHA', '.']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/my-django-app:$COMMIT_SHA']

  # Step 2: Run migrations as a Cloud Run job
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Create or update the migration job
        gcloud run jobs update django-migrate \
          --image gcr.io/$PROJECT_ID/my-django-app:$COMMIT_SHA \
          --region us-central1 \
          --set-cloudsql-instances=$PROJECT_ID:us-central1:my-instance \
          --set-env-vars=DB_HOST=/cloudsql/$PROJECT_ID:us-central1:my-instance,DB_NAME=myapp \
          --set-secrets=DB_PASSWORD=db-password:latest,DB_USER=db-user:latest \
          --command=python,manage.py,migrate,--noinput \
          --max-retries=1 \
          --task-timeout=300s \
          2>/dev/null || \
        gcloud run jobs create django-migrate \
          --image gcr.io/$PROJECT_ID/my-django-app:$COMMIT_SHA \
          --region us-central1 \
          --set-cloudsql-instances=$PROJECT_ID:us-central1:my-instance \
          --set-env-vars=DB_HOST=/cloudsql/$PROJECT_ID:us-central1:my-instance,DB_NAME=myapp \
          --set-secrets=DB_PASSWORD=db-password:latest,DB_USER=db-user:latest \
          --command=python,manage.py,migrate,--noinput \
          --max-retries=1 \
          --task-timeout=300s

        # Execute the migration job and wait for completion
        gcloud run jobs execute django-migrate \
          --region us-central1 \
          --wait

  # Step 3: Deploy the application only after migrations succeed
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'my-django-app'
      - '--image=gcr.io/$PROJECT_ID/my-django-app:$COMMIT_SHA'
      - '--region=us-central1'
      - '--add-cloudsql-instances=$PROJECT_ID:us-central1:my-instance'
      - '--set-env-vars=DB_HOST=/cloudsql/$PROJECT_ID:us-central1:my-instance'
      - '--set-secrets=DB_PASSWORD=db-password:latest,DB_USER=db-user:latest'

images:
  - 'gcr.io/$PROJECT_ID/my-django-app:$COMMIT_SHA'
```

## Django Settings for Cloud Build

Your Django settings need to handle both the Cloud Build environment (TCP connection through proxy) and the Cloud Run environment (Unix socket).

```python
# settings.py - Database configuration that works in both environments
import os

# Detect the environment
# Cloud Run uses Unix socket, Cloud Build uses TCP through proxy
DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = os.environ.get("DB_PORT", "")

# If DB_HOST starts with /cloudsql, it is a Unix socket (Cloud Run)
# If it is a hostname or IP, it is TCP (Cloud Build or local)
if DB_HOST.startswith("/cloudsql"):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("DB_NAME", "myapp"),
            "USER": os.environ.get("DB_USER", "appuser"),
            "PASSWORD": os.environ.get("DB_PASSWORD", ""),
            "HOST": DB_HOST,  # Unix socket path
            "PORT": "",       # No port for Unix sockets
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("DB_NAME", "myapp"),
            "USER": os.environ.get("DB_USER", "appuser"),
            "PASSWORD": os.environ.get("DB_PASSWORD", ""),
            "HOST": DB_HOST,
            "PORT": DB_PORT or "5432",
        }
    }
```

## Safe Migration Practices

Not all migrations are safe to run during deployment. Here are some patterns to avoid downtime.

```python
# migrations/0025_add_email_index.py - Safe migration example
from django.db import migrations, models

class Migration(migrations.Migration):
    """Add an index concurrently to avoid locking the table."""

    # Allow this migration to run outside of a transaction
    # Required for CREATE INDEX CONCURRENTLY on PostgreSQL
    atomic = False

    dependencies = [
        ('myapp', '0024_previous_migration'),
    ]

    operations = [
        # Use AddIndex with concurrently=True for zero-downtime index creation
        migrations.AddIndex(
            model_name='user',
            index=models.Index(
                fields=['email'],
                name='idx_user_email',
            ),
        ),
    ]
```

```python
# migrations/0026_add_optional_column.py - Adding a nullable column is safe
from django.db import migrations, models

class Migration(migrations.Migration):
    """Add a new nullable column - safe for zero-downtime deployment."""

    dependencies = [
        ('myapp', '0025_add_email_index'),
    ]

    operations = [
        # Adding a nullable column does not lock the table or break existing code
        migrations.AddField(
            model_name='user',
            name='phone_number',
            field=models.CharField(max_length=20, null=True, blank=True),
        ),
    ]
```

## Pre-Deployment Migration Check

Add a check step before deploying to verify migrations are compatible.

```python
# check_migrations.py - Verify migrations before deployment
import subprocess
import sys

def check_migration_safety():
    """Check for potentially dangerous migrations."""
    result = subprocess.run(
        ["python", "manage.py", "showmigrations", "--plan"],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        print(f"Error checking migrations: {result.stderr}")
        return False

    # Parse the planned migrations
    pending = []
    for line in result.stdout.strip().split("\n"):
        if line.strip().startswith("[ ]"):
            pending.append(line.strip())

    if not pending:
        print("No pending migrations.")
        return True

    print(f"Pending migrations ({len(pending)}):")
    for migration in pending:
        print(f"  {migration}")

    # Run sqlmigrate to inspect the actual SQL
    print("\nGenerated SQL:")
    for migration in pending:
        # Extract app and migration name
        parts = migration.replace("[ ]", "").strip().split(".")
        if len(parts) >= 2:
            app, name = parts[0].strip(), parts[1].strip()
            sql_result = subprocess.run(
                ["python", "manage.py", "sqlmigrate", app, name],
                capture_output=True,
                text=True,
            )
            print(f"\n-- {app}.{name} --")
            print(sql_result.stdout)

    return True

if __name__ == "__main__":
    check_migration_safety()
```

## IAM Permissions

Make sure Cloud Build has the right permissions.

```bash
PROJECT_NUMBER=$(gcloud projects describe my-project --format='value(projectNumber)')
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Cloud SQL client access
gcloud projects add-iam-policy-binding my-project \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="roles/cloudsql.client"

# Secret Manager access
gcloud projects add-iam-policy-binding my-project \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="roles/secretmanager.secretAccessor"

# Cloud Run admin (for deploying)
gcloud projects add-iam-policy-binding my-project \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="roles/run.admin"

# Cloud Run jobs admin (if using Cloud Run jobs for migrations)
gcloud projects add-iam-policy-binding my-project \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="roles/run.developer"
```

## Monitoring Deployments

Failed migrations can leave your database in an inconsistent state. OneUptime (https://oneuptime.com) can monitor your Django application on Cloud Run and alert you when the deployment causes errors, helping you catch migration-related issues quickly.

## Summary

Running Django migrations during Cloud Build deployments requires solving the Cloud SQL connectivity problem and handling failures gracefully. The Cloud Run jobs approach is the cleanest because it uses the same container image and Cloud SQL connection method as your production service. Whichever approach you choose, always run migrations before deploying the new code (so the new code finds the schema it expects), use nullable columns and concurrent indexes for zero-downtime migrations, and inspect the generated SQL before applying migrations to production.
