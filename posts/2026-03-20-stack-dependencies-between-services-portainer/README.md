# How to Set Up Stack Dependencies Between Services in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Compose, Dependencies, Service Ordering, Stack, DevOps

Description: Configure service dependency chains in Portainer stacks using depends_on with health conditions to ensure services start and restart in the correct order.

---

This guide shows how to use Docker Compose features in Docker Standalone Portainer stacks to simplify and standardize your deployments.

## Overview

Portainer's stack editor accepts Docker Compose-format YAML. On Docker Standalone stacks, Compose features like profiles, extension fields, YAML anchors, and `depends_on` health conditions work through Docker Compose. On Docker Swarm stacks, Portainer deploys with `docker stack deploy`, which uses the legacy Compose file version 3 format and does not support every current Compose Specification feature.

## Practical Example

### Docker Compose Profiles

Profiles let you define services that are only started in specific scenarios:

```yaml
# stack with profiles

services:
  # Always started
  webapp:
    image: myapp:1.2.3
    # No profiles attribute = always active

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

For Docker Standalone stacks in Portainer, set the COMPOSE_PROFILES environment variable:
```text
COMPOSE_PROFILES=monitoring,debug
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
# x- fields are ignored by Docker Compose
x-deploy-info:
  maintainer: "platform-team@example.com"
  last-updated: "2026-03-20"
  documentation: "https://wiki.example.com/deployments/myapp"

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
services:
  # Stage 1: Database
  database:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: example
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
      interval: 10s
      timeout: 5s
      retries: 5

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
    healthcheck:
      test: ["CMD-SHELL", "python -c \"import urllib.request; urllib.request.urlopen('http://localhost:8080/health', timeout=2)\""]
      interval: 10s
      timeout: 5s
      retries: 5
    ports:
      - "8080:8080"

  # Stage 4: Load balancer (run after app is healthy)
  nginx:
    image: nginx:1.25-alpine
    depends_on:
      app:
        condition: service_healthy
    ports:
      - "80:80"
```

## Deploying in Portainer

Paste the compose YAML directly into Portainer's stack editor at **Stacks > Add Stack > Web Editor** for a Docker Standalone environment. YAML anchors and extension fields are valid Docker Compose syntax, and profiles are activated when you set `COMPOSE_PROFILES`.

## Summary

Docker Compose features like profiles, YAML anchors, extension fields, and `depends_on` conditions work in Docker Standalone Portainer stacks. Use profiles for environment-specific service activation, YAML anchors to eliminate configuration duplication, extension fields for metadata annotation, and health-based dependencies for startup ordering. These features make large, complex stacks more maintainable.
