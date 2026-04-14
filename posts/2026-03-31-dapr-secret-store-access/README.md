# How to Configure Secret Store Access in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret, Security, Kubernetes, Configuration

Description: Learn how to configure Dapr secret store components to securely inject secrets into your microservices without hardcoding credentials.

---

## Overview

Dapr's secret store API abstracts away the underlying secrets backend - whether Kubernetes secrets, HashiCorp Vault, AWS Secrets Manager, or Azure Key Vault. Your application requests secrets by name and Dapr handles retrieval.

## Configuring the Kubernetes Secret Store

The Kubernetes secret store is available by default in Dapr clusters:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kubernetes
  namespace: default
spec:
  type: secretstores.kubernetes
  version: v1
```

## Configuring HashiCorp Vault

For production, use HashiCorp Vault:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vault
  namespace: default
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
  - name: vaultKVPrefix
    value: "myapp"
```

## Retrieving Secrets in Application Code

```python
from dapr.clients import DaprClient

def get_db_credentials():
    with DaprClient() as client:
        secret = client.get_secret(
            store_name="vault",
            key="db-credentials"
        )
        return {
            "host": secret.secret["host"],
            "password": secret.secret["password"]
        }
```

## Using Secrets to Configure Components

Reference secrets in other component definitions:

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
    value: redis:6379
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
```

## Scoping Secret Store Access

Restrict which applications can access which secrets using the Configuration API:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: restrictedconfig
  namespace: default
spec:
  secrets:
    scopes:
    - storeName: vault
      defaultAccess: deny
      allowedSecrets:
      - db-credentials
      - api-keys
```

Apply this configuration to specific apps:

```yaml
annotations:
  dapr.io/config: "restrictedconfig"
```

## Bulk Secret Retrieval

Fetch all secrets from a store at once (useful for initialization):

```python
with DaprClient() as client:
    secrets = client.get_bulk_secret(store_name="kubernetes")
    for key, value in secrets.secrets.items():
        print(f"Secret: {key}")
```

## Summary

Dapr's secret store API provides a unified interface for accessing secrets from any backend. By using component definitions with secret references and Configuration-level scoping, you can enforce least-privilege access to secrets without changing application code when switching between secret backends.
