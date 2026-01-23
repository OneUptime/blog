# How to Implement Docker Compose Anchors and YAML Aliases

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Compose, YAML, Anchors, Aliases, DRY

Description: Learn how to use YAML anchors and aliases in Docker Compose for DRY configurations, reducing duplication and improving maintainability.

---

YAML anchors (`&`) and aliases (`*`) enable reusing configuration blocks within a single Docker Compose file. Combined with merge keys (`<<`), they create DRY, maintainable configurations.

## Understanding Anchors and Aliases

```mermaid
flowchart LR
    subgraph Definition["Define Anchor"]
        A["x-common: &common<br/>restart: always<br/>logging: {...}"]
    end
    
    subgraph Usage["Reference & Merge"]
        B["service:<br/><<: *common<br/>image: myapp"]
    end
    
    subgraph Result["Result"]
        C["service:<br/>restart: always<br/>logging: {...}<br/>image: myapp"]
    end
    
    A -->|"&anchor_name"| B
    B -->|"<<: *anchor_name"| C
    
    style Definition fill:#e1f5fe
    style Usage fill:#fff3e0
    style Result fill:#e8f5e9
```

**Key Syntax:**
- Define anchor: `&anchor_name`
- Reference alias: `*anchor_name`
- Merge into map: `<<: *anchor_name`

## Basic Anchors and Aliases

```yaml
version: '3.8'

# Define common configurations using extension fields (x-)
x-common-env: &common-env
  TZ: UTC
  LOG_LEVEL: info

x-logging: &default-logging
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"

services:
  api:
    image: myapi:latest
    environment:
      <<: *common-env
      API_PORT: "3000"
    logging: *default-logging

  worker:
    image: myworker:latest
    environment:
      <<: *common-env
      WORKER_COUNT: "4"
    logging: *default-logging
```

## Extension Fields

Extension fields starting with `x-` are ignored by Compose but perfect for anchors.

```yaml
version: '3.8'

# Reusable blocks
x-app-common: &app-common
  restart: unless-stopped
  networks:
    - backend
  logging:
    driver: json-file
    options:
      max-size: "10m"
      max-file: "3"

x-healthcheck: &default-healthcheck
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s

x-resource-limits: &default-resources
  deploy:
    resources:
      limits:
        cpus: '0.5'
        memory: 256M
      reservations:
        cpus: '0.1'
        memory: 128M

services:
  api:
    <<: *app-common
    <<: *default-resources
    image: myapi:latest
    ports:
      - "3000:3000"
    healthcheck:
      <<: *default-healthcheck
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]

  worker:
    <<: *app-common
    <<: *default-resources
    image: myworker:latest
    healthcheck:
      <<: *default-healthcheck
      test: ["CMD", "pgrep", "-x", "worker"]

networks:
  backend:
```

## Environment Variables

```yaml
version: '3.8'

x-database-env: &db-env
  POSTGRES_USER: ${DB_USER:-app}
  POSTGRES_PASSWORD: ${DB_PASSWORD}
  POSTGRES_DB: ${DB_NAME:-appdb}

x-app-env: &app-env
  DATABASE_URL: postgres://${DB_USER:-app}:${DB_PASSWORD}@postgres:5432/${DB_NAME:-appdb}
  REDIS_URL: redis://redis:6379/0
  NODE_ENV: ${NODE_ENV:-development}

services:
  postgres:
    image: postgres:15
    environment:
      <<: *db-env

  api:
    image: myapi:latest
    environment:
      <<: *app-env
      API_SECRET: ${API_SECRET}
      PORT: "3000"

  worker:
    image: myworker:latest
    environment:
      <<: *app-env
      WORKER_CONCURRENCY: "10"
```

## Volume Mounts

```yaml
version: '3.8'

x-app-volumes: &app-volumes
  - ./src:/app/src:ro
  - ./config:/app/config:ro
  - logs:/app/logs

x-dev-volumes: &dev-volumes
  - ./src:/app/src
  - ./config:/app/config
  - /app/node_modules

services:
  api:
    image: myapi:latest
    volumes: *app-volumes

  worker:
    image: myworker:latest
    volumes: *app-volumes

  # Development service with different volumes
  api-dev:
    image: myapi:latest
    volumes: *dev-volumes
    command: npm run dev

volumes:
  logs:
```

## Deploy Configuration

```yaml
version: '3.8'

x-deploy-default: &deploy-default
  replicas: 2
  update_config:
    parallelism: 1
    delay: 10s
    failure_action: rollback
  rollback_config:
    parallelism: 1
    delay: 10s
  restart_policy:
    condition: on-failure
    delay: 5s
    max_attempts: 3

x-deploy-db: &deploy-db
  replicas: 1
  placement:
    constraints:
      - node.labels.type == database
  restart_policy:
    condition: any

services:
  api:
    image: myapi:latest
    deploy:
      <<: *deploy-default
      replicas: 3  # Override specific value

  worker:
    image: myworker:latest
    deploy:
      <<: *deploy-default

  postgres:
    image: postgres:15
    deploy:
      <<: *deploy-db
```

## Combining Multiple Anchors

```yaml
version: '3.8'

# Base configurations
x-base: &base
  restart: unless-stopped
  logging:
    driver: json-file
    options:
      max-size: "10m"

x-healthcheck-http: &healthcheck-http
  healthcheck:
    test: ["CMD", "wget", "-q", "--spider", "http://localhost/health"]
    interval: 30s
    timeout: 5s
    retries: 3

x-healthcheck-tcp: &healthcheck-tcp
  healthcheck:
    test: ["CMD", "nc", "-z", "localhost", "5432"]
    interval: 30s
    timeout: 5s
    retries: 3

x-resources-small: &resources-small
  deploy:
    resources:
      limits:
        cpus: '0.25'
        memory: 128M

x-resources-medium: &resources-medium
  deploy:
    resources:
      limits:
        cpus: '0.5'
        memory: 256M

services:
  api:
    <<: [*base, *healthcheck-http, *resources-medium]
    image: myapi:latest
    ports:
      - "3000:3000"

  worker:
    <<: [*base, *resources-small]
    image: myworker:latest

  postgres:
    <<: [*base, *healthcheck-tcp]
    image: postgres:15
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
```

## Complete Production Example

```yaml
version: '3.8'

# ============================================
# Reusable Configuration Blocks
# ============================================

x-logging: &default-logging
  logging:
    driver: json-file
    options:
      max-size: "50m"
      max-file: "5"
      labels: "service"

x-healthcheck-http: &healthcheck-http
  healthcheck:
    test: ["CMD", "wget", "-q", "--spider", "http://localhost:${PORT:-8080}/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s

x-healthcheck-tcp: &healthcheck-tcp
  healthcheck:
    interval: 30s
    timeout: 10s
    retries: 3

x-restart-policy: &restart-policy
  restart: unless-stopped

x-common-env: &common-env
  TZ: ${TZ:-UTC}
  LOG_LEVEL: ${LOG_LEVEL:-info}
  LOG_FORMAT: json

x-app-env: &app-env
  <<: *common-env
  DATABASE_URL: postgres://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
  REDIS_URL: redis://redis:6379/0

x-deploy-app: &deploy-app
  deploy:
    replicas: ${REPLICAS:-2}
    update_config:
      parallelism: 1
      delay: 10s
      failure_action: rollback
      order: start-first
    rollback_config:
      parallelism: 1
    resources:
      limits:
        cpus: '${CPU_LIMIT:-0.5}'
        memory: ${MEMORY_LIMIT:-256M}
      reservations:
        cpus: '0.1'
        memory: 128M

x-deploy-singleton: &deploy-singleton
  deploy:
    replicas: 1
    resources:
      limits:
        cpus: '1'
        memory: 512M

# ============================================
# Services
# ============================================

services:
  # API Service
  api:
    <<: [*default-logging, *healthcheck-http, *restart-policy, *deploy-app]
    image: ${REGISTRY}/api:${VERSION:-latest}
    ports:
      - "${API_PORT:-3000}:3000"
    environment:
      <<: *app-env
      PORT: "3000"
      API_SECRET: ${API_SECRET}
    networks:
      - frontend
      - backend
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  # Background Worker
  worker:
    <<: [*default-logging, *restart-policy, *deploy-app]
    image: ${REGISTRY}/worker:${VERSION:-latest}
    environment:
      <<: *app-env
      WORKER_CONCURRENCY: ${WORKER_CONCURRENCY:-10}
    networks:
      - backend
    depends_on:
      - postgres
      - redis

  # Scheduled Tasks
  scheduler:
    <<: [*default-logging, *restart-policy]
    image: ${REGISTRY}/scheduler:${VERSION:-latest}
    environment:
      <<: *app-env
    networks:
      - backend
    deploy:
      replicas: 1

  # PostgreSQL Database
  postgres:
    <<: [*default-logging, *restart-policy, *deploy-singleton]
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    healthcheck:
      <<: *healthcheck-tcp
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - backend

  # Redis Cache
  redis:
    <<: [*default-logging, *restart-policy]
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 128mb --maxmemory-policy allkeys-lru
    healthcheck:
      <<: *healthcheck-tcp
      test: ["CMD", "redis-cli", "ping"]
    volumes:
      - redis_data:/data
    networks:
      - backend
    deploy:
      resources:
        limits:
          memory: 256M

# ============================================
# Networks and Volumes
# ============================================

networks:
  frontend:
  backend:
    internal: true

volumes:
  postgres_data:
  redis_data:
```

## Limitations

```yaml
# Anchors only work within the same file
# This does NOT work across files:

# file1.yml
x-common: &common
  restart: always

# file2.yml
services:
  app:
    <<: *common  # ERROR: anchor not found

# Solution: Use extends or include instead for cross-file reuse
```

## Summary

| Feature | Syntax | Use Case |
|---------|--------|----------|
| Anchor | `&name` | Define reusable block |
| Alias | `*name` | Reference entire block |
| Merge | `<<: *name` | Merge into mapping |
| Extension | `x-name:` | Hidden config blocks |

YAML anchors and aliases reduce duplication within a single Compose file. For cross-file reuse, combine with extends as described in our post on [Docker Compose Extends](https://oneuptime.com/blog/post/2026-01-16-docker-compose-extends/view).

