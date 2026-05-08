# How to Target a Specific Build Stage with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Build, Multi-Stage, Target

Description: Learn how to target specific build stages in Podman multi-stage builds using the --target flag for development, testing, and production workflows.

---

> Targeting build stages lets you use a single Containerfile for development, testing, and production by stopping at the right stage.

In multi-stage builds, you do not always want to build through to the final stage. During development, you might want an image with debug tools. For testing, you need an image with test frameworks. The `--target` flag in `podman build` lets you stop at any named stage, producing an image from that point. This guide covers all practical uses of build stage targeting.

---

## The --target Flag

The `--target` flag tells Podman to stop building at a specific named stage and use that stage as the final image.

```bash
# Syntax

podman build --target STAGE_NAME -t image:tag .
```

## Setting Up Named Stages

Name your stages with the `AS` keyword in the FROM instruction.

```bash
cat > Containerfile << 'EOF'
# Stage: base
FROM docker.io/library/node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# Stage: deps
FROM base AS deps
RUN npm ci

# Stage: dev
FROM deps AS dev
RUN npm install -g nodemon
COPY . .
CMD ["nodemon", "src/index.js"]

# Stage: test
FROM deps AS test
RUN npm install -g jest
COPY . .
CMD ["jest", "--coverage"]

# Stage: build
FROM deps AS build
COPY . .
RUN npm run build

# Stage: production
FROM docker.io/library/node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
EOF
```

## Building Different Targets

Build each stage independently depending on your needs.

```bash
# Build the development image (stops at dev stage)
podman build --target dev -t myapp:dev .

# Build the test image (stops at test stage)
podman build --target test -t myapp:test .

# Build the production image (builds through all stages to production)
podman build --target production -t myapp:prod .

# Build without --target (defaults to the last stage, which is production)
podman build -t myapp:latest .
```

## Development Workflow

Use the dev target for local development with hot reloading.

```bash
# Build the development image
podman build --target dev -t myapp:dev .

# Run with volume mount for live code changes
podman run -d \
  --name myapp-dev \
  -p 3000:3000 \
  -v ./src:/app/src:Z \
  myapp:dev

# Check logs to confirm hot reload is working
podman logs -f myapp-dev
```

## Testing Workflow

Use the test target in CI/CD pipelines.

```bash
# Build the test image
podman build --target test -t myapp:test .

# Run tests
podman run --rm myapp:test

# Run tests with specific options
podman run --rm myapp:test jest --verbose --testPathPatterns="unit"

# Run tests and extract coverage report
podman run --rm -v ./coverage:/app/coverage:Z myapp:test jest --coverage
```

## Go Application with Debug and Release Targets

```bash
cat > Containerfile << 'EOF'
# Stage: builder - compiles the application
FROM docker.io/library/golang:1.22 AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .

# Stage: debug - includes debug symbols and tools
FROM builder AS debug
RUN CGO_ENABLED=0 go build -gcflags="all=-N -l" -o /app .
FROM docker.io/library/alpine:latest AS debug-runtime
RUN apk add --no-cache bash curl
COPY --from=debug /app /usr/local/bin/app
CMD ["app"]

# Stage: release - optimized binary, minimal image
FROM builder AS release-build
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /app .
FROM gcr.io/distroless/static:nonroot AS release
COPY --from=release-build /app /usr/local/bin/app
CMD ["app"]
EOF

# Build for debugging
podman build --target debug-runtime -t myapp:debug .

# Build for production release
podman build --target release -t myapp:release .

# Compare sizes
podman images | grep myapp
```

## Python Application with Lint, Test, and Production Targets

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/python:3.12-slim AS base
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM base AS lint
RUN pip install --no-cache-dir flake8 black mypy
COPY . .
CMD ["sh", "-c", "flake8 . && black --check . && mypy ."]

FROM base AS test
RUN pip install --no-cache-dir pytest pytest-cov
COPY . .
CMD ["pytest", "--cov=app", "-v"]

FROM base AS production
COPY . .
RUN useradd -m appuser
USER appuser
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "app:create_app()"]
EOF

# Run linting
podman build --target lint -t myapp:lint .
podman run --rm myapp:lint

# Run tests
podman build --target test -t myapp:test .
podman run --rm myapp:test

# Build production
podman build --target production -t myapp:prod .
```

## CI/CD Pipeline Integration

Use targets in your CI/CD pipeline to build, test, and deploy from the same Containerfile.

```bash
#!/bin/bash
# ci-pipeline.sh

set -e

IMAGE_NAME="myapp"
COMMIT_SHA=$(git rev-parse --short HEAD)

echo "=== Step 1: Lint ==="
podman build --target lint -t "${IMAGE_NAME}:lint" .
podman run --rm "${IMAGE_NAME}:lint"

echo "=== Step 2: Test ==="
podman build --target test -t "${IMAGE_NAME}:test" .
podman run --rm "${IMAGE_NAME}:test"

echo "=== Step 3: Build Production ==="
podman build --target production -t "${IMAGE_NAME}:${COMMIT_SHA}" .
podman tag "${IMAGE_NAME}:${COMMIT_SHA}" "${IMAGE_NAME}:latest"

echo "=== Pipeline Complete ==="
podman images | grep "${IMAGE_NAME}"
```

## Caching Benefits

Targeting stages takes advantage of layer caching. Stages that are not needed for your target are skipped entirely.

```bash
# Only builds base and deps stages, skips build and production
podman build --target dev -t myapp:dev .

# Later, building production reuses cached base and deps layers
podman build --target production -t myapp:prod .
```

## Summary

The `--target` flag is essential for getting maximum value from multi-stage Containerfiles. A single Containerfile can serve development, testing, linting, and production by targeting different stages. This keeps your build pipeline consistent and your images appropriately sized for each context. Name your stages clearly, organize them logically, and integrate stage targeting into your CI/CD pipeline for clean, efficient builds.
