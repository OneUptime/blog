# How to Configure Dapr with Local Environment Variables as Secret Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret Management, Environment Variable, Local Development, Configuration

Description: Learn how to configure and use the Dapr local environment variable secret store for development and testing without a remote secret backend.

---

The Dapr local environment variable secret store reads secrets directly from the process environment. It is the simplest possible secret store backend - no external service required, no credentials to manage. While not appropriate for production, it is an excellent fit for local development, CI pipelines, and containers that receive secrets via platform injection.

## When to Use the Local Env Store

Use the local env store when:
- You are developing locally and want to keep things simple
- Your CI system injects credentials as environment variables
- Your container orchestrator (like Nomad or Docker Swarm) manages secret injection via env vars
- You are migrating and need a transitional solution

## Component Configuration

The component is minimal - there is no metadata needed:

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

Save this as `~/.dapr/components/env-secret-store.yaml` for local development, or apply it to Kubernetes for cluster use.

## Setting Up Secrets as Environment Variables

```bash
# Export secrets in your shell or .env file
export DATABASE_PASSWORD="localdevpassword"
export STRIPE_API_KEY="sk_test_local123"
export REDIS_PASSWORD="localredispass"
export JWT_SECRET="my-local-jwt-secret"
```

When running with Dapr locally, these are passed through to the sidecar:

```bash
dapr run \
  --app-id my-service \
  --app-port 3000 \
  --resources-path ~/.dapr/components \
  -- node server.js
```

## Retrieving Environment Variable Secrets

The secret name is the exact environment variable name:

```bash
curl http://localhost:3500/v1.0/secrets/env-secret-store/DATABASE_PASSWORD
```

Response:

```json
{
  "DATABASE_PASSWORD": "localdevpassword"
}
```

In code:

```python
import httpx

async def get_secret(key: str) -> str:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"http://localhost:3500/v1.0/secrets/env-secret-store/{key}"
        )
        return resp.json()[key]

db_password = await get_secret("DATABASE_PASSWORD")
```

## Using in Docker Compose

```yaml
version: "3.8"
services:
  my-service:
    image: my-service:latest
    environment:
      - DATABASE_PASSWORD=devpassword
      - STRIPE_API_KEY=sk_test_local

  dapr-sidecar:
    image: daprio/daprd:latest
    command:
      - "./daprd"
      - "--app-id=my-service"
      - "--app-port=3000"
      - "--resources-path=/components"
    environment:
      - DATABASE_PASSWORD=devpassword
      - STRIPE_API_KEY=sk_test_local
    volumes:
      - ./components:/components
    network_mode: "service:my-service"
```

Both containers need the environment variables since the sidecar reads them on behalf of the app.

## Limitations to Be Aware Of

The local env store has important limitations for production:
- Secrets are visible in `ps auxe` output and `/proc/PID/environ`
- No access control or scoping enforcement
- No audit logging
- No versioning or rotation support

For production, use Kubernetes secrets, HashiCorp Vault, or a cloud provider's secret manager.

## Summary

The Dapr local environment variable secret store provides the simplest possible secrets backend by reading directly from the process environment. It is ideal for local development and CI pipelines where secrets are injected via environment variables, allowing you to use the same Dapr secrets API as production while deferring the complexity of a real secret backend to when it is actually needed.
