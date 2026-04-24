# How to Create Secrets via YAML Manifest in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Secret, YAML, Security, DevOps

Description: Learn how to create Kubernetes Secrets using YAML manifests in Portainer for GitOps workflows, complex secret configurations, and infrastructure-as-code practices.

## Introduction

Creating Kubernetes Secrets via YAML manifests enables GitOps workflows and infrastructure-as-code practices. While raw secret values should never be stored in Git, YAML manifests define the structure and can reference values from external secret managers. Portainer's YAML editor supports creating secrets directly from manifests. This guide covers creating Secrets via YAML in Portainer.

## Prerequisites

- Portainer with Kubernetes environment
- Secret values to store (passwords, tokens, certificates)
- Understanding that values in the `data` field must be base64-encoded, while `stringData` accepts plain text

## Understanding Base64 Encoding in Kubernetes Secrets

Kubernetes Secret manifests use base64-encoded strings in the `data` field:

```bash
# Encode a value

echo -n "my-password" | base64
# Output: bXktcGFzc3dvcmQ=

# Decode a value
echo "bXktcGFzc3dvcmQ=" | base64 --decode
# Output: my-password

# Important: -n flag prevents newline in encoded output
echo "my-password" | base64     # WRONG - includes newline
echo -n "my-password" | base64  # CORRECT
```

Note: The `stringData` field accepts plain text and avoids manual encoding, though Kubernetes notes it does not work well with server-side apply.

## Step 1: Opaque Secret with base64-encoded Data

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-app-secrets
  namespace: production
  labels:
    app: my-app
    environment: production
type: Opaque
data:
  # Values must be base64-encoded
  # echo -n "postgres-password" | base64
  DATABASE_PASSWORD: cG9zdGdyZXMtcGFzc3dvcmQ=
  # echo -n "redis-secret" | base64
  REDIS_PASSWORD: cmVkaXMtc2VjcmV0
  # echo -n "jwt-secret-key-here" | base64
  JWT_SECRET: and0LXNlY3JldC1rZXktaGVyZQ==
```

## Step 2: Using stringData (Recommended for Readability)

The `stringData` field accepts plain text - Kubernetes encodes it automatically:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-app-secrets
  namespace: production
type: Opaque
stringData:
  # Plain text - no base64 encoding needed
  DATABASE_PASSWORD: "postgres-password-production"
  DATABASE_URL: "postgresql://app_user:postgres-password-production@postgres:5432/mydb"
  REDIS_PASSWORD: "redis-secret-password"
  JWT_SECRET: "a-very-long-random-secret-key-minimum-32-chars"
  API_KEY: "sk-prod-abc123def456ghi789jkl012"
  STRIPE_SECRET_KEY: "sk_live_abc123"
  SENDGRID_API_KEY: "SG.abc123def456"
```

## Step 3: TLS Secret from Certificates

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: tls-production
  namespace: production
type: kubernetes.io/tls
data:
  # Base64-encode certificate files:
  # base64 < tls.crt | tr -d '\n'
  tls.crt: LS0tLS1CRUdJTi...  # truncated - paste full base64
  # base64 < tls.key | tr -d '\n'
  tls.key: LS0tLS1CRUdJTi...  # truncated - paste full base64
```

Or use stringData for TLS (less common but valid):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: tls-production
  namespace: production
type: kubernetes.io/tls
stringData:
  tls.crt: |
    -----BEGIN CERTIFICATE-----
    MIIFazCCA1OgAwIBAgIUe...
    -----END CERTIFICATE-----
  tls.key: |
    -----BEGIN PRIVATE KEY-----
    MIIEvQIBADANBgkqhkiG9w...
    -----END PRIVATE KEY-----
```

## Step 4: Docker Registry Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: registry-credentials
  namespace: production
type: kubernetes.io/dockerconfigjson
stringData:
  .dockerconfigjson: |
    {
      "auths": {
        "registry.company.com": {
          "username": "robot-account",
          "password": "robot-token-here",
          "email": "ops@company.com",
          "auth": "cm9ib3QtYWNjb3VudDpyb2JvdC10b2tlbi1oZXJl"
        }
      }
    }
```

The `auth` field is base64-encoded `username:password`.

## Step 5: Multiple Secrets in One YAML

Deploy several secrets at once using multi-document YAML:

```yaml
# Database credentials
---
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: production
type: Opaque
stringData:
  DB_USER: "app_user"
  DB_PASSWORD: "db-production-password-2024"
  DB_HOST: "postgres.production.svc.cluster.local"
  DB_PORT: "5432"
  DB_NAME: "myapp_production"

# External service API keys
---
apiVersion: v1
kind: Secret
metadata:
  name: external-api-keys
  namespace: production
type: Opaque
stringData:
  STRIPE_SECRET_KEY: "sk_live_..."
  SENDGRID_API_KEY: "SG...."
  TWILIO_AUTH_TOKEN: "..."
  DATADOG_API_KEY: "..."

# Internal service tokens
---
apiVersion: v1
kind: Secret
metadata:
  name: service-tokens
  namespace: production
type: Opaque
stringData:
  INTERNAL_API_TOKEN: "..."
  WEBHOOK_SECRET: "..."
  ENCRYPTION_KEY: "..."
```

## Step 6: Apply the Secret YAML in Portainer

1. In Portainer, open **ConfigMaps & Secrets** > **Secrets** and click **Create from manifest**
2. Paste the Secret manifest into the web editor
3. Click **Deploy**
4. Portainer confirms creation

Important: After successful deployment, clear the editor and do not save the YAML with real values to Git.

## Step 7: External Secrets Operator Integration

For production use, reference secrets from external stores:

```yaml
# ExternalSecret CRD (requires External Secrets Operator)
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: my-app-secrets
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: my-app-secrets   # Creates this Kubernetes Secret
    creationPolicy: Owner
  data:
    - secretKey: DATABASE_PASSWORD
      remoteRef:
        key: production/myapp
        property: db_password
    - secretKey: API_KEY
      remoteRef:
        key: production/myapp
        property: api_key
```

## Step 8: Immutable Secrets

Prevent accidental modification of critical secrets:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: production-credentials-v3
  namespace: production
type: Opaque
immutable: true
stringData:
  API_KEY: "versioned-api-key-v3"
```

Use versioned names (`production-credentials-v3`) and create new secrets rather than modifying immutable ones.

## Conclusion

YAML-based Secret creation in Portainer enables structured, reproducible secret management. Use `stringData` to avoid manual base64 encoding, create typed secrets for TLS and registry credentials, and use multi-document YAML to create related secrets together. For production environments, integrate with External Secrets Operator or HashiCorp Vault to source secret values from dedicated secret management systems rather than hardcoding them in YAML manifests.
