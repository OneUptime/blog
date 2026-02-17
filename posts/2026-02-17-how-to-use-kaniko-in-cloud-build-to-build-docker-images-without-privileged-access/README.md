# How to Use Kaniko in Cloud Build to Build Docker Images Without Privileged Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Kaniko, Cloud Build, Docker, Security, Container, Artifact Registry

Description: Learn how to use Kaniko in Google Cloud Build to build Docker images without requiring a Docker daemon or privileged access to the host.

---

Building Docker images traditionally requires a Docker daemon running with root privileges. This is a security concern in shared CI/CD environments because a privileged container can potentially access the host system. In a multi-tenant environment like a shared Kubernetes cluster or a CI/CD platform, this creates real risk.

Kaniko solves this problem. It is a tool from Google that builds container images from a Dockerfile inside a container, without requiring a Docker daemon or any special privileges. It executes each Dockerfile command entirely in userspace, which makes it safe to run in environments where you cannot or should not grant root access.

Cloud Build uses Kaniko under the hood for some of its operations, but you can also use it explicitly for more control over the build process.

## Why Kaniko Instead of Docker Build

The standard way to build Docker images in Cloud Build is using `gcr.io/cloud-builders/docker`. This works fine for most cases, but there are scenarios where Kaniko is a better choice:

- When you need to build images inside a Kubernetes cluster (no Docker socket available)
- When security policies prohibit privileged containers
- When you want to build images in environments without Docker installed
- When you need better layer caching with remote cache support

## Basic Kaniko Build in Cloud Build

Here is the simplest way to use Kaniko in Cloud Build.

```yaml
# cloudbuild.yaml - Basic Kaniko build
steps:
  - name: 'gcr.io/kaniko-project/executor:latest'
    args:
      - '--dockerfile=Dockerfile'
      - '--context=.'
      - '--destination=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
```

That is it. One step. Kaniko reads the Dockerfile, builds the image, and pushes it to Artifact Registry. There is no separate push step because Kaniko pushes directly as part of the build process.

## A Sample Dockerfile

Let me use a practical example. Here is a Node.js application Dockerfile that we will build with Kaniko.

```dockerfile
# Dockerfile - Multi-stage build for a Node.js application
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for better layer caching
COPY package*.json ./
RUN npm ci --only=production

# Copy application source
COPY . .

# Build the application
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy only what we need from the builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Run as non-root user
USER node

EXPOSE 8080
CMD ["node", "dist/index.js"]
```

## Kaniko with Layer Caching

One of Kaniko's strengths is its support for remote layer caching. You can store intermediate layers in a registry and reuse them across builds. This speeds up subsequent builds significantly.

```yaml
# cloudbuild.yaml - Kaniko with remote layer caching
steps:
  - name: 'gcr.io/kaniko-project/executor:latest'
    args:
      - '--dockerfile=Dockerfile'
      - '--context=.'
      - '--destination=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
      - '--destination=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:latest'
      # Enable cache layers stored in Artifact Registry
      - '--cache=true'
      - '--cache-repo=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app/cache'
      # Cache TTL - keep cached layers for 72 hours
      - '--cache-ttl=72h'
```

The `--cache=true` flag tells Kaniko to check the cache repository for existing layers before building. If a layer already exists (same Dockerfile instruction and same parent layer), Kaniko reuses it instead of rebuilding. The cached layers are stored as images in the specified cache repository.

## Building Multiple Images

If your project has multiple services, each with its own Dockerfile, you can build them in parallel with Kaniko.

```yaml
# cloudbuild.yaml - Build multiple images in parallel with Kaniko
steps:
  # Build the API service
  - name: 'gcr.io/kaniko-project/executor:latest'
    id: 'build-api'
    args:
      - '--dockerfile=services/api/Dockerfile'
      - '--context=.'
      - '--destination=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/api:$SHORT_SHA'
      - '--cache=true'
      - '--cache-repo=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/api/cache'

  # Build the worker service (runs in parallel with api)
  - name: 'gcr.io/kaniko-project/executor:latest'
    id: 'build-worker'
    args:
      - '--dockerfile=services/worker/Dockerfile'
      - '--context=.'
      - '--destination=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/worker:$SHORT_SHA'
      - '--cache=true'
      - '--cache-repo=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/worker/cache'

  # Build the frontend (runs in parallel)
  - name: 'gcr.io/kaniko-project/executor:latest'
    id: 'build-frontend'
    args:
      - '--dockerfile=services/frontend/Dockerfile'
      - '--context=services/frontend'
      - '--destination=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/frontend:$SHORT_SHA'
      - '--cache=true'
      - '--cache-repo=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/frontend/cache'

options:
  # Allow concurrent execution
  pool: {}
```

## Build Arguments and Secrets

Kaniko supports Docker build arguments and can pull secrets from environment variables.

```yaml
# cloudbuild.yaml - Kaniko with build arguments
steps:
  - name: 'gcr.io/kaniko-project/executor:latest'
    args:
      - '--dockerfile=Dockerfile'
      - '--context=.'
      - '--destination=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
      # Pass build arguments
      - '--build-arg=NODE_ENV=production'
      - '--build-arg=APP_VERSION=$SHORT_SHA'
      # Use a specific target in a multi-stage build
      - '--target=production'
```

For secrets, you can use Cloud Build's secret management integration.

```yaml
# cloudbuild.yaml - Kaniko with secrets from Secret Manager
steps:
  - name: 'gcr.io/kaniko-project/executor:latest'
    args:
      - '--dockerfile=Dockerfile'
      - '--context=.'
      - '--destination=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
      - '--build-arg=NPM_TOKEN=$$NPM_TOKEN'
    secretEnv:
      - 'NPM_TOKEN'

availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/npm-token/versions/latest
      env: 'NPM_TOKEN'
```

## Using Kaniko in GKE

You can also run Kaniko directly in a GKE cluster, which is useful for build systems running on Kubernetes.

```yaml
# kaniko-build-job.yaml - Run Kaniko as a Kubernetes Job
apiVersion: batch/v1
kind: Job
metadata:
  name: kaniko-build
spec:
  template:
    spec:
      containers:
        - name: kaniko
          image: gcr.io/kaniko-project/executor:latest
          args:
            - "--dockerfile=Dockerfile"
            - "--context=gs://my-project-source/my-app.tar.gz"
            - "--destination=us-central1-docker.pkg.dev/my-project/my-repo/my-app:v1"
            - "--cache=true"
            - "--cache-repo=us-central1-docker.pkg.dev/my-project/my-repo/my-app/cache"
          # No privileged flag needed - Kaniko runs as a regular container
          volumeMounts:
            - name: kaniko-secret
              mountPath: /kaniko/.docker/
      volumes:
        - name: kaniko-secret
          secret:
            # Docker config for Artifact Registry auth
            secretName: docker-registry-credentials
      restartPolicy: Never
  backoffLimit: 3
```

Notice there is no `privileged: true` in the security context. This is the whole point of Kaniko. It runs as a regular unprivileged container and still builds Docker images.

## Kaniko vs Docker Build Performance

In my experience, Kaniko builds are slightly slower than native Docker builds for a single build. Docker has the advantage of a local layer cache stored on disk. However, Kaniko with remote caching catches up quickly in CI/CD scenarios where you do not have a persistent local cache.

Here is a rough comparison for a medium-sized Node.js application:

- Docker build (cold, no cache): ~90 seconds
- Docker build (warm, local cache): ~15 seconds
- Kaniko build (cold, no cache): ~100 seconds
- Kaniko build (warm, remote cache): ~25 seconds

The remote cache adds some network overhead, but it works across any build machine. You do not need sticky builds or persistent volumes.

## Reproducing Builds

Kaniko supports reproducible builds with the `--reproducible` flag.

```yaml
# cloudbuild.yaml - Reproducible Kaniko build
steps:
  - name: 'gcr.io/kaniko-project/executor:latest'
    args:
      - '--dockerfile=Dockerfile'
      - '--context=.'
      - '--destination=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
      - '--reproducible'       # Strip timestamps for reproducible builds
      - '--snapshot-mode=redo'  # More accurate file tracking
      - '--cache=true'
      - '--cache-repo=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app/cache'
```

The `--reproducible` flag strips file timestamps so that building the same source produces the same image digest. This is useful for supply chain security and build verification.

## Common Issues and Solutions

**Slow builds on first run**: The first Kaniko build is always the slowest because there is no cache. Enable `--cache=true` from the start so subsequent builds benefit.

**Permission errors with Artifact Registry**: Make sure the Cloud Build service account (or the Kubernetes service account) has `roles/artifactregistry.writer` permission.

**Context too large**: Kaniko uploads the entire build context. Use a `.dockerignore` file to exclude `node_modules`, `.git`, and other large directories you do not need in the build.

```text
# .dockerignore - Keep the build context small
.git
node_modules
*.md
.env*
```

## Wrapping Up

Kaniko gives you a way to build Docker images without the security implications of running a Docker daemon. In Cloud Build, it is a drop-in replacement for Docker builds with the added benefit of remote layer caching. Whether you are running builds in Cloud Build or directly in GKE, Kaniko lets you build images safely in any environment without privileged access.
