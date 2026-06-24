# How to Deploy Multi-Stage Applications with Portainer Stacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Compose, Multi-Stage, Stack, Microservice, DevOps

Description: Deploy complex multi-stage applications using Portainer stacks where builds, migrations, and serving happen in coordinated Docker Compose service groups.

---

This guide shows how to use this Docker Compose feature in Portainer stacks to simplify and standardize your deployments.

## Overview

On Docker Standalone environments, Portainer deploys stacks with Docker Compose. Standard Compose syntax such as profiles, extension fields, and YAML anchors can be used directly in the stack editor. On Docker Swarm, Portainer deploys stacks with `docker stack deploy`, which uses the legacy Compose v3 format rather than the full Compose Specification.

## Practical Example

### Docker Compose Profiles

Profiles let you define services that are only started in specific scenarios:

```yaml
# stack with profiles

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

For Compose-based deployments, enable profiles with the standard `COMPOSE_PROFILES` environment variable:
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
# x- fields are preserved but ignored by Docker Compose
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

On Docker Standalone environments, you can model a complete multi-stage application flow like this:

```yaml
services:
  # Stage 1: Database
  database:
    image: postgres:16-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
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
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/')"]
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

On Docker Standalone environments, paste the Compose YAML directly into Portainer's stack editor at **Stacks > Add stack > Web editor**. On Docker Swarm environments, Portainer uses `docker stack deploy`, so features from the full Compose Specification, such as profiles and `depends_on` conditions, should be avoided in Swarm stack definitions.

## Summary

On Docker Standalone environments, Compose features like profiles, YAML anchors, and extension fields can make Portainer stacks more maintainable. Use profiles for environment-specific service activation, YAML anchors to eliminate configuration duplication, and extension fields for metadata annotation. For staged startup flows, pair `depends_on` conditions with explicit healthchecks, and check Swarm compatibility before reusing the same stack definition there.
