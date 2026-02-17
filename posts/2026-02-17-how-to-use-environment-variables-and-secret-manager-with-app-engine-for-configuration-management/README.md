# How to Use Environment Variables and Secret Manager with App Engine for Configuration Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, App Engine, Secret Manager, Environment Variables, Configuration

Description: Learn how to manage application configuration on App Engine using environment variables for settings and Secret Manager for sensitive credentials.

---

Every application needs configuration - database connection strings, API keys, feature flags, service URLs. The challenge is managing this configuration securely and consistently across environments. App Engine gives you environment variables through `app.yaml` for non-sensitive settings, and Google Cloud Secret Manager handles the sensitive stuff like passwords and API keys.

In this post, I will cover both approaches, when to use each, and how to combine them for a clean configuration management strategy.

## Environment Variables in app.yaml

The simplest way to pass configuration to your App Engine app is through the `env_variables` section in `app.yaml`:

```yaml
# app.yaml - Environment variables for application configuration
runtime: python312

env_variables:
  APP_ENV: "production"
  LOG_LEVEL: "info"
  CACHE_TTL: "300"
  API_BASE_URL: "https://api.example.com"
  MAX_RETRIES: "3"
  FEATURE_NEW_UI: "true"
```

These variables are available in your application through the standard environment variable APIs:

```python
# config.py - Reading environment variables in Python
import os

class Config:
    # Application settings from environment variables
    APP_ENV = os.environ.get("APP_ENV", "development")
    LOG_LEVEL = os.environ.get("LOG_LEVEL", "debug")
    CACHE_TTL = int(os.environ.get("CACHE_TTL", "60"))
    API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8080")
    MAX_RETRIES = int(os.environ.get("MAX_RETRIES", "3"))
    FEATURE_NEW_UI = os.environ.get("FEATURE_NEW_UI", "false").lower() == "true"
```

```javascript
// config.js - Reading environment variables in Node.js
const config = {
  appEnv: process.env.APP_ENV || "development",
  logLevel: process.env.LOG_LEVEL || "debug",
  cacheTtl: parseInt(process.env.CACHE_TTL || "60", 10),
  apiBaseUrl: process.env.API_BASE_URL || "http://localhost:8080",
  maxRetries: parseInt(process.env.MAX_RETRIES || "3", 10),
  featureNewUi: process.env.FEATURE_NEW_UI === "true",
};

module.exports = config;
```

## The Problem with Secrets in app.yaml

Here is what you should never do:

```yaml
# BAD - Do not put secrets in app.yaml
env_variables:
  DATABASE_PASSWORD: "super-secret-password"
  API_SECRET_KEY: "sk_live_abc123xyz"
  STRIPE_WEBHOOK_SECRET: "whsec_abc123"
```

The `app.yaml` file is part of your source code. It gets committed to version control, stored in CI/CD systems, and viewed by anyone with access to the repository. Putting secrets here means they end up in git history, build logs, and potentially in places you never intended.

## Setting Up Secret Manager

Secret Manager is a dedicated GCP service for storing and managing sensitive data. Enable it first:

```bash
# Enable the Secret Manager API
gcloud services enable secretmanager.googleapis.com --project=your-project-id
```

Create secrets for your sensitive configuration:

```bash
# Create a secret for your database password
echo -n "my-database-password" | gcloud secrets create DB_PASSWORD \
  --data-file=- \
  --replication-policy=automatic \
  --project=your-project-id

# Create a secret for your API key
echo -n "sk_live_abc123xyz" | gcloud secrets create API_SECRET_KEY \
  --data-file=- \
  --replication-policy=automatic \
  --project=your-project-id

# Create a secret for a service account JSON key
gcloud secrets create SERVICE_ACCOUNT_KEY \
  --data-file=./service-account.json \
  --replication-policy=automatic \
  --project=your-project-id
```

## Granting Access to App Engine

The App Engine default service account needs permission to read secrets:

```bash
# Grant Secret Manager accessor role to App Engine service account
gcloud secrets add-iam-policy-binding DB_PASSWORD \
  --member="serviceAccount:your-project-id@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=your-project-id
```

To grant access to all secrets at once (less granular but simpler):

```bash
# Grant project-wide secret access to App Engine service account
gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:your-project-id@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Accessing Secrets in Python

Install the Secret Manager client library:

```
# requirements.txt
google-cloud-secret-manager==2.18.0
```

Create a utility module for loading secrets:

```python
# secrets_loader.py - Load secrets from Secret Manager
from google.cloud import secretmanager
import os

# Cache secrets to avoid repeated API calls
_secret_cache = {}

def get_secret(secret_id, version="latest"):
    """Retrieve a secret value from Secret Manager.
    Results are cached in memory for the lifetime of the instance.
    """
    cache_key = f"{secret_id}:{version}"
    if cache_key in _secret_cache:
        return _secret_cache[cache_key]

    # Build the resource name
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "your-project-id")
    name = f"projects/{project_id}/secrets/{secret_id}/versions/{version}"

    # Access the secret
    client = secretmanager.SecretManagerServiceClient()
    response = client.access_secret_version(request={"name": name})
    secret_value = response.payload.data.decode("utf-8")

    # Cache the result
    _secret_cache[cache_key] = secret_value
    return secret_value

def get_secret_or_env(secret_id, env_var, default=None):
    """Try Secret Manager first, fall back to environment variable.
    Useful for local development where secrets come from .env files.
    """
    # In development, use environment variables
    if os.environ.get("APP_ENV") == "development":
        return os.environ.get(env_var, default)

    # In production, use Secret Manager
    try:
        return get_secret(secret_id)
    except Exception:
        # Fall back to environment variable if Secret Manager fails
        return os.environ.get(env_var, default)
```

Use it in your application:

```python
# main.py - Using secrets in your application
from secrets_loader import get_secret, get_secret_or_env
import sqlalchemy

# Load database configuration
db_password = get_secret_or_env("DB_PASSWORD", "DB_PASSWORD")
db_user = os.environ.get("DB_USER", "app")
db_name = os.environ.get("DB_NAME", "myapp")

# Build connection string with the secret password
connection_string = f"postgresql://{db_user}:{db_password}@/{db_name}"

# Create database engine
engine = sqlalchemy.create_engine(connection_string)
```

## Accessing Secrets in Node.js

Install the client library:

```bash
npm install @google-cloud/secret-manager
```

```javascript
// secretsLoader.js - Load secrets from Secret Manager
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");

// Cache secrets in memory
const secretCache = new Map();
let client = null;

function getClient() {
  // Lazy initialization of the client
  if (!client) {
    client = new SecretManagerServiceClient();
  }
  return client;
}

async function getSecret(secretId, version = "latest") {
  const cacheKey = `${secretId}:${version}`;
  if (secretCache.has(cacheKey)) {
    return secretCache.get(cacheKey);
  }

  const projectId = process.env.GOOGLE_CLOUD_PROJECT || "your-project-id";
  const name = `projects/${projectId}/secrets/${secretId}/versions/${version}`;

  const [response] = await getClient().accessSecretVersion({ name });
  const secretValue = response.payload.data.toString("utf8");

  // Cache for future calls
  secretCache.set(cacheKey, secretValue);
  return secretValue;
}

module.exports = { getSecret };
```

## Loading Secrets During Warmup

The best time to load secrets is during the warmup phase, so they are ready before user requests arrive:

```python
# Warmup handler that pre-loads secrets
@app.route("/_ah/warmup")
def warmup():
    # Pre-load all secrets during warmup
    secrets_to_load = ["DB_PASSWORD", "API_SECRET_KEY", "REDIS_PASSWORD"]
    for secret_id in secrets_to_load:
        try:
            get_secret(secret_id)
        except Exception as e:
            logger.warning(f"Failed to pre-load secret {secret_id}: {e}")

    return "Warmup complete", 200
```

## Secret Versioning

Secret Manager supports versions, which is useful for secret rotation:

```bash
# Add a new version of a secret (e.g., during password rotation)
echo -n "new-password-value" | gcloud secrets versions add DB_PASSWORD \
  --data-file=- \
  --project=your-project-id

# Disable the old version
gcloud secrets versions disable 1 \
  --secret=DB_PASSWORD \
  --project=your-project-id
```

When you access a secret with version `latest`, you always get the most recent enabled version. Your application picks up the new secret value on the next cold start or when the cache expires.

## Per-Environment Configuration Pattern

A clean pattern is to combine environment variables for non-sensitive per-environment settings with Secret Manager for secrets:

```yaml
# app.yaml for production
env_variables:
  APP_ENV: "production"
  DB_HOST: "/cloudsql/project:region:instance"
  DB_NAME: "production_db"
  DB_USER: "app_user"
  REDIS_HOST: "10.0.0.3"
  LOG_LEVEL: "warning"
  # Note: DB_PASSWORD comes from Secret Manager, not here
```

```yaml
# app-staging.yaml for staging
env_variables:
  APP_ENV: "staging"
  DB_HOST: "/cloudsql/project:region:staging-instance"
  DB_NAME: "staging_db"
  DB_USER: "staging_user"
  REDIS_HOST: "10.0.1.3"
  LOG_LEVEL: "debug"
```

Secrets live in Secret Manager and are loaded at runtime. Non-sensitive configuration lives in `app.yaml` and varies per environment.

## Local Development

For local development, use a `.env` file that mirrors your configuration:

```
# .env - Local development configuration (never commit this file)
APP_ENV=development
DB_PASSWORD=local-dev-password
API_SECRET_KEY=test-key-for-dev
DB_HOST=localhost
DB_NAME=dev_db
REDIS_HOST=localhost
```

Load it with a library like `python-dotenv`:

```python
# Load .env file for local development only
from dotenv import load_dotenv
if os.environ.get("APP_ENV") != "production":
    load_dotenv()
```

Make sure `.env` is in your `.gitignore` and `.gcloudignore` files.

## Summary

Use environment variables in `app.yaml` for non-sensitive configuration like feature flags, service URLs, log levels, and database names. Use Secret Manager for anything sensitive - passwords, API keys, tokens, and certificates. The combination gives you readable configuration files that are safe to commit while keeping secrets secure and auditable. Load secrets during warmup for best performance, cache them in memory to avoid repeated API calls, and provide fallbacks for local development.
