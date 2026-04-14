# How to Use Dapr Secrets Management with Environment Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret Management, Environment Variable, Configuration, Developer Experience

Description: Learn how to bridge Dapr Secrets Management with environment variables, letting you inject secrets from a secure store into your app's environment at startup.

---

Many applications read configuration from environment variables. Dapr Secrets Management can work alongside this pattern by populating environment variables from a secure secret store, giving you the developer ergonomics of env vars while keeping credentials in a hardened backend.

## The Local Environment Variable Secret Store

Dapr ships with a local environment variable secret store that reads directly from the process environment. This is useful in containers that receive secrets via the orchestration platform:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: env-secret-store
spec:
  type: secretstores.local.env
  version: v1
  metadata: []
```

Retrieve a secret by its environment variable name:

```bash
curl http://localhost:3500/v1.0/secrets/env-secret-store/DATABASE_URL
```

## Injecting Secrets from Vault into Kubernetes Environment Variables

A common pattern is to use Vault Agent Injector or External Secrets Operator to write secrets from Vault into Kubernetes secrets, then mount them as environment variables. Dapr can then use the Kubernetes secret store to expose the same values through the secrets API:

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: my-service
      env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: db-password
```

Application code reading from either source:

```javascript
// Works whether the value came from env var or Dapr API
const dbPassword = process.env.DB_PASSWORD ||
  await daprClient.secret.get('k8s-secrets', 'db-password')
    .then(s => s['db-password']);
```

## Using Dapr Init Container to Populate Env Files

For legacy applications that require a `.env` file, use an init container to write secrets from Dapr before the main container starts:

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      volumes:
        - name: shared-env
          emptyDir: {}
      initContainers:
        - name: secrets-init
          image: alpine:latest
          command:
            - sh
            - -c
            - |
              apk add --no-cache curl jq > /dev/null 2>&1 &&
              curl -s http://dapr-api:3500/v1.0/secrets/vault-store/app-secrets \
                | jq -r 'to_entries | .[] | "\(.key)=\(.value)"' \
                > /shared/app.env
          volumeMounts:
            - name: shared-env
              mountPath: /shared
      containers:
        - name: my-app
          command: ["sh", "-c", "set -a && . /shared/app.env && set +a && exec my-app"]
          volumeMounts:
            - name: shared-env
              mountPath: /shared
```

## Combining Dapr Secrets API with dotenv

For Node.js services, you can use Dapr to bootstrap your dotenv configuration:

```javascript
import { DaprClient } from '@dapr/dapr';

async function bootstrapEnv() {
  const client = new DaprClient();
  const secrets = await client.secret.get('vault-store', 'app-secrets');

  // Inject into process.env for backward compatibility
  for (const [key, value] of Object.entries(secrets)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// Call before anything else
await bootstrapEnv();
```

## Summary

Dapr Secrets Management integrates smoothly with environment-variable-based applications by providing a local env store, Kubernetes secret injection patterns, and programmatic bootstrapping at startup. This lets you migrate applications incrementally - reading from the Dapr secrets API where possible while falling back to environment variables for code that has not been updated yet.
