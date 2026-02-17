# How to Use the google-cloud/secret-manager npm Package to Inject Secrets into a Node.js Cloud Function

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Secret Manager, Node.js, Cloud Functions, Security, Google Cloud

Description: Learn how to securely inject secrets from Google Cloud Secret Manager into Node.js Cloud Functions using the google-cloud/secret-manager npm package.

---

Hardcoding API keys, database passwords, and other sensitive values in your source code or environment variables is a security risk. Google Cloud Secret Manager provides a centralized, audited, and encrypted way to store and access secrets. When combined with Cloud Functions, you can load secrets at function startup without ever exposing them in your deployment configuration.

In this post, I will show you how to use the `@google-cloud/secret-manager` npm package to access secrets from within a Node.js Cloud Function, including caching strategies and best practices for production.

## Why Not Just Use Environment Variables?

You can set environment variables on Cloud Functions, and for some non-sensitive configuration that works fine. But environment variables have several drawbacks for secrets:

- They are visible in the GCP Console and in deployment configurations
- They appear in logs if your logging is not carefully configured
- Rotating them requires redeploying the function
- There is no audit trail of who accessed what

Secret Manager solves all of these problems. Secrets are encrypted at rest, access is controlled through IAM, and every access is logged in Cloud Audit Logs.

## Setting Up Secrets

First, create some secrets in Secret Manager.

```bash
# Create a secret for your database password
echo -n "my-super-secret-password" | \
  gcloud secrets create db-password \
  --data-file=- \
  --replication-policy=automatic

# Create a secret for an API key
echo -n "sk_live_abc123def456" | \
  gcloud secrets create stripe-api-key \
  --data-file=- \
  --replication-policy=automatic

# Verify the secrets exist
gcloud secrets list
```

## Granting Access to Your Cloud Function

Your Cloud Function's service account needs the `secretmanager.secretAccessor` role.

```bash
# Get the default compute service account
PROJECT_NUMBER=$(gcloud projects describe your-project-id --format='value(projectNumber)')
SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Grant access to specific secrets
gcloud secrets add-iam-policy-binding db-password \
  --member="serviceAccount:${SA}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding stripe-api-key \
  --member="serviceAccount:${SA}" \
  --role="roles/secretmanager.secretAccessor"
```

## Installing the Package

Add the Secret Manager client to your Cloud Function project.

```bash
# Install the Secret Manager client library
npm install @google-cloud/secret-manager
```

## Basic Secret Access

Here is the simplest way to access a secret from a Cloud Function.

```javascript
// index.js - Basic secret access in a Cloud Function
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

// Create the client outside the handler for reuse across invocations
const secretClient = new SecretManagerServiceClient();

const PROJECT_ID = process.env.GCP_PROJECT || 'your-project-id';

// Helper function to access a secret's latest version
async function getSecret(secretName) {
  const name = `projects/${PROJECT_ID}/secrets/${secretName}/versions/latest`;

  const [version] = await secretClient.accessSecretVersion({ name });

  // The payload data is a Buffer, convert to string
  return version.payload.data.toString('utf8');
}

exports.myFunction = async (req, res) => {
  try {
    const dbPassword = await getSecret('db-password');
    const apiKey = await getSecret('stripe-api-key');

    // Use the secrets to connect to your database, call APIs, etc.
    console.log('Secrets loaded successfully');

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Failed to load secrets:', error);
    res.status(500).json({ error: 'Internal error' });
  }
};
```

## Caching Secrets for Performance

Accessing Secret Manager on every function invocation adds latency and costs. Since Cloud Function instances are reused across invocations, you can cache secrets at the module level.

```javascript
// index.js - Cache secrets at the module level for reuse
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const secretClient = new SecretManagerServiceClient();
const PROJECT_ID = process.env.GCP_PROJECT || 'your-project-id';

// Cache object to store loaded secrets
let secretsCache = null;

async function loadSecrets() {
  // Return cached secrets if already loaded
  if (secretsCache) {
    return secretsCache;
  }

  // Load all required secrets in parallel
  const [dbPassword, stripeKey, jwtSecret] = await Promise.all([
    getSecret('db-password'),
    getSecret('stripe-api-key'),
    getSecret('jwt-secret'),
  ]);

  // Store in cache for future invocations on this instance
  secretsCache = {
    dbPassword,
    stripeKey,
    jwtSecret,
  };

  console.log('Secrets loaded and cached');
  return secretsCache;
}

async function getSecret(secretName) {
  const name = `projects/${PROJECT_ID}/secrets/${secretName}/versions/latest`;
  const [version] = await secretClient.accessSecretVersion({ name });
  return version.payload.data.toString('utf8');
}

exports.processPayment = async (req, res) => {
  const secrets = await loadSecrets();

  // Use secrets.stripeKey to initialize Stripe
  // Use secrets.dbPassword to connect to the database
  // The first invocation loads from Secret Manager
  // Subsequent invocations on the same instance use the cache

  res.json({ status: 'payment processed' });
};
```

## Cache with TTL for Secret Rotation

If you rotate secrets regularly, you should add a time-to-live to your cache so the function picks up new secret versions automatically.

```javascript
// Secrets cache with time-to-live for automatic refresh
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedSecrets = null;
let cacheTimestamp = 0;

async function getSecrets() {
  const now = Date.now();

  // Return cache if it exists and has not expired
  if (cachedSecrets && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedSecrets;
  }

  console.log('Cache expired or empty, reloading secrets');

  const [dbPassword, apiKey] = await Promise.all([
    accessSecret('db-password'),
    accessSecret('stripe-api-key'),
  ]);

  cachedSecrets = { dbPassword, apiKey };
  cacheTimestamp = now;

  return cachedSecrets;
}

async function accessSecret(name) {
  const fullName = `projects/${PROJECT_ID}/secrets/${name}/versions/latest`;
  const [version] = await secretClient.accessSecretVersion({ name: fullName });
  return version.payload.data.toString('utf8');
}
```

## Accessing a Specific Secret Version

Instead of always using `latest`, you can pin to a specific version. This is useful when you want predictable behavior during deployments.

```javascript
// Access a specific version of a secret
async function getSecretVersion(secretName, version = 'latest') {
  const name = `projects/${PROJECT_ID}/secrets/${secretName}/versions/${version}`;

  const [secretVersion] = await secretClient.accessSecretVersion({ name });
  return secretVersion.payload.data.toString('utf8');
}

// Usage - pin to version 3
const dbPassword = await getSecretVersion('db-password', '3');

// Or use latest
const apiKey = await getSecretVersion('stripe-api-key', 'latest');
```

## Using Secrets with Cloud Functions Gen2

Cloud Functions 2nd gen (built on Cloud Run) supports native secret mounting. You can mount secrets as environment variables or files without any code changes.

```bash
# Deploy a Cloud Function with secrets mounted as environment variables
gcloud functions deploy my-function \
  --gen2 \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --region us-central1 \
  --set-secrets 'DB_PASSWORD=db-password:latest,STRIPE_KEY=stripe-api-key:latest'
```

With this approach, secrets are available as regular environment variables.

```javascript
// When using --set-secrets, secrets appear as environment variables
exports.myFunction = async (req, res) => {
  // No Secret Manager SDK needed - secrets are injected automatically
  const dbPassword = process.env.DB_PASSWORD;
  const stripeKey = process.env.STRIPE_KEY;

  // Use them directly
  res.json({ status: 'ok' });
};
```

You can also mount secrets as files.

```bash
# Mount secrets as files in the function's filesystem
gcloud functions deploy my-function \
  --gen2 \
  --runtime nodejs20 \
  --trigger-http \
  --set-secrets '/secrets/db-password=db-password:latest'
```

```javascript
// Read a secret mounted as a file
const fs = require('fs');
const dbPassword = fs.readFileSync('/secrets/db-password', 'utf8');
```

## Error Handling

Secret Manager operations can fail for several reasons. Handle these gracefully.

```javascript
// Robust secret access with error handling
async function getSecretSafe(secretName) {
  try {
    const name = `projects/${PROJECT_ID}/secrets/${secretName}/versions/latest`;
    const [version] = await secretClient.accessSecretVersion({ name });
    return version.payload.data.toString('utf8');
  } catch (error) {
    if (error.code === 5) {
      // NOT_FOUND - secret or version does not exist
      console.error(`Secret '${secretName}' not found`);
      throw new Error(`Secret not found: ${secretName}`);
    }
    if (error.code === 7) {
      // PERMISSION_DENIED - service account lacks access
      console.error(`Permission denied for secret '${secretName}'`);
      throw new Error(`No permission to access: ${secretName}`);
    }
    // Log and rethrow unexpected errors
    console.error(`Error accessing secret '${secretName}':`, error);
    throw error;
  }
}
```

## Best Practices

Here are a few things to keep in mind when using Secret Manager with Cloud Functions:

- Always cache secrets at the instance level to reduce latency and API calls
- Use `Promise.all` to load multiple secrets in parallel
- Grant access at the individual secret level, not at the project level
- Use secret versions for safe rotation - create a new version, update the function, then disable the old version
- Monitor Secret Manager access with Cloud Audit Logs
- Set up alerting for unauthorized access attempts
- Keep secrets small - Secret Manager is not designed for storing large blobs

Using Secret Manager with Cloud Functions is one of those patterns that takes a few minutes to set up but pays dividends in security, auditability, and operational simplicity. Whether you use the SDK directly or the native Gen2 secret mounting feature depends on your needs, but either way your secrets stay out of your source code and deployment configs.
