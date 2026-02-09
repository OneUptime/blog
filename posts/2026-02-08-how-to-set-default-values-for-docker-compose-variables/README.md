# How to Set Default Values for Docker Compose Variables

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker Compose, Environment Variables, Configuration, Defaults, DevOps, Docker

Description: Complete guide to setting default values for Docker Compose variables using built-in syntax, .env files, and shell techniques.

---

When you build Docker Compose files that work across multiple environments, you need sensible defaults. A developer cloning your repository should be able to run `docker compose up` without creating any configuration files. At the same time, production deployments should be able to override every value. Docker Compose gives you several mechanisms to achieve this, and understanding when to use each one keeps your configuration clean and predictable.

## The ${VAR:-default} Syntax

The most common way to set defaults is directly in the compose file using the `:-` syntax:

```yaml
# docker-compose.yml - inline defaults with :- syntax
version: "3.8"

services:
  api:
    image: myapi:${API_VERSION:-latest}
    ports:
      - "${API_PORT:-3000}:3000"
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      LOG_LEVEL: ${LOG_LEVEL:-debug}
      MAX_CONNECTIONS: ${MAX_CONNECTIONS:-100}
      CACHE_TTL: ${CACHE_TTL:-300}

  postgres:
    image: postgres:${PG_VERSION:-16-alpine}
    environment:
      POSTGRES_USER: ${DB_USER:-appuser}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-localdev123}
      POSTGRES_DB: ${DB_NAME:-myapp_dev}
    ports:
      - "${DB_PORT:-5432}:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:${REDIS_VERSION:-7-alpine}
    ports:
      - "${REDIS_PORT:-6379}:6379"
    command: redis-server --maxmemory ${REDIS_MAXMEM:-256mb}

volumes:
  pgdata:
```

With this setup, running `docker compose up` without any variables set gives you a working development stack. PostgreSQL runs on port 5432, the API runs on port 3000, and everything uses development defaults.

## The Difference Between :- and -

Docker Compose supports two variations of the default syntax:

```yaml
services:
  app:
    environment:
      # :- treats both unset AND empty as "use the default"
      VAR_A: ${MY_VAR:-fallback_value}

      # - treats only unset as "use the default" (empty string is kept)
      VAR_B: ${MY_VAR-fallback_value}
```

Here is how they behave:

```bash
# Variable is completely unset
unset MY_VAR
# Both :- and - produce: "fallback_value"

# Variable is set to empty string
export MY_VAR=""
# :- produces: "fallback_value" (treats empty as missing)
# -  produces: "" (keeps the empty string)

# Variable has a value
export MY_VAR="real_value"
# Both :- and - produce: "real_value"
```

Use `:-` in most cases. The `-` variant is only useful when an empty string is a valid value you want to preserve.

## Using .env Files for Project Defaults

The `.env` file provides another layer of defaults. Docker Compose reads it automatically:

```bash
# .env - project-level defaults
COMPOSE_PROJECT_NAME=myapp
API_VERSION=2.1.0
PG_VERSION=16-alpine
REDIS_VERSION=7-alpine
API_PORT=3000
DB_PORT=5432
```

The precedence order is:

1. Shell environment variables (highest priority)
2. `.env` file values
3. Inline defaults in compose file (`:-` syntax, lowest priority)

This layering lets you set project-wide defaults in `.env`, override them per-environment with shell variables, and still have a final fallback in the compose file itself.

## The .env.example Pattern

Ship a template file with your project that documents every variable:

```bash
# .env.example - copy to .env and customize
# Application
API_VERSION=latest
API_PORT=3000
NODE_ENV=development
LOG_LEVEL=debug

# Database
PG_VERSION=16-alpine
DB_USER=appuser
DB_PASSWORD=CHANGE_ME_IN_PRODUCTION
DB_NAME=myapp_dev
DB_PORT=5432

# Redis
REDIS_VERSION=7-alpine
REDIS_PORT=6379
REDIS_MAXMEM=256mb

# Feature flags
ENABLE_CACHE=true
ENABLE_METRICS=false
```

Add a setup script or Makefile target:

```makefile
# Makefile - common project tasks
.PHONY: setup up down

setup:
	@test -f .env || cp .env.example .env
	@echo "Environment file ready. Edit .env if needed."

up: setup
	docker compose up -d

down:
	docker compose down
```

## Conditional Defaults Based on Environment

A useful pattern is to set defaults that change based on a single environment variable:

```yaml
# docker-compose.yml with environment-aware defaults
version: "3.8"

services:
  app:
    image: myapp:${API_VERSION:-latest}
    ports:
      - "${API_PORT:-3000}:3000"
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      LOG_LEVEL: ${LOG_LEVEL:-debug}
      # In development, use verbose errors. Override in production .env
      SHOW_ERRORS: ${SHOW_ERRORS:-true}
      CORS_ORIGIN: ${CORS_ORIGIN:-*}
```

Then create environment-specific override files:

```bash
# .env.production - overrides for production
API_VERSION=2.1.0
API_PORT=80
NODE_ENV=production
LOG_LEVEL=warn
SHOW_ERRORS=false
CORS_ORIGIN=https://myapp.com
```

Deploy with:

```bash
# Production deployment with overridden defaults
docker compose --env-file .env.production up -d
```

## Defaults for Docker Compose Override Files

Combine defaults with Docker Compose's override mechanism. The base file has production settings, and the override adds development conveniences:

```yaml
# docker-compose.yml - base configuration with production defaults
version: "3.8"

services:
  app:
    image: myapp:${API_VERSION:-2.1.0}
    restart: ${RESTART_POLICY:-always}
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      LOG_LEVEL: ${LOG_LEVEL:-warn}
    deploy:
      resources:
        limits:
          cpus: "${CPU_LIMIT:-2.0}"
          memory: "${MEM_LIMIT:-1G}"
```

```yaml
# docker-compose.override.yml - development overrides (auto-loaded)
version: "3.8"

services:
  app:
    build:
      context: .
    ports:
      - "${API_PORT:-3000}:3000"
    volumes:
      - ./src:/app/src
    environment:
      NODE_ENV: development
      LOG_LEVEL: debug
```

In development, both files are loaded automatically. In production, use only the base:

```bash
# Development - loads both files automatically
docker compose up

# Production - explicitly use only the base file
docker compose -f docker-compose.yml up -d
```

## Defaults with Shell Wrapper Scripts

For complex default logic that Compose cannot handle, use a wrapper script:

```bash
#!/bin/bash
# deploy.sh - set computed defaults before running compose

# Default to current git branch tag for version
export API_VERSION=${API_VERSION:-$(git describe --tags --always 2>/dev/null || echo "latest")}

# Default port based on environment
if [ "${NODE_ENV}" = "production" ]; then
  export API_PORT=${API_PORT:-80}
  export LOG_LEVEL=${LOG_LEVEL:-warn}
  export WORKERS=${WORKERS:-$(nproc)}
else
  export API_PORT=${API_PORT:-3000}
  export LOG_LEVEL=${LOG_LEVEL:-debug}
  export WORKERS=${WORKERS:-1}
fi

# Default memory limit based on available system memory
TOTAL_MEM_MB=$(free -m | awk '/^Mem:/{print $2}')
export MEM_LIMIT=${MEM_LIMIT:-$((TOTAL_MEM_MB / 2))M}

echo "Deploying API ${API_VERSION} on port ${API_PORT}"
echo "Workers: ${WORKERS}, Memory: ${MEM_LIMIT}"

docker compose "$@"
```

Usage:

```bash
# Uses all computed defaults
./deploy.sh up -d

# Override specific values
API_VERSION=3.0.0 ./deploy.sh up -d

# Pass any compose command
./deploy.sh down
./deploy.sh logs -f
```

## Validating Defaults at Startup

Add a validation step that catches misconfiguration early:

```yaml
services:
  validate:
    image: alpine
    entrypoint: ["sh", "-c"]
    command:
      - |
        echo "Validating configuration..."
        errors=0

        # Check required variables have non-default values in production
        if [ "$NODE_ENV" = "production" ]; then
          if [ "$DB_PASSWORD" = "localdev123" ]; then
            echo "ERROR: DB_PASSWORD still has default value"
            errors=$((errors + 1))
          fi
          if [ "$API_PORT" = "3000" ]; then
            echo "WARNING: API_PORT using development default"
          fi
        fi

        if [ $errors -gt 0 ]; then
          echo "Configuration validation failed"
          exit 1
        fi
        echo "Configuration valid"
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      DB_PASSWORD: ${DB_PASSWORD:-localdev123}
      API_PORT: ${API_PORT:-3000}

  app:
    image: myapp:${API_VERSION:-latest}
    depends_on:
      validate:
        condition: service_completed_successfully
```

## Debugging Default Resolution

Use `docker compose config` to see what values are actually being used:

```bash
# Show the fully resolved compose file
docker compose config

# Show just the environment section for a specific service
docker compose config | grep -A 20 "environment:"

# Compare two environments
diff <(docker compose config) <(docker compose --env-file .env.production config)
```

You can also check which variables Compose detects as unset:

```bash
# Show warnings about variables without values or defaults
docker compose config 2>&1 | grep -i "warn"
```

## Summary

Setting good defaults makes your Docker Compose files portable and developer-friendly. Use inline `${VAR:-default}` syntax for fallback values in the compose file, `.env` files for project-level configuration, and environment-specific `.env.production` files for deployment overrides. Layer these together with the precedence rules: shell variables beat `.env` values, which beat inline defaults. Always provide an `.env.example` so new team members know what variables exist and what reasonable values look like.
