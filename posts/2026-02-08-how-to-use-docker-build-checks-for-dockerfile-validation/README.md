# How to Use Docker Build Checks for Dockerfile Validation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Dockerfile, Build Checks, Validation, BuildKit, DevOps, Best Practices

Description: Learn how to use Docker's built-in build checks to validate Dockerfiles and catch common mistakes before building images.

---

Docker introduced build checks as a native way to validate Dockerfiles without needing external tools. Built directly into Docker Build and BuildKit, these checks analyze your Dockerfile for common mistakes, best practice violations, and potential issues before the actual build starts. Think of them as a first line of defense that catches problems early in your workflow.

Build checks complement tools like Hadolint by integrating directly into the Docker build process. You do not need to install anything extra if you already have a recent version of Docker.

## Requirements

Docker build checks require Docker Engine 27.0 or later, or Docker Desktop 4.33 or later. They rely on BuildKit, which has been the default builder since Docker 23.0.

Verify your Docker version supports build checks:

```bash
# Check your Docker version
docker version

# Verify BuildKit is the active builder
docker buildx version

# Build checks are available when you see BuildKit v0.15.0 or later
docker buildx inspect --bootstrap | grep -i version
```

## Running Build Checks

The simplest way to run build checks is with the `docker build --check` flag. This validates the Dockerfile without actually building the image.

Run a build check against a Dockerfile:

```bash
# Run build checks without building the image
docker build --check .

# Run checks on a specific Dockerfile
docker build --check -f Dockerfile.prod .
```

If there are no issues, the command exits silently with a zero exit code. When problems are found, you get detailed output describing each issue.

## Understanding Check Output

Let's create a Dockerfile with some issues and see what the checks report.

A Dockerfile with common problems:

```dockerfile
# test.Dockerfile - Contains issues for demonstration
FROM ubuntu:22.04

RUN apt-get update
RUN apt-get install -y python3 curl wget

COPY . .

RUN cd /app && python3 setup.py install

ENTRYPOINT python3 /app/main.py
```

Run the check:

```bash
# Check this Dockerfile
docker build --check -f test.Dockerfile .
```

The output shows each issue with its location, severity, and a description:

```
WARNING: LegacyKeyValueFormat - "Legacy key/value format with whitespace separator should not be used"
WARNING: SecretsUsedInArgOrEnv - "Do not use ARG or ENV instructions for sensitive data"
WARNING: JSONArgsRecommended - "JSON arguments recommended for ENTRYPOINT to prevent unintended behavior"
```

Each check has a unique identifier that you can reference when configuring which checks to enforce or ignore.

## Available Built-in Checks

Docker build checks cover several categories of issues. Here are the most important ones you will encounter.

### Instruction Format Checks

These validate the syntax and format of Dockerfile instructions:

```dockerfile
# JSONArgsRecommended - Use JSON format for CMD and ENTRYPOINT
# Bad: shell form
ENTRYPOINT python3 app.py
# Good: exec form (JSON array)
ENTRYPOINT ["python3", "app.py"]

# DuplicateStageName - Each stage must have a unique name
# Bad: duplicate names
FROM node:20 AS build
FROM node:20 AS build
# Good: unique names
FROM node:20 AS builder
FROM node:20 AS runner
```

### Security Checks

These catch potential security issues:

```dockerfile
# SecretsUsedInArgOrEnv - Don't put secrets in ARG or ENV
# Bad: secret exposed in image layers
ARG DB_PASSWORD=mysecret
ENV API_KEY=abc123
# Good: use build secrets instead
RUN --mount=type=secret,id=db_pass cat /run/secrets/db_pass

# RedundantUser - Avoid setting USER to root explicitly
# Bad: unnecessary root user declaration
USER root
# Good: only set USER when switching to a non-root user
USER appuser
```

### Best Practice Checks

These enforce Dockerfile best practices:

```dockerfile
# StageNameCasing - Stage names should be lowercase
# Bad: uppercase stage name
FROM node:20 AS Builder
# Good: lowercase stage name
FROM node:20 AS builder

# FromPlatformFlagConstDisallowed - Dynamic platform flags
# Potentially problematic:
FROM --platform=linux/amd64 ubuntu:22.04
# Better: use build args for platform
FROM --platform=$BUILDPLATFORM ubuntu:22.04
```

## Configuring Build Checks

You can configure which checks are active using a `check` directive in your Dockerfile or through a `docker-bake.hcl` file.

Add check configuration directly in your Dockerfile:

```dockerfile
# syntax=docker/dockerfile:1

# Configure build checks inline
# check=skip=SecretsUsedInArgOrEnv;error=true

FROM python:3.12-slim

ARG BUILD_ENV=production

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

CMD ["python", "app.py"]
```

The `check` directive supports several options:

```dockerfile
# Skip specific checks
# check=skip=JSONArgsRecommended,SecretsUsedInArgOrEnv

# Treat all warnings as errors (fails the build)
# check=error=true

# Combine skip and error settings
# check=skip=LegacyKeyValueFormat;error=true
```

## Integrating Build Checks in CI/CD

Build checks work well as a CI pipeline step because they are fast and do not require building the full image.

GitHub Actions example:

```yaml
# .github/workflows/docker-check.yml
name: Docker Build Checks

on:
  pull_request:
    paths:
      - "Dockerfile*"
      - "docker/**"

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Run Docker build checks
        run: docker build --check .

      - name: Run checks on staging Dockerfile
        run: docker build --check -f Dockerfile.staging .
```

GitLab CI example:

```yaml
# .gitlab-ci.yml
docker-check:
  stage: validate
  image: docker:27
  services:
    - docker:27-dind
  script:
    - docker build --check .
  rules:
    - changes:
        - Dockerfile
```

## Build Checks vs Hadolint

Docker build checks and Hadolint overlap in some areas but serve different purposes.

Docker build checks are built into the Docker build process, require no additional installation, and focus on issues that BuildKit can detect during Dockerfile parsing. They understand build stages, build arguments, and multi-platform contexts natively.

Hadolint is an external tool with a broader rule set. It catches more stylistic issues, integrates ShellCheck for shell command analysis, and has more granular configuration options. Hadolint runs independently of Docker and can lint Dockerfiles even on machines without Docker installed.

The best approach is to use both. Run Docker build checks as part of your build process and Hadolint in your linting pipeline:

```bash
# Run both checks in sequence
hadolint Dockerfile && docker build --check .
```

## Build Checks with Docker Compose

When using Docker Compose, you can run build checks on all services that have build configurations.

Run checks for Compose services:

```bash
# Check all services with build configurations
docker compose build --check

# Check a specific service
docker compose build --check api
```

Your docker-compose.yml might look like this:

```yaml
# docker-compose.yml
services:
  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    ports:
      - "3000:3000"

  worker:
    build:
      context: ./worker
      dockerfile: Dockerfile
    depends_on:
      - api
```

Running `docker compose build --check` validates both the `api` and `worker` Dockerfiles.

## Fixing Common Issues

Let's walk through fixing the most common issues that build checks flag.

Start with a Dockerfile that triggers several checks:

```dockerfile
# Before: multiple issues
FROM node AS build
COPY . /app
WORKDIR /app
RUN npm install
ENTRYPOINT npm start
```

Apply the fixes one by one:

```dockerfile
# After: all checks pass
# syntax=docker/dockerfile:1

# Pin the base image tag, use lowercase stage name
FROM node:20-slim AS build

WORKDIR /app

# Copy dependency manifest first for layer caching
COPY package.json package-lock.json ./
RUN npm ci --production

COPY . .

# Use JSON/exec form for ENTRYPOINT
ENTRYPOINT ["npm", "start"]
```

Each change addresses a specific build check:
- Pinning `node:20-slim` resolves version pinning checks
- Lowercase `build` stage name satisfies casing checks
- JSON form `ENTRYPOINT` resolves the JSONArgsRecommended check
- Adding the syntax directive enables the latest check features

## Automating Checks with Make

Add build checks to a Makefile for easy execution:

```makefile
# Makefile - Docker build check targets

.PHONY: check build lint

# Run build checks only (fast, no image built)
check:
	docker build --check .

# Run hadolint and build checks together
lint: check
	hadolint Dockerfile

# Build with checks enabled
build: check
	docker build -t myapp:latest .

# Check all Dockerfiles in the project
check-all:
	find . -name "Dockerfile*" -exec docker build --check -f {} . \;
```

Run the checks:

```bash
# Quick validation
make check

# Full linting
make lint

# Build with pre-build validation
make build
```

## Summary

Docker build checks provide a zero-installation way to validate Dockerfiles as part of your build workflow. Use `docker build --check` to catch issues before spending time on a full build. Configure which checks matter to your project using the inline `check` directive. Combine build checks with Hadolint for comprehensive coverage, and add both to your CI pipeline for automated enforcement. The few seconds these checks take to run will save you from debugging avoidable issues in production.
