# How to Migrate from HashiCorp Vault Direct Usage to Dapr Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, HashiCorp Vault, Secrets Management, Migration, Security

Description: Learn how to replace direct HashiCorp Vault API calls with Dapr Secrets Management to simplify secret retrieval and enable multi-backend secret portability.

---

## Why Use Dapr in Front of Vault?

The HashiCorp Vault API is powerful but verbose: you manage tokens, lease renewals, and KV version paths in your code. Dapr wraps Vault behind a simple get/list API. Your application code no longer knows it is talking to Vault - you can swap to AWS Secrets Manager or Kubernetes Secrets later with zero code changes.

## Before: Direct hvac (Python Vault Client)

```python
# vault_client.py - direct hvac
import os
import hvac

VAULT_ADDR  = 'http://vault:8200'
VAULT_TOKEN = os.environ['VAULT_TOKEN']

client = hvac.Client(url=VAULT_ADDR, token=VAULT_TOKEN)

def get_db_credentials():
    secret = client.secrets.kv.v2.read_secret_version(
        path='database/order-service',
        mount_point='secret'
    )
    data = secret['data']['data']
    return {
        'host':     data['host'],
        'username': data['username'],
        'password': data['password']
    }

def get_api_key(service_name):
    secret = client.secrets.kv.v2.read_secret_version(
        path=f'api-keys/{service_name}',
        mount_point='secret'
    )
    return secret['data']['data']['key']
```

## After: Dapr Secrets Management with Vault

Configure the Dapr Vault component:

```yaml
# components/vault-secrets.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vault
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: "http://vault:8200"
  - name: vaultToken
    value: ""               # leave empty; use skipVerify or k8s auth
  - name: vaultKVPrefix
    value: "secret"
  - name: vaultKVUsePrefix
    value: "true"
  - name: enginePath
    value: "secret"
  - name: vaultTokenMountPath
    value: "/var/run/secrets/vault/token"
```

Simplified application code:

```python
# vault_client.py - via Dapr
from dapr.clients import DaprClient

def get_db_credentials():
    with DaprClient() as client:
        secret = client.get_secret(
            store_name='vault',
            key='database/order-service'
        )
        return {
            'host':     secret.secret['host'],
            'username': secret.secret['username'],
            'password': secret.secret['password']
        }

def get_api_key(service_name):
    with DaprClient() as client:
        secret = client.get_secret(
            store_name='vault',
            key=f'api-keys/{service_name}'
        )
        return secret.secret['key']
```

## Vault Kubernetes Auth

Instead of a static token, use a Vault Agent sidecar or init container to perform Kubernetes auth and write the resulting Vault token to a file. Then point `vaultTokenMountPath` at that file:

```yaml
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: "http://vault:8200"
  - name: vaultTokenMountPath
    value: "/vault/secrets/token"
  - name: skipVerify
    value: "false"
  - name: tlsServerName
    value: "vault"
```

The Vault Agent sidecar handles the Kubernetes service account login and writes a renewable Vault token to the path above. This keeps authentication concerns outside of Dapr and your application code.

## Listing Available Secrets

```python
with DaprClient() as client:
    secrets = client.get_bulk_secret(store_name='vault')
    for key, value in secrets.secrets.items():
        print(f"Key: {key}")
```

## Applying Access Scoping

Restrict which secrets an application can read:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: order-service-config
spec:
  secrets:
    scopes:
    - storeName: vault
      defaultAccess: deny
      allowedSecrets:
        - "database/order-service"
        - "api-keys/payment-gateway"
```

## Summary

Migrating from direct hvac calls to Dapr Secrets Management removes Vault-specific token management and KV path construction from your application code. The Dapr Vault component handles lease renewal and authentication transparently. Application code calls a simple `get_secret()` method, making it trivial to switch from Vault to another secrets backend by swapping only the component YAML.
