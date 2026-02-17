# How to Access GCP Secret Manager Secrets from Cloud Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Functions, Secret Manager, Serverless, Security

Description: Learn how to securely access Secret Manager secrets from Google Cloud Functions using both the client library approach and the built-in secret reference integration.

---

Cloud Functions often need access to secrets - database connection strings, API keys for third-party services, webhook signing keys, and encryption passphrases. The tempting shortcut is to store these as plain-text environment variables in your function configuration. That works, but it means your secrets appear in the Cloud Console, in deployment logs, in gcloud output, and in Terraform state files.

GCP provides two approaches for accessing Secret Manager secrets from Cloud Functions. The first is the built-in secret reference integration, where you declare secrets in your deployment configuration and the runtime injects them. The second is the client library approach, where your function code directly calls the Secret Manager API. Both are valid, and the right choice depends on your needs.

## Approach 1: Built-in Secret References (Recommended)

Cloud Functions (2nd gen) supports referencing Secret Manager secrets directly in the deployment configuration. The function runtime fetches the secret at startup and makes it available as an environment variable or a mounted file.

### Prerequisites

Grant the Cloud Functions service account access to the secret:

```bash
# Find the service account used by the function
# For 2nd gen functions, this is either the default compute SA or a custom one
gcloud functions describe my-function \
  --gen2 \
  --region=us-central1 \
  --format="get(serviceConfig.serviceAccountEmail)" \
  --project=my-project-id

# Grant it access to the specific secret
gcloud secrets add-iam-policy-binding my-api-key \
  --member="serviceAccount:my-sa@my-project-id.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=my-project-id
```

### Deploying with Secret Environment Variables

```bash
# Deploy a Cloud Function with secrets as environment variables
gcloud functions deploy process-payment \
  --gen2 \
  --runtime=python311 \
  --region=us-central1 \
  --source=./function-source/ \
  --entry-point=handler \
  --trigger-http \
  --set-secrets="STRIPE_KEY=stripe-api-key:latest,DB_PASSWORD=db-password:latest" \
  --service-account=my-sa@my-project-id.iam.gserviceaccount.com \
  --project=my-project-id
```

Your function code reads the secrets as normal environment variables:

```python
# main.py - Cloud Function reading secrets from environment variables
import os
import functions_framework
import stripe

@functions_framework.http
def handler(request):
    """Process a payment using the Stripe API key from Secret Manager."""
    # The secret is available as a regular environment variable
    stripe.api_key = os.environ.get("STRIPE_KEY")
    db_password = os.environ.get("DB_PASSWORD")

    # Use the secrets in your application logic
    charge = stripe.Charge.create(
        amount=1000,
        currency="usd",
        source=request.json.get("token"),
    )

    return {"status": "success", "charge_id": charge.id}
```

### Deploying with Secret Volume Mounts

For secrets that are better consumed as files (certificates, JSON configs), mount them as volumes:

```bash
# Deploy with secrets mounted as files
gcloud functions deploy process-payment \
  --gen2 \
  --runtime=python311 \
  --region=us-central1 \
  --source=./function-source/ \
  --entry-point=handler \
  --trigger-http \
  --set-secrets="/secrets/tls-cert=tls-certificate:latest" \
  --service-account=my-sa@my-project-id.iam.gserviceaccount.com \
  --project=my-project-id
```

The secret is available at the specified path:

```python
# Reading a secret from a mounted file
def get_tls_cert():
    with open("/secrets/tls-cert", "r") as f:
        return f.read()
```

## Approach 2: Client Library (Programmatic Access)

The client library approach gives you more control. You call the Secret Manager API in your function code, which means you can handle errors, cache values, and access multiple versions.

### Python Example

```python
# main.py - Cloud Function using the Secret Manager client library
import functions_framework
from google.cloud import secretmanager

# Initialize the client outside the handler for reuse across invocations
client = secretmanager.SecretManagerServiceClient()
PROJECT_ID = "my-project-id"

# Cache for secrets to avoid repeated API calls during warm instances
_secret_cache = {}

def get_secret(secret_id, version="latest"):
    """Fetch a secret from Secret Manager with caching."""
    cache_key = f"{secret_id}:{version}"
    if cache_key not in _secret_cache:
        name = f"projects/{PROJECT_ID}/secrets/{secret_id}/versions/{version}"
        response = client.access_secret_version(request={"name": name})
        _secret_cache[cache_key] = response.payload.data.decode("UTF-8")
    return _secret_cache[cache_key]

@functions_framework.http
def handler(request):
    """HTTP handler that uses secrets from Secret Manager."""
    # Fetch secrets on demand
    api_key = get_secret("stripe-api-key")
    db_password = get_secret("db-password")

    # Use the secrets
    return {"status": "configured", "key_length": len(api_key)}
```

### Node.js Example

```javascript
// index.js - Cloud Function using the Secret Manager client library
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");
const functions = require("@google-cloud/functions-framework");

// Initialize client outside handler for reuse
const client = new SecretManagerServiceClient();
const PROJECT_ID = "my-project-id";

// Cache for warm instance reuse
const secretCache = {};

async function getSecret(secretId, version = "latest") {
  const cacheKey = `${secretId}:${version}`;
  if (!secretCache[cacheKey]) {
    const name = `projects/${PROJECT_ID}/secrets/${secretId}/versions/${version}`;
    const [response] = await client.accessSecretVersion({ name });
    secretCache[cacheKey] = response.payload.data.toString("utf8");
  }
  return secretCache[cacheKey];
}

functions.http("handler", async (req, res) => {
  try {
    // Fetch secrets on demand
    const apiKey = await getSecret("stripe-api-key");
    const dbPassword = await getSecret("db-password");

    // Use the secrets
    res.json({ status: "configured", keyLength: apiKey.length });
  } catch (error) {
    console.error("Failed to access secret:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});
```

### Go Example

```go
// main.go - Cloud Function using the Secret Manager client library
package main

import (
    "context"
    "fmt"
    "net/http"
    "sync"

    "github.com/GoogleCloudPlatform/functions-framework-go/functions"
    secretmanager "cloud.google.com/go/secretmanager/apiv1"
    "cloud.google.com/go/secretmanager/apiv1/secretmanagerpb"
)

var (
    smClient *secretmanager.Client
    cache    = make(map[string]string)
    mu       sync.RWMutex
)

func init() {
    // Initialize the client at cold start
    ctx := context.Background()
    var err error
    smClient, err = secretmanager.NewClient(ctx)
    if err != nil {
        panic(fmt.Sprintf("failed to create secret manager client: %v", err))
    }

    functions.HTTP("Handler", handler)
}

func getSecret(ctx context.Context, secretID string) (string, error) {
    mu.RLock()
    if val, ok := cache[secretID]; ok {
        mu.RUnlock()
        return val, nil
    }
    mu.RUnlock()

    // Fetch from Secret Manager
    name := fmt.Sprintf("projects/my-project-id/secrets/%s/versions/latest", secretID)
    result, err := smClient.AccessSecretVersion(ctx, &secretmanagerpb.AccessSecretVersionRequest{
        Name: name,
    })
    if err != nil {
        return "", err
    }

    value := string(result.Payload.Data)
    mu.Lock()
    cache[secretID] = value
    mu.Unlock()

    return value, nil
}

func handler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    apiKey, err := getSecret(ctx, "stripe-api-key")
    if err != nil {
        http.Error(w, "Failed to get secret", http.StatusInternalServerError)
        return
    }
    fmt.Fprintf(w, `{"status":"configured","key_length":%d}`, len(apiKey))
}
```

## Which Approach to Choose

Use the **built-in secret references** when:
- You want the simplest setup with minimal code
- Your secrets do not change frequently during a function's lifetime
- You are comfortable with secrets being fetched only at cold start

Use the **client library** when:
- You need to access different secrets based on runtime conditions
- You want explicit error handling for secret access failures
- You need to refresh secrets without redeploying the function
- You are accessing secrets from a different project

## Cold Start Impact

With built-in secret references, the secret fetch happens during cold start before your function code runs. This adds latency to cold starts - typically 50-200ms per secret. For functions with many secrets, this can be noticeable.

With the client library, you control when secrets are fetched. You can fetch them lazily on first use, which means the cold start only pays the cost for secrets actually needed by the first request.

## Updating Secrets

When you add a new version to a secret, existing warm function instances keep the old value. New instances (from cold starts or scaling) get the new value. If you need all instances to pick up a new secret immediately, redeploy the function:

```bash
# Force a new deployment to pick up updated secrets
gcloud functions deploy process-payment \
  --gen2 \
  --region=us-central1 \
  --project=my-project-id
```

With the client library approach, you can implement cache expiration to periodically refresh secrets without redeployment:

```python
# Cache with expiration for automatic refresh
import time

_secret_cache = {}
CACHE_TTL = 300  # Refresh secrets every 5 minutes

def get_secret_with_ttl(secret_id, version="latest"):
    """Fetch a secret with time-based cache expiration."""
    cache_key = f"{secret_id}:{version}"
    now = time.time()

    if cache_key in _secret_cache:
        value, cached_at = _secret_cache[cache_key]
        if now - cached_at < CACHE_TTL:
            return value

    # Cache expired or not present - fetch fresh value
    name = f"projects/{PROJECT_ID}/secrets/{secret_id}/versions/{version}"
    response = client.access_secret_version(request={"name": name})
    value = response.payload.data.decode("UTF-8")
    _secret_cache[cache_key] = (value, now)
    return value
```

## Security Best Practices

Always use a dedicated service account for your Cloud Functions instead of the default compute service account. Grant `secretAccessor` on individual secrets, not at the project level.

Never log secret values. Avoid print or console.log statements that might include secret data, even during debugging.

Use version pinning in production (`db-password:3`) and `latest` in development. This prevents accidental secret changes from affecting production.

Set up monitoring for secret access errors. If your function suddenly cannot read a secret, you want to know immediately, not when customers report failures.

Cloud Functions and Secret Manager work well together. Whether you use the built-in integration or the client library, the pattern keeps your secrets out of your deployment configuration and gives you the access control and audit logging that production systems need.
