# How to Use Docker Compose Anchors and Aliases

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Docker Compose, YAML, DevOps, Configuration

Description: Master YAML anchors and aliases in Docker Compose to eliminate configuration duplication, create reusable blocks, and maintain cleaner compose files.

---

YAML anchors and aliases let you define configuration once and reuse it multiple times in your Docker Compose files. This reduces duplication, prevents copy-paste errors, and makes updates easier when common settings need to change.

## Understanding Anchors and Aliases

YAML provides three mechanisms for reuse:

- **Anchor** (`&name`): Marks a block of YAML for reuse
- **Alias** (`*name`): References an anchored block
- **Merge** (`<<:`): Merges anchored content into current mapping

```yaml
# Define anchor
x-common: &common-settings
  restart: unless-stopped
  logging:
    driver: json-file

# Use alias with merge
services:
  api:
    <<: *common-settings
    image: api:latest
```

## Basic Anchors and Aliases

### Reusing Simple Values

```yaml
version: '3.8'

# Define anchors for common values
x-image-tag: &tag "v1.2.3"
x-memory-limit: &mem "256M"

services:
  api:
    image: myapp-api:*tag
    deploy:
      resources:
        limits:
          memory: *mem

  worker:
    image: myapp-worker:*tag
    deploy:
      resources:
        limits:
          memory: *mem
```

### Reusing Configuration Blocks

```yaml
version: '3.8'

# Common logging configuration
x-logging: &default-logging
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"

services:
  api:
    image: api:latest
    logging: *default-logging

  worker:
    image: worker:latest
    logging: *default-logging

  scheduler:
    image: scheduler:latest
    logging: *default-logging
```

## Merge Key for Object Merging

The merge key (`<<:`) combines an anchored mapping with additional properties:

```yaml
version: '3.8'

x-app-common: &app-common
  restart: unless-stopped
  networks:
    - backend
  logging:
    driver: json-file
    options:
      max-size: "10m"
  deploy:
    resources:
      limits:
        cpus: '0.5'
        memory: 256M

services:
  api:
    <<: *app-common
    image: api:latest
    ports:
      - "8080:8080"
    environment:
      - SERVICE_NAME=api

  worker:
    <<: *app-common
    image: worker:latest
    environment:
      - SERVICE_NAME=worker
      - WORKER_CONCURRENCY=4

  scheduler:
    <<: *app-common
    image: scheduler:latest
    command: ["./scheduler", "--interval=5m"]
```

## Multiple Anchors and Overrides

Merge multiple anchors and override specific values:

```yaml
version: '3.8'

x-logging: &default-logging
  logging:
    driver: json-file
    options:
      max-size: "10m"

x-healthcheck: &default-healthcheck
  healthcheck:
    interval: 30s
    timeout: 10s
    retries: 3

x-deploy: &default-deploy
  deploy:
    resources:
      limits:
        cpus: '0.5'
        memory: 256M

services:
  api:
    <<: [*default-logging, *default-healthcheck, *default-deploy]
    image: api:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
    deploy:
      resources:
        limits:
          memory: 512M  # Override memory limit
```

Note: When merging multiple anchors, later ones override earlier ones for conflicting keys.

## Extension Fields

Docker Compose ignores top-level keys starting with `x-`, making them perfect for anchor definitions:

```yaml
version: '3.8'

# Extension fields for common configurations
x-environment: &common-env
  TZ: UTC
  LOG_LEVEL: info
  NODE_ENV: production

x-labels: &common-labels
  app.team: platform
  app.environment: production

x-resources: &common-resources
  deploy:
    resources:
      limits:
        cpus: '1'
        memory: 512M
      reservations:
        cpus: '0.25'
        memory: 128M

services:
  api:
    image: api:latest
    environment:
      <<: *common-env
      SERVICE_NAME: api
      DATABASE_URL: ${DATABASE_URL}
    labels:
      <<: *common-labels
      app.service: api
    <<: *common-resources
```

## Environment Variable Blocks

Reuse environment configurations across services:

```yaml
version: '3.8'

x-database-env: &db-env
  DB_HOST: database
  DB_PORT: "5432"
  DB_NAME: myapp

x-redis-env: &redis-env
  REDIS_HOST: redis
  REDIS_PORT: "6379"

x-observability-env: &obs-env
  OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4317
  OTEL_SERVICE_NAME: ${OTEL_SERVICE_NAME:-default}

services:
  api:
    image: api:latest
    environment:
      <<: [*db-env, *redis-env, *obs-env]
      OTEL_SERVICE_NAME: api
      API_PORT: "8080"

  worker:
    image: worker:latest
    environment:
      <<: [*db-env, *redis-env, *obs-env]
      OTEL_SERVICE_NAME: worker
      WORKER_QUEUE: tasks
```

## Volume and Network Anchors

Reuse volume and network configurations:

```yaml
version: '3.8'

x-volume-config: &volume-common
  driver: local
  driver_opts:
    type: none
    o: bind

x-network-config: &network-common
  driver: bridge
  ipam:
    config:
      - subnet: 172.28.0.0/16

services:
  api:
    image: api:latest
    volumes:
      - api-logs:/var/log/app
    networks:
      - backend

volumes:
  api-logs:
    <<: *volume-common
    driver_opts:
      device: /data/api-logs

  worker-logs:
    <<: *volume-common
    driver_opts:
      device: /data/worker-logs

networks:
  backend:
    <<: *network-common
  frontend:
    <<: *network-common
    ipam:
      config:
        - subnet: 172.29.0.0/16
```

## Build Configuration Anchors

Share build settings across services:

```yaml
version: '3.8'

x-build-common: &build-common
  context: .
  args:
    - NODE_VERSION=18
    - NPM_TOKEN=${NPM_TOKEN}
  cache_from:
    - type=registry,ref=myregistry/cache:latest

services:
  api:
    build:
      <<: *build-common
      dockerfile: Dockerfile.api
      target: production
    image: myapp-api:${VERSION:-latest}

  worker:
    build:
      <<: *build-common
      dockerfile: Dockerfile.worker
      target: production
    image: myapp-worker:${VERSION:-latest}
```

## Health Check Anchors

Define reusable health check patterns:

```yaml
version: '3.8'

x-healthcheck-http: &healthcheck-http
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s

x-healthcheck-tcp: &healthcheck-tcp
  interval: 10s
  timeout: 5s
  retries: 5

services:
  api:
    image: api:latest
    healthcheck:
      <<: *healthcheck-http
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]

  nginx:
    image: nginx:alpine
    healthcheck:
      <<: *healthcheck-http
      test: ["CMD", "curl", "-f", "http://localhost/health"]

  database:
    image: postgres:15
    healthcheck:
      <<: *healthcheck-tcp
      test: ["CMD-SHELL", "pg_isready -U postgres"]

  redis:
    image: redis:7-alpine
    healthcheck:
      <<: *healthcheck-tcp
      test: ["CMD", "redis-cli", "ping"]
```

## Complete Example

A production-ready compose file using anchors extensively:

```yaml
version: '3.8'

# Extension fields for common configurations
x-logging: &default-logging
  driver: json-file
  options:
    max-size: "50m"
    max-file: "5"

x-restart: &default-restart
  restart: unless-stopped

x-healthcheck-defaults: &healthcheck-defaults
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s

x-common-env: &common-env
  TZ: ${TZ:-UTC}
  LOG_LEVEL: ${LOG_LEVEL:-info}

x-backend-env: &backend-env
  <<: *common-env
  DATABASE_URL: postgres://${DB_USER}:${DB_PASSWORD}@database:5432/${DB_NAME}
  REDIS_URL: redis://redis:6379

x-deploy-small: &deploy-small
  deploy:
    resources:
      limits:
        cpus: '0.5'
        memory: 256M
      reservations:
        cpus: '0.1'
        memory: 64M

x-deploy-medium: &deploy-medium
  deploy:
    resources:
      limits:
        cpus: '1'
        memory: 512M
      reservations:
        cpus: '0.25'
        memory: 128M

services:
  api:
    image: myapp-api:${VERSION:-latest}
    <<: [*default-restart, *deploy-medium]
    logging: *default-logging
    environment:
      <<: *backend-env
      SERVICE_NAME: api
    healthcheck:
      <<: *healthcheck-defaults
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
    ports:
      - "8080:8080"
    networks:
      - frontend
      - backend
    depends_on:
      database:
        condition: service_healthy
      redis:
        condition: service_healthy

  worker:
    image: myapp-worker:${VERSION:-latest}
    <<: [*default-restart, *deploy-small]
    logging: *default-logging
    environment:
      <<: *backend-env
      SERVICE_NAME: worker
    healthcheck:
      <<: *healthcheck-defaults
      test: ["CMD", "curl", "-f", "http://localhost:8081/health"]
    networks:
      - backend
    depends_on:
      database:
        condition: service_healthy
      redis:
        condition: service_healthy

  database:
    image: postgres:15-alpine
    <<: *default-restart
    logging: *default-logging
    environment:
      <<: *common-env
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    healthcheck:
      <<: *healthcheck-defaults
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
    volumes:
      - db-data:/var/lib/postgresql/data
    networks:
      - backend

  redis:
    image: redis:7-alpine
    <<: [*default-restart, *deploy-small]
    logging: *default-logging
    healthcheck:
      <<: *healthcheck-defaults
      test: ["CMD", "redis-cli", "ping"]
    volumes:
      - redis-data:/data
    networks:
      - backend

volumes:
  db-data:
  redis-data:

networks:
  frontend:
  backend:
    internal: true
```

## Validating Your Configuration

Always verify the merged result:

```bash
# Show fully resolved configuration
docker compose config

# Show specific service
docker compose config --services
docker compose config | yq '.services.api'

# Validate without running
docker compose config --quiet && echo "Valid"
```

## Limitations

Be aware of YAML anchor limitations:

```yaml
# Anchors are file-scoped - cannot reference across files
# Use extends for cross-file reuse

# Cannot anchor and alias in same mapping
services:
  api: &api-service
    image: api:latest
  api-clone: *api-service  # This works

  # But this does not work for overrides in same level:
  api:
    <<: *api-service  # Error if api-service defined in same services block
```

---

YAML anchors and aliases transform verbose Docker Compose files into maintainable configurations. Start with common patterns like logging and health checks, then expand to environment variables and deploy settings. Always run `docker compose config` to verify the resolved output matches your expectations.
