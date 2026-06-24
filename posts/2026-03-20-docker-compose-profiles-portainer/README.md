# How to Use Docker Compose Profiles in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Compose, Profiles, Selective Deployment, DevOps

Description: Use Docker Compose profiles in Portainer stacks to selectively start service groups for different environments, enabling one Compose file for dev, staging, and production.

---

This guide shows how to use this Docker Compose feature in Portainer Docker Standalone stacks to simplify and standardize your deployments.

## Overview

On Docker Standalone environments, Portainer's stack editor supports Docker Compose features like profiles, extension fields, and YAML anchors without any special configuration. Docker Swarm stacks are different: Portainer deploys those with `docker stack deploy`, which uses the legacy Compose file version 3 format and does not support newer Compose-spec features such as profiles.

## Practical Example

### Docker Compose Profiles

On Docker Standalone, profiles let you define services that are only started in specific scenarios:

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

Services without a `profiles` entry are always active.

In Portainer on Docker Standalone, set the `COMPOSE_PROFILES` stack environment variable:
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

Deploy a complete multi-stage application flow:

```yaml
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

Paste the compose YAML directly into Portainer's stack editor at **Stacks > Add Stack > Web Editor**. On Docker Standalone, Portainer handles YAML anchors, profiles, and extension fields transparently. On Docker Swarm, Portainer uses `docker stack deploy`, so newer Compose-spec features such as profiles are not available.

## Summary

On Docker Standalone, Docker Compose features like profiles, YAML anchors, and extension fields work in Portainer's stack editor. Use profiles for environment-specific service activation, YAML anchors to eliminate configuration duplication, and extension fields for metadata annotation. On Docker Swarm, stick to features supported by `docker stack deploy`.
