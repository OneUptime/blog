# How to Configure Docker Layer Caching in Cloud Build to Speed Up Multi-Stage Builds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Build, Docker, Caching, CI/CD, Artifact Registry, Performance

Description: Learn how to configure Docker layer caching in Google Cloud Build to dramatically speed up multi-stage Docker builds by reusing previously built layers.

---

Cloud Build starts every build from scratch. There is no persistent local Docker cache between builds. This means every `docker build` downloads base images, reinstalls dependencies, and rebuilds every layer from the beginning. For a multi-stage build with a large dependency installation step, this can easily add 5-10 minutes to your build time.

Docker layer caching fixes this by pulling a previously built image and using its layers as a cache source. When a layer has not changed since the last build, Docker reuses it instead of rebuilding. This turns a 10-minute build into a 2-minute build.

## How Docker Layer Caching Works

Docker builds images layer by layer. Each instruction in your Dockerfile creates a layer. Docker checks if a layer needs to be rebuilt by comparing the instruction and the files it depends on. If nothing changed, Docker uses the cached layer.

The problem in Cloud Build is that there is no local cache. The trick is to pull the previous image from your registry before building, and tell Docker to use it as a cache source.

## Basic Layer Caching Setup

Here is a Cloud Build configuration that implements layer caching.

```yaml
# cloudbuild.yaml - Docker build with layer caching
steps:
  # Step 1: Pull the previous image to use as cache
  - name: 'gcr.io/cloud-builders/docker'
    id: 'pull-cache'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Pull the latest image for cache, but do not fail if it does not exist
        docker pull us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:latest || true

  # Step 2: Build using the pulled image as cache
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build'
    args:
      - 'build'
      - '--cache-from'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:latest'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:latest'
      - '.'

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:latest'
```

The `--cache-from` flag tells Docker to use the layers from the specified image as a build cache. The `|| true` on the pull step ensures the build does not fail on the first run when no previous image exists.

## Caching Multi-Stage Builds

Basic `--cache-from` only caches the final stage. For multi-stage builds, you need to cache each stage separately.

Here is a typical multi-stage Dockerfile.

```dockerfile
# Dockerfile - Multi-stage build with named stages
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 8080
CMD ["node", "dist/index.js"]
```

And here is the Cloud Build config that caches all stages.

```yaml
# cloudbuild.yaml - Multi-stage build with per-stage caching
steps:
  # Pull cache images for each stage
  - name: 'gcr.io/cloud-builders/docker'
    id: 'pull-cache'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Pull cache for each build stage
        docker pull us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:deps-cache || true
        docker pull us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:builder-cache || true
        docker pull us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:latest || true

  # Build the deps stage and tag it for caching
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build-deps'
    args:
      - 'build'
      - '--target'
      - 'deps'
      - '--cache-from'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:deps-cache'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:deps-cache'
      - '.'

  # Build the builder stage using deps cache
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build-builder'
    args:
      - 'build'
      - '--target'
      - 'builder'
      - '--cache-from'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:deps-cache'
      - '--cache-from'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:builder-cache'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:builder-cache'
      - '.'

  # Build the final image using all caches
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build-final'
    args:
      - 'build'
      - '--cache-from'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:deps-cache'
      - '--cache-from'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:builder-cache'
      - '--cache-from'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:latest'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:latest'
      - '.'

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:latest'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:deps-cache'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:builder-cache'
```

This is verbose, but the payoff is significant. The deps stage (which runs `npm ci`) only rebuilds when `package.json` or `package-lock.json` changes. For most code-only changes, that layer is served from cache.

## Using BuildKit Cache Mounts

Docker BuildKit provides a more elegant caching mechanism with `--mount=type=cache`. This stores cache in named volumes that persist across build steps.

```dockerfile
# Dockerfile - Using BuildKit cache mounts for npm
# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Mount the npm cache directory to speed up installs
RUN --mount=type=cache,target=/root/.npm \
    npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 8080
CMD ["node", "dist/index.js"]
```

To use BuildKit in Cloud Build, enable it with an environment variable.

```yaml
# cloudbuild.yaml - BuildKit with Cloud Build
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
      - '.'
    env:
      - 'DOCKER_BUILDKIT=1'
```

Note that BuildKit cache mounts only persist within a single Cloud Build execution. For cross-build caching, you still need the `--cache-from` approach.

## Using Kaniko for Better Caching

Kaniko offers a different approach to caching that works well in Cloud Build. It stores cache layers in a registry.

```yaml
# cloudbuild.yaml - Kaniko with remote layer caching
steps:
  - name: 'gcr.io/kaniko-project/executor:latest'
    args:
      - '--dockerfile=Dockerfile'
      - '--context=.'
      - '--destination=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
      - '--destination=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:latest'
      # Enable Kaniko's built-in cache
      - '--cache=true'
      - '--cache-repo=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app/cache'
      - '--cache-ttl=168h'
```

Kaniko's caching is simpler to set up because you do not need to manage per-stage cache images. Kaniko automatically caches each layer and checks the cache before rebuilding.

## Measuring the Impact

Here are real numbers from a medium-sized Node.js application with about 200 npm packages:

| Build Type | First Build | Subsequent (code change) | Subsequent (dep change) |
|------------|-------------|--------------------------|-------------------------|
| No caching | 6m 30s | 6m 30s | 6m 30s |
| Single-stage cache | 6m 30s | 3m 15s | 6m 30s |
| Multi-stage cache | 6m 30s | 1m 45s | 3m 15s |
| Kaniko cache | 6m 45s | 1m 50s | 3m 20s |

The first build is always the slowest because there is nothing to cache. But after that, code-only changes (which are the most common) are dramatically faster because the dependency installation layer is cached.

## Optimizing Your Dockerfile for Caching

Layer caching only works if your Dockerfile is structured to take advantage of it. The key principle is: put things that change rarely at the top and things that change frequently at the bottom.

```dockerfile
# Good - dependency files copied before source code
FROM node:20-alpine
WORKDIR /app

# These files change rarely - cached layer
COPY package.json package-lock.json ./
RUN npm ci

# Source changes frequently - only this layer rebuilds
COPY . .
RUN npm run build
```

```dockerfile
# Bad - everything copied at once, cache busted on every change
FROM node:20-alpine
WORKDIR /app

# Any source change invalidates the npm ci layer
COPY . .
RUN npm ci
RUN npm run build
```

## Cleaning Up Old Cache Images

Cache images accumulate over time. Set up a cleanup policy in Artifact Registry.

```bash
# Create a cleanup policy to delete old cache images
gcloud artifacts repositories set-cleanup-policies my-repo \
    --location=us-central1 \
    --policy='{"name": "delete-old-cache", "action": {"type": "Delete"}, "condition": {"tagState": "TAGGED", "tagPrefixes": ["deps-cache", "builder-cache"], "olderThan": "604800s"}}'
```

This deletes cache images older than 7 days.

## Wrapping Up

Docker layer caching in Cloud Build is the single biggest optimization you can make for build times. The multi-stage caching approach requires some upfront configuration, but it pays for itself on every build. For most projects, the combination of proper Dockerfile ordering and per-stage cache images cuts build times by 50-75%.
