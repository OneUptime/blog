# How to Retrieve Secrets Using the Dapr Secrets API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret, Secrets API, Security, Configuration

Description: Use the Dapr Secrets API to retrieve secrets from any configured secret store via HTTP or SDK, keeping credentials out of application code and environment variables.

---

The Dapr Secrets API provides a unified interface for reading secrets from any secret store backend - Kubernetes secrets, HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, and others. Your application code stays identical regardless of which backend is used.

## How the Secrets API Works

Your application calls the Dapr sidecar's secrets endpoint. The sidecar handles authentication with the backend secret store and returns the secret value:

```text
App -> Dapr Sidecar -> Secret Store Backend (Vault, K8s, etc.)
```

## Configuring a Secret Store Component

Example using Kubernetes secrets as the backend:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mysecretstore
  namespace: default
spec:
  type: secretstores.kubernetes
  version: v1
```

Example using HashiCorp Vault:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mysecretstore
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: "https://vault.example.com:8200"
  - name: vaultToken
    value: "YOUR_VAULT_TOKEN"
  - name: enginePath
    value: "secret"
```

## Retrieving a Secret via HTTP

```bash
curl http://localhost:3500/v1.0/secrets/mysecretstore/db-password
```

Response:

```json
{"db-password": "supersecretvalue"}
```

For Kubernetes secrets with multiple keys:

```bash
curl http://localhost:3500/v1.0/secrets/mysecretstore/database-credentials
```

Response:

```json
{
  "username": "admin",
  "password": "supersecretvalue",
  "host": "db.internal.example.com"
}
```

## Using the Go SDK

```go
package main

import (
  "context"
  "fmt"
  dapr "github.com/dapr/go-sdk/client"
)

func getSecret(ctx context.Context, client dapr.Client, store, key string) (string, error) {
  secret, err := client.GetSecret(ctx, store, key, nil)
  if err != nil {
    return "", fmt.Errorf("failed to get secret %s: %w", key, err)
  }
  return secret[key], nil
}

func main() {
  client, _ := dapr.NewClient()
  defer client.Close()

  ctx := context.Background()

  dbPassword, err := getSecret(ctx, client, "mysecretstore", "db-password")
  if err != nil {
    panic(err)
  }

  fmt.Printf("Got secret of length: %d\n", len(dbPassword))
}
```

## Using the Python SDK

```python
from dapr.clients import DaprClient

with DaprClient() as client:
    secret = client.get_secret(
        store_name="mysecretstore",
        key="db-password"
    )
    db_password = secret.secret["db-password"]
    print(f"Retrieved secret of length {len(db_password)}")
```

## Metadata Options

Pass optional metadata to the secrets API for backends that support versioning:

```bash
# AWS Secrets Manager with version
curl "http://localhost:3500/v1.0/secrets/aws-secretstore/my-api-key?metadata.version_stage=AWSPREVIOUS"
```

## Security Best Practices

- Never log secret values - log only key names and lengths.
- Use RBAC or secret scoping to restrict which apps can access which secrets.
- Prefer secret store backends over environment variable secret stores in production.
- Rotate secrets in the backend and rely on Dapr to fetch fresh values on each call.

## Summary

The Dapr Secrets API decouples your application from secret store specifics, enabling you to switch from Kubernetes secrets to Vault or AWS Secrets Manager without changing application code. By fetching secrets at runtime through the sidecar, you avoid embedding sensitive values in container images or environment variable configurations. This single API works identically across all supported secret store backends.
