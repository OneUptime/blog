# How to Use Docker Compose Extends

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Docker Compose, DevOps, Configuration, DRY

Description: Master Docker Compose extends to share service configurations across multiple Compose files, reducing duplication and maintaining consistency in complex deployments.

---

Docker Compose `extends` lets you share common configuration between services, avoiding duplication and ensuring consistency. When you have multiple services with similar settings or multiple environments with shared base configurations, `extends` keeps your Compose files DRY (Do not Repeat Yourself).

## Basic Extends Usage

The `extends` keyword copies configuration from a base service:

```yaml
# common.yml - Base service definitions
services:
  web-base:
    image: nginx:alpine
    environment:
      - TZ=UTC
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

```yaml
# docker-compose.yml - Extends base service
services:
  web:
    extends:
      file: common.yml
      service: web-base
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
```

The resulting configuration merges the base with the extending service:

```bash
# View merged configuration
docker compose config
```

## Extends Within Same File

You can extend services within the same Compose file:

```yaml
version: '3.8'

services:
  app-base:
    image: myapp:latest
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s

  api:
    extends:
      service: app-base
    ports:
      - "8080:8080"
    environment:
      - SERVICE_NAME=api
      - API_KEY=${API_KEY}

  worker:
    extends:
      service: app-base
    command: ["node", "worker.js"]
    environment:
      - SERVICE_NAME=worker
      - QUEUE_URL=${QUEUE_URL}
```

## Multi-Level Extends

Chain extends for granular configuration inheritance:

```yaml
# base.yml - Lowest level base configuration
services:
  base:
    logging:
      driver: json-file
      options:
        max-size: "10m"
    restart: unless-stopped
```

```yaml
# node-base.yml - Node.js specific base
services:
  node-app:
    extends:
      file: base.yml
      service: base
    image: node:18-alpine
    working_dir: /app
    environment:
      - NODE_ENV=production
```

```yaml
# docker-compose.yml - Final application
services:
  api:
    extends:
      file: node-base.yml
      service: node-app
    ports:
      - "3000:3000"
    volumes:
      - ./api:/app
    command: ["node", "server.js"]
```

## What Gets Extended

### Merged Properties

These properties merge with the extending service:

```yaml
# base.yml
services:
  base:
    environment:
      - VAR1=value1
      - VAR2=value2
    labels:
      app: myapp
    volumes:
      - logs:/var/log

# docker-compose.yml
services:
  app:
    extends:
      file: base.yml
      service: base
    environment:
      - VAR3=value3     # Added to environment
      - VAR1=override   # Overrides VAR1
    labels:
      version: "1.0"    # Added to labels
    volumes:
      - data:/app/data  # Added to volumes
```

### Replaced Properties

These properties are completely replaced, not merged:

```yaml
# base.yml
services:
  base:
    command: ["npm", "start"]
    entrypoint: ["/docker-entrypoint.sh"]
    ports:
      - "8080:8080"

# docker-compose.yml
services:
  app:
    extends:
      file: base.yml
      service: base
    command: ["npm", "run", "dev"]  # Replaces command entirely
    ports:
      - "3000:3000"  # Replaces ports entirely
```

## Properties That Cannot Be Extended

Some properties are not inherited through extends:

- `links`
- `volumes_from`
- `depends_on`
- `networks` (in some versions)

```yaml
# These must be defined in each extending service
services:
  api:
    extends:
      file: common.yml
      service: base
    depends_on:
      - database    # Must define here, not inherited
    networks:
      - backend     # Must define here, not inherited
```

## Environment-Specific Configurations

Use extends for dev/staging/prod environments:

```yaml
# base.yml - Shared configuration
services:
  api-base:
    image: myapp:${VERSION:-latest}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
    logging:
      driver: json-file
      options:
        max-size: "50m"

  database-base:
    image: postgres:15
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  db-data:
```

```yaml
# docker-compose.dev.yml - Development
services:
  api:
    extends:
      file: base.yml
      service: api-base
    build:
      context: .
      target: development
    volumes:
      - ./src:/app/src  # Hot reload
    environment:
      - NODE_ENV=development
      - DEBUG=true
    ports:
      - "3000:8080"

  database:
    extends:
      file: base.yml
      service: database-base
    environment:
      - POSTGRES_PASSWORD=devpassword
    ports:
      - "5432:5432"  # Expose for local tools
```

```yaml
# docker-compose.prod.yml - Production
services:
  api:
    extends:
      file: base.yml
      service: api-base
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 512M
    environment:
      - NODE_ENV=production
    secrets:
      - api_key

  database:
    extends:
      file: base.yml
      service: database-base
    environment:
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
    secrets:
      - db_password
    # No port exposure in production

secrets:
  api_key:
    external: true
  db_password:
    external: true
```

## Microservices with Shared Configuration

```yaml
# common/observability.yml
services:
  observable:
    logging:
      driver: fluentd
      options:
        fluentd-address: "localhost:24224"
        tag: "docker.{{.Name}}"
    labels:
      prometheus.scrape: "true"
      prometheus.port: "8080"
      prometheus.path: "/metrics"
```

```yaml
# common/healthcheck.yml
services:
  healthy:
    healthcheck:
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

```yaml
# services/users/docker-compose.yml
services:
  users-api:
    extends:
      file: ../../common/observability.yml
      service: observable
    image: users-api:latest
    environment:
      - SERVICE_NAME=users
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
```

```yaml
# services/orders/docker-compose.yml
services:
  orders-api:
    extends:
      file: ../../common/observability.yml
      service: observable
    image: orders-api:latest
    environment:
      - SERVICE_NAME=orders
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
```

## Combining Extends with Override Files

```yaml
# docker-compose.yml - Base
services:
  app:
    extends:
      file: common.yml
      service: base
    image: myapp:latest

# docker-compose.override.yml - Local development (auto-loaded)
services:
  app:
    build: .
    volumes:
      - .:/app
```

```bash
# Development (loads both files automatically)
docker compose up

# Production (only base + production override)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up
```

## Debugging Extends

View the fully merged configuration:

```bash
# Show resolved configuration
docker compose config

# Show specific service
docker compose config --services
docker compose config | grep -A 50 "api:"

# Validate configuration
docker compose config --quiet && echo "Configuration valid"
```

Common issues:

```yaml
# WRONG: Circular extends
services:
  a:
    extends:
      service: b
  b:
    extends:
      service: a
# Error: circular dependency

# WRONG: Missing file
services:
  app:
    extends:
      file: nonexistent.yml
      service: base
# Error: nonexistent.yml not found

# WRONG: Missing service in file
services:
  app:
    extends:
      file: common.yml
      service: nonexistent
# Error: service nonexistent not found in common.yml
```

## Project Structure Example

```
project/
  common/
    base.yml           # Lowest-level shared config
    observability.yml  # Logging, metrics config
    security.yml       # Security-related config
  services/
    api/
      Dockerfile
      docker-compose.yml
    worker/
      Dockerfile
      docker-compose.yml
  docker-compose.yml   # Main orchestration
  docker-compose.dev.yml
  docker-compose.prod.yml
```

```yaml
# docker-compose.yml - Main file bringing it together
services:
  api:
    extends:
      file: services/api/docker-compose.yml
      service: api
    depends_on:
      - database
      - redis

  worker:
    extends:
      file: services/worker/docker-compose.yml
      service: worker
    depends_on:
      - database
      - redis

  database:
    extends:
      file: common/base.yml
      service: postgres

  redis:
    extends:
      file: common/base.yml
      service: redis
```

## Limitations and Alternatives

Extends has limitations in Docker Compose v3:

1. Networks and volumes cannot be extended
2. Some properties are replaced, not merged
3. Deep nesting can become hard to debug

Alternatives for complex scenarios:

```yaml
# Use YAML anchors for simple cases
x-logging: &default-logging
  driver: json-file
  options:
    max-size: "10m"

x-healthcheck: &default-healthcheck
  interval: 30s
  timeout: 10s
  retries: 3

services:
  api:
    image: myapp:latest
    logging: *default-logging
    healthcheck:
      <<: *default-healthcheck
      test: ["CMD", "curl", "-f", "http://localhost/health"]

  worker:
    image: myworker:latest
    logging: *default-logging
    healthcheck:
      <<: *default-healthcheck
      test: ["CMD", "pgrep", "worker"]
```

---

Docker Compose `extends` reduces configuration duplication and ensures consistency across services and environments. Use it for sharing logging, health checks, resource limits, and other common settings. Start with simple base files and add complexity gradually. When configurations become too nested, consider switching to YAML anchors or splitting into multiple Compose files that you merge at runtime.
