# How to Use Dapr Secrets with Environment Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret, Environment Variable, Security, Configuration

Description: Configure the Dapr local environment variable secret store to inject secrets from environment variables into applications during development and CI pipelines.

---

## Overview

Dapr provides a `secretstores.local.env` component that exposes environment variables as secrets through the Dapr Secrets API. This is useful in development, CI/CD pipelines, or any environment where secrets are pre-injected as environment variables. Your app reads secrets through the uniform Dapr Secrets API without knowing the underlying source.

## Architecture

```mermaid
graph LR
    App["Your App"]
    Sidecar["Dapr Sidecar"]
    EnvStore["local.env\nSecret Store"]
    EnvVars["OS Environment Variables\nDB_PASSWORD=secret123\nAPI_KEY=abc456"]

    App -->|GetSecret("secretstore","DB_PASSWORD")| Sidecar
    Sidecar -->|lookup env var| EnvStore
    EnvStore -->|os.Getenv| EnvVars
    EnvVars -->|value| EnvStore
    EnvStore -->|secret value| Sidecar
    Sidecar -->|{"DB_PASSWORD":"secret123"}| App
```

## Step 1: Configure the Local Environment Variable Secret Store

```yaml
# components/secretstore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: secretstore
  namespace: default
spec:
  type: secretstores.local.env
  version: v1
  metadata: []
```

No additional metadata is required. The store automatically reads from the process environment.

## Step 2: Set Environment Variables

```bash
# Set secrets as environment variables before running your app
export DB_PASSWORD="my-database-password"
export API_KEY="my-api-key-value"
export JWT_SECRET="my-jwt-signing-secret"
export REDIS_PASSWORD="my-redis-password"
```

## Step 3: Read Secrets via Dapr HTTP API

```bash
# Start the app with Dapr
dapr run \
  --app-id my-service \
  --app-port 8080 \
  --components-path ./components \
  -- go run main.go

# Retrieve a secret
curl http://localhost:3500/v1.0/secrets/secretstore/DB_PASSWORD
# Response: {"DB_PASSWORD":"my-database-password"}

# Retrieve all secrets (bulk)
curl http://localhost:3500/v1.0/secrets/secretstore/bulk
```

## Step 4: Read Secrets via SDK

### Go

```go
package main

import (
    "context"
    "fmt"
    "log"

    dapr "github.com/dapr/go-sdk/client"
)

func main() {
    client, err := dapr.NewClient()
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    ctx := context.Background()

    // Get a single secret
    secret, err := client.GetSecret(ctx, "secretstore", "DB_PASSWORD", nil)
    if err != nil {
        log.Fatalf("Failed to get secret: %v", err)
    }
    dbPassword := secret["DB_PASSWORD"]
    fmt.Printf("DB password retrieved (length: %d)\n", len(dbPassword))

    // Get API key
    apiSecret, err := client.GetSecret(ctx, "secretstore", "API_KEY", nil)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("API key: %s\n", apiSecret["API_KEY"])

    // Get bulk secrets
    bulkSecrets, err := client.GetBulkSecret(ctx, "secretstore", nil)
    if err != nil {
        log.Fatal(err)
    }
    for key, values := range bulkSecrets {
        fmt.Printf("Secret %s has %d value(s)\n", key, len(values))
    }
}
```

### Python

```python
from dapr.clients import DaprClient

def main():
    with DaprClient() as client:
        # Single secret
        secret = client.get_secret(
            store_name="secretstore",
            key="DB_PASSWORD",
        )
        db_password = secret.secret["DB_PASSWORD"]
        print(f"DB password retrieved (length: {len(db_password)})")

        # API key
        api_secret = client.get_secret(
            store_name="secretstore",
            key="API_KEY",
        )
        print(f"API key: {api_secret.secret['API_KEY']}")

        # Bulk secrets
        bulk = client.get_bulk_secret(store_name="secretstore")
        for key, values in bulk.secrets.items():
            print(f"Secret {key} = {list(values.values())[0][:3]}...")

main()
```

### TypeScript

```typescript
import { DaprClient } from "@dapr/dapr";

async function main() {
  const client = new DaprClient();

  const dbSecret = await client.secret.get("secretstore", "DB_PASSWORD");
  console.log("DB password length:", dbSecret["DB_PASSWORD"].length);

  const apiSecret = await client.secret.get("secretstore", "API_KEY");
  console.log("API key:", apiSecret["API_KEY"]);

  const allSecrets = await client.secret.getBulk("secretstore");
  console.log("All secrets:", Object.keys(allSecrets));
}

main().catch(console.error);
```

## Step 5: Reference in Component YAML

Use environment variable secrets to configure other Dapr components without hardcoding values:

```yaml
# components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: redisPassword
    secretKeyRef:
      name: REDIS_PASSWORD
      key: REDIS_PASSWORD
auth:
  secretStore: secretstore
```

## Step 6: Use in Docker Compose

```yaml
# docker-compose.yml
version: "3.8"
services:
  my-service:
    image: myapp:latest
    environment:
      DB_PASSWORD: ${DB_PASSWORD}
      API_KEY: ${API_KEY}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - placement

  my-service-dapr:
    image: "daprio/daprd:latest"
    command: [
      "./daprd",
      "-app-id", "my-service",
      "-app-port", "8080",
      "-components-path", "/components",
    ]
    volumes:
      - ./components:/components
    network_mode: "service:my-service"
    environment:
      DB_PASSWORD: ${DB_PASSWORD}
      API_KEY: ${API_KEY}
      JWT_SECRET: ${JWT_SECRET}
```

## Step 7: Use in Kubernetes with Env from Secrets

Inject Kubernetes secrets as environment variables into the app container with `envFrom`, and pass them to the Dapr sidecar using the `dapr.io/env` annotation so the `secretstores.local.env` component can read them:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "my-service"
        dapr.io/app-port: "8080"
        dapr.io/env: "DB_PASSWORD=my-database-password,API_KEY=my-api-key"
    spec:
      containers:
      - name: my-service
        image: myapp:latest
        envFrom:
        - secretRef:
            name: app-secrets
---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  DB_PASSWORD: my-database-password
  API_KEY: my-api-key
```

## Summary

The `secretstores.local.env` Dapr component exposes process environment variables through the Dapr Secrets API. This enables uniform secret access regardless of the backing store (env vars in development, Vault in production) without changing application code. Reference these secrets in other component YAML files using `secretKeyRef` to avoid hardcoded credentials. In Kubernetes, inject secrets using `envFrom` so both the app container and the Dapr sidecar can read them.
