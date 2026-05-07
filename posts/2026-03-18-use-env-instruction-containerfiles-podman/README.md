# How to Use ENV Instruction in Containerfiles for Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Containerfile, ENV, Environment Variable, Configuration

Description: Learn how to use the ENV instruction in Podman Containerfiles to configure environment variables for both build-time and runtime, with best practices for security and maintainability.

---

> Environment variables are the standard way to configure containerized applications. The ENV instruction in Containerfiles sets variables that persist in the final image and are available at both build time and runtime.

Environment variables play a central role in containerized applications. They configure application behavior, set paths, define connection strings, and control feature flags, all without changing code or rebuilding images. The ENV instruction in a Containerfile sets these variables as part of your image, making them available to every subsequent instruction during the build and to any process that runs inside the container.

This guide covers how to use ENV effectively in Podman Containerfiles, including syntax variations, scoping rules, security considerations, and practical patterns for real-world applications.

---

## Basic Syntax

The ENV instruction has two preferred forms, plus a legacy form:

```dockerfile
# Form 1: Single variable

ENV MY_VAR=value

# Form 2: Multiple variables on one line
ENV MY_VAR=value OTHER_VAR=other_value

# Form 3: Legacy syntax (single variable, no equals sign)
ENV MY_VAR value with spaces
```

The first two forms are preferred. The legacy syntax without the equals sign only supports a single variable per instruction and treats everything after the variable name as the value, including spaces.

```dockerfile
FROM alpine:3.19

# Set multiple related variables
ENV APP_NAME=myapp \
    APP_VERSION=1.0.0 \
    APP_ENV=production

RUN echo "Building ${APP_NAME} version ${APP_VERSION}"
```

## How ENV Variables Persist

Unlike ARG, which only exists during the build, ENV variables persist in the final image. They are available to:

- Subsequent build instructions that support environment replacement, and shell commands in RUN instructions
- Any process running inside the container at runtime
- Child processes spawned by the container's main process

```dockerfile
FROM python:3.12-slim

ENV APP_HOME=/app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR ${APP_HOME}

COPY . .
RUN pip install --no-cache-dir -r requirements.txt

# APP_HOME, PYTHONDONTWRITEBYTECODE, and PYTHONUNBUFFERED
# are all available when the container runs
CMD ["python", "app.py"]
```

You can verify environment variables in a running container:

```bash
podman run myapp env | grep APP
# APP_HOME=/app

podman run myapp printenv PYTHONUNBUFFERED
# 1
```

## ENV Variable Expansion

ENV variables can be referenced in several Containerfile instructions using `$variable` or `${variable}` syntax:

```dockerfile
FROM node:20-alpine

ENV APP_DIR=/app
ENV NODE_ENV=production
ENV PORT=3000

# Used in WORKDIR
WORKDIR ${APP_DIR}

# Used in COPY
COPY . ${APP_DIR}/

# Used in RUN
RUN echo "Environment: ${NODE_ENV}"

# Used in EXPOSE
EXPOSE ${PORT}

# Used in CMD
CMD ["node", "server.js"]
```

Variable expansion supports default values and substitution:

```dockerfile
FROM alpine:3.19

ENV BASE_DIR=/opt

# ${variable:-default} - use default if variable is not set
RUN echo "${UNDEFINED_VAR:-fallback_value}"

# ${variable:+alternate} - use alternate if variable IS set
RUN echo "${BASE_DIR:+directory is set}"
```

## Setting Variables for Common Runtimes

### Node.js

```dockerfile
FROM node:20-alpine

ENV NODE_ENV=production
ENV NPM_CONFIG_LOGLEVEL=warn
ENV PORT=3000

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .

USER node
EXPOSE ${PORT}
CMD ["node", "server.js"]
```

### Python

```dockerfile
FROM python:3.12-slim

# Prevent Python from writing .pyc files
ENV PYTHONDONTWRITEBYTECODE=1
# Ensure output is sent directly to terminal without buffering
ENV PYTHONUNBUFFERED=1
# Set the module path
ENV PYTHONPATH=/app/src

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

CMD ["python", "-m", "myapp"]
```

### Java

```dockerfile
FROM eclipse-temurin:21-jre-alpine

ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseG1GC"
ENV APP_HOME=/app
ENV SPRING_PROFILES_ACTIVE=production

WORKDIR ${APP_HOME}
COPY target/myapp.jar app.jar

USER 1001
EXPOSE 8080
CMD ["sh", "-c", "java ${JAVA_OPTS} -jar app.jar"]
```

### Go

```dockerfile
FROM golang:1.22-alpine AS builder

ENV CGO_ENABLED=0
ENV GOOS=linux
ENV GOARCH=amd64

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -ldflags="-s -w" -o server .

FROM alpine:3.19
WORKDIR /app
COPY --from=builder /app/server .
USER 1001
CMD ["./server"]
```

## Overriding ENV at Runtime

ENV variables set in the Containerfile serve as defaults that can be overridden when running the container:

```dockerfile
FROM python:3.12-slim

ENV APP_ENV=production
ENV LOG_LEVEL=info
ENV DATABASE_HOST=localhost
ENV DATABASE_PORT=5432

WORKDIR /app
COPY . .
CMD ["python", "app.py"]
```

Override at runtime:

```bash
# Override a single variable
podman run -e LOG_LEVEL=debug myapp

# Override multiple variables
podman run \
    -e APP_ENV=staging \
    -e LOG_LEVEL=debug \
    -e DATABASE_HOST=db.staging.local \
    myapp

# Use an env file
podman run --env-file .env.staging myapp
```

The `.env.staging` file:

```plaintext
APP_ENV=staging
LOG_LEVEL=debug
DATABASE_HOST=db.staging.local
DATABASE_PORT=5432
```

## ENV vs ARG: Understanding the Differences

ENV and ARG serve different purposes and have different lifecycles:

```dockerfile
FROM python:3.12-slim

# ARG: Only available during build, not in the final image
ARG BUILD_DATE
ARG GIT_COMMIT

# ENV: Available during build AND at runtime
ENV APP_VERSION=1.0.0
ENV APP_ENV=production

# Pass ARG values to ENV if you need them at runtime
ENV BUILD_DATE=${BUILD_DATE}
ENV GIT_COMMIT=${GIT_COMMIT}

WORKDIR /app
COPY . .

# Both ARG and ENV work during build
RUN echo "Built on ${BUILD_DATE}, commit ${GIT_COMMIT}"

# Only ENV works at runtime
CMD ["python", "app.py"]
```

Build with build arguments:

```bash
podman build \
    --build-arg BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
    --build-arg GIT_COMMIT=$(git rev-parse --short HEAD) \
    -t myapp .
```

## Security Considerations

ENV variables are embedded in the image metadata and visible to anyone who can inspect the image. Never use ENV for secrets.

```dockerfile
# BAD: Secrets in ENV are visible in image history
ENV DATABASE_PASSWORD=super_secret_password
ENV API_KEY=sk-1234567890

# GOOD: Pass secrets at runtime only
# Don't set them in the Containerfile at all
```

```bash
# Pass secrets at runtime
podman run \
    -e DATABASE_PASSWORD="$(cat /path/to/secret)" \
    -e API_KEY="$(vault read -field=key secret/myapp)" \
    myapp

# Or use Podman secrets
echo "super_secret" | podman secret create db_password -
podman run --secret db_password myapp
```

If you need secrets during the build process, use build secrets instead of ENV:

```dockerfile
# Using build secrets (not stored in image layers)
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) \
    npm ci
```

```bash
podman build --secret id=npm_token,src=.npmrc -t myapp .
```

## ENV with PATH

A common use of ENV is extending the PATH variable:

```dockerfile
FROM ubuntu:24.04

# Add a custom binary directory to PATH
ENV PATH="/app/bin:${PATH}"

# Install a tool to a custom location
RUN mkdir -p /app/bin
COPY scripts/mytool /app/bin/
RUN chmod +x /app/bin/mytool

# mytool is now available without full path
RUN mytool --version

CMD ["mytool", "start"]
```

Multiple PATH additions:

```dockerfile
FROM python:3.12-slim

ENV PATH="/app/bin:/app/scripts:${PATH}"
ENV PYTHONPATH="/app/src:${PYTHONPATH}"

WORKDIR /app
COPY . .

CMD ["python", "-m", "myapp"]
```

## Layering and Cache Behavior

Each ENV instruction creates a new layer. Group related variables to minimize layers:

```dockerfile
# Creates 4 layers
ENV APP_NAME=myapp
ENV APP_VERSION=1.0.0
ENV APP_ENV=production
ENV APP_PORT=3000

# Creates 1 layer (preferred)
ENV APP_NAME=myapp \
    APP_VERSION=1.0.0 \
    APP_ENV=production \
    APP_PORT=3000
```

Changing an ENV value invalidates the cache for that layer and all subsequent layers. Place ENV instructions that change frequently (like version numbers) later in the Containerfile:

```dockerfile
FROM node:20-alpine

# Stable configuration (rarely changes, cached)
ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .

# Version might change on each build (place near the end)
ENV APP_VERSION=2.1.0

CMD ["node", "server.js"]
```

## Unsetting Environment Variables

If you need to unset an ENV variable for a specific command, do so in the RUN instruction:

```dockerfile
FROM node:20-alpine

ENV NODE_ENV=production

# Temporarily unset for dev dependency installation during build
RUN unset NODE_ENV && npm install

# NODE_ENV is still production for runtime
CMD ["node", "server.js"]
```

## Conclusion

The ENV instruction is the primary mechanism for configuring container behavior through environment variables. Use it to set sensible defaults for your application, configure runtime behavior, and define paths. Keep secrets out of ENV entirely, passing them at runtime through `podman run -e` or Podman secrets. Group related variables to minimize layers, place frequently changing values near the end of your Containerfile for cache efficiency, and remember that ENV values serve as overridable defaults. By following these practices, you create flexible, secure container images that are easy to configure across different environments.
