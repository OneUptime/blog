# How to Use Compose Health Checks with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, podman-compose, Health Check, Monitoring

Description: Learn how to define and use health checks in podman-compose to monitor container readiness and trigger dependency startup.

---

> Health checks in compose files let Podman monitor your containers and report their readiness, enabling smart dependency ordering.

Health checks provide a mechanism to verify that a service inside a container is actually working, not just that the container process is running. podman-compose supports the Compose `healthcheck` directive, which Podman uses to periodically probe container health.

---

## Basic Health Check

```yaml
# docker-compose.yml

version: "3.8"
services:
  web:
    image: docker.io/library/nginx:alpine
    ports:
      - "8080:80"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80/"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 5s
```

```bash
# Deploy and check health status
podman-compose up -d

# View health status
podman ps --format "{{.Names}}\t{{.Status}}"
# Output: project_web_1   Up 30s (healthy)
```

## Health Check Options Explained

```yaml
healthcheck:
  # Command to run inside the container
  test: ["CMD", "curl", "-f", "http://localhost/"]

  # Time between health checks
  interval: 10s

  # Maximum time for a single check to complete
  timeout: 5s

  # Number of consecutive failures before marking unhealthy
  retries: 3

  # Grace period for container startup before failures count
  start_period: 15s
```

## Database Health Checks

```yaml
# docker-compose.yml
version: "3.8"
services:
  postgres:
    image: docker.io/library/postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5
      start_period: 10s

  mysql:
    image: docker.io/library/mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: secret
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 3s
      retries: 5
      start_period: 30s

  redis:
    image: docker.io/library/redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 3
```

## Shell-Based Health Checks

```yaml
services:
  app:
    image: docker.io/library/python:3.12-slim
    command: python -m http.server 8000
    healthcheck:
      # Use CMD-SHELL for shell features like pipes and redirects
      test: ["CMD-SHELL", "python -c 'import urllib.request; urllib.request.urlopen(\"http://localhost:8000\")' || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 3
```

## Using Health Checks with depends_on

```yaml
# docker-compose.yml
version: "3.8"
services:
  app:
    image: docker.io/library/node:20-alpine
    command: node server.js
    depends_on:
      db:
        condition: service_healthy
  db:
    image: docker.io/library/postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5
```

## Disabling Health Checks

```yaml
services:
  app:
    image: docker.io/library/nginx:alpine
    healthcheck:
      disable: true
```

## Monitoring Health Status

```bash
# Check health status of all containers
podman ps --format "table {{.Names}}\t{{.Status}}"

# Get detailed health information
podman inspect project_db_1 --format '{{json .State.Health}}' | python3 -m json.tool

# Manually run a health check
podman healthcheck run project_db_1
```

## Summary

Define health checks in your compose file to monitor container readiness. Use `CMD` for simple commands and `CMD-SHELL` for shell features. Combine health checks with `depends_on` conditions to ensure services only start when their dependencies are truly ready.
