# How to Use Environment Variables from Secrets in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret, Environment Variable, Kubernetes, Security

Description: Learn how to inject secrets as environment variables into Dapr-enabled services using Kubernetes secrets and Dapr's secret store integration.

---

## Overview

Exposing secrets as environment variables is a common pattern in containerized applications. Dapr enhances this workflow by providing a secret store API and supporting Kubernetes-native secret injection, giving you flexibility in how secrets reach your application.

## Method 1: Native Kubernetes Secret Injection

The simplest approach uses standard Kubernetes secret references in your pod spec:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  DB_PASSWORD: cGFzc3dvcmQxMjM=  # base64 encoded
  API_KEY: bXlzZWNyZXRrZXk=
```

Reference these in your Deployment:

```yaml
spec:
  containers:
  - name: myapp
    image: myrepo/myapp:latest
    env:
    - name: DB_PASSWORD
      valueFrom:
        secretKeyRef:
          name: app-secrets
          key: DB_PASSWORD
    - name: API_KEY
      valueFrom:
        secretKeyRef:
          name: app-secrets
          key: API_KEY
```

## Method 2: Fetching Secrets at Startup via Dapr

For dynamic secret retrieval at runtime, use the Dapr secret API at application startup:

```python
import os
from dapr.clients import DaprClient

def load_secrets_as_env():
    with DaprClient() as client:
        db_secret = client.get_secret(
            store_name="vault",
            key="db-credentials"
        )
        # Set as environment variables for the process
        os.environ["DB_HOST"] = db_secret.secret["host"]
        os.environ["DB_PASSWORD"] = db_secret.secret["password"]

        api_secret = client.get_secret(
            store_name="vault",
            key="api-keys"
        )
        os.environ["STRIPE_KEY"] = api_secret.secret["stripe"]

if __name__ == "__main__":
    load_secrets_as_env()
    # Now start the application
    run_app()
```

## Method 3: Startup Script Pattern

The Dapr sidecar runs as a regular container, so it is not available during init container execution. Instead, use a startup wrapper script in the main container that waits for the sidecar and fetches secrets before starting the application:

```python
import json
import os
import time
import urllib.request

def wait_for_dapr(timeout=30):
    """Wait for the Dapr sidecar to be ready."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            urllib.request.urlopen("http://localhost:3500/v1.0/healthz")
            return
        except Exception:
            time.sleep(1)
    raise RuntimeError("Dapr sidecar did not become ready")

def load_secrets():
    wait_for_dapr()
    with urllib.request.urlopen(
        "http://localhost:3500/v1.0/secrets/vault/db-credentials"
    ) as resp:
        db_creds = json.loads(resp.read())
    os.environ["DB_PASSWORD"] = db_creds["password"]

if __name__ == "__main__":
    load_secrets()
    # Now start the application
    run_app()
```

## Restricting Secret Access via Scoping

Use Dapr Configuration to limit which secrets each service can access:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: payment-config
spec:
  secrets:
    scopes:
    - storeName: vault
      defaultAccess: deny
      allowedSecrets:
      - stripe-keys
      - db-credentials
```

## Auditing Secret Access

Enable Dapr logging to track secret retrievals:

```bash
kubectl logs -l app=payment-service -c daprd | grep "secret"
```

## Summary

Dapr provides multiple approaches for getting secrets into environment variables: Kubernetes native injection for static values, the Dapr secret API for dynamic retrieval at runtime, and startup scripts for pre-startup loading. Combine with Configuration-level scoping to enforce least-privilege access and audit which services are accessing which secrets.
