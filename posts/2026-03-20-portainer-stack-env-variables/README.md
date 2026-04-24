# How to Set Environment Variables for Stacks in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Stack, Environment Variable, DevOps

Description: Learn how to manage environment variables for Docker Compose stacks in Portainer, including secure secret handling and per-environment configurations.

## Introduction

Environment variables are the standard mechanism for configuring Docker applications without hardcoding values in images or Compose files. In Portainer, stack environment variables are primarily used to substitute `${VARIABLE}` placeholders in your Compose YAML. Containers receive those values only when you reference them in a service's `environment:` section or, on Docker Standalone and Podman, through `env_file: - stack.env`. Managing these correctly is critical for security - secrets should never be committed to Git.

## Prerequisites

- Portainer with at least one stack or the ability to create one
- Understanding of Docker Compose variable substitution

## How Stack Variables Work in Portainer

Portainer stack environment variables can affect your stack in two ways, depending on how you reference them:

1. **Compose-level substitution**: `${DB_PORT}` in the Compose YAML becomes the actual value before Docker processes it. Used for image tags, port numbers, network names.

2. **Container-level injection**: If you reference a variable in the `environment:` section of a service, the resulting value is passed to the container process. On Docker Standalone and Podman, you can also use `env_file: - stack.env`, but Docker Swarm does not support `env_file` with `docker stack deploy`.

```yaml
# Both substitution types in one Compose file:

services:
  api:
    image: myorg/api:${IMAGE_TAG}          # Compose-level: sets the image to pull
    ports:
      - "${API_PORT}:8080"                  # Compose-level: sets the host port
    environment:
      - DATABASE_URL=${DATABASE_URL}        # Container-level: runtime env var
      - SECRET_KEY=${SECRET_KEY}            # Container-level: runtime env var
      - LOG_LEVEL=${LOG_LEVEL:-info}        # Container-level with default
```

## Step 1: Add Variables During Stack Creation

1. Navigate to **Stacks** → **Add stack**.
2. Enter your Compose YAML with `${VARIABLE}` placeholders.
3. Scroll to **Environment variables**.
4. Click **Add an environment variable**.
5. Enter the name and value for each variable.

## Step 2: Variable Reference in Compose Files

```yaml
services:
  # Image tag controlled by variable
  web:
    image: nginx:${NGINX_VERSION:-alpine}   # Default: alpine if not set

  # Database with all connection params as variables
  api:
    image: myorg/api:${IMAGE_TAG:-latest}
    environment:
      - DB_HOST=${DB_HOST:-postgres}
      - DB_PORT=${DB_PORT:-5432}
      - DB_NAME=${DB_NAME}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}          # Secret - set in Portainer, not in repo
      - JWT_SECRET=${JWT_SECRET}            # Secret - never commit this
      - REDIS_URL=redis://${REDIS_HOST:-redis}:6379
      - ENVIRONMENT=${ENVIRONMENT:-production}

  postgres:
    image: postgres:${POSTGRES_VERSION:-15-alpine}
    environment:
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}

networks:
  app-net:
    name: ${STACK_NAME:-myapp}-network     # Network name uses variable
```

## Step 3: Manage Variables for Multiple Environments

Create separate stacks for each environment with different variable sets:

```text
Stack: myapp-production
  IMAGE_TAG=v1.2.3
  ENVIRONMENT=production
  DB_PASSWORD=<prod-secret>
  NGINX_VERSION=1.25-alpine

Stack: myapp-staging
  IMAGE_TAG=v1.3.0-rc1
  ENVIRONMENT=staging
  DB_PASSWORD=<staging-secret>
  NGINX_VERSION=alpine
```

## Step 4: Load Variables from a `.env` File

Instead of adding variables one by one, use **Load variables from .env file** to upload them all:

1. Click **Load variables from .env file** in the Environment variables section.
2. Upload a file in `KEY=VALUE` format:

```text
IMAGE_TAG=v1.2.3
ENVIRONMENT=production
DB_HOST=postgres
DB_PORT=5432
DB_NAME=myapp
DB_USER=appuser
DB_PASSWORD=supersecretpassword
JWT_SECRET=myjwtsecretkey
REDIS_HOST=redis
LOG_LEVEL=info
```

3. Review the imported variables, then deploy or update the stack.

## Step 5: Update Variables on an Existing Stack

To update environment variables without changing the Compose content:

1. Navigate to **Stacks** → click the stack name.
2. Scroll to the **Environment variables** section.
3. Modify, add, or remove variables.
4. Click **Update the stack**.
5. Services that use those values are recreated or redeployed with the new variable values.

## Step 6: Reference Variables in Stack Names and Labels

```yaml
services:
  api:
    image: myorg/api:${IMAGE_TAG}
    labels:
      # Traefik routing labels using variables:
      - "traefik.http.routers.api.rule=Host(`${API_DOMAIN}`)"
      - "traefik.http.services.api.loadbalancer.server.port=8080"
      # Prometheus labels:
      - "prometheus.io/scrape=true"
      - "com.myorg.environment=${ENVIRONMENT}"
      - "com.myorg.version=${IMAGE_TAG}"
```

## Step 7: Secure Sensitive Variables

Never hardcode secrets in Compose files. Best practices:

```bash
# What NOT to do (committing secrets to Git):
# DB_PASSWORD=hardcodedpassword  ← BAD

# What TO do:
# 1. In Compose file: use a placeholder
#    - DB_PASSWORD=${DB_PASSWORD}

# 2. If the application only supports environment variables,
#    set the actual value in Portainer stack variables
#    DB_PASSWORD = <actual secret>

# 3. Where supported, prefer Docker secrets instead:
secrets:
  db_password:
    external: true

services:
  api:
    secrets:
      - db_password
    environment:
      - DB_PASSWORD_FILE=/run/secrets/db_password
```

## Conclusion

Environment variables in Portainer stacks provide a clean separation between configuration structure (in the Compose file, safely committed to Git) and configuration values (set in Portainer, where secrets stay out of version control). Use `${VARIABLE:-default}` syntax for optional settings with sensible defaults, and prefer Docker secrets for passwords, API keys, and tokens when your images support them. If you must use environment variables for sensitive values, set them in Portainer rather than hardcoding them. Uploading a `.env` file makes it efficient to manage many variables at once.
