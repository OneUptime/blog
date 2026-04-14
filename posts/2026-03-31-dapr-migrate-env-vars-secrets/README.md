# How to Migrate from Environment Variables to Dapr Secrets Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secrets Management, Environment Variable, Security, Migration

Description: Learn how to replace environment variable-based secrets with Dapr Secrets Management to centralize secret storage and reduce secret sprawl across deployments.

---

## The Environment Variable Problem

Environment variables for secrets are convenient but problematic at scale: they appear in process listings, leak into crash dumps, require redeployment to rotate, and are difficult to audit. Dapr Secrets Management connects to a secrets backend (Kubernetes Secrets, Vault, AWS Secrets Manager) through a uniform API.

## Before: Environment Variables

```python
# config.py
import os

DB_PASSWORD    = os.environ['DB_PASSWORD']
API_KEY        = os.environ['PAYMENT_API_KEY']
JWT_SECRET     = os.environ['JWT_SECRET']
SMTP_PASSWORD  = os.environ['SMTP_PASSWORD']
```

```yaml
# kubernetes/deployment.yaml
env:
  - name: DB_PASSWORD
    value: "supersecret123"       # hardcoded - bad
  - name: PAYMENT_API_KEY
    valueFrom:
      secretKeyRef:
        name: payment-secrets
        key: api-key
```

## After: Dapr Secrets Management

Configure the secrets component:

```yaml
# components/secrets.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: app-secrets
spec:
  type: secretstores.kubernetes
  version: v1
  metadata: []
```

For local development using a local file store:

```yaml
# components/secrets-local.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: app-secrets
spec:
  type: secretstores.local.file
  version: v1
  metadata:
  - name: secretsFile
    value: "./secrets.json"
  - name: nestedSeparator
    value: "/"
```

secrets.json (local dev only — gitignored):

```json
{
  "db-password": "localdev123",
  "payment-api-key": "pk_test_abc123",
  "jwt-secret": "dev-jwt-secret",
  "smtp-password": "local-smtp-pass"
}
```

Retrieve secrets in Python:

```python
# config.py - via Dapr
import requests
import os

DAPR_PORT = os.getenv('DAPR_HTTP_PORT', '3500')

def get_secret(secret_name: str) -> str:
    response = requests.get(
        f'http://localhost:{DAPR_PORT}/v1.0/secrets/app-secrets/{secret_name}'
    )
    response.raise_for_status()
    return response.json()[secret_name]

DB_PASSWORD   = get_secret('db-password')
API_KEY       = get_secret('payment-api-key')
JWT_SECRET    = get_secret('jwt-secret')
SMTP_PASSWORD = get_secret('smtp-password')
```

## Using Dapr SDK (Python)

```python
from dapr.clients import DaprClient

with DaprClient() as client:
    db_secret = client.get_secret(
        store_name='app-secrets',
        key='db-password'
    )
    db_password = db_secret.secret['db-password']
```

## Referencing Secrets in Component Configuration

You can also reference secrets directly in Dapr component metadata to avoid hardcoding credentials there:

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
    value: "redis:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-password
      key: redis-password
auth:
  secretStore: app-secrets
```

## Secret Scoping

Limit which applications can access which secrets:

```yaml
# components/secret-scope.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: app-config
spec:
  secrets:
    scopes:
    - storeName: app-secrets
      defaultAccess: deny
      allowedSecrets: ["db-password", "jwt-secret"]
```

## Summary

Migrating from environment variables to Dapr Secrets Management centralizes secret storage in a dedicated backend while keeping your application code simple. A single `get_secret()` call replaces `os.environ` lookups. Secrets can be scoped per application, and rotating a secret in the backend does not require a redeployment. Local development uses a JSON file store that mimics the same API.
