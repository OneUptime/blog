# How to Create a Docker Build Pipeline with Earthly

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Earthly, CI/CD, Build Pipeline, DevOps, Containers

Description: Learn how to create reproducible Docker build pipelines using Earthly for consistent builds across local and CI environments.

---

Building Docker images in CI/CD pipelines often leads to frustration. Builds work on your machine but break in CI. Caching behaves differently across environments. Multi-stage builds get complicated fast. Earthly solves these problems by combining the best parts of Dockerfiles and Makefiles into a single, reproducible build system.

This guide walks you through setting up a Docker build pipeline with Earthly from scratch, including multi-stage builds, caching strategies, and CI integration.

## What is Earthly?

Earthly is an open-source build automation tool that runs every build in containers. Think of it as a hybrid between Docker and Make. You write build targets in an `Earthfile`, and Earthly executes them in isolated containers. The result is builds that behave identically whether you run them on your laptop or in GitHub Actions.

The key advantages over raw Dockerfiles include better caching, the ability to define reusable build targets, and built-in support for multi-platform builds.

## Installing Earthly

On macOS, install Earthly through Homebrew.

```bash
# Install Earthly CLI on macOS
brew install earthly/earthly/earthly

# Bootstrap Earthly (pulls the buildkit daemon image)
earthly bootstrap
```

On Linux, use the official install script.

```bash
# Download and install Earthly on Linux
sudo /bin/sh -c 'wget https://github.com/earthly/earthly/releases/latest/download/earthly-linux-amd64 -O /usr/local/bin/earthly && chmod +x /usr/local/bin/earthly'

# Bootstrap the buildkit daemon
earthly bootstrap
```

Verify the installation works correctly.

```bash
# Check Earthly version
earthly --version
```

## Writing Your First Earthfile

Create a file named `Earthfile` in your project root. Let's build a Node.js application as an example.

```dockerfile
# Earthfile - defines all build targets for the project
VERSION 0.8

# Base target sets up the common foundation for all other targets
base:
    FROM node:20-alpine
    WORKDIR /app
    COPY package.json package-lock.json ./
    RUN npm ci

# Build target compiles the application
build:
    FROM +base
    COPY src/ ./src/
    COPY tsconfig.json ./
    RUN npm run build
    # Save the build output as an artifact for other targets
    SAVE ARTIFACT dist /dist

# Test target runs the test suite
test:
    FROM +base
    COPY src/ ./src/
    COPY tsconfig.json ./
    COPY tests/ ./tests/
    RUN npm run test

# Docker target produces the final container image
docker:
    FROM node:20-alpine
    WORKDIR /app
    COPY package.json package-lock.json ./
    RUN npm ci --production
    # Pull in the compiled output from the build target
    COPY +build/dist ./dist
    EXPOSE 3000
    CMD ["node", "dist/index.js"]
    # Save the image with the specified tag
    SAVE IMAGE --push myapp:latest
```

Run individual targets from the command line.

```bash
# Run the build target
earthly +build

# Run tests
earthly +test

# Build the Docker image
earthly +docker
```

## Setting Up a Multi-Stage Pipeline

A real pipeline needs more than just build and test. Let's create a comprehensive pipeline with linting, security scanning, and multi-platform support.

```dockerfile
VERSION 0.8

# Shared base image with all dependencies
base:
    FROM node:20-alpine
    WORKDIR /app
    COPY package.json package-lock.json ./
    RUN npm ci

# Lint target checks code quality
lint:
    FROM +base
    COPY .eslintrc.json ./
    COPY src/ ./src/
    RUN npm run lint

# Security audit checks for vulnerable dependencies
audit:
    FROM +base
    RUN npm audit --audit-level=moderate

# Unit tests with coverage reporting
test:
    FROM +base
    COPY src/ ./src/
    COPY tests/ ./tests/
    COPY tsconfig.json jest.config.js ./
    RUN npm run test -- --coverage
    # Export coverage report as an artifact
    SAVE ARTIFACT coverage /coverage

# Build the production bundle
build:
    FROM +base
    COPY src/ ./src/
    COPY tsconfig.json ./
    RUN npm run build
    SAVE ARTIFACT dist /dist

# Integration tests run after the build succeeds
integration-test:
    FROM +base
    COPY +build/dist ./dist
    COPY tests/integration/ ./tests/integration/
    # Start a test database container using Earthly's WITH DOCKER
    WITH DOCKER --pull postgres:16-alpine
        RUN docker run -d --name testdb -e POSTGRES_PASSWORD=test postgres:16-alpine && \
            sleep 3 && \
            npm run test:integration
    END

# Final Docker image for deployment
docker:
    FROM node:20-alpine
    WORKDIR /app
    COPY package.json package-lock.json ./
    RUN npm ci --production && npm cache clean --force
    COPY +build/dist ./dist
    EXPOSE 3000
    HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/health || exit 1
    CMD ["node", "dist/index.js"]
    SAVE IMAGE --push myapp:latest

# Run all checks in the correct order
all:
    BUILD +lint
    BUILD +audit
    BUILD +test
    BUILD +build
    BUILD +integration-test
    BUILD +docker
```

Run the entire pipeline with a single command.

```bash
# Execute the full pipeline
earthly +all
```

## Caching for Faster Builds

Earthly has built-in caching, but you can optimize it further with explicit cache mounts and shared caches.

```dockerfile
VERSION 0.8

base:
    FROM node:20-alpine
    WORKDIR /app
    COPY package.json package-lock.json ./
    # Use a cache mount for npm to avoid re-downloading packages
    RUN --mount=type=cache,target=/root/.npm \
        npm ci

build:
    FROM +base
    COPY src/ ./src/
    COPY tsconfig.json ./
    # Cache the TypeScript compilation output between builds
    RUN --mount=type=cache,target=/app/.tsbuildinfo \
        npm run build
    SAVE ARTIFACT dist /dist
```

For CI environments, enable remote caching so builds across different runners share cache layers.

```bash
# Enable remote caching with an OCI registry
earthly --ci --remote-cache=registry.example.com/myapp/cache +all
```

## Multi-Platform Builds

Earthly makes cross-platform builds straightforward. Build images for both amd64 and arm64 architectures.

```dockerfile
VERSION 0.8

# Multi-platform Docker image target
docker-multiplatform:
    FROM --platform=$TARGETPLATFORM node:20-alpine
    WORKDIR /app
    COPY package.json package-lock.json ./
    RUN npm ci --production
    COPY +build/dist ./dist
    EXPOSE 3000
    CMD ["node", "dist/index.js"]
    # Build and push for both architectures
    SAVE IMAGE --push myapp:latest

# Trigger builds for both platforms
all-platforms:
    BUILD --platform=linux/amd64 --platform=linux/arm64 +docker-multiplatform
```

```bash
# Build for multiple platforms
earthly +all-platforms
```

## Integrating with GitHub Actions

Create a workflow file that runs your Earthly pipeline in CI.

```yaml
# .github/workflows/build.yml - CI pipeline using Earthly
name: Build Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Earthly
        uses: earthly/actions-setup@v1
        with:
          version: v0.8.0

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      # Run the full pipeline with remote caching enabled
      - name: Run Earthly Pipeline
        run: earthly --ci --remote-cache=registry.example.com/cache +all
```

## Passing Arguments and Secrets

Earthly supports build arguments and secrets, which you need for things like private registries or API keys.

```dockerfile
VERSION 0.8

# Define build arguments with defaults
ARG --global APP_VERSION=dev
ARG --global REGISTRY=docker.io/myorg

docker:
    FROM node:20-alpine
    WORKDIR /app
    COPY +build/dist ./dist
    LABEL version=$APP_VERSION
    SAVE IMAGE --push ${REGISTRY}/myapp:${APP_VERSION}
```

```bash
# Pass arguments when running the build
earthly --build-arg APP_VERSION=1.2.3 --build-arg REGISTRY=ghcr.io/myorg +docker

# Pass secrets securely (never baked into the image)
earthly --secret NPM_TOKEN=your-token-here +build
```

## Debugging Failed Builds

When a build fails, Earthly gives you tools to investigate.

```bash
# Run with verbose output to see each step
earthly --verbose +build

# Drop into an interactive shell at the point of failure
earthly --interactive +build

# Output detailed build logs to a file
earthly --logstream +build 2>&1 | tee build.log
```

## Best Practices

Keep your Earthfiles maintainable by following these guidelines. First, break large pipelines into separate Earthfiles per component. Use `FROM ../component+target` syntax to reference targets across directories. Second, always pin your base image versions. Third, put frequently changing layers at the bottom of each target so caching stays effective. Fourth, use `SAVE ARTIFACT` to pass data between targets instead of mounting volumes.

Earthly gives you the reproducibility of containers with the flexibility of a proper build system. Once your pipeline is defined in an Earthfile, every developer on the team gets identical builds without needing to understand the CI system.

For monitoring your Docker containers after deployment, consider setting up proper observability with tools that track container health, resource usage, and application performance.
