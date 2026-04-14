# How to Use the Dapr Secrets API Reference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret, API, Security, Vault

Description: A practical reference for the Dapr Secrets API covering secret retrieval, bulk secrets, scoping, and supported secret store backends.

---

## Overview

The Dapr Secrets API provides a uniform interface for retrieving secrets from any supported secret store backend, including Kubernetes Secrets, HashiCorp Vault, Azure Key Vault, and AWS Secrets Manager. Applications call the sidecar API and the sidecar handles authentication and backend-specific protocols.

## Base URL

```yaml
http://localhost:{daprPort}/v1.0/secrets/{secretStoreName}/{secretName}
```

## Getting a Single Secret

**GET** `/v1.0/secrets/{secretStoreName}/{secretName}`

```bash
curl http://localhost:3500/v1.0/secrets/kubernetes/db-credentials
```

Response:

```json
{
  "username": "app-user",
  "password": "s3cr3tP@ssword"
}
```

## Getting a Specific Key from a Secret

Some backends store multiple key-value pairs under one secret name. The API returns all key-value pairs for that secret, so extract the key you need in your app:

```javascript
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();

const secret = await client.secret.get("kubernetes", "db-credentials");
const password = secret["password"];
```

## Getting All Secrets (Bulk)

**GET** `/v1.0/secrets/{secretStoreName}/bulk`

```bash
curl http://localhost:3500/v1.0/secrets/vault/bulk
```

Response:

```json
{
  "db-credentials": {
    "username": "app-user",
    "password": "s3cr3t"
  },
  "api-keys": {
    "stripe": "sk_live_abc123",
    "sendgrid": "SG.xyz456"
  }
}
```

## Kubernetes Secret Store Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kubernetes
spec:
  type: secretstores.kubernetes
  version: v1
```

## HashiCorp Vault Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vault
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
    - name: vaultAddr
      value: http://vault.default.svc.cluster.local:8200
    - name: vaultToken
      secretKeyRef:
        name: vault-token
        key: token
```

## Scoping Secret Store Access

Restrict which applications can use a secret store component by adding a `scopes` field to the component YAML:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vault
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
    - name: vaultAddr
      value: http://vault:8200
auth:
  secretStore: kubernetes
scopes:
  - order-service
  - payment-service
```

This limits the `vault` secret store to only the `order-service` and `payment-service` app IDs. To control access to individual secrets within a store, use a Dapr [Configuration](https://docs.dapr.io/operations/configuration/configuration-overview/) resource with `spec.secrets.scopes`.

## Using Secrets in Component Metadata

Reference secrets directly in component YAML to avoid hardcoded credentials:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisPassword
      secretKeyRef:
        name: redis-credentials
        key: password
auth:
  secretStore: kubernetes
```

## Summary

The Dapr Secrets API decouples application code from secret store implementations. Use it to retrieve credentials at runtime rather than embedding them in environment variables or configuration files. The secret reference syntax in component YAML allows Dapr itself to inject credentials into component configurations without exposing them to application code.
