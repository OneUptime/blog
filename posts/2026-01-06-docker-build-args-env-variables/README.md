# How to Pass Build Arguments and Environment Variables in Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Containers, DevOps, Configuration, Security

Description: Understand ARG vs ENV, .env files, Compose interpolation, and secret injection patterns to configure Docker builds and containers correctly.

Configuring Docker containers involves two distinct phases: build time and run time. Mixing them up leads to secrets baked into images, missing configuration at runtime, or builds that fail mysteriously. This guide clarifies when to use each mechanism and shows secure patterns for sensitive data.

---

## ARG vs ENV: The Core Distinction

| Aspect | ARG | ENV |
|--------|-----|-----|
| Available during | `docker build` only | Build AND runtime |
| Set via | `--build-arg` flag | `docker run -e` flag |
| Persists in image | No (except as layer metadata) | Yes |
| Use for | Version numbers, build flags | App configuration, paths |

### Simple Example

```dockerfile
# ARG: only exists during build
ARG NODE_VERSION=22
FROM node:${NODE_VERSION}

# ENV: exists in the running container
ENV APP_PORT=3000

WORKDIR /app
COPY . .
RUN npm install

EXPOSE ${APP_PORT}
CMD ["node", "server.js"]
```

```bash
# Override ARG at build time
docker build --build-arg NODE_VERSION=20 -t myapp .

# Override ENV at runtime
docker run -e APP_PORT=8080 myapp
```

---

## Build Arguments (ARG) Deep Dive

### Declaring and Using ARGs

```dockerfile
# With default value
ARG BASE_IMAGE=node:22-alpine

# Without default (must be provided)
ARG COMMIT_SHA

# Use in FROM (must be before FROM)
ARG BASE_IMAGE=node:22-alpine
FROM ${BASE_IMAGE}

# ARG after FROM needs redeclaration
ARG COMMIT_SHA
LABEL commit=${COMMIT_SHA}
```

### ARG Scope Rules

ARGs declared before `FROM` are only available for the `FROM` instruction. To use them later, redeclare:

```dockerfile
ARG VERSION=1.0.0
FROM node:22 AS builder

# Must redeclare to use after FROM
ARG VERSION
RUN echo "Building version ${VERSION}"
```

### Passing ARGs at Build Time

```bash
# Single ARG
docker build --build-arg VERSION=2.0.0 -t myapp .

# Multiple ARGs
docker build \
  --build-arg VERSION=2.0.0 \
  --build-arg COMMIT_SHA=$(git rev-parse HEAD) \
  -t myapp .
```

### Common ARG Use Cases

```dockerfile
# Conditional dependencies
ARG INSTALL_DEV_DEPS=false
RUN if [ "$INSTALL_DEV_DEPS" = "true" ]; then npm install; else npm install --only=production; fi

# Version pinning
ARG ALPINE_VERSION=3.19
FROM alpine:${ALPINE_VERSION}

# Build-time secrets (use with caution - see secrets section below)
ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc && \
    npm install && \
    rm .npmrc
```

---

## Environment Variables (ENV) Deep Dive

### Setting ENV in Dockerfile

```dockerfile
# Single variable
ENV NODE_ENV=production

# Multiple variables (recommended format)
ENV NODE_ENV=production \
    APP_PORT=3000 \
    LOG_LEVEL=info

# Interpolation works
ENV APP_HOME=/app
ENV APP_CONFIG=${APP_HOME}/config
```

### Overriding at Runtime

```bash
# Single variable
docker run -e NODE_ENV=development myapp

# Multiple variables
docker run -e NODE_ENV=development -e LOG_LEVEL=debug myapp

# From host environment
export DATABASE_URL="postgres://localhost/db"
docker run -e DATABASE_URL myapp

# From file
docker run --env-file .env myapp
```

### The .env File Format

```bash
# .env file
NODE_ENV=production
DATABASE_URL=postgres://user:pass@host:5432/db
API_KEY=sk-12345

# Comments and empty lines are ignored
# Quotes are optional but recommended for special characters
GREETING="Hello, World!"

# No interpolation in .env files
# This does NOT work: PATH=$HOME/bin
```

---

## Docker Compose Configuration

Compose adds layers of variable handling that trip up many developers.

### Variable Substitution in Compose

```yaml
# docker-compose.yml
services:
  api:
    image: myapp:${VERSION:-latest}
    environment:
      - NODE_ENV=${NODE_ENV:-production}
      - DATABASE_URL
    env_file:
      - .env
      - .env.local
```

### How Compose Resolves Variables

1. Shell environment (highest priority)
2. `.env` file in the same directory as `docker-compose.yml`
3. Default values in the Compose file (`${VAR:-default}`)

```bash
# .env (loaded automatically by Compose)
VERSION=1.0.0
NODE_ENV=staging

# Shell override takes precedence
VERSION=2.0.0 docker compose up
```

### Compose .env vs Container .env

There's a critical distinction:

```yaml
services:
  api:
    env_file:
      - app.env  # Variables for the CONTAINER

# The .env file in the project root is for COMPOSE INTERPOLATION
# It's NOT automatically passed to containers
```

### Build Args in Compose

```yaml
services:
  api:
    build:
      context: .
      args:
        - NODE_VERSION=22
        - COMMIT_SHA=${COMMIT_SHA}  # From shell/env
    environment:
      - APP_PORT=3000
```

```bash
# Pass build arg from shell
COMMIT_SHA=$(git rev-parse HEAD) docker compose build
```

### Complete Compose Example

```yaml
# docker-compose.yml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        NODE_VERSION: ${NODE_VERSION:-22}
        BUILD_ENV: ${BUILD_ENV:-production}
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      PORT: 3000
      DATABASE_URL: ${DATABASE_URL}
    env_file:
      - .env.${NODE_ENV:-production}
    ports:
      - "${HOST_PORT:-3000}:3000"

  worker:
    build: ./worker
    environment:
      REDIS_URL: ${REDIS_URL}
    env_file:
      - .env.${NODE_ENV:-production}
```

---

## Secure Secret Injection

Never bake secrets into images. They persist in layer history even if deleted.

### Bad: Secrets in ARG

```dockerfile
# DON'T DO THIS - secret visible in image history
ARG DATABASE_PASSWORD
ENV DATABASE_PASSWORD=${DATABASE_PASSWORD}
```

```bash
# Anyone with image access can see this
docker history myapp:latest
```

### Good: Runtime-Only Secrets

```dockerfile
# Dockerfile - no secrets here
ENV DATABASE_HOST=db
ENV DATABASE_PORT=5432
# DATABASE_PASSWORD injected at runtime
```

```bash
# Pass at runtime
docker run -e DATABASE_PASSWORD="secret" myapp
```

### Better: Docker Secrets (Swarm/Compose)

```yaml
# docker-compose.yml
services:
  api:
    image: myapp
    secrets:
      - db_password
    environment:
      DATABASE_PASSWORD_FILE: /run/secrets/db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

### Best: BuildKit Secrets for Build-Time

When you need secrets during build (npm tokens, private repos):

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22

WORKDIR /app
COPY package*.json ./

# Secret mounted only during this RUN, never persisted
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) \
    npm install

COPY . .
CMD ["node", "server.js"]
```

```bash
# Build with secret
docker build --secret id=npm_token,src=.npmrc -t myapp .
```

---

## Patterns and Best Practices

### Pattern: Environment-Specific Configs

```bash
# .env.development
DATABASE_URL=postgres://localhost:5432/dev
LOG_LEVEL=debug
API_URL=http://localhost:3000

# .env.production
DATABASE_URL=postgres://prod-db:5432/app
LOG_LEVEL=warn
API_URL=https://api.example.com
```

```yaml
# docker-compose.yml
services:
  api:
    env_file:
      - .env.${ENV:-development}
```

### Pattern: Required Variables Validation

```dockerfile
# Fail fast if required env vars missing
FROM node:22
WORKDIR /app
COPY . .

# This runs at container start
CMD ["sh", "-c", "\
  if [ -z \"$DATABASE_URL\" ]; then echo 'DATABASE_URL required' && exit 1; fi && \
  node server.js"]
```

Or in the app:

```javascript
// config.js
const required = ['DATABASE_URL', 'API_KEY', 'JWT_SECRET'];
required.forEach(key => {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
});
```

### Pattern: Default with Override

```dockerfile
ENV LOG_LEVEL=info
ENV PORT=3000
```

```bash
# Use defaults
docker run myapp

# Override specific values
docker run -e LOG_LEVEL=debug myapp
```

---

## Debugging Variable Issues

### See Final Environment

```bash
# View all env vars in running container
docker exec mycontainer env

# Or at start
docker run --rm myapp env
```

### See Build Args Used

```bash
# Image history shows ARG usage
docker history myapp:latest

# Inspect image config
docker inspect myapp:latest | jq '.[0].Config.Env'
```

### Compose Variable Resolution

```bash
# See interpolated Compose file
docker compose config

# This shows the actual values after variable substitution
```

---

## Quick Reference

```bash
# Build with ARG
docker build --build-arg VERSION=1.0 -t myapp .

# Run with ENV
docker run -e NODE_ENV=production myapp

# Run with env file
docker run --env-file .env myapp

# Compose with env override
NODE_ENV=production docker compose up

# BuildKit secret
docker build --secret id=token,src=.token -t myapp .
```

---

## Summary

- **ARG** is for build-time configuration (versions, flags) - doesn't persist in runtime
- **ENV** is for runtime configuration - persists in the image
- Never put secrets in ARG or ENV in Dockerfiles - inject at runtime
- Use BuildKit secrets (`--mount=type=secret`) for build-time secrets
- Compose has its own `.env` for interpolation - separate from container env files
- Always validate required variables at container startup

Getting this right from the start prevents security incidents and debugging headaches down the road.
