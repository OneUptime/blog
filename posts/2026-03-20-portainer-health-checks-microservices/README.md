# How to Set Up Health Checks for Microservices in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Health Check, Microservice, Docker, Docker Compose, Reliability

Description: Learn how to configure Docker health checks for microservices in Portainer to enable automatic restart on failure and dependency-aware startup ordering.

---

Docker health checks tell Docker whether a container is functioning correctly. Portainer surfaces this health status in its UI. In Docker Compose on standalone Docker, health checks can also be used for dependency-aware startup ordering.

## Defining Health Checks in Compose

```yaml
services:
  api:
    image: myapi:latest
    healthcheck:
      # Command to run inside the container
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s      # How often to check
      timeout: 10s       # Max time to wait for response
      retries: 3         # Failures before marking unhealthy
      start_period: 30s  # Grace period for slow startup
```

## Health Check Patterns by Service Type

**HTTP API:**
```yaml
test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
```

**TCP port:**
```yaml
test: ["CMD-SHELL", "nc -z localhost 5432 || exit 1"]
```

**Database (PostgreSQL):**
```yaml
test: ["CMD-SHELL", "pg_isready -U postgres"]
```

**Database (MySQL):**
```yaml
test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
```

**Redis:**
```yaml
test: ["CMD", "redis-cli", "ping"]
```

## Dependency Health Ordering

With Docker Compose on standalone Docker, use health check conditions to start services only when dependencies are healthy:

```yaml
services:
  db:
    image: postgres:16-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myapp"]
      interval: 5s
      retries: 10

  api:
    image: myapi:latest
    depends_on:
      db:
        # Wait for db to be healthy before starting api
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      retries: 3
```

This `depends_on: condition: service_healthy` behavior is a Docker Compose feature for standalone Docker. Docker Swarm stack deployments use the legacy Compose v3 format and do not support this startup ordering.

## Viewing Health Status in Portainer

Portainer surfaces the container's Docker health status in the UI:

- **Healthy**
- **Starting** (before the container becomes healthy)
- **Unhealthy** (exceeded retries)
- **No health check**

## Health Checks and Restart Policies

Combine health checks with restart policies carefully:

```yaml
services:
  api:
    image: myapi:latest
    restart: unless-stopped    # Restart if the container exits
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      retries: 3
```

Docker marks the container as `unhealthy` after `retries` consecutive failures. A restart policy only restarts the container if its main process exits.

For Swarm services, use `deploy.restart_policy` instead of `restart`. It also applies when tasks exit, not when a health check reports `unhealthy`.
