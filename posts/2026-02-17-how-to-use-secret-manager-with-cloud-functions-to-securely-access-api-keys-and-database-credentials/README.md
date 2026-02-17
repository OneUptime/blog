# How to Use Secret Manager with Cloud Functions to Securely Access API Keys and Database Credentials

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Functions, Secret Manager, Security, Serverless

Description: Learn how to securely store and access API keys, database passwords, and other sensitive credentials in Cloud Functions using Google Cloud Secret Manager.

---

Hardcoding API keys and database passwords in Cloud Functions is a terrible idea, but I still see it in production codebases more often than I would like to admit. Environment variables are better than hardcoding, but they are still visible in the Cloud Console, stored in plain text in deployment configs, and can be accidentally logged. Google Cloud Secret Manager solves this properly by giving you a centralized, versioned, access-controlled store for sensitive data.

Here is how to set it up with Cloud Functions so your secrets stay safe.

## Why Not Just Use Environment Variables?

Environment variables work for non-sensitive configuration, but they have real limitations for secrets:

- They are visible to anyone with `cloudfunctions.functions.get` permission
- They show up in deployment descriptors and Terraform state
- They cannot be rotated without redeploying the function
- There is no audit trail of who accessed them
- They are stored unencrypted in the function metadata

Secret Manager addresses all of these issues. Secrets are encrypted at rest, access is controlled via IAM, every access is logged in Cloud Audit Logs, and secrets can be versioned and rotated independently of deployments.

## Setting Up Secret Manager

First, enable the API and create some secrets:

```bash
# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com

# Create a secret for your database password
echo -n "my-super-secure-db-password" | \
  gcloud secrets create db-password \
  --data-file=- \
  --replication-policy="automatic"

# Create a secret for an API key
echo -n "sk_live_abc123def456" | \
  gcloud secrets create stripe-api-key \
  --data-file=- \
  --replication-policy="automatic"

# Create a secret for a JSON service account key
gcloud secrets create firebase-admin-key \
  --data-file=./service-account.json \
  --replication-policy="automatic"
```

## Granting Access to Your Cloud Function

Your Cloud Function runs with a service account. That service account needs permission to read the secrets it needs. Follow the principle of least privilege and only grant access to the specific secrets each function needs.

```bash
# Find your function's service account
gcloud functions describe my-function \
  --region=us-central1 \
  --format="value(serviceConfig.serviceAccountEmail)"

# Grant access to specific secrets (not all secrets!)
gcloud secrets add-iam-policy-binding db-password \
  --member="serviceAccount:my-project@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding stripe-api-key \
  --member="serviceAccount:my-project@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Method 1: Mount Secrets as Environment Variables (Gen 2)

The simplest approach with Gen 2 Cloud Functions is to mount secrets directly as environment variables. The function runtime fetches the secret value at startup and exposes it as an env var.

```bash
# Deploy with secrets mounted as environment variables
gcloud functions deploy my-function \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=handler \
  --set-secrets="DB_PASSWORD=db-password:latest,STRIPE_KEY=stripe-api-key:latest"
```

Then access them in your code like regular environment variables:

```javascript
// Access mounted secrets as environment variables
// These are populated automatically at instance startup
exports.handler = async (req, res) => {
  const dbPassword = process.env.DB_PASSWORD;
  const stripeKey = process.env.STRIPE_KEY;

  // Use them to connect to services
  const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: dbPassword,  // From Secret Manager
    database: 'myapp'
  });

  // ...
};
```

This method is easy but has a downside: the secret value is fixed at instance startup. If you rotate a secret, existing instances will not pick up the new value until they are replaced.

## Method 2: Fetch Secrets at Runtime via the API

For more control, fetch secrets directly from the Secret Manager API. This lets you get the latest version on every request (or cache it with a TTL for performance).

```javascript
// index.js - Fetching secrets from Secret Manager at runtime
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const functions = require('@google-cloud/functions-framework');

// Create the client once at module level
const secretClient = new SecretManagerServiceClient();

// Cache for secret values with TTL
const secretCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getSecret(secretName) {
  const cacheKey = secretName;
  const cached = secretCache.get(cacheKey);

  // Return cached value if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.value;
  }

  // Fetch the latest version of the secret
  const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;

  const [version] = await secretClient.accessSecretVersion({ name });
  const value = version.payload.data.toString('utf8');

  // Cache the value
  secretCache.set(cacheKey, { value, timestamp: Date.now() });

  return value;
}

functions.http('myApi', async (req, res) => {
  try {
    // Fetch secrets on demand
    const dbPassword = await getSecret('db-password');
    const stripeKey = await getSecret('stripe-api-key');

    // Use the secrets
    console.log('Successfully retrieved secrets');
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Failed to access secret:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## Method 3: Mount Secrets as Files (Gen 2)

For secrets that are entire files (like service account JSON keys or TLS certificates), you can mount them as files in the function's filesystem:

```bash
# Mount a secret as a file at a specific path
gcloud functions deploy my-function \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=handler \
  --set-secrets="/etc/secrets/firebase-key.json=firebase-admin-key:latest"
```

Then read the file in your code:

```javascript
const fs = require('fs');
const admin = require('firebase-admin');

// Read the service account key from the mounted secret file
const serviceAccount = JSON.parse(
  fs.readFileSync('/etc/secrets/firebase-key.json', 'utf8')
);

// Initialize Firebase Admin with the key
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
```

## Python Example

Here is the same runtime-fetch approach in Python:

```python
# main.py - Accessing Secret Manager from a Python Cloud Function
from google.cloud import secretmanager
import functions_framework
import os

# Initialize the client once at module level
client = secretmanager.SecretManagerServiceClient()
project_id = os.environ.get('GCP_PROJECT')

# Simple cache dictionary
_secret_cache = {}

def get_secret(secret_id, version="latest"):
    """Fetch a secret value with caching."""
    cache_key = f"{secret_id}:{version}"
    if cache_key in _secret_cache:
        return _secret_cache[cache_key]

    # Build the resource name for the secret version
    name = f"projects/{project_id}/secrets/{secret_id}/versions/{version}"
    response = client.access_secret_version(request={"name": name})
    value = response.payload.data.decode("UTF-8")

    _secret_cache[cache_key] = value
    return value

@functions_framework.http
def handle_request(request):
    # Get database credentials from Secret Manager
    db_password = get_secret("db-password")
    api_key = get_secret("stripe-api-key")

    return {"status": "secrets loaded successfully"}
```

## Secret Rotation Strategy

One of the biggest advantages of Secret Manager is secret rotation. Here is a pattern for zero-downtime rotation:

```bash
# Add a new version of the secret (old version still accessible)
echo -n "new-password-value" | \
  gcloud secrets versions add db-password --data-file=-

# The new version automatically becomes "latest"
# Functions using :latest will pick up the new value on next access/restart

# After confirming everything works, disable the old version
gcloud secrets versions disable 1 --secret=db-password

# Eventually destroy the old version
gcloud secrets versions destroy 1 --secret=db-password
```

If your function uses the runtime API method with caching, it will pick up the new secret value within your cache TTL period. If you use the mounted environment variable method, instances need to be recycled.

## Common Mistakes to Avoid

**Logging secret values**: Never log the actual secret value. This is surprisingly easy to do accidentally during debugging.

```javascript
// NEVER DO THIS
console.log(`Connecting with password: ${dbPassword}`);

// Instead, log that you successfully retrieved the secret
console.log('Successfully loaded database credentials');
```

**Using the default service account for everything**: Create dedicated service accounts for each function and grant only the secrets it needs. The default App Engine service account has too many permissions.

**Not pinning secret versions in production**: While `latest` is convenient, consider pinning to a specific version in production for stability.

```bash
# Pin to a specific version instead of "latest"
gcloud functions deploy my-function \
  --gen2 \
  --set-secrets="DB_PASSWORD=db-password:3"
```

**Forgetting to handle Secret Manager API errors**: If Secret Manager is unreachable, your function should fail gracefully rather than crashing with an unhandled error.

## Monitoring Secret Access

Use Cloud Audit Logs to track who and what is accessing your secrets. Set up alerts in OneUptime to detect unusual access patterns, like a secret being accessed from an unexpected service account or at an unusual frequency. This gives you visibility into your secrets usage and helps catch potential security issues early.

Secret Manager adds a small amount of latency to your function (typically 10-50ms per secret fetch), but with proper caching, this is a one-time cost per instance. The security benefits far outweigh that minor overhead.
