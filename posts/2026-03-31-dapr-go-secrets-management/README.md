# How to Use Dapr Secrets Management with Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Go, Secret, Security, Microservice, SDK

Description: Retrieve secrets from Vault, Kubernetes, AWS Secrets Manager, and other backends in Go using the Dapr secrets building block without hardcoding credentials.

---

## Overview

Dapr secrets management provides a unified API for accessing secrets from any supported store. Your Go application calls a single Dapr API, and the sidecar retrieves the secret from the configured backend - HashiCorp Vault, Kubernetes Secrets, AWS Secrets Manager, Azure Key Vault, or a local file for development.

## Configuring a Secret Store

For local development, use the local file store:

```yaml
# components/local-secret-store.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: local-secret-store
spec:
  type: secretstores.local.file
  version: v1
  metadata:
    - name: secretsFile
      value: "./secrets.json"
    - name: nestedSeparator
      value: ":"
```

```json
{
  "db-password": "supersecret123",
  "api-keys": {
    "stripe": "sk_live_abc123",
    "sendgrid": "SG.xyz456"
  }
}
```

## Retrieving a Single Secret

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
    secret, err := client.GetSecret(ctx, "local-secret-store", "db-password", nil)
    if err != nil {
        log.Fatalf("failed to get secret: %v", err)
    }
    fmt.Printf("DB Password: %s\n", secret["db-password"])
}
```

## Retrieving Nested Secrets

```go
// Nested key using the configured separator
stripeKey, err := client.GetSecret(ctx, "local-secret-store", "api-keys:stripe", nil)
if err != nil {
    log.Fatal(err)
}
fmt.Println(stripeKey["api-keys:stripe"])
```

## Retrieving All Secrets

```go
allSecrets, err := client.GetBulkSecret(ctx, "local-secret-store", nil)
if err != nil {
    log.Fatal(err)
}

for secretName, values := range allSecrets {
    for k, v := range values {
        fmt.Printf("%s/%s = %s\n", secretName, k, v)
    }
}
```

## Using Secrets with Access Control

Restrict which apps can read which secrets via Dapr access control policy:

```yaml
# config.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  secrets:
    scopes:
      - storeName: local-secret-store
        defaultAccess: deny
        allowedSecrets:
          - "db-password"
```

## HashiCorp Vault Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vault-store
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
    - name: vaultAddr
      value: "https://vault.example.com:8200"
    - name: vaultToken
      secretKeyRef:
        name: vault-token
        key: token
  auth:
    secretStore: kubernetes-secret-store
```

## Summary

The Dapr Go secrets API has two functions: `GetSecret` and `GetBulkSecret`. Both accept an optional metadata map for passing store-specific parameters such as secret version selection. By configuring the secret store in a YAML component, you can use the same Go code in development (local file), staging (Kubernetes Secrets), and production (HashiCorp Vault or AWS Secrets Manager) without any application changes.
