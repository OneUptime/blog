# How to Use Docker Secrets with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Docker, Secret, Security, Configuration

Description: Learn how to use Docker Secrets with Dapr to securely pass sensitive configuration like API keys and passwords to services without exposing them in environment variables.

---

## Why Docker Secrets with Dapr

Hardcoding sensitive values in environment variables or component YAML files is a security risk - they appear in `docker inspect` output and CI logs. Docker Secrets stores sensitive data in an encrypted overlay and mounts it as a file inside the container, keeping it out of the image and environment.

## Creating Docker Secrets in Swarm Mode

Docker Secrets require Docker Swarm. Initialize a swarm if you have not already:

```bash
docker swarm init
```

Create secrets for database credentials and API keys:

```bash
echo "my-redis-password" | docker secret create redis_password -
echo "my-api-key-value" | docker secret create external_api_key -
```

List your secrets (values are never displayed):

```bash
docker secret ls
```

## Accessing Secrets in Dapr Components

Docker mounts secrets as files under `/run/secrets/`. Configure your Dapr component to read values from files using the `secretKeyRef` approach or simply read the file path directly:

Create a Dapr local file secret store that reads from the secrets mount:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: docker-secrets
spec:
  type: secretstores.local.file
  version: v1
  metadata:
  - name: secretsFile
    value: /run/secrets/dapr-secrets.json
```

The secrets file mounted by Docker would contain:

```json
{
  "redisPassword": "my-redis-password",
  "externalApiKey": "my-api-key-value"
}
```

Then reference the secret in another component:

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
      name: redisPassword
      key: redisPassword
auth:
  secretStore: docker-secrets
```

## Deploying with Docker Stack and Secrets

Define secrets in your Docker Compose/Stack file:

```yaml
version: "3.9"
secrets:
  redis_password:
    external: true
  dapr_secrets_file:
    external: true

services:
  order-service-dapr:
    image: daprio/daprd:1.13.0
    command: [
      "./daprd",
      "--app-id", "order-service",
      "--app-port", "3000",
      "--app-channel-address", "order-service",
      "--resources-path", "/components"
    ]
    secrets:
      - dapr_secrets_file
    volumes:
      - ./components:/components

  redis:
    image: redis:7-alpine
    command: sh -c "redis-server --requirepass $$(cat /run/secrets/redis_password)"
    secrets:
      - redis_password
```

Deploy the stack:

```bash
docker stack deploy -c docker-compose.yml dapr-stack
```

## Reading Secrets in Application Code

Your application can also read Docker Secrets directly from the filesystem:

```python
import os

def read_secret(secret_name: str) -> str:
    secret_path = f"/run/secrets/{secret_name}"
    if os.path.exists(secret_path):
        with open(secret_path, "r") as f:
            return f.read().strip()
    raise FileNotFoundError(f"Secret {secret_name} not found")

redis_password = read_secret("redis_password")
```

## Summary

Docker Secrets provide a secure alternative to environment variables for sensitive Dapr configuration. By creating an external Dapr secret store that reads from `/run/secrets/`, you can reference secrets in any component YAML file without exposing values in the image, environment, or logs. This pattern works well in Docker Swarm deployments alongside Dapr's built-in secret store building block.
