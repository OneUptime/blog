# How to Use the google-cloud-secret-manager Python Library to Load Secrets at Runtime in Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Secret Manager, Python, Cloud Run, Security

Description: Learn how to securely load secrets at runtime in Cloud Run applications using the google-cloud-secret-manager Python library instead of environment variables.

---

Hardcoding secrets in environment variables or config files is a common shortcut that creates real security risks. Even if you are careful, secrets in environment variables can leak through process listings, error reports, or log dumps. Google Cloud Secret Manager provides a proper solution - it stores secrets centrally, controls access through IAM, and maintains version history. In this post, I will show you how to load secrets at runtime from a Python application running on Cloud Run.

## Why Not Just Use Environment Variables?

Cloud Run supports setting environment variables during deployment, and you might wonder why that is not good enough. Here is the issue: environment variables are set at deploy time and visible to anyone who can describe the Cloud Run service. They also show up in revision metadata. With Secret Manager, the secret value is only fetched at runtime by the application itself, and access is controlled through IAM permissions.

## Installation

Install the Secret Manager client library.

```bash
# Install the Secret Manager Python client
pip install google-cloud-secret-manager
```

## Creating Secrets

Before your application can load secrets, they need to exist in Secret Manager. You can create them through the console, gcloud CLI, or the API.

```bash
# Create a secret
gcloud secrets create database-password --replication-policy="automatic"

# Add a secret version (the actual value)
echo -n "super-secret-db-password" | gcloud secrets versions add database-password --data-file=-

# Create another secret for an API key
echo -n "sk-abc123def456" | gcloud secrets versions add api-key --data-file=-
```

## Loading Secrets in Python

Here is the basic pattern for accessing a secret from your application.

```python
from google.cloud import secretmanager

def get_secret(project_id, secret_id, version_id="latest"):
    """Fetch a secret value from Secret Manager."""
    # Create the Secret Manager client
    client = secretmanager.SecretManagerServiceClient()

    # Build the resource name for the secret version
    name = f"projects/{project_id}/secrets/{secret_id}/versions/{version_id}"

    # Access the secret version
    response = client.access_secret_version(request={"name": name})

    # The payload is bytes, decode to string
    secret_value = response.payload.data.decode("UTF-8")
    return secret_value

# Usage
db_password = get_secret("my-gcp-project", "database-password")
api_key = get_secret("my-gcp-project", "api-key")
```

## Caching Secrets for Performance

Calling Secret Manager on every request adds latency. In most cases, you should cache secrets and refresh them periodically.

```python
from google.cloud import secretmanager
import time
import threading

class SecretCache:
    """Cache for Secret Manager values with automatic refresh."""

    def __init__(self, project_id, refresh_interval=300):
        self.project_id = project_id
        self.refresh_interval = refresh_interval  # Seconds between refreshes
        self.client = secretmanager.SecretManagerServiceClient()
        self._cache = {}
        self._timestamps = {}
        self._lock = threading.Lock()

    def get(self, secret_id, version="latest"):
        """Get a secret value, using cache when available."""
        cache_key = f"{secret_id}:{version}"

        with self._lock:
            # Check if we have a cached value that is still fresh
            if cache_key in self._cache:
                age = time.time() - self._timestamps[cache_key]
                if age < self.refresh_interval:
                    return self._cache[cache_key]

        # Fetch from Secret Manager
        name = f"projects/{self.project_id}/secrets/{secret_id}/versions/{version}"
        response = self.client.access_secret_version(request={"name": name})
        value = response.payload.data.decode("UTF-8")

        # Update the cache
        with self._lock:
            self._cache[cache_key] = value
            self._timestamps[cache_key] = time.time()

        return value

# Initialize the cache once at startup
secrets = SecretCache("my-gcp-project", refresh_interval=300)

# Use it throughout your application
db_password = secrets.get("database-password")
api_key = secrets.get("api-key")
```

## Integrating with a FastAPI Application on Cloud Run

Here is a practical example showing how to use Secret Manager in a FastAPI application deployed on Cloud Run.

```python
# main.py - FastAPI app with Secret Manager integration
from fastapi import FastAPI, Depends
from google.cloud import secretmanager
from contextlib import asynccontextmanager
import os
import logging

logger = logging.getLogger(__name__)

# Store loaded secrets in a module-level dictionary
app_secrets = {}

def load_secrets():
    """Load all required secrets at startup."""
    client = secretmanager.SecretManagerServiceClient()
    project_id = os.environ.get("GCP_PROJECT", "my-gcp-project")

    # Define which secrets we need
    required_secrets = [
        "database-url",
        "redis-password",
        "jwt-signing-key",
        "stripe-api-key",
    ]

    for secret_id in required_secrets:
        try:
            name = f"projects/{project_id}/secrets/{secret_id}/versions/latest"
            response = client.access_secret_version(request={"name": name})
            app_secrets[secret_id] = response.payload.data.decode("UTF-8")
            logger.info(f"Loaded secret: {secret_id}")
        except Exception as e:
            logger.error(f"Failed to load secret {secret_id}: {e}")
            raise

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load secrets when the application starts."""
    load_secrets()
    logger.info(f"Loaded {len(app_secrets)} secrets")
    yield
    # Cleanup on shutdown if needed
    app_secrets.clear()

app = FastAPI(lifespan=lifespan)

def get_secret(name: str) -> str:
    """Dependency that provides access to secrets."""
    if name not in app_secrets:
        raise ValueError(f"Secret '{name}' not loaded")
    return app_secrets[name]

@app.get("/health")
async def health():
    """Health check that verifies secrets are loaded."""
    return {
        "status": "healthy",
        "secrets_loaded": len(app_secrets),
    }
```

## Using Secrets for Database Connections

A common pattern is loading the database connection string from Secret Manager at startup.

```python
import sqlalchemy
from google.cloud import secretmanager
import os

def get_database_url():
    """Build the database URL using a password from Secret Manager."""
    client = secretmanager.SecretManagerServiceClient()
    project_id = os.environ.get("GCP_PROJECT")

    # Fetch the database password
    name = f"projects/{project_id}/secrets/database-password/versions/latest"
    response = client.access_secret_version(request={"name": name})
    db_password = response.payload.data.decode("UTF-8")

    # Build the connection string - host and database name from env vars
    db_host = os.environ.get("DB_HOST", "localhost")
    db_name = os.environ.get("DB_NAME", "myapp")
    db_user = os.environ.get("DB_USER", "appuser")

    return f"postgresql://{db_user}:{db_password}@{db_host}/{db_name}"

# Create the SQLAlchemy engine with the secret-based URL
engine = sqlalchemy.create_engine(get_database_url())
```

## IAM Permissions

Your Cloud Run service needs the right IAM role to access secrets. The service account running your Cloud Run service needs the `secretmanager.secretAccessor` role.

```bash
# Grant the Cloud Run service account access to secrets
gcloud secrets add-iam-policy-binding database-password \
    --member="serviceAccount:my-service@my-project.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# Or grant access to all secrets in the project (less secure but simpler)
gcloud projects add-iam-policy-binding my-project \
    --member="serviceAccount:my-service@my-project.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

## Cloud Run Native Secret Integration

Cloud Run also supports mounting secrets as environment variables or files without code changes. This is a middle ground between hardcoded env vars and runtime fetching.

```bash
# Deploy Cloud Run with secrets mounted as environment variables
gcloud run deploy my-service \
    --image gcr.io/my-project/my-service \
    --set-secrets="DB_PASSWORD=database-password:latest,API_KEY=api-key:latest" \
    --region us-central1

# Or mount secrets as files
gcloud run deploy my-service \
    --image gcr.io/my-project/my-service \
    --set-secrets="/secrets/db-password=database-password:latest" \
    --region us-central1
```

With file mounting, your application reads the secret from the filesystem.

```python
import os

def read_mounted_secret(path):
    """Read a secret that was mounted as a file by Cloud Run."""
    with open(path, "r") as f:
        return f.read().strip()

# Read the mounted secret
db_password = read_mounted_secret("/secrets/db-password")
```

## Secret Rotation

When you rotate secrets, you add a new version. Your application will automatically get the new version on the next fetch if it uses the "latest" alias.

```python
from google.cloud import secretmanager

def rotate_secret(project_id, secret_id, new_value):
    """Add a new version to a secret (rotation)."""
    client = secretmanager.SecretManagerServiceClient()

    # The parent is the secret itself, not a version
    parent = f"projects/{project_id}/secrets/{secret_id}"

    # Add a new version with the updated value
    response = client.add_secret_version(
        request={
            "parent": parent,
            "payload": {"data": new_value.encode("UTF-8")},
        }
    )

    print(f"Added secret version: {response.name}")

    # Optionally, disable old versions
    # List all versions and disable everything except the latest
    versions = client.list_secret_versions(request={"parent": parent})
    for version in versions:
        if version.state == secretmanager.SecretVersion.State.ENABLED:
            if version.name != response.name:
                client.disable_secret_version(request={"name": version.name})
                print(f"Disabled old version: {version.name}")
```

## Monitoring Secret Access

Keep an eye on your secrets in production. Audit logs tell you who accessed what and when. OneUptime (https://oneuptime.com) can monitor the health of your Cloud Run services and alert you when things break, which could indicate issues with secret loading or access permission changes affecting your application.

## Summary

Loading secrets at runtime from Secret Manager is more secure than baking them into environment variables or config files. The key practices are: load secrets at application startup and cache them, use IAM to control which services can access which secrets, rotate secrets by adding new versions, and use Cloud Run's native secret mounting for simpler use cases. The `google-cloud-secret-manager` library makes all of this straightforward from Python.
