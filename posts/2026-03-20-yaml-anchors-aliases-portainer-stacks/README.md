# How to Use YAML Anchors and Aliases in Portainer Stacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Compose, YAML, Anchors, Alias, DRY, Configuration

Description: Use YAML anchors and aliases in Portainer stack definitions to eliminate configuration duplication across similar services like worker pools and microservice replicas.

---

This guide shows how to use this Docker Compose feature in Portainer stacks to simplify and standardize your deployments.

## Overview

Portainer's stack editor supports the full Docker Compose specification. Features like profiles, extension fields, and YAML anchors work directly in the Portainer stack editor without any special configuration.

## Practical Example

### Docker Compose Profiles

Profiles let you define services that are only started in specific scenarios:

```yaml
# stack with profiles

version: "3.8"
services:
  # Always started
  webapp:
    image: myapp:1.2.3
    profiles: []    # No profile = always active

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

In Portainer, set the COMPOSE_PROFILES environment variable:
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
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 10s

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

Paste the compose YAML directly into Portainer's stack editor at **Stacks > Add Stack > Web Editor**. Portainer handles YAML anchors, profiles, and extension fields transparently - they're all valid Docker Compose syntax that Portainer passes to Docker's Compose engine.

## Summary

Docker Compose features like profiles, YAML anchors, and extension fields all work seamlessly in Portainer's stack editor. Use profiles for environment-specific service activation, YAML anchors to eliminate configuration duplication, and extension fields for metadata annotation. These features make large, complex stacks more maintainable.
