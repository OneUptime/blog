# How to Fix Cloud Build Step Timeout Exceeded Error for Long-Running Docker Builds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Build, Docker, CI/CD, Google Cloud

Description: Fix Cloud Build step timeout errors when Docker builds take longer than the default timeout and learn how to optimize build times.

---

You push your code, Cloud Build kicks off, and partway through a Docker build step it fails with "Step exceeded timeout." The default step timeout in Cloud Build is 10 minutes, and the default build timeout is 60 minutes. For large Docker images with complex dependency installations, model training, or compilation steps, these defaults are not enough. This post covers how to increase timeouts and, more importantly, how to speed up your builds so you do not need long timeouts.

## Understanding Cloud Build Timeouts

Cloud Build has two levels of timeouts:

1. Build timeout: The maximum time for the entire build (all steps combined). Default is 60 minutes, maximum is 24 hours.
2. Step timeout: The maximum time for a single step. Default is not explicitly set (inherits from build timeout).

When you see "Step exceeded timeout," it means a single step ran longer than the allowed time.

## Step 1: Increase the Build Timeout

Update your `cloudbuild.yaml` to set a longer build timeout:

```yaml
# cloudbuild.yaml with extended timeout
timeout: '3600s'  # 1 hour total build timeout

steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-image:$COMMIT_SHA', '.']
    timeout: '2400s'  # 40 minutes for this step
```

Or set it via the gcloud command:

```bash
# Submit a build with a custom timeout
gcloud builds submit . \
    --tag=us-central1-docker.pkg.dev/your-project/your-repo/your-image:latest \
    --timeout=3600s
```

The timeout value is in seconds (with an `s` suffix) or in duration format like `1h30m`.

## Step 2: Use a Larger Build Machine

The default Cloud Build machine (`e2-medium`, 1 vCPU, 4 GB RAM) is often the bottleneck. Upgrading to a larger machine speeds up builds significantly, especially for compilation-heavy projects:

```yaml
# Use a high-CPU build machine
options:
  machineType: 'E2_HIGHCPU_32'  # 32 vCPUs, 32 GB RAM
  diskSizeGb: 200

timeout: '3600s'

steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-image:$COMMIT_SHA', '.']
```

Available machine types:
- `E2_MEDIUM` (default): 1 vCPU, 4 GB RAM
- `E2_HIGHCPU_8`: 8 vCPUs, 8 GB RAM
- `E2_HIGHCPU_32`: 32 vCPUs, 32 GB RAM
- `N1_HIGHCPU_32`: 32 vCPUs (for private pools)

The cost is higher, but the build time reduction usually makes it worthwhile.

## Step 3: Optimize Your Dockerfile Layer Caching

Docker builds can be slow because they rebuild layers unnecessarily. Order your Dockerfile so that frequently-changing layers are at the bottom:

```dockerfile
# Good: Dependencies first (rarely change), code second (frequently changes)
FROM python:3.11-slim

# Install system dependencies - this layer is cached when deps don't change
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies separately from code
COPY requirements.txt /app/
WORKDIR /app
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code last - only this layer rebuilds on code changes
COPY . /app/
```

Compare with the bad approach:

```dockerfile
# Bad: Copying everything first invalidates all subsequent layers on any change
FROM python:3.11-slim
COPY . /app/
WORKDIR /app
RUN apt-get update && apt-get install -y build-essential libpq-dev
RUN pip install --no-cache-dir -r requirements.txt
```

## Step 4: Enable Docker Layer Caching with Kaniko

Cloud Build does not persist Docker layer cache between builds by default. Use Kaniko to cache layers in Artifact Registry:

```yaml
# Use Kaniko for cached Docker builds
steps:
  - name: 'gcr.io/kaniko-project/executor:latest'
    args:
      - '--destination=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-image:$COMMIT_SHA'
      - '--cache=true'
      - '--cache-ttl=168h'  # Cache layers for 7 days
      - '--cache-repo=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-image/cache'
    timeout: '1800s'

timeout: '3600s'
```

Kaniko stores cached layers in a separate path in your container registry. Subsequent builds pull these cached layers instead of rebuilding them, which can reduce build times from 30 minutes to 5 minutes for dependency-heavy images.

## Step 5: Use Multi-Stage Builds

Multi-stage builds reduce both build time and final image size by separating the build environment from the runtime environment:

```dockerfile
# Stage 1: Build stage with all build tools
FROM golang:1.21 AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download  # Download dependencies (cached if go.mod unchanged)
COPY . .
RUN CGO_ENABLED=0 go build -o /app/server ./cmd/server

# Stage 2: Minimal runtime image
FROM gcr.io/distroless/static-debian12
COPY --from=builder /app/server /server
ENTRYPOINT ["/server"]
```

The build stage has all the compilation tools and dependencies, but they do not end up in the final image. This makes the push step faster because the image is smaller.

## Step 6: Parallelize Independent Build Steps

If your build has independent steps (like building multiple services), run them in parallel using `waitFor`:

```yaml
# Parallel build steps
steps:
  # These two steps run in parallel because they both wait for nothing
  - id: 'build-frontend'
    name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'frontend:$COMMIT_SHA', '-f', 'frontend/Dockerfile', 'frontend/']
    waitFor: ['-']  # Start immediately

  - id: 'build-backend'
    name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'backend:$COMMIT_SHA', '-f', 'backend/Dockerfile', 'backend/']
    waitFor: ['-']  # Start immediately

  # This step waits for both builds to finish
  - id: 'push-images'
    name: 'gcr.io/cloud-builders/docker'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        docker push frontend:$COMMIT_SHA
        docker push backend:$COMMIT_SHA
    waitFor: ['build-frontend', 'build-backend']

timeout: '3600s'
```

## Step 7: Use .dockerignore to Reduce Build Context

A large build context (files sent to Docker before building) slows down the build significantly. Create a `.dockerignore` file:

```
# .dockerignore - exclude files not needed in the Docker image
.git
node_modules
__pycache__
*.pyc
.env
.venv
tests/
docs/
*.md
.pytest_cache
.mypy_cache
coverage/
```

Check the build context size:

```bash
# Check what Docker would include in the build context
du -sh --exclude=.git .
```

If the context is several GB, a `.dockerignore` can make a dramatic difference in build start time.

## Step 8: Pre-Build Base Images

If multiple pipelines use the same base image with common dependencies, pre-build it and reference it:

```dockerfile
# Pre-built base image with common dependencies
# Build this separately and update weekly
FROM python:3.11-slim AS base
RUN apt-get update && apt-get install -y \
    build-essential libpq-dev libffi-dev \
    && rm -rf /var/lib/apt/lists/*
RUN pip install numpy pandas scipy scikit-learn

# Application Dockerfile references the pre-built base
FROM us-central1-docker.pkg.dev/my-project/my-repo/base-image:latest
COPY requirements-app.txt /app/
RUN pip install -r /app/requirements-app.txt
COPY . /app/
```

This way, the slow dependency installation happens once (when updating the base image) instead of on every build.

## Timeout Configuration Summary

```yaml
# Complete cloudbuild.yaml with optimized settings
options:
  machineType: 'E2_HIGHCPU_8'
  diskSizeGb: 100
  logging: CLOUD_LOGGING_ONLY

timeout: '7200s'  # 2 hours max for the whole build

steps:
  - name: 'gcr.io/kaniko-project/executor:latest'
    args:
      - '--destination=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-image:$COMMIT_SHA'
      - '--destination=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-image:latest'
      - '--cache=true'
      - '--cache-ttl=168h'
      - '--cache-repo=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-image/cache'
      - '--snapshotMode=redo'
    timeout: '3600s'  # 1 hour for the Docker build step
```

## Monitoring Build Performance

Use [OneUptime](https://oneuptime.com) to track Cloud Build execution times and failure rates. Setting up alerts on build duration trends helps you catch regressions early - before a build that used to take 5 minutes creeps up to 30 minutes and starts hitting timeouts.

The goal is to get your builds fast enough that timeouts are not an issue. Invest in proper caching, layer ordering, and machine sizing, and you will rarely need to think about timeout limits.
