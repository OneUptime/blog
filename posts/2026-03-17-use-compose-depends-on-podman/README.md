# How to Use Compose Depends-On with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, podman-compose, Dependencies, Startup Order

Description: Learn how to control service startup order in podman-compose using depends_on with health check conditions.

---

> depends_on ensures your database starts before your application, and health checks guarantee it is actually ready to accept connections.

Multi-service applications often require specific startup ordering. A web application needs the database to be running and accepting connections before it can start. The `depends_on` directive in podman-compose controls this ordering, and health check conditions ensure dependencies are truly ready.

---

## Basic depends_on

```yaml
# docker-compose.yml

services:
  web:
    image: docker.io/library/nginx:alpine
    ports:
      - "8080:80"
    depends_on:
      - api
      - db
  api:
    image: docker.io/library/python:3.12-slim
    command: python -m http.server 5000
    depends_on:
      - db
  db:
    image: docker.io/library/postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
```

```bash
# Startup order: db -> api -> web
podman-compose up -d
```

## depends_on with Health Check Conditions

Basic `depends_on` only waits for the container to start, not for the service to be ready. Use conditions with health checks for true readiness.

```yaml
# docker-compose.yml
services:
  web:
    image: docker.io/library/nginx:alpine
    ports:
      - "8080:80"
    depends_on:
      db:
        condition: service_healthy
      redis:
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
      start_period: 10s

  redis:
    image: docker.io/library/redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
```

```bash
# podman-compose waits for db and redis health checks to pass before starting web
podman-compose up -d

# Check health status
podman ps --format "{{.Names}}\t{{.Status}}"
```

## service_started vs service_healthy

```yaml
services:
  app:
    image: docker.io/library/node:20-alpine
    depends_on:
      db:
        # Wait for the health check to pass
        condition: service_healthy
      cache:
        # Only wait for the container to start
        condition: service_started
```

## service_completed_successfully

```yaml
services:
  migrate:
    image: docker.io/library/python:3.12-slim
    command: python migrate.py
    depends_on:
      db:
        condition: service_healthy

  app:
    image: docker.io/library/python:3.12-slim
    command: python app.py
    depends_on:
      migrate:
        # Wait for the migration to finish successfully
        condition: service_completed_successfully
      db:
        condition: service_healthy
```

## Debugging Startup Issues

```bash
# Check if a service is stuck waiting for a dependency
podman-compose ps

# View health check logs
podman inspect project_db_1 --format '{{json .State.Health}}'

# Check health check output
podman healthcheck run project_db_1
```

## Summary

Use `depends_on` in podman-compose to control service startup order. Combine it with health checks and `condition: service_healthy` to ensure dependencies are actually ready before dependent services start. Use `service_completed_successfully` for one-shot initialization tasks like database migrations.
