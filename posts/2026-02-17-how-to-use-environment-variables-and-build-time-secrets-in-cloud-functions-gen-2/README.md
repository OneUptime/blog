# How to Use Environment Variables and Build-Time Secrets in Cloud Functions Gen 2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Functions, Environment Variables, Secrets, Configuration

Description: A complete guide to managing environment variables and build-time secrets in Google Cloud Functions Gen 2 for proper configuration management across environments.

---

Configuration management in Cloud Functions is something that seems straightforward until you have multiple environments, sensitive credentials, and build-time dependencies to handle. Gen 2 Cloud Functions give you several ways to inject configuration - plain environment variables, runtime secrets from Secret Manager, build-time environment variables, and mounted secret files. Each has its place, and picking the right one matters for both security and operational simplicity.

Let me break down each option and show you when to use what.

## Plain Environment Variables

Environment variables are the simplest configuration mechanism. They are set at deploy time and available to your function at runtime via `process.env` (Node.js) or `os.environ` (Python).

### Setting Environment Variables at Deploy Time

```bash
# Set individual environment variables
gcloud functions deploy my-function \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=handler \
  --trigger-http \
  --set-env-vars="APP_ENV=production,LOG_LEVEL=info,MAX_RETRIES=3"
```

For many variables, use a file:

```bash
# Create an env vars file (YAML format)
# env.yaml
APP_ENV: production
LOG_LEVEL: info
MAX_RETRIES: "3"
ALLOWED_ORIGINS: "https://app.example.com,https://admin.example.com"
FEATURE_FLAG_NEW_UI: "true"
```

```bash
# Deploy using the env vars file
gcloud functions deploy my-function \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=handler \
  --trigger-http \
  --env-vars-file=env.yaml
```

### Updating Environment Variables Without Redeploying Code

You can update environment variables without changing the function code:

```bash
# Update a single environment variable
gcloud functions deploy my-function \
  --gen2 \
  --region=us-central1 \
  --update-env-vars="LOG_LEVEL=debug"

# Remove an environment variable
gcloud functions deploy my-function \
  --gen2 \
  --region=us-central1 \
  --remove-env-vars="FEATURE_FLAG_NEW_UI"
```

### Accessing Environment Variables in Code

```javascript
// index.js - Reading environment variables in Node.js
const functions = require('@google-cloud/functions-framework');

// Read config at module level for values that do not change per request
const config = {
  appEnv: process.env.APP_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
};

console.log(`Starting in ${config.appEnv} mode with log level ${config.logLevel}`);

functions.http('handler', (req, res) => {
  // Use config throughout your function
  if (config.logLevel === 'debug') {
    console.log('Request headers:', req.headers);
  }

  res.json({
    environment: config.appEnv,
    version: process.env.K_REVISION || 'unknown'
  });
});
```

Python version:

```python
# main.py - Reading environment variables in Python
import os
import functions_framework

# Read config at module level
APP_ENV = os.environ.get('APP_ENV', 'development')
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'info')
MAX_RETRIES = int(os.environ.get('MAX_RETRIES', '3'))

@functions_framework.http
def handler(request):
    return {
        'environment': APP_ENV,
        'logLevel': LOG_LEVEL
    }
```

## Runtime Secrets from Secret Manager

For sensitive values like API keys, database passwords, and tokens, use Secret Manager instead of plain environment variables. Gen 2 functions can mount secrets as environment variables or files.

### Mounting Secrets as Environment Variables

```bash
# Create secrets in Secret Manager first
echo -n "sk_live_abc123" | gcloud secrets create stripe-key --data-file=-
echo -n "super-secret-password" | gcloud secrets create db-password --data-file=-

# Grant the function's service account access
gcloud secrets add-iam-policy-binding stripe-key \
  --member="serviceAccount:my-project@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding db-password \
  --member="serviceAccount:my-project@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Deploy with secrets mounted as env vars
gcloud functions deploy my-function \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=handler \
  --trigger-http \
  --set-env-vars="APP_ENV=production,LOG_LEVEL=info" \
  --set-secrets="STRIPE_KEY=stripe-key:latest,DB_PASSWORD=db-password:latest"
```

In your code, these look just like regular environment variables:

```javascript
// Secrets mounted as env vars are accessed the same way
const stripeKey = process.env.STRIPE_KEY;
const dbPassword = process.env.DB_PASSWORD;
```

The difference is that these values are fetched from Secret Manager at instance startup, not stored in the function's metadata. They are not visible in the Cloud Console's function configuration.

### Mounting Secrets as Files

For multi-line secrets like TLS certificates or JSON service account keys, mount them as files:

```bash
# Mount a secret as a file at a specific path
gcloud functions deploy my-function \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=handler \
  --trigger-http \
  --set-secrets="/etc/secrets/tls-cert.pem=tls-certificate:latest,/etc/secrets/sa-key.json=service-account-key:latest"
```

```javascript
// Read the mounted secret files
const fs = require('fs');

// TLS certificate mounted as a file
const tlsCert = fs.readFileSync('/etc/secrets/tls-cert.pem', 'utf-8');

// Service account key mounted as a file
const saKey = JSON.parse(
  fs.readFileSync('/etc/secrets/sa-key.json', 'utf-8')
);
```

### Pinning Secret Versions

For stability in production, pin to a specific secret version instead of using `latest`:

```bash
# Use a specific version (version 3 in this case)
gcloud functions deploy my-function \
  --gen2 \
  --region=us-central1 \
  --set-secrets="STRIPE_KEY=stripe-key:3,DB_PASSWORD=db-password:5"
```

This prevents a secret rotation from unexpectedly changing your function's behavior. When you rotate a secret, you explicitly update the version number in your deployment.

## Build-Time Environment Variables

Gen 2 functions support build-time environment variables that are available during the build step (when your code is compiled or dependencies are installed) but NOT at runtime.

This is useful for:
- Private npm registry authentication tokens
- Custom build flags
- Package manager configuration

```bash
# Set build environment variables
gcloud functions deploy my-function \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=handler \
  --trigger-http \
  --set-build-env-vars="NPM_TOKEN=abc123,NODE_ENV=production"
```

A common use case is authenticating with a private npm registry during the build:

Create a `.npmrc` file in your function source:

```
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
@mycompany:registry=https://npm.pkg.github.com
```

Then set the `NPM_TOKEN` as a build-time variable. The token is available when `npm install` runs during the build, but it is not present at runtime.

### Build-Time Secrets

For sensitive build-time values, you can reference Secret Manager secrets:

```bash
# Use Secret Manager for build-time secrets
gcloud functions deploy my-function \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=handler \
  --trigger-http \
  --set-build-env-vars="NPM_TOKEN=projects/my-project/secrets/npm-token/versions/latest"
```

## Managing Configuration Across Environments

Here is a practical pattern for managing configuration across development, staging, and production:

```bash
# Directory structure
# config/
#   dev.yaml
#   staging.yaml
#   prod.yaml
```

Each file contains the environment-specific variables:

```yaml
# config/prod.yaml
APP_ENV: production
LOG_LEVEL: warn
MAX_RETRIES: "5"
CACHE_TTL_SECONDS: "3600"
CORS_ORIGINS: "https://app.example.com"
```

```yaml
# config/dev.yaml
APP_ENV: development
LOG_LEVEL: debug
MAX_RETRIES: "1"
CACHE_TTL_SECONDS: "60"
CORS_ORIGINS: "*"
```

Deploy with the appropriate config file:

```bash
# Deploy to production
gcloud functions deploy my-function \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=handler \
  --trigger-http \
  --env-vars-file=config/prod.yaml \
  --set-secrets="STRIPE_KEY=stripe-key-prod:latest,DB_PASSWORD=db-password-prod:latest"

# Deploy to staging
gcloud functions deploy my-function-staging \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=handler \
  --trigger-http \
  --env-vars-file=config/staging.yaml \
  --set-secrets="STRIPE_KEY=stripe-key-staging:latest,DB_PASSWORD=db-password-staging:latest"
```

## Terraform Configuration

Here is how to manage all of this in Terraform:

```hcl
resource "google_cloudfunctions2_function" "api" {
  name     = "my-function"
  location = "us-central1"

  build_config {
    runtime     = "nodejs20"
    entry_point = "handler"

    # Build-time environment variables
    environment_variables = {
      NODE_ENV = "production"
    }

    source {
      storage_source {
        bucket = google_storage_bucket.source.name
        object = google_storage_bucket_object.source.name
      }
    }
  }

  service_config {
    available_memory = "256Mi"

    # Runtime environment variables
    environment_variables = {
      APP_ENV    = "production"
      LOG_LEVEL  = "warn"
      MAX_RETRIES = "5"
    }

    # Runtime secrets from Secret Manager
    secret_environment_variables {
      key        = "STRIPE_KEY"
      project_id = var.project_id
      secret     = google_secret_manager_secret.stripe_key.secret_id
      version    = "latest"
    }

    secret_environment_variables {
      key        = "DB_PASSWORD"
      project_id = var.project_id
      secret     = google_secret_manager_secret.db_password.secret_id
      version    = "latest"
    }
  }
}
```

## Debugging Configuration Issues

When your function is not picking up the right configuration, check these common issues.

Use OneUptime to set up alerts on function errors that might be caused by missing configuration. A function that suddenly starts failing after a deployment might have a missing or incorrect environment variable. Catching these configuration issues quickly means less downtime and faster resolution.

The general rule is simple: use plain environment variables for non-sensitive configuration, use Secret Manager for anything sensitive, and use build-time variables only for build dependencies. Keep your configuration well-organized across environments, and you will avoid the configuration drift that makes debugging production issues painful.
