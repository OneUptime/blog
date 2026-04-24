# How to Manage Dev, Staging, and Production Environments with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Environment Management, Dev Staging Production, Docker, CI/CD, Multi-Environment

Description: Learn how to manage development, staging, and production environments with Portainer using separate stacks, environments, and configuration management.

---

Managing multiple environments (dev, staging, production) with Portainer involves separate stacks with environment-specific configurations, isolated data volumes, and a promotion pipeline that moves code forward through each stage.

## Environment Architecture

```mermaid
graph LR
    Dev[Dev Environment<br/>Feature branches] -->|PR Merge| Staging[Staging Environment<br/>Integration testing]
    Staging -->|Approval| Prod[Production Environment<br/>Live traffic]
    Dev -->|localhost:3000| DevPorts[Dev Ports]
    Staging -->|staging.example.com| StagingPorts[Staging Ports]
    Prod -->|example.com| ProdPorts[Production Ports]
```

## Portainer Environment Topology

Use separate Portainer **Environments** for physical separation:

| Environment | Portainer Setup | Purpose |
|-------------|-----------------|---------|
| Development | Local Docker endpoint | Developer laptops or shared dev server |
| Staging | Separate Portainer environment | QA and integration testing |
| Production | Separate Portainer environment | Live user traffic |

Or use a single Portainer instance with separate **stacks** and networks for cost efficiency.

## Shared Compose Base with Override Files

Use a base compose file with per-environment overrides:

```yaml
# docker-compose.yml (base)

services:
  api:
    image: myregistry.example.com/my-app:${IMAGE_TAG:-latest}
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      LOG_LEVEL: ${LOG_LEVEL:-info}
    networks:
      - app_net

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-appdb}
      POSTGRES_USER: ${POSTGRES_USER:-appuser}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app_net

volumes:
  postgres_data:

networks:
  app_net:
```

```yaml
# docker-compose.dev.yml (development overrides)
services:
  api:
    volumes:
      - .:/app         # Hot reload with bind mount
    environment:
      LOG_LEVEL: debug
      DEBUG_MODE: "true"
    ports:
      - "3000:3000"
      - "9229:9229"    # Node.js debugger port
```

```yaml
# docker-compose.staging.yml (staging overrides)
services:
  api:
    ports:
      - "8080:3000"
    environment:
      LOG_LEVEL: debug
```

```yaml
# docker-compose.prod.yml (production overrides)
services:
  api:
    scale: 3
    mem_limit: 512M
    restart: always
```

## Environment-Specific .env Files

Store environment variables in separate files in a secure config repository (not the application repo), then load the matching file into each Portainer stack:

```bash
# .env.dev
IMAGE_TAG=develop
DATABASE_URL=postgresql://appuser:devpassword@postgres:5432/appdb_dev
REDIS_URL=redis://dev-redis:6379/0
POSTGRES_PASSWORD=devpassword
LOG_LEVEL=debug

# .env.staging
IMAGE_TAG=staging
DATABASE_URL=postgresql://appuser:stagingpassword@postgres:5432/appdb_staging
REDIS_URL=redis://staging-redis:6379/0
POSTGRES_PASSWORD=stagingpassword
LOG_LEVEL=info

# .env.production
IMAGE_TAG=production
DATABASE_URL=postgresql://appuser:prodpassword@postgres:5432/appdb
REDIS_URL=redis://prod-redis:6379/0
POSTGRES_PASSWORD=prodpassword
LOG_LEVEL=warn
```

## Promotion Pipeline

If you're using Portainer Business Edition on a non-Edge environment, you can promote images through environments using tagging and then trigger the target stack with a webhook:

```bash
#!/bin/bash
# promote.sh <from-env> <to-env>
# Example: ./promote.sh staging production

FROM_ENV=$1
TO_ENV=$2
IMAGE="myregistry.example.com/my-app"

# Get the current image digest for the source environment
docker image pull "$IMAGE:$FROM_ENV"
CURRENT_DIGEST=$(docker image inspect "$IMAGE:$FROM_ENV" --format '{{index .RepoDigests 0}}')

echo "Promoting $IMAGE from $FROM_ENV to $TO_ENV"
echo "Image: $CURRENT_DIGEST"

# Re-tag and push
docker image tag  "$IMAGE:$FROM_ENV" "$IMAGE:$TO_ENV"
docker image push "$IMAGE:$TO_ENV"

# Trigger target environment deployment
WEBHOOK_VAR="PORTAINER_${TO_ENV^^}_WEBHOOK"
curl -fsS -X POST "${!WEBHOOK_VAR}"

echo "Promotion complete"
```

## Environment Isolation Checklist

Before going live, verify each environment is properly isolated:

- Separate database instances with separate passwords
- Separate Redis instances
- No shared volumes between environments
- Environment-specific API keys and secrets
- Separate domain names or ports
- Production has resource limits set
- Production has restart policies set
- Staging has debug logging enabled
- Dev has bind mounts for hot reload
