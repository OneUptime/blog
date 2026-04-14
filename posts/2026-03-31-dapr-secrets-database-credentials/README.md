# How to Use Dapr Secrets Management for Database Credentials

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret Management, Database, Kubernetes, Security

Description: Learn how to use Dapr Secrets Management to securely inject database credentials into your microservices without hardcoding connection details.

---

Managing database credentials securely is one of the most common challenges in microservice development. Hardcoded passwords in environment variables or config files create security risks and operational headaches. Dapr Secrets Management provides a clean abstraction that lets your application retrieve credentials at runtime from a secure backend.

## Why Dapr for Database Credentials

Dapr's secrets building block gives you a consistent API to access secrets regardless of the underlying store. You can swap from Kubernetes Secrets to HashiCorp Vault without changing application code. This separation of concerns means developers focus on application logic while operators manage credential lifecycle.

## Configure a Secret Store Component

Start by defining the secret store. Here using Kubernetes secrets as the backend:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mysecretstore
  namespace: default
spec:
  type: secretstores.kubernetes
  version: v1
  metadata: []
```

Create the Kubernetes secret holding your database password:

```bash
kubectl create secret generic db-creds \
  --from-literal=db-password=s3cr3tP@ssw0rd \
  --from-literal=db-username=appuser \
  -n default
```

## Retrieve Secrets in Your Application

With the Dapr sidecar running, call the secrets API from your service:

```bash
curl http://localhost:3500/v1.0/secrets/mysecretstore/db-creds
```

The response returns all key-value pairs in the secret:

```json
{
  "db-password": "s3cr3tP@ssw0rd",
  "db-username": "appuser"
}
```

## Using Secrets in a Node.js Service

Here is how to retrieve database credentials in a Node.js application using the Dapr client SDK:

```javascript
const { DaprClient } = require('@dapr/dapr');

async function getDbConnection() {
  const client = new DaprClient();
  const secrets = await client.secret.get('mysecretstore', 'db-creds');

  const connectionString = `postgres://${secrets['db-username']}:${secrets['db-password']}@db-host:5432/mydb`;
  return connectionString;
}
```

## Reference Secrets in Dapr Components

You can also reference secrets directly in other Dapr component definitions, avoiding any exposure in code:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: postgres-binding
spec:
  type: bindings.postgresql
  version: v1
  metadata:
    - name: url
      secretKeyRef:
        name: db-creds
        key: db-connection-url
  auth:
    secretStore: mysecretstore
```

## Scoping Secret Access

Limit which applications can read which secrets using Dapr scoping:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mysecretstore
spec:
  type: secretstores.kubernetes
  version: v1
  metadata: []
scopes:
  - order-service
  - inventory-service
```

Only services listed in `scopes` can access this secret store, preventing other microservices from reading database credentials they do not need.

## Summary

Dapr Secrets Management decouples credential storage from application code, letting you rotate database passwords without redeployments. By combining secret store components, scoping rules, and the consistent Dapr API, you can centralize credential management across all your microservices regardless of the backend secret store in use.
