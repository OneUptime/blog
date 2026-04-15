# How to Configure Dapr with Kubernetes Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Secret, Secret Store, Configuration, Security

Description: Learn how to configure the Dapr Kubernetes secret store component to read native Kubernetes Secrets and inject them into your applications securely.

---

## Overview

Dapr supports Kubernetes Secrets as a built-in secret store. This lets your application retrieve secrets using the Dapr Secrets API instead of mounting volumes or environment variables directly, keeping secret access uniform across environments and auditable through Dapr telemetry.

## Creating a Kubernetes Secret

Create a Kubernetes Secret that holds your application credentials:

```bash
kubectl create secret generic db-credentials \
  --from-literal=db-password=supersecretpassword \
  --from-literal=db-username=appuser \
  -n default
```

Or define it declaratively (avoid committing actual values to source control):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: default
type: Opaque
stringData:
  db-password: supersecretpassword
  db-username: appuser
```

## Configuring the Dapr Secret Store Component

The Kubernetes secret store component requires no external infrastructure - Dapr reads from the Kubernetes API directly:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kubernetes-secrets
  namespace: default
spec:
  type: secretstores.kubernetes
  version: v1
  metadata: []
```

Apply this component:

```bash
kubectl apply -f kubernetes-secret-store.yaml
```

## Granting RBAC Access

Dapr's service account needs read access to secrets. Create a Role and RoleBinding:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: dapr-secret-reader
  namespace: default
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: dapr-secret-reader-binding
  namespace: default
subjects:
  - kind: ServiceAccount
    name: default
    namespace: default
roleRef:
  kind: Role
  name: dapr-secret-reader
  apiGroup: rbac.authorization.k8s.io
```

## Reading a Secret via the Dapr HTTP API

Once the component is configured, retrieve a secret with a simple HTTP call:

```bash
curl http://localhost:3500/v1.0/secrets/kubernetes-secrets/db-credentials
```

Response:

```json
{
  "db-password": "supersecretpassword",
  "db-username": "appuser"
}
```

Retrieve the secret from a specific namespace by passing `metadata.namespace` as a query parameter:

```bash
curl "http://localhost:3500/v1.0/secrets/kubernetes-secrets/db-credentials?metadata.namespace=default"
```

## Reading Secrets in Code (Python SDK)

```python
from dapr.clients import DaprClient

with DaprClient() as client:
    secret = client.get_secret(
        store_name="kubernetes-secrets",
        key="db-credentials"
    )
    db_password = secret.secret["db-password"]
    db_username = secret.secret["db-username"]
    print(f"Connecting as {db_username}")
```

## Reading Secrets in Code (Go SDK)

```go
package main

import (
    "context"
    "fmt"
    dapr "github.com/dapr/go-sdk/client"
)

func main() {
    client, _ := dapr.NewClient()
    defer client.Close()

    secret, _ := client.GetSecret(context.Background(),
        "kubernetes-secrets", "db-credentials", nil)

    fmt.Println("DB Username:", secret["db-username"])
}
```

## Referencing Secrets in Dapr Component Definitions

You can also use Kubernetes Secrets to supply credentials for other Dapr components without hardcoding them:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: redis-statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: redis-master:6379
    - name: redisPassword
      secretKeyRef:
        name: redis-secret
        key: redis-password
auth:
  secretStore: kubernetes
```

## Summary

The Dapr Kubernetes secret store component lets applications read native Kubernetes Secrets through a consistent Dapr API. After creating an RBAC role for the Dapr service account and applying a minimal component YAML, your application can retrieve any secret by name using the Dapr SDK or HTTP API. Secrets can also be referenced in other Dapr component definitions to supply credentials without embedding them in configuration files.
