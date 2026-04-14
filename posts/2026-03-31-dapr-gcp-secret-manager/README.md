# How to Use Dapr with GCP Secret Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, GCP, Secret, Security, Kubernetes

Description: Configure Dapr's secrets building block with Google Cloud Secret Manager to securely retrieve secrets in your microservices without hardcoding credentials.

---

## Overview

Google Cloud Secret Manager provides a secure, centralized store for API keys, passwords, and certificates. Dapr's secrets API integrates with Secret Manager, allowing your services to retrieve secrets at runtime without embedding them in code or configuration files.

## Prerequisites

- GCP project with Secret Manager API enabled
- Service account with `roles/secretmanager.secretAccessor`
- Dapr installed

## Creating Secrets in GCP Secret Manager

```bash
# Enable the API
gcloud services enable secretmanager.googleapis.com

# Create a secret
echo -n "my-database-password" | gcloud secrets create db-password \
  --data-file=- \
  --replication-policy=automatic

# Create another version
echo -n "new-database-password" | gcloud secrets versions add db-password \
  --data-file=-
```

## Configuring the Dapr Secrets Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: gcpsecretmanager
  namespace: default
spec:
  type: secretstores.gcp.secretmanager
  version: v1
  metadata:
  - name: project_id
    value: "my-gcp-project"
  - name: type
    value: "service_account"
```

## Retrieving Secrets from Application Code

```bash
# Get a secret
curl http://localhost:3500/v1.0/secrets/gcpsecretmanager/db-password

# Get a specific version
curl "http://localhost:3500/v1.0/secrets/gcpsecretmanager/db-password?metadata.version_id=2"
```

Using the Go SDK:

```go
import (
    dapr "github.com/dapr/go-sdk/client"
)

func getDatabasePassword(ctx context.Context, client dapr.Client) (string, error) {
    secret, err := client.GetSecret(ctx, "gcpsecretmanager", "db-password", nil)
    if err != nil {
        return "", err
    }
    return secret["db-password"], nil
}
```

## Referencing Secrets in Dapr Components

Use Secret Manager secrets to populate other Dapr component credentials:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-password
      key: redis-password
auth:
  secretStore: gcpsecretmanager
```

## Bulk Secret Retrieval

```bash
# Get all secrets (requires appropriate permissions)
curl http://localhost:3500/v1.0/secrets/gcpsecretmanager/bulk
```

## Setting Up Access Control

Restrict which Dapr apps can access which secrets using Dapr's secret access policy:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  secrets:
    scopes:
    - storeName: gcpsecretmanager
      defaultAccess: deny
      allowedSecrets: ["db-password", "api-key"]
```

## Summary

Dapr's GCP Secret Manager integration provides a secure, auditable way to manage secrets in your microservices. By referencing secrets through the Dapr API rather than environment variables or ConfigMaps, you get centralized secret rotation, audit logging, and fine-grained access control without changing application code.
