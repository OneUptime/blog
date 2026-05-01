# How to Set Up Separate Dev/Staging/Prod Environments in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Environment, CI/CD, DevOps, Multi-Environment

Description: Configure separate development, staging, and production environments in Portainer using multiple endpoints, environment-specific stacks, and secrets.

## Introduction

Managing separate Dev/Staging/Prod environments in Portainer uses the Environments feature to connect multiple Docker hosts. Each environment gets its own endpoint in Portainer, and stacks can be deployed independently to each. This guide covers the complete setup for three-tier environment management.

## Architecture

```text
Portainer (Central Management)
    │
    ├─── Development Environment (Endpoint 1)
    │    └─── dev-server.local
    │
    ├─── Staging Environment (Endpoint 2)
    │    └─── staging-server.yourdomain.com
    │
    └─── Production Environment (Endpoint 3)
         └─── prod-server.yourdomain.com (or Swarm cluster)
```

## Step 1: Add All Three Environments to Portainer

For each Docker Standalone environment server, install the Portainer Agent:

```bash
# Install on each Docker Standalone server (dev, staging, and prod if prod is standalone)

docker run -d \
  -p 9001:9001 \
  --name portainer_agent \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:latest
```

If Production is a Swarm cluster, deploy the Swarm Agent there instead and add that environment as **Docker Swarm** rather than **Docker Standalone**.

In Portainer:
1. **Environments** > **Add environment**
2. Add Dev and Staging as **Docker Standalone**. Add Production as **Docker Swarm** if you want Swarm-only features like secrets, replicas, and rolling updates.
3. For Agent-based environments, use `dev-server:9001`, `staging-server:9001`, and `prod-server:9001` as the environment URL. Do not prefix the address with `tcp://`.
4. Add tags to each: `environment=dev`, `environment=staging`, `environment=production`

## Step 2: Environment-Specific Stack Files

```yaml
# docker-compose.dev.yml - Development overrides
version: "3.8"

services:
  api:
    image: myapp/api:dev  # Local image, no registry
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    environment:
      - ENVIRONMENT=development
      - DEBUG=true
      - DATABASE_URL=postgresql://dev:dev@postgres:5432/devdb
      - LOG_LEVEL=debug
      - RELOAD=true
    volumes:
      # Mount source code for hot-reload (not in staging/prod)
      - /opt/myapp/src:/app/src
    ports:
      - "8000:8000"
      - "5678:5678"    # Debugger

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=devdb
      - POSTGRES_USER=dev
      - POSTGRES_PASSWORD=dev

  # Dev-only: pgAdmin, mailhog
  pgadmin:
    image: dpage/pgadmin4:latest
    environment:
      - PGADMIN_DEFAULT_EMAIL=admin@dev.local
      - PGADMIN_DEFAULT_PASSWORD=admin

  mailhog:
    image: mailhog/mailhog:latest
    ports:
      - "8025:8025"
```

```yaml
# docker-compose.staging.yml - Staging configuration
version: "3.8"

services:
  api:
    image: registry.yourdomain.com/myapp/api:${IMAGE_TAG:-latest}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    environment:
      - ENVIRONMENT=staging
      - DEBUG=false
      - DATABASE_URL=${STAGING_DATABASE_URL}
      - LOG_LEVEL=info
    mem_limit: 512M

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=staging_db
      - POSTGRES_USER=${STAGING_DB_USER}
      - POSTGRES_PASSWORD=${STAGING_DB_PASSWORD}
    volumes:
      - staging_db_data:/var/lib/postgresql/data

volumes:
  staging_db_data:
```

```yaml
# docker-compose.production.yml - Production configuration (Swarm)
version: "3.8"

services:
  api:
    image: registry.yourdomain.com/myapp/api:${IMAGE_TAG}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    environment:
      - ENVIRONMENT=production
      - DEBUG=false
      - DATABASE_URL=${PROD_DATABASE_URL}
      - LOG_LEVEL=warn
      - SENTRY_DSN=${SENTRY_DSN}
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 1G
      update_config:
        parallelism: 1
        delay: 30s
        order: start-first
```

## Step 3: Use Portainer Environments for Stack Deployment

```bash
#!/bin/bash
# deploy-multi-env.sh - Update existing file-based stacks via the Portainer API

set -euo pipefail

ENVIRONMENT="${1:?Specify: dev|staging|production}"
IMAGE_TAG="${2:?Specify image tag}"

case "$ENVIRONMENT" in
    dev)
        ENDPOINT_ID=1
        STACK_ID=1
        STACK_FILE="docker-compose.dev.yml"
        ;;
    staging)
        ENDPOINT_ID=2
        STACK_ID=2
        STACK_FILE="docker-compose.staging.yml"
        ;;
    production)
        ENDPOINT_ID=3
        STACK_ID=3
        STACK_FILE="docker-compose.production.yml"
        ;;
    *)
        echo "Unknown environment: $ENVIRONMENT"
        exit 1
        ;;
esac

echo "Deploying $IMAGE_TAG to $ENVIRONMENT (endpoint: $ENDPOINT_ID)"

PAYLOAD=$(jq -n \
  --arg image_tag "$IMAGE_TAG" \
  --rawfile stack_file_content "$STACK_FILE" \
  '{
    Env: [
      {"name": "IMAGE_TAG", "value": $image_tag}
    ],
    RepullImageAndRedeploy: true,
    StackFileContent: $stack_file_content
  }')

curl -X PUT \
  -H "X-API-Key: $PORTAINER_API_KEY" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/stacks/$STACK_ID?endpointId=$ENDPOINT_ID" \
  -d "$PAYLOAD"
```

## Step 4: Environment-Specific Portainer Secrets

In Portainer, create environment-specific secrets for any Docker Swarm environment:
1. Navigate to a Swarm environment (for example, Production)
2. Go to **Secrets** > **Add secret**
3. Create secrets specific to that environment:
   - `db_password` (different value per environment)
   - `api_key` (different value per environment)
   - `jwt_secret` (different value per environment)

On Docker Standalone endpoints, use stack environment variables or an uploaded `.env` file instead, because Portainer only exposes the **Secrets** menu for Docker Swarm environments.

```yaml
# Reference secrets in stack file
services:
  api:
    secrets:
      - db_password
      - jwt_secret
    environment:
      - DB_PASSWORD_FILE=/run/secrets/db_password

secrets:
  db_password:
    external: true  # Created per-environment in Portainer
  jwt_secret:
    external: true
```

## Step 5: Portainer Teams for Environment Access Control

```text
Teams:
├── Developers
│   ├── Access: Dev environment (full)
│   ├── Access: Staging environment (read-only)
│   └── Access: Production environment (none)
│
├── DevOps
│   ├── Access: Dev environment (full)
│   ├── Access: Staging environment (full)
│   └── Access: Production environment (full)
│
└── Managers
    ├── Access: All environments (read-only)
```

Create teams under **User-related** > **Teams**, then assign those teams to environments from **Environment-related** > **Environments** > **Manage access**. In Community Edition you can still restrict environment access, but the granular read-only/full split above requires Portainer Business Edition RBAC.

## Step 6: Environment Status Dashboard

```bash
#!/bin/bash
# check-all-envs.sh - Display status of all environments

set -euo pipefail

for ENV_ID in 1 2 3; do
    ENV_INFO=$(curl -s \
        -H "X-API-Key: $PORTAINER_API_KEY" \
        "$PORTAINER_URL/api/endpoints/$ENV_ID")

    ENV_NAME=$(echo "$ENV_INFO" | jq -r '.Name')
    IS_SWARM_MANAGER=$(curl -s \
        -H "X-API-Key: $PORTAINER_API_KEY" \
        "$PORTAINER_URL/api/endpoints/$ENV_ID/docker/info" | \
        jq -r '.Swarm.ControlAvailable // false')

    echo "=== $ENV_NAME (Endpoint $ENV_ID) ==="

    if [ "$IS_SWARM_MANAGER" = "true" ]; then
        SERVICES_JSON=$(curl -s \
            -H "X-API-Key: $PORTAINER_API_KEY" \
            "$PORTAINER_URL/api/endpoints/$ENV_ID/docker/services")
        SERVICES=$(echo "$SERVICES_JSON" | jq 'length')

        echo "Swarm services: $SERVICES"

        echo "$SERVICES_JSON" | \
            jq -r '.[] | "\(.Spec.Name): \(.Spec.TaskTemplate.ContainerSpec.Image)"'
    else
        CONTAINERS_JSON=$(curl -s \
            -H "X-API-Key: $PORTAINER_API_KEY" \
            "$PORTAINER_URL/api/endpoints/$ENV_ID/docker/containers/json")
        CONTAINERS=$(echo "$CONTAINERS_JSON" | jq 'length')

        echo "Running containers: $CONTAINERS"

        echo "$CONTAINERS_JSON" | \
            jq -r '.[] | "\(.Names[0]): \(.Image)"'
    fi

    echo ""
done
```

## Conclusion

Separate Dev/Staging/Prod environments in Portainer give your team a controlled pipeline for software releases. Developers work freely in Dev, changes are validated in Staging (mirroring production configuration), and Production only receives tested, approved releases. Portainer's environment switching makes it easy to manage all three from one interface, while team-based access control ensures developers can't accidentally deploy to production.
