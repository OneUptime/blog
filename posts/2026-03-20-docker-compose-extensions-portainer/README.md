# How to Use Docker Compose Extensions in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Compose, Extension, X-fields, YAML, DevOps

Description: Use Docker Compose extension fields (x- prefix) in Portainer stacks to define reusable YAML anchors and reduce duplication across service definitions.

---

This guide shows how to use Docker Compose extension fields and YAML anchors in Portainer stacks to simplify and standardize your deployments.

## Overview

On Docker Standalone environments, Portainer deploys stacks with Docker Compose semantics, so features like extension fields and YAML anchors work in the stack editor without any special configuration. On Docker Swarm environments, Portainer uses `docker stack deploy`, which relies on the legacy Compose file version 3 format rather than the full Compose Specification.

## Practical Example

### Docker Compose Profiles

Profiles let you define services that are only started in specific scenarios. This is a Docker Compose feature for standalone deployments:

```yaml
# stack with profiles

version: "3.8"
services:
  # Always started
  webapp:
    image: myapp:1.2.3

  # Only started with --profile debug
  debug-tools:
    image: busybox:latest
    profiles: ["debug"]
    command: sleep infinity

  # Only started with --profile monitoring
  prometheus:
    image: prom/prometheus:latest
    profiles: ["monitoring"]
    ports:
      - "9090:9090"
```

When you run the same file with Docker Compose, enable profiles with:
```text
docker compose --profile monitoring --profile debug up

# or
COMPOSE_PROFILES=monitoring,debug docker compose up
```

### YAML Anchors and Aliases

Reduce duplication with YAML anchors:

```yaml
# Define a reusable base configuration
x-common-env: &common-env
  LOG_LEVEL: info
  APP_ENV: production
  DATABASE_URL: "${DATABASE_URL}"

x-resource-limits: &resource-limits
  deploy:
    resources:
      limits:
        memory: 512M
        cpus: "0.5"

version: "3.8"
services:
  api-service-1:
    image: myapi:1.2.3
    environment:
      <<: *common-env    # Merge the anchor
      SERVICE_NAME: api-1
    <<: *resource-limits  # Apply resource limits

  api-service-2:
    image: myapi:1.2.3
    environment:
      <<: *common-env
      SERVICE_NAME: api-2
    <<: *resource-limits
```

### Docker Compose Extensions (x- fields)

Extensions allow custom metadata that Docker Compose ignores:

```yaml
# x- fields are preserved but ignored by Docker Compose
x-deploy-info:
  maintainer: "platform-team@example.com"
  last-updated: "2026-03-20"
  documentation: "https://wiki.example.com/deployments/myapp"

version: "3.8"
services:
  webapp:
    image: myapp:1.2.3
    # Reference extension for human documentation only
    x-service-info:
      tier: "api"
      sla: "99.9%"
```

### Multi-Stage Application Example

Deploy a complete multi-stage application flow:

```yaml
version: "3.8"
services:
  # Stage 1: Database
  database:
    image: postgres:16-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
      interval: 10s

  # Stage 2: Migrations (run after DB is ready)
  migrations:
    image: myapp:1.2.3
    command: python manage.py migrate
    depends_on:
      database:
        condition: service_healthy

  # Stage 3: Application (run after migrations complete)
  app:
    image: myapp:1.2.3
    depends_on:
      migrations:
        condition: service_completed_successfully
    ports:
      - "8080:8080"

  # Stage 4: Load balancer (run after app starts)
  nginx:
    image: nginx:1.25-alpine
    depends_on:
      app:
        condition: service_started
    ports:
      - "80:80"
```

## Deploying in Portainer

Paste the compose YAML directly into Portainer's stack editor at **Stacks > Add Stack > Web Editor**. YAML anchors and `x-` extension fields are valid Compose/YAML syntax and work directly in stack files. Keep in mind that Compose feature support varies by deployment target: Docker Standalone uses Docker Compose behavior, while Docker Swarm stacks are deployed with `docker stack deploy`.

## Summary

YAML anchors and extension fields are a practical way to reduce duplication in Portainer stack files. If you're deploying to Docker Standalone, you can also use Docker Compose features like profiles and `depends_on` conditions. On Docker Swarm, Portainer relies on `docker stack deploy`, so not every modern Compose feature is available.
