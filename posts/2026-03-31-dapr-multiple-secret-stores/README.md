# How to Configure Multiple Secret Stores in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret, Multiple Stores, Configuration, Security

Description: Configure multiple Dapr secret store components to access different backends simultaneously, enabling migration between stores and environment-specific secret routing.

---

Production microservices often need secrets from multiple backends - Kubernetes secrets for infrastructure credentials, HashiCorp Vault for application secrets, and AWS Secrets Manager for cloud service keys. Dapr supports multiple secret store components running simultaneously.

## Configuring Multiple Secret Store Components

Each secret store component has a unique name. You can have as many as needed:

```yaml
# components/k8s-secrets.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: k8s-secrets
  namespace: default
spec:
  type: secretstores.kubernetes
  version: v1
```

```yaml
# components/vault-secrets.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vault-secrets
  namespace: default
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: "https://vault.example.com:8200"
  - name: vaultToken
    secretKeyRef:
      name: vault-access-token
      key: token
  - name: enginePath
    value: "secret"
```

```yaml
# components/aws-secrets.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: aws-secrets
  namespace: default
spec:
  type: secretstores.aws.secretmanager
  version: v1
  metadata:
  - name: region
    value: "us-east-1"
  - name: accessKey
    secretKeyRef:
      name: aws-access
      key: accessKeyId
  - name: secretKey
    secretKeyRef:
      name: aws-access
      key: secretAccessKey
```

## Accessing Secrets from Different Stores

Specify the store name in each API call:

```bash
# From Kubernetes secrets
curl http://localhost:3500/v1.0/secrets/k8s-secrets/db-password

# From Vault
curl http://localhost:3500/v1.0/secrets/vault-secrets/payment-api-key

# From AWS Secrets Manager
curl http://localhost:3500/v1.0/secrets/aws-secrets/s3-bucket-credentials
```

## Using Multiple Stores in Go

```go
package main

import (
  "context"
  "fmt"
  dapr "github.com/dapr/go-sdk/client"
)

type AppSecrets struct {
  DBPassword    string
  PaymentAPIKey string
  S3Credentials map[string]string
}

func loadSecrets(ctx context.Context, client dapr.Client) (*AppSecrets, error) {
  secrets := &AppSecrets{}

  // Infrastructure secrets from Kubernetes
  dbSecret, err := client.GetSecret(ctx, "k8s-secrets", "db-password", nil)
  if err != nil {
    return nil, fmt.Errorf("k8s secret lookup failed: %w", err)
  }
  secrets.DBPassword = dbSecret["db-password"]

  // Application secrets from Vault
  paymentSecret, err := client.GetSecret(ctx, "vault-secrets", "payment-api-key", nil)
  if err != nil {
    return nil, fmt.Errorf("vault secret lookup failed: %w", err)
  }
  secrets.PaymentAPIKey = paymentSecret["payment-api-key"]

  // Cloud service credentials from AWS
  s3Secret, err := client.GetSecret(ctx, "aws-secrets", "s3-bucket-credentials", nil)
  if err != nil {
    return nil, fmt.Errorf("aws secret lookup failed: %w", err)
  }
  secrets.S3Credentials = s3Secret

  return secrets, nil
}
```

## Referencing Multiple Stores in Components

A component can reference a secret from any of the configured stores:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: my-database
spec:
  type: state.postgresql
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: postgres-connection
      key: connectionString
auth:
  secretStore: vault-secrets   # Use vault for this component's secrets
```

## Migration Pattern: Dual-Store Reads

During a migration from Kubernetes secrets to Vault, read from both with fallback:

```go
func getSecretWithFallback(ctx context.Context, client dapr.Client, key string) (string, error) {
  // Try Vault first
  secret, err := client.GetSecret(ctx, "vault-secrets", key, nil)
  if err == nil {
    return secret[key], nil
  }

  // Fall back to Kubernetes secrets
  secret, err = client.GetSecret(ctx, "k8s-secrets", key, nil)
  if err != nil {
    return "", fmt.Errorf("secret %s not found in any store: %w", key, err)
  }

  log.Printf("WARNING: secret %s served from k8s fallback - migrate to Vault", key)
  return secret[key], nil
}
```

## Summary

Dapr's support for multiple simultaneous secret store components enables flexible, layered secret management strategies. Infrastructure credentials can live in Kubernetes secrets, application secrets in Vault, and cloud credentials in provider-native stores - each accessed through the same Dapr API with different store names. This architecture also simplifies secret store migrations by enabling dual-store reads with gradual cutover.
