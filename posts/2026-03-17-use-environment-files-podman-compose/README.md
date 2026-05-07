# How to Use Environment Files with podman-compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, podman-compose, Environment Variable, Configuration

Description: Learn how to use .env files and env_file directives in podman-compose to manage environment variables across services.

---

> Environment files keep sensitive configuration out of your compose files and make it easy to switch between environments.

Managing environment variables through files can keep secrets out of version control when those files are excluded, and lets you switch between development, staging, and production configurations by swapping a single file. podman-compose supports both `.env` files for compose-level variables and `env_file` directives for container-level variables.

---

## The Default .env File

podman-compose automatically reads a `.env` file in the same directory as your compose file.

```bash
# .env

POSTGRES_VERSION=16
APP_PORT=8080
DB_PASSWORD=devsecret
```

```yaml
# docker-compose.yml
name: project
services:
  db:
    image: docker.io/library/postgres:${POSTGRES_VERSION}-alpine
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
  app:
    image: docker.io/library/nginx:alpine
    ports:
      - "${APP_PORT}:80"
```

```bash
# Variables from .env are substituted into the compose file
podman-compose up -d

# Verify the correct image was pulled
podman inspect project_db_1 --format '{{.Config.Image}}'
# Output: docker.io/library/postgres:16-alpine
```

## Using env_file for Container Variables

```bash
# app.env
NODE_ENV=development
API_URL=http://localhost:3000
LOG_LEVEL=debug
SECRET_KEY=mysecretkey123
```

```yaml
# docker-compose.yml
name: project
services:
  app:
    image: docker.io/library/node:20-alpine
    env_file:
      - app.env
    command: ["node", "-e", "setInterval(() => {}, 1000)"]
```

```bash
# Deploy - all variables from app.env are injected into the container
podman-compose up -d

# Verify the variables are set
podman exec project_app_1 env | grep NODE_ENV
# Output: NODE_ENV=development
```

## Multiple Environment Files

```yaml
# docker-compose.yml
services:
  app:
    image: docker.io/library/node:20-alpine
    env_file:
      - common.env
      - app.env
      - secrets.env
    command: ["node", "-e", "setInterval(() => {}, 1000)"]
```

Later files override values from earlier files.

## Per-Environment Configuration

```bash
# Create environment-specific files
# dev.env
DATABASE_URL=postgres://localhost:5432/devdb
DEBUG=true

# prod.env
DATABASE_URL=postgres://db.prod:5432/proddb
DEBUG=false
```

```yaml
# docker-compose.yml
services:
  app:
    image: docker.io/library/node:20-alpine
    env_file:
      - ${ENV_FILE:-dev.env}
    command: ["node", "-e", "setInterval(() => {}, 1000)"]
```

```bash
# Use dev environment (default)
podman-compose up -d

# Use production environment
ENV_FILE=prod.env podman-compose up -d
```

## Combining env_file and environment

```yaml
# docker-compose.yml
services:
  app:
    image: docker.io/library/node:20-alpine
    env_file:
      - app.env
    environment:
      # Inline values override env_file values
      - LOG_LEVEL=warn
    command: ["node", "-e", "setInterval(() => {}, 1000)"]
```

## Verifying Environment Variables

```bash
# Check all environment variables in a container
podman-compose exec app env

# Check a specific variable
podman-compose exec app printenv DATABASE_URL
```

## Summary

Use `.env` for compose-level variable substitution and `env_file` for injecting variables into containers. Combine multiple env files for layered configuration, and use per-environment files to switch between development and production settings without changing your compose file.
