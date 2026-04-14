# How to Get a Single Secret from a Dapr Secret Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret, Secret Store, Security, HTTP API

Description: Learn the exact HTTP request format and SDK calls to retrieve a single named secret from a Dapr secret store, with examples across multiple languages.

---

Retrieving a single secret is the most common Dapr secrets operation. This guide covers the exact API format, SDK usage across languages, and error handling patterns.

## HTTP API Format

```text
GET http://localhost:{daprPort}/v1.0/secrets/{storeName}/{secretName}
```

Example:

```bash
curl http://localhost:3500/v1.0/secrets/vault-store/database-password
```

Response for a simple secret:

```json
{"database-password": "my-super-secure-password"}
```

## Why the Response Is a Map

Dapr returns secrets as key-value maps to support backends like Kubernetes that store multiple fields per secret object. For a simple single-value secret, the response map has one entry matching the secret name.

## Retrieving in Go

```go
package main

import (
  "context"
  "fmt"
  "log"
  dapr "github.com/dapr/go-sdk/client"
)

func getDatabasePassword(ctx context.Context) (string, error) {
  client, err := dapr.NewClient()
  if err != nil {
    return "", err
  }
  defer client.Close()

  secret, err := client.GetSecret(ctx, "vault-store", "database-password", nil)
  if err != nil {
    return "", fmt.Errorf("secret retrieval failed: %w", err)
  }

  value, ok := secret["database-password"]
  if !ok {
    return "", fmt.Errorf("key 'database-password' not in secret response")
  }

  return value, nil
}
```

## Retrieving in Python

```python
from dapr.clients import DaprClient

def get_database_password() -> str:
    with DaprClient() as client:
        result = client.get_secret(
            store_name="vault-store",
            key="database-password"
        )
        return result.secret.get("database-password", "")

password = get_database_password()
```

## Retrieving in Node.js

```javascript
const { DaprClient } = require("@dapr/dapr");

const client = new DaprClient({ daprPort: "3500" });

async function getDatabasePassword() {
  const secret = await client.secret.get("vault-store", "database-password");
  return secret["database-password"];
}

getDatabasePassword().then((password) => {
  console.log(`Got secret of length: ${password.length}`);
});
```

## Handling Errors

```go
secret, err := client.GetSecret(ctx, "vault-store", "nonexistent-key", nil)
if err != nil {
  // err contains the status code and message from Dapr
  // Common errors:
  // - Secret store not found (component not configured)
  // - Secret key not found in the store
  // - Permission denied (scoping rules applied)
  log.Printf("Secret lookup failed: %v", err)
  return err
}
```

## Using Metadata for Versioned Secrets

Some backends support fetching specific secret versions:

```bash
# AWS Secrets Manager - previous version
curl "http://localhost:3500/v1.0/secrets/aws-store/api-key?metadata.version_id=AWSPREVIOUS"

# AWS Secrets Manager - specific version
curl "http://localhost:3500/v1.0/secrets/aws-store/api-key?metadata.version_id=abc123"
```

In Go:

```go
secret, err := client.GetSecret(ctx, "aws-store", "api-key", map[string]string{
  "version_id": "AWSPREVIOUS",
})
```

## Caching Secrets

Dapr does not cache secrets by default. For high-frequency secret reads, cache at the application level:

```go
var secretCache sync.Map

func getCachedSecret(ctx context.Context, client dapr.Client, store, key string) (string, error) {
  if cached, ok := secretCache.Load(store + "/" + key); ok {
    return cached.(string), nil
  }

  secret, err := client.GetSecret(ctx, store, key, nil)
  if err != nil {
    return "", err
  }

  value := secret[key]
  secretCache.Store(store+"/"+key, value)
  return value, nil
}
```

## Summary

Fetching a single secret from Dapr requires a simple GET request to the sidecar with the store name and secret key. The response is always a map, even for single-value secrets, providing consistency with multi-key secrets from stores like Kubernetes. Error handling should account for missing keys, store configuration issues, and scoping denials to build robust secret retrieval logic.
