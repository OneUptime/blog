# How to Use Dapr Secrets Management with Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Python, Secret, Security, Microservice

Description: Learn how to retrieve and use secrets from Dapr secret stores in Python applications, with examples using local file store and Kubernetes secrets.

---

## Introduction

Dapr Secrets Management provides a unified API to retrieve secrets from various secret stores such as HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, and local files. In this guide, you will use the Dapr Python SDK to read secrets securely at runtime.

## Prerequisites

```bash
pip install dapr
dapr init
```

## Configuring a Local Secret Store

Create a secret store component for local development:

```yaml
# components/local-secret-store.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: localsecretstore
spec:
  type: secretstores.local.file
  version: v1
  metadata:
    - name: secretsFile
      value: ./secrets.json
    - name: nestedSeparator
      value: ":"
```

Create the secrets file:

```json
{
  "db-password": "s3cur3p@ss",
  "api-key": "my-super-secret-key"
}
```

## Retrieving a Secret

Use `DaprClient` to fetch secrets from your configured store:

```python
from dapr.clients import DaprClient

with DaprClient() as client:
    secret = client.get_secret(
        store_name="localsecretstore",
        key="db-password"
    )
    print(f"DB Password: {secret.secret['db-password']}")
```

## Retrieving Bulk Secrets

Fetch all secrets from a store in a single call:

```python
with DaprClient() as client:
    all_secrets = client.get_bulk_secret(store_name="localsecretstore")
    for key, value in all_secrets.secrets.items():
        print(f"{key}: {list(value.values())[0]}")
```

## Using Secrets in Application Config

A common pattern is to load secrets once at startup and inject them into your application configuration:

```python
from dapr.clients import DaprClient

def load_config():
    config = {}
    with DaprClient() as client:
        db_secret = client.get_secret(
            store_name="localsecretstore",
            key="db-password"
        )
        config["db_password"] = db_secret.secret["db-password"]

        api_secret = client.get_secret(
            store_name="localsecretstore",
            key="api-key"
        )
        config["api_key"] = api_secret.secret["api-key"]
    return config

app_config = load_config()
print(f"Loaded {len(app_config)} secrets")
```

## Kubernetes Secret Store

For Kubernetes deployments, configure the Kubernetes secret store:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: k8ssecretstore
spec:
  type: secretstores.kubernetes
  version: v1
```

Then reference it the same way in Python - no code changes needed:

```python
with DaprClient() as client:
    secret = client.get_secret(
        store_name="k8ssecretstore",
        key="my-k8s-secret"
    )
```

## Running the App

```bash
dapr run --app-id secrets-app --resources-path ./components -- python app.py
```

## Summary

Dapr Secrets Management lets you decouple secret retrieval from your application code. The Python SDK provides simple methods like `get_secret` and `get_bulk_secret` that work identically across all supported backends. Switching from a local file store to Vault or Kubernetes only requires updating the component configuration.
