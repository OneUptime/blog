# How to Deploy Infisical Secrets Manager via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Infisical, Secret, Security, Open Source

Description: Deploy Infisical open-source secrets manager via Portainer and use it to manage secrets for containerized applications.

## Introduction

Infisical is an open-source secrets manager that provides a GitHub-like UI for managing application secrets across environments. It supports automatic secret rotation, audit logs, and SDK/CLI integration. Deploying Infisical via Portainer gives your team a self-hosted alternative to HashiCorp Vault with a simpler setup.

## Deploying Infisical via Portainer

```yaml
# infisical-stack.yml

version: '3.8'

services:
  infisical:
    image: infisical/infisical:latest  # Pin to a specific release in production
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    ports:
      - "8080:8080"
    environment:
      NODE_ENV: "production"
      ENCRYPTION_KEY: "${ENCRYPTION_KEY}"  # Generate with: openssl rand -hex 16
      AUTH_SECRET: "${AUTH_SECRET}"        # Generate with: openssl rand -base64 32
      REDIS_URL: "redis://redis:6379"
      DB_CONNECTION_URI: "postgres://${POSTGRES_USER:-infisical}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB:-infisical}"
      SITE_URL: "https://infisical.example.com"
      SMTP_HOST: "${SMTP_HOST}"
      SMTP_PORT: "${SMTP_PORT:-587}"
      SMTP_USERNAME: "${SMTP_USERNAME}"
      SMTP_PASSWORD: "${SMTP_PASSWORD}"
      SMTP_FROM_ADDRESS: "noreply@example.com"
      SMTP_FROM_NAME: "Infisical"
    networks:
      - infisical-net

  db:
    image: postgres:14-alpine
    restart: unless-stopped
    volumes:
      - pg-data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: "${POSTGRES_DB:-infisical}"
      POSTGRES_USER: "${POSTGRES_USER:-infisical}"
      POSTGRES_PASSWORD: "${POSTGRES_PASSWORD}"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready --username=$$POSTGRES_USER && psql --username=$$POSTGRES_USER --list"]
      interval: 5s
      timeout: 10s
      retries: 10
    networks:
      - infisical-net

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis-data:/data
    networks:
      - infisical-net

volumes:
  pg-data:
  redis-data:

networks:
  infisical-net:
```

## Initial Setup

```bash
# Access Infisical at https://infisical.example.com
# 1. Create the first user account (the first user becomes the instance administrator)
# 2. Create an organization
# 3. Create a project (e.g., "my-app")
# 4. Add secrets to each environment (for example: dev, staging, prod)

# Install Infisical CLI on Alpine
apk add --no-cache bash sudo wget
wget -qO- 'https://artifacts-cli.infisical.com/setup.apk.sh' | sudo sh
apk update && sudo apk add infisical

# Point the CLI to your self-hosted instance
export INFISICAL_API_URL="https://infisical.example.com"

# Login and link your local project
infisical login
infisical init
```

## Using Infisical CLI with Docker

```bash
# Inject secrets into a Docker container at runtime
docker run --rm --env-file <(infisical export --projectId=<your-project-id> --env=prod --format=dotenv) \
  --name my-app \
  -e NODE_ENV=production \
  my-app:latest

# Get secrets in the current shell
eval "$(infisical export --projectId=<your-project-id> --env=prod --format=dotenv-export)"

# Start an image that already runs `infisical run` in its entrypoint
docker run --rm \
  --env INFISICAL_TOKEN="$INFISICAL_TOKEN" \
  --env INFISICAL_API_URL="https://infisical.example.com" \
  my-app-with-infisical:latest
```

## Infisical Agent for Kubernetes

```yaml
# Requires the Infisical Agent Injector to be installed in the cluster
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-infisical-config
data:
  config.yaml: |
    infisical:
      address: "https://infisical.example.com"
      auth:
        type: "kubernetes"
        config:
          identity-id: "<your-infisical-machine-identity-id>"
    templates:
      - destination-path: "/run/secrets/app.env"
        template-content: |
          {{- with secret "<your-project-id>" "prod" "/" }}
          {{- range . }}
          {{ .Key }}={{ .Value }}
          {{- end }}
          {{- end }}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
      annotations:
        org.infisical.com/inject: "true"
        org.infisical.com/inject-mode: "sidecar"
        org.infisical.com/agent-config-map: "myapp-infisical-config"
    spec:
      containers:
      - name: app
        image: myapp:latest
```

## Using the Infisical SDK

```python
# Python SDK
from infisical_sdk import InfisicalSDKClient

client = InfisicalSDKClient(
    host="https://infisical.example.com",
    token="your-infisical-token"
)

# Get a specific secret
db_secret = client.secrets.get_secret_by_name(
    secret_name="DB_PASSWORD",
    project_id="<your-project-id>",
    environment_slug="prod",
    secret_path="/"
)
db_password = db_secret.secretValue

# Get all secrets for an environment
secrets = client.secrets.list_secrets(
    project_id="<your-project-id>",
    environment_slug="prod",
    secret_path="/"
)
for secret in secrets.secrets:
    print(f"{secret.secretKey} = {secret.secretValue}")
```

```javascript
// Node.js SDK
const { InfisicalSDK } = require('@infisical/sdk');

const client = new InfisicalSDK({
    siteUrl: 'https://infisical.example.com'
});

client.auth().accessToken(process.env.INFISICAL_TOKEN);

async function getSecrets() {
    const secrets = await client.secrets().listSecrets({
        environment: 'prod',
        projectId: '<your-project-id>'
    });

    process.env.DB_PASSWORD = secrets.secrets.find(
        (secret) => secret.secretKey === 'DB_PASSWORD'
    )?.secretValue;
}
```

## Infisical in Portainer Deployment Pipeline

```yaml
# portainer-app-stack.yml - app image includes the Infisical CLI
version: '3.8'

services:
  app:
    image: myapp-with-infisical:latest
    restart: unless-stopped
    environment:
      INFISICAL_TOKEN: "${INFISICAL_TOKEN}"
      INFISICAL_API_URL: "https://infisical.example.com"
    command:
      - infisical
      - run
      - --projectId=<your-project-id>
      - --env=prod
      - --
      - node
      - server.js
```

## Conclusion

Infisical provides a modern, open-source secrets management solution that integrates well with Portainer-managed containers. Its intuitive UI, multi-environment support, and SDK integrations make it accessible to teams of all sizes. Deploying Infisical via Portainer gives you a self-hosted secrets manager with full control over your sensitive data.
