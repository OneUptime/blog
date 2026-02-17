# How to Create and Store Secrets in Google Cloud Secret Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Secret Manager, Security, Secrets, Configuration

Description: A comprehensive guide to creating, storing, and retrieving secrets using Google Cloud Secret Manager, covering the CLI, client libraries, and best practices for secret management.

---

Every application has secrets - database passwords, API keys, TLS certificates, OAuth client secrets, encryption keys. The question is where you store them. Environment variables are easy but insecure. Config files get accidentally committed to Git. Key management services handle encryption keys but are not designed for arbitrary secret data.

Google Cloud Secret Manager is purpose-built for storing sensitive configuration data. It provides a centralized, API-accessible vault for your secrets with built-in versioning, fine-grained access control, audit logging, and encryption at rest. This post covers the fundamentals of creating and managing secrets, from the basics through to production patterns.

## What Secret Manager Provides

Secret Manager stores secrets as opaque byte payloads up to 64 KiB in size. Each secret can have multiple versions, and each version is immutable once created. The service encrypts all data at rest using Google-managed keys by default, with the option to use customer-managed encryption keys (CMEK).

Key features include:
- Automatic versioning of secret values
- IAM-based access control at the individual secret level
- Audit logging through Cloud Audit Logs
- Automatic and user-managed replication across regions
- Integration with Cloud Functions, Cloud Run, GKE, and Compute Engine

## Prerequisites

- A GCP project with billing enabled
- The Secret Manager API enabled
- The `roles/secretmanager.admin` role (or more targeted roles for specific operations)

Enable the API:

```bash
# Enable the Secret Manager API
gcloud services enable secretmanager.googleapis.com --project=my-project-id
```

## Creating a Secret Using gcloud

Creating a secret is a two-step process: first you create the secret resource (which defines metadata like replication policy), then you add a version with the actual secret value.

```bash
# Step 1: Create the secret resource
gcloud secrets create my-database-password \
  --replication-policy="automatic" \
  --project=my-project-id

# Step 2: Add the secret value as a new version
echo -n "super-secret-password-123" | gcloud secrets versions add my-database-password \
  --data-file=- \
  --project=my-project-id
```

The `-n` flag on `echo` prevents adding a trailing newline to the secret value, which can cause issues with passwords and API keys.

You can also create the secret and add the first version in one command:

```bash
# Create secret and add value in one step
echo -n "my-api-key-value" | gcloud secrets create my-api-key \
  --data-file=- \
  --replication-policy="automatic" \
  --project=my-project-id
```

## Retrieving a Secret

To access the latest version of a secret:

```bash
# Access the latest version of a secret
gcloud secrets versions access latest \
  --secret=my-database-password \
  --project=my-project-id
```

To access a specific version:

```bash
# Access version 2 of a secret
gcloud secrets versions access 2 \
  --secret=my-database-password \
  --project=my-project-id
```

## Creating Secrets from Files

For secrets stored in files (like TLS certificates or JSON key files), you can create them directly from the file:

```bash
# Create a secret from a certificate file
gcloud secrets create tls-certificate \
  --data-file=./server.crt \
  --replication-policy="automatic" \
  --project=my-project-id

# Create a secret from a JSON config file
gcloud secrets create app-config \
  --data-file=./config.json \
  --replication-policy="automatic" \
  --project=my-project-id
```

## Using Client Libraries

For application code, the client libraries are the preferred way to access secrets.

### Python

```python
# Python example: accessing a secret from Secret Manager
from google.cloud import secretmanager

def get_secret(project_id, secret_id, version_id="latest"):
    """Retrieve a secret value from Secret Manager."""
    # Create the Secret Manager client
    client = secretmanager.SecretManagerServiceClient()

    # Build the resource name of the secret version
    name = f"projects/{project_id}/secrets/{secret_id}/versions/{version_id}"

    # Access the secret version
    response = client.access_secret_version(request={"name": name})

    # Decode the secret payload
    secret_value = response.payload.data.decode("UTF-8")
    return secret_value

# Usage
db_password = get_secret("my-project-id", "my-database-password")
api_key = get_secret("my-project-id", "my-api-key")
```

### Node.js

```javascript
// Node.js example: accessing a secret from Secret Manager
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");

async function getSecret(projectId, secretId, versionId = "latest") {
  // Create the client
  const client = new SecretManagerServiceClient();

  // Build the secret version name
  const name = `projects/${projectId}/secrets/${secretId}/versions/${versionId}`;

  // Access the secret
  const [version] = await client.accessSecretVersion({ name });

  // Extract the payload
  const payload = version.payload.data.toString("utf8");
  return payload;
}

// Usage
async function main() {
  const dbPassword = await getSecret("my-project-id", "my-database-password");
  console.log("Retrieved database password successfully");
}

main();
```

### Go

```go
// Go example: accessing a secret from Secret Manager
package main

import (
    "context"
    "fmt"

    secretmanager "cloud.google.com/go/secretmanager/apiv1"
    "cloud.google.com/go/secretmanager/apiv1/secretmanagerpb"
)

func getSecret(projectID, secretID, versionID string) (string, error) {
    // Create the context and client
    ctx := context.Background()
    client, err := secretmanager.NewClient(ctx)
    if err != nil {
        return "", fmt.Errorf("failed to create client: %w", err)
    }
    defer client.Close()

    // Build the request
    name := fmt.Sprintf("projects/%s/secrets/%s/versions/%s", projectID, secretID, versionID)
    req := &secretmanagerpb.AccessSecretVersionRequest{
        Name: name,
    }

    // Access the secret
    result, err := client.AccessSecretVersion(ctx, req)
    if err != nil {
        return "", fmt.Errorf("failed to access secret: %w", err)
    }

    return string(result.Payload.Data), nil
}
```

## Managing Secret Versions

Every time you update a secret's value, a new version is created. The old version remains accessible:

```bash
# Add a new version (updating the secret value)
echo -n "new-password-456" | gcloud secrets versions add my-database-password \
  --data-file=- \
  --project=my-project-id

# List all versions of a secret
gcloud secrets versions list my-database-password \
  --project=my-project-id

# Disable an old version (prevents access but keeps the data)
gcloud secrets versions disable 1 \
  --secret=my-database-password \
  --project=my-project-id

# Destroy an old version (permanently deletes the data)
gcloud secrets versions destroy 1 \
  --secret=my-database-password \
  --project=my-project-id
```

## Adding Labels and Annotations

Labels help you organize and filter secrets:

```bash
# Create a secret with labels
gcloud secrets create payment-api-key \
  --replication-policy="automatic" \
  --labels="environment=production,team=payments,sensitivity=high" \
  --project=my-project-id

# List secrets filtered by label
gcloud secrets list \
  --filter="labels.environment=production" \
  --project=my-project-id
```

## Replication Policies

Secret Manager offers two replication policies:

**Automatic replication** lets Google manage where the secret data is stored. This is the simplest option and works well for most use cases:

```bash
# Automatic replication (Google manages locations)
gcloud secrets create my-secret \
  --replication-policy="automatic" \
  --project=my-project-id
```

**User-managed replication** lets you specify exact regions:

```bash
# User-managed replication to specific regions
gcloud secrets create my-secret \
  --replication-policy="user-managed" \
  --locations="us-central1,us-east1,europe-west1" \
  --project=my-project-id
```

Use user-managed replication when you have compliance requirements about where data can be stored or when you want secrets close to the workloads that use them.

## Best Practices

Name your secrets descriptively but do not include the secret value in the name. Use a consistent naming convention like `{service}-{type}-{environment}` - for example, `payments-api-key-production` or `user-db-password-staging`.

Always reference secrets by `latest` version in your application code unless you have a specific reason to pin a version. This way, rotating a secret just requires adding a new version - no code changes needed.

Grant the minimum IAM roles needed. Use `roles/secretmanager.secretAccessor` for applications that only need to read secrets, and `roles/secretmanager.admin` only for the pipeline or person that manages secret lifecycle.

Never log secret values. This sounds obvious, but it is easy to accidentally log them during debugging. Use the client library's built-in protections and avoid printing response payloads.

Treat Secret Manager as the single source of truth for all secrets. If a secret lives in Secret Manager, it should not also live in a `.env` file, a Kubernetes ConfigMap, or a CI/CD variable store. One copy, one source.

Secret Manager is one of those GCP services that does one thing well and integrates cleanly with the rest of the platform. Getting your secrets into it early in a project saves considerable pain down the road when you need rotation, auditing, or fine-grained access control.
