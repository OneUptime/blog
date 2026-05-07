# How to Use Variable Substitution in podman-compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, podman-compose, Variable, Configuration

Description: Learn how to use variable substitution syntax in podman-compose files for dynamic configuration with defaults and error handling.

---

> Variable substitution in compose files lets you parameterize images, ports, and configuration without editing the YAML directly.

podman-compose supports shell-style variable substitution in compose files. You can reference environment variables, provide default values, and require mandatory variables. This makes your compose files portable across different environments.

---

## Basic Variable Substitution

```yaml
# docker-compose.yml

services:
  web:
    image: docker.io/library/nginx:${NGINX_VERSION}
    ports:
      - "${HOST_PORT}:80"
```

```bash
# Set variables and run
NGINX_VERSION=alpine HOST_PORT=8080 podman-compose up -d

# Or export them
export NGINX_VERSION=alpine
export HOST_PORT=8080
podman-compose up -d
```

## Default Values

Use `:-` to provide a default when a variable is unset or empty.

```yaml
# docker-compose.yml
services:
  app:
    # Default to 3.12-slim if TAG is not set
    image: docker.io/library/python:${TAG:-3.12-slim}
    ports:
      # Default to port 8080
      - "${PORT:-8080}:8080"
    environment:
      # Default to info log level
      LOG_LEVEL: ${LOG_LEVEL:-info}
      # Default to development mode
      APP_ENV: ${APP_ENV:-development}
```

```bash
# Run with defaults (no variables set)
podman-compose up -d
# Uses python:3.12-slim on port 8080

# Override specific values
TAG=3.11-slim PORT=9090 podman-compose up -d
```

## Required Variables with Error Messages

Use `:?` to fail with an error if a variable is not set or is empty.

```yaml
# docker-compose.yml
services:
  db:
    image: docker.io/library/postgres:16-alpine
    environment:
      # Fail if DB_PASSWORD is not set
      POSTGRES_PASSWORD: ${DB_PASSWORD:?DB_PASSWORD must be set}
  app:
    image: docker.io/library/node:20-alpine
    environment:
      # Fail if API_KEY is not set
      API_KEY: ${API_KEY:?API_KEY is required}
```

```bash
# This will fail with an error message
podman-compose up -d
# Error: DB_PASSWORD must be set

# Set the required variables
DB_PASSWORD=secret API_KEY=mykey podman-compose up -d
```

## Using .env with Substitution

```bash
# .env
PROJECT_NAME=myapp
REGISTRY=docker.io/library
PYTHON_TAG=3.12-slim
REDIS_TAG=7-alpine
EXPOSED_PORT=8080
```

```yaml
# docker-compose.yml
services:
  app:
    image: ${REGISTRY}/python:${PYTHON_TAG}
    container_name: ${PROJECT_NAME}-app
    ports:
      - "${EXPOSED_PORT}:8080"
  cache:
    image: ${REGISTRY}/redis:${REDIS_TAG}
    container_name: ${PROJECT_NAME}-cache
```

## Escaping Dollar Signs

```yaml
# Use $$ to include a literal dollar sign
services:
  app:
    environment:
      # This passes a literal $PATH to the container
      SHELL_PATH: $$PATH
```

## Substitution in Different Fields

```yaml
# Variables work in most compose fields
services:
  app:
    image: ${REGISTRY}/${IMAGE}:${TAG}
    container_name: ${PROJECT}-app
    hostname: ${HOSTNAME:-app-host}
    ports:
      - "${HOST_PORT:-8080}:${CONTAINER_PORT:-8080}"
    volumes:
      - ${DATA_DIR:-./data}:/app/data
    labels:
      environment: ${ENV:-dev}
```

## Summary

podman-compose supports `${VAR}` for basic substitution, `${VAR:-default}` for default values, and `${VAR:?error}` for mandatory variables. Combine these with a `.env` file to keep your compose files environment-agnostic and portable across teams and deployment targets.
