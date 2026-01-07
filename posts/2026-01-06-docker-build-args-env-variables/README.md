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

This Dockerfile demonstrates the fundamental difference between ARG and ENV. ARG values exist only during the build process, while ENV values become part of the final image and are available to running containers.

```dockerfile
# ARG: only exists during build - used here to select base image version
ARG NODE_VERSION=22
FROM node:${NODE_VERSION}

# ENV: exists in the running container - available to the application
ENV APP_PORT=3000

WORKDIR /app
COPY . .
RUN npm install

# ENV variables can be used in Dockerfile instructions
EXPOSE ${APP_PORT}
CMD ["node", "server.js"]
```

These commands show how to override ARG at build time and ENV at runtime. Note that ARG is set with `--build-arg` during `docker build`, while ENV is set with `-e` during `docker run`.

```bash
# Override ARG at build time - changes which Node version is used
docker build --build-arg NODE_VERSION=20 -t myapp .

# Override ENV at runtime - changes the port the app listens on
docker run -e APP_PORT=8080 myapp
```

---

## Build Arguments (ARG) Deep Dive

### Declaring and Using ARGs

These patterns show the different ways to declare and use ARG variables in a Dockerfile. Understanding scope is crucial - ARGs before FROM behave differently than ARGs after FROM.

```dockerfile
# With default value - used if --build-arg not provided
ARG BASE_IMAGE=node:22-alpine

# Without default (must be provided via --build-arg or build will use empty string)
ARG COMMIT_SHA

# Use in FROM - ARG must be declared BEFORE the FROM instruction
ARG BASE_IMAGE=node:22-alpine
FROM ${BASE_IMAGE}

# ARG after FROM needs redeclaration - scope resets at each FROM
ARG COMMIT_SHA
LABEL commit=${COMMIT_SHA}
```

### ARG Scope Rules

ARGs declared before `FROM` are only available for the `FROM` instruction. To use them later, redeclare:

This example illustrates the ARG scope rule. The VERSION declared before FROM is lost after the FROM instruction executes. You must redeclare it to use it in subsequent instructions.

```dockerfile
# This ARG is available for the FROM instruction
ARG VERSION=1.0.0
FROM node:22 AS builder

# Must redeclare to use after FROM - original ARG is now out of scope
ARG VERSION
RUN echo "Building version ${VERSION}"
```

### Passing ARGs at Build Time

Pass build arguments using the `--build-arg` flag. Multiple arguments can be provided, and you can inject dynamic values like git commit hashes.

```bash
# Single ARG override
docker build --build-arg VERSION=2.0.0 -t myapp .

# Multiple ARGs - useful for injecting build metadata
docker build \
  --build-arg VERSION=2.0.0 \
  --build-arg COMMIT_SHA=$(git rev-parse HEAD) \
  -t myapp .
```

### Common ARG Use Cases

These patterns demonstrate practical uses for ARG: conditional dependency installation, version pinning, and build-time secrets (with the caveat that ARG secrets are visible in image history).

```dockerfile
# Conditional dependencies - install dev deps only when requested
ARG INSTALL_DEV_DEPS=false
RUN if [ "$INSTALL_DEV_DEPS" = "true" ]; then npm install; else npm install --only=production; fi

# Version pinning - control base image versions from build command
ARG ALPINE_VERSION=3.19
FROM alpine:${ALPINE_VERSION}

# Build-time secrets (use with caution - see secrets section below)
# WARNING: This pattern leaves secrets in image layer history
ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc && \
    npm install && \
    rm .npmrc  # Deletion doesn't remove from layer history!
```

---

## Environment Variables (ENV) Deep Dive

### Setting ENV in Dockerfile

ENV variables are embedded in the image and available to running containers. They support interpolation from previously defined ENV values.

```dockerfile
# Single variable declaration
ENV NODE_ENV=production

# Multiple variables (recommended format for readability)
ENV NODE_ENV=production \
    APP_PORT=3000 \
    LOG_LEVEL=info

# Interpolation works - reference previously defined ENV values
ENV APP_HOME=/app
ENV APP_CONFIG=${APP_HOME}/config
```

### Overriding at Runtime

These examples show various ways to pass environment variables when running containers. The `-e` flag takes precedence over Dockerfile defaults.

```bash
# Single variable override
docker run -e NODE_ENV=development myapp

# Multiple variables
docker run -e NODE_ENV=development -e LOG_LEVEL=debug myapp

# From host environment - variable is read from your shell
export DATABASE_URL="postgres://localhost/db"
docker run -e DATABASE_URL myapp  # Passes $DATABASE_URL from host

# From file - all variables in the file are passed to the container
docker run --env-file .env myapp
```

### The .env File Format

The .env file format has specific rules. This example shows correct syntax including comments, quoting for special characters, and the limitation that variable interpolation does not work.

```bash
# .env file format example
NODE_ENV=production
DATABASE_URL=postgres://user:pass@host:5432/db
API_KEY=sk-12345

# Comments and empty lines are ignored

# Quotes are optional but recommended for special characters
GREETING="Hello, World!"

# No interpolation in .env files - this does NOT work:
# PATH=$HOME/bin  <- Would NOT expand $HOME
```

---

## Docker Compose Configuration

Compose adds layers of variable handling that trip up many developers.

### Variable Substitution in Compose

Docker Compose supports variable substitution with default values using the `${VAR:-default}` syntax. Variables can come from the environment, .env file, or be defined inline.

```yaml
# docker-compose.yml
services:
  api:
    image: myapp:${VERSION:-latest}  # Use VERSION or default to 'latest'
    environment:
      - NODE_ENV=${NODE_ENV:-production}  # Default to production
      - DATABASE_URL  # Pass through from shell/env without default
    env_file:
      - .env        # Base configuration
      - .env.local  # Local overrides (gitignored)
```

### How Compose Resolves Variables

1. Shell environment (highest priority)
2. `.env` file in the same directory as `docker-compose.yml`
3. Default values in the Compose file (`${VAR:-default}`)

This demonstrates the variable resolution priority. Shell environment variables take precedence over .env file values, which take precedence over defaults.

```bash
# .env (loaded automatically by Compose)
VERSION=1.0.0
NODE_ENV=staging

# Shell override takes precedence over .env file
VERSION=2.0.0 docker compose up  # Uses VERSION=2.0.0
```

### Compose .env vs Container .env

There's a critical distinction:

This is a common source of confusion. The .env file in your project root configures Compose itself, NOT the container. Use env_file to pass variables to the container.

```yaml
services:
  api:
    env_file:
      - app.env  # Variables for the CONTAINER (passed to running app)

# The .env file in the project root is for COMPOSE INTERPOLATION only
# It's NOT automatically passed to containers - they're different purposes!
```

### Build Args in Compose

Build arguments in Compose are defined under the build.args key. They can use Compose variable substitution to pull values from the environment.

```yaml
services:
  api:
    build:
      context: .
      args:
        - NODE_VERSION=22            # Hardcoded build arg
        - COMMIT_SHA=${COMMIT_SHA}   # From shell/env via Compose substitution
    environment:
      - APP_PORT=3000                # Runtime env var
```

```bash
# Pass build arg from shell - Compose substitutes it into the config
COMMIT_SHA=$(git rev-parse HEAD) docker compose build
```

### Complete Compose Example

This comprehensive example shows environment-specific configuration loading, build arguments, and runtime environment variables working together.

```yaml
# docker-compose.yml - complete configuration example
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        NODE_VERSION: ${NODE_VERSION:-22}    # Build-time Node version
        BUILD_ENV: ${BUILD_ENV:-production}  # Build-time environment
    environment:
      NODE_ENV: ${NODE_ENV:-production}      # Runtime environment
      PORT: 3000                             # Fixed port
      DATABASE_URL: ${DATABASE_URL}          # Required, no default
    env_file:
      - .env.${NODE_ENV:-production}         # Load env-specific file
    ports:
      - "${HOST_PORT:-3000}:3000"            # Configurable host port

  worker:
    build: ./worker
    environment:
      REDIS_URL: ${REDIS_URL}                # Required for worker
    env_file:
      - .env.${NODE_ENV:-production}         # Same env file as api
```

---

## Secure Secret Injection

Never bake secrets into images. They persist in layer history even if deleted.

### Bad: Secrets in ARG

This anti-pattern shows what NOT to do. Secrets passed as ARG or converted to ENV are visible in the image history, making them accessible to anyone with image access.

```dockerfile
# DON'T DO THIS - secret visible in image history forever
ARG DATABASE_PASSWORD
ENV DATABASE_PASSWORD=${DATABASE_PASSWORD}
```

```bash
# Anyone with image access can see secrets with this command
docker history myapp:latest
```

### Good: Runtime-Only Secrets

The secure approach: never put secrets in the Dockerfile. Inject them only at runtime so they never become part of the image.

```dockerfile
# Dockerfile - no secrets here, only structure
ENV DATABASE_HOST=db
ENV DATABASE_PORT=5432
# DATABASE_PASSWORD will be injected at runtime, not baked in
```

```bash
# Pass secrets at runtime - they exist only in the running container
docker run -e DATABASE_PASSWORD="secret" myapp
```

### Better: Docker Secrets (Swarm/Compose)

Docker secrets mount sensitive data as files inside the container. This is more secure than environment variables, which can appear in process listings.

```yaml
# docker-compose.yml using Docker secrets
services:
  api:
    image: myapp
    secrets:
      - db_password                              # Mount this secret
    environment:
      DATABASE_PASSWORD_FILE: /run/secrets/db_password  # App reads from file

secrets:
  db_password:
    file: ./secrets/db_password.txt              # Source file on host
```

### Best: BuildKit Secrets for Build-Time

When you need secrets during build (npm tokens, private repos):

BuildKit secrets are the gold standard for build-time secrets. The secret is mounted only during the specific RUN command and is never written to any image layer.

```dockerfile
# syntax=docker/dockerfile:1
# Enable BuildKit syntax for secret mounts
FROM node:22

WORKDIR /app
COPY package*.json ./

# Secret mounted only during this RUN, never persisted to image layers
# The secret file is available at /run/secrets/<id> during this command only
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) \
    npm install

COPY . .
CMD ["node", "server.js"]
```

```bash
# Build with secret - secret file is not included in the image
docker build --secret id=npm_token,src=.npmrc -t myapp .
```

---

## Patterns and Best Practices

### Pattern: Environment-Specific Configs

Maintain separate configuration files for each environment. This keeps production secrets separate from development defaults.

```bash
# .env.development - safe defaults for local development
DATABASE_URL=postgres://localhost:5432/dev
LOG_LEVEL=debug
API_URL=http://localhost:3000

# .env.production - production values (keep secure!)
DATABASE_URL=postgres://prod-db:5432/app
LOG_LEVEL=warn
API_URL=https://api.example.com
```

```yaml
# docker-compose.yml - load environment-specific config
services:
  api:
    env_file:
      - .env.${ENV:-development}  # Defaults to development if ENV not set
```

### Pattern: Required Variables Validation

Fail fast if required environment variables are missing. This prevents cryptic errors later in the application lifecycle.

```dockerfile
# Fail fast if required env vars missing at container start
FROM node:22
WORKDIR /app
COPY . .

# This runs at container start, before the app
# Validates required variables and exits with error if missing
CMD ["sh", "-c", "\
  if [ -z \"$DATABASE_URL\" ]; then echo 'DATABASE_URL required' && exit 1; fi && \
  node server.js"]
```

Or in the app:

Application-level validation provides better error messages and can be tested. This pattern ensures the app fails immediately with a clear message rather than later with a confusing error.

```javascript
// config.js - validate required environment variables at startup
const required = ['DATABASE_URL', 'API_KEY', 'JWT_SECRET'];
required.forEach(key => {
  if (!process.env[key]) {
    // Exit immediately with clear error message
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
});
```

### Pattern: Default with Override

Set sensible defaults in the Dockerfile, allowing runtime overrides for customization without requiring them.

```dockerfile
# Sensible defaults that work out of the box
ENV LOG_LEVEL=info
ENV PORT=3000
```

```bash
# Use defaults - no configuration needed for common case
docker run myapp

# Override specific values when needed
docker run -e LOG_LEVEL=debug myapp
```

---

## Debugging Variable Issues

### See Final Environment

These commands let you inspect the actual environment variables inside a container, useful for verifying that your configuration is working correctly.

```bash
# View all env vars in running container
docker exec mycontainer env

# Or see what env vars would be set at start
docker run --rm myapp env
```

### See Build Args Used

Inspect images to see how they were built. Note that this exposes ARG values, which is why secrets should never be passed as ARG.

```bash
# Image history shows ARG usage (and why secrets shouldn't be ARGs!)
docker history myapp:latest

# Inspect image config to see ENV values baked into image
docker inspect myapp:latest | jq '.[0].Config.Env'
```

### Compose Variable Resolution

Use `docker compose config` to see the fully interpolated configuration. This reveals exactly what values Compose will use after all variable substitution.

```bash
# See interpolated Compose file with all variables resolved
docker compose config

# This shows the actual values after variable substitution
# Extremely useful for debugging "why is this value wrong?" issues
```

---

## Quick Reference

This quick reference summarizes the key commands for working with Docker variables. Keep these handy for daily use.

```bash
# Build with ARG - set build-time variables
docker build --build-arg VERSION=1.0 -t myapp .

# Run with ENV - set runtime variables
docker run -e NODE_ENV=production myapp

# Run with env file - load variables from file
docker run --env-file .env myapp

# Compose with env override - shell vars take precedence
NODE_ENV=production docker compose up

# BuildKit secret - secure build-time secrets
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
