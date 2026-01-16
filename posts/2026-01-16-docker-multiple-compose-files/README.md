# How to Run Multiple Docker Compose Files Together

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Compose, DevOps, Configuration, Environments

Description: Learn how to use multiple Docker Compose files for different environments (development, staging, production), override configurations, and manage complex multi-service applications.

---

A single docker-compose.yml file rarely fits all needs. Development requires volume mounts and debug tools, production needs different resource limits and no exposed ports, and staging might need mock services. Docker Compose's ability to merge multiple files solves this elegantly.

## How Compose File Merging Works

When you specify multiple Compose files, Docker merges them in order. Later files override earlier ones for conflicting values, while non-conflicting values are combined.

```bash
# Merge base with overrides
docker-compose -f docker-compose.yml -f docker-compose.override.yml up
```

## The Override Pattern

By default, Compose looks for two files:
1. `docker-compose.yml` - base configuration
2. `docker-compose.override.yml` - local overrides (automatically loaded)

### Base Configuration (docker-compose.yml)

```yaml
version: '3.8'

services:
  api:
    image: myapp/api:latest
    environment:
      - NODE_ENV=production
    networks:
      - app-network

  database:
    image: postgres:15
    volumes:
      - db-data:/var/lib/postgresql/data
    networks:
      - app-network

networks:
  app-network:

volumes:
  db-data:
```

### Development Override (docker-compose.override.yml)

```yaml
version: '3.8'

services:
  api:
    build: .
    volumes:
      - ./src:/app/src
      - ./package.json:/app/package.json
    ports:
      - "3000:3000"
      - "9229:9229"  # Debug port
    environment:
      - NODE_ENV=development
      - DEBUG=app:*
    command: npm run dev

  database:
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_PASSWORD=devpassword
```

### Running Environments

```bash
# Development (uses override automatically)
docker-compose up

# Production (ignores override)
docker-compose -f docker-compose.yml up

# Explicit files
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
```

## Environment-Specific Files

### Project Structure

```
project/
├── docker-compose.yml           # Base configuration
├── docker-compose.override.yml  # Local development (auto-loaded)
├── docker-compose.dev.yml       # Shared development settings
├── docker-compose.prod.yml      # Production settings
├── docker-compose.test.yml      # Test environment
└── docker-compose.ci.yml        # CI/CD pipeline
```

### Production Configuration (docker-compose.prod.yml)

```yaml
version: '3.8'

services:
  api:
    image: myapp/api:${VERSION:-latest}
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    environment:
      - NODE_ENV=production
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    # No ports exposed - use reverse proxy

  database:
    deploy:
      resources:
        limits:
          memory: 2G
    # No ports exposed
```

### Test Configuration (docker-compose.test.yml)

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      target: test
    command: npm test
    environment:
      - NODE_ENV=test
      - DATABASE_URL=postgres://test:test@database:5432/testdb
    depends_on:
      database:
        condition: service_healthy

  database:
    environment:
      - POSTGRES_USER=test
      - POSTGRES_PASSWORD=test
      - POSTGRES_DB=testdb
    # Use tmpfs for faster tests (data not persisted)
    tmpfs:
      - /var/lib/postgresql/data
```

### CI Configuration (docker-compose.ci.yml)

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      cache_from:
        - myapp/api:cache
    environment:
      - CI=true

  database:
    image: postgres:15-alpine  # Smaller image for CI
    tmpfs:
      - /var/lib/postgresql/data
```

## Using Multiple Files

### Command Line

```bash
# Combine base with production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Run tests
docker-compose -f docker-compose.yml -f docker-compose.test.yml run --rm api

# CI build
docker-compose -f docker-compose.yml -f docker-compose.ci.yml build
```

### Environment Variable

Set `COMPOSE_FILE` to avoid typing multiple `-f` flags.

```bash
# In .bashrc or .zshrc
export COMPOSE_FILE=docker-compose.yml:docker-compose.dev.yml

# Or per-project in .env
COMPOSE_FILE=docker-compose.yml:docker-compose.dev.yml
```

### Makefile Pattern

```makefile
# Makefile

.PHONY: dev prod test ci

BASE = docker-compose.yml

dev:
	docker-compose -f $(BASE) -f docker-compose.override.yml up

prod:
	docker-compose -f $(BASE) -f docker-compose.prod.yml up -d

test:
	docker-compose -f $(BASE) -f docker-compose.test.yml run --rm api npm test

ci:
	docker-compose -f $(BASE) -f docker-compose.ci.yml build

down:
	docker-compose down -v --remove-orphans
```

## Merging Behavior

Understanding how values merge is crucial for effective configuration.

### Scalar Values: Override

Later files replace earlier values.

```yaml
# docker-compose.yml
services:
  api:
    image: myapp:latest
    command: npm start

# docker-compose.dev.yml
services:
  api:
    command: npm run dev  # Replaces "npm start"
```

### Lists: Replace (Not Append)

Lists are replaced entirely, not merged.

```yaml
# docker-compose.yml
services:
  api:
    ports:
      - "3000:3000"

# docker-compose.dev.yml
services:
  api:
    ports:
      - "8080:3000"  # Replaces, doesn't add to
      - "9229:9229"
```

### Mappings: Merge

Maps (dictionaries) are merged recursively.

```yaml
# docker-compose.yml
services:
  api:
    environment:
      NODE_ENV: production
      LOG_LEVEL: info

# docker-compose.dev.yml
services:
  api:
    environment:
      NODE_ENV: development  # Overrides
      DEBUG: "true"          # Adds
    # LOG_LEVEL: info is preserved
```

### Volumes: Merge

Volume mappings are merged.

```yaml
# docker-compose.yml
services:
  api:
    volumes:
      - data:/app/data

# docker-compose.dev.yml
services:
  api:
    volumes:
      - ./src:/app/src  # Adds to existing volumes
```

## Extending Services

Use the `extends` keyword to inherit from another service or file.

### Extending Within Same File

```yaml
version: '3.8'

services:
  base-api:
    build: .
    environment:
      - LOG_LEVEL=info
    networks:
      - app-network

  api-v1:
    extends:
      service: base-api
    environment:
      - API_VERSION=v1

  api-v2:
    extends:
      service: base-api
    environment:
      - API_VERSION=v2
```

### Extending From Another File

```yaml
# common.yml
version: '3.8'

services:
  node-base:
    image: node:18
    working_dir: /app
    volumes:
      - .:/app
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    extends:
      file: common.yml
      service: node-base
    command: npm start
    ports:
      - "3000:3000"

  worker:
    extends:
      file: common.yml
      service: node-base
    command: npm run worker
```

## YAML Anchors and Aliases

Use YAML features to reduce repetition within a single file.

```yaml
version: '3.8'

# Define anchor
x-common-env: &common-env
  LOG_LEVEL: info
  TZ: UTC

x-healthcheck: &default-healthcheck
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s

services:
  api:
    image: myapp/api
    environment:
      <<: *common-env  # Merge common environment
      SERVICE_NAME: api
    healthcheck:
      <<: *default-healthcheck
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]

  worker:
    image: myapp/worker
    environment:
      <<: *common-env
      SERVICE_NAME: worker
    healthcheck:
      <<: *default-healthcheck
      test: ["CMD", "pgrep", "-x", "node"]
```

## Viewing Merged Configuration

Check what the final merged configuration looks like.

```bash
# Show merged config
docker-compose -f docker-compose.yml -f docker-compose.prod.yml config

# Save to file
docker-compose -f docker-compose.yml -f docker-compose.prod.yml config > merged.yml
```

## Best Practices

### 1. Keep Base File Minimal

```yaml
# docker-compose.yml - just the essentials
version: '3.8'

services:
  api:
    image: myapp/api
    networks:
      - app-network

  database:
    image: postgres:15
    volumes:
      - db-data:/var/lib/postgresql/data
    networks:
      - app-network

networks:
  app-network:

volumes:
  db-data:
```

### 2. Don't Commit Override File

```bash
# .gitignore
docker-compose.override.yml
```

Provide a template instead:
```bash
cp docker-compose.override.yml.example docker-compose.override.yml
```

### 3. Use .env for Shared Variables

```bash
# .env
POSTGRES_VERSION=15
APP_VERSION=1.2.3
```

```yaml
services:
  database:
    image: postgres:${POSTGRES_VERSION}

  api:
    image: myapp/api:${APP_VERSION}
```

## Summary

| File | Purpose | Committed to Git |
|------|---------|------------------|
| `docker-compose.yml` | Base configuration | Yes |
| `docker-compose.override.yml` | Local development | No (template only) |
| `docker-compose.dev.yml` | Shared development | Yes |
| `docker-compose.prod.yml` | Production settings | Yes |
| `docker-compose.test.yml` | Test environment | Yes |
| `docker-compose.ci.yml` | CI/CD pipeline | Yes |

Multiple Compose files keep your configuration DRY while allowing environment-specific customization. Start with a minimal base, use override for local development, and create explicit files for each deployment target.
