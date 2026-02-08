# How to Use Docker Compose with Pre-Built Images Only

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker Compose, Docker Images, Deployment, CI/CD, DevOps, Production

Description: Learn how to configure Docker Compose for production deployments that use only pre-built images with no local builds.

---

During development, Docker Compose typically builds images from local Dockerfiles. But in production, you want to deploy pre-built, tested images from a registry. Building images on production servers is slow, inconsistent, and risky. Your CI pipeline should build and test images once, push them to a registry, and production servers should only pull and run those verified images.

This guide shows you how to structure your Docker Compose setup for a clean separation between development (with builds) and production (pre-built images only).

## The Production Compose File

A production compose file uses only `image:` directives with no `build:` sections:

```yaml
# docker-compose.prod.yml - production, pre-built images only
version: "3.8"

services:
  web:
    image: registry.example.com/myapp/web:${VERSION}
    ports:
      - "80:8080"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://${DB_USER}:${DB_PASS}@db:5432/${DB_NAME}
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
    restart: unless-stopped

  api:
    image: registry.example.com/myapp/api:${VERSION}
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://${DB_USER}:${DB_PASS}@db:5432/${DB_NAME}
      REDIS_URL: redis://redis:6379
    restart: unless-stopped

  worker:
    image: registry.example.com/myapp/worker:${VERSION}
    environment:
      DATABASE_URL: postgres://${DB_USER}:${DB_PASS}@db:5432/${DB_NAME}
      REDIS_URL: redis://redis:6379
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASS}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
    restart: unless-stopped

volumes:
  pgdata:
  redisdata:
```

Every image is pinned to a specific version through the `${VERSION}` variable. No Dockerfiles are referenced. No source code is needed on the production server.

## Development vs Production Compose Files

Keep separate files for development and production. The development file includes build context:

```yaml
# docker-compose.yml - development with local builds
version: "3.8"

services:
  web:
    build:
      context: ./web
      dockerfile: Dockerfile
    ports:
      - "80:8080"
    volumes:
      - ./web/src:/app/src    # Hot reload in development
    environment:
      NODE_ENV: development

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    volumes:
      - ./api/src:/app/src
    environment:
      NODE_ENV: development

  worker:
    build:
      context: ./worker
      dockerfile: Dockerfile
    volumes:
      - ./worker/src:/app/src
```

Production uses only pre-built images. Deploy with the explicit file flag:

```bash
# Development
docker compose up

# Production - uses only the production compose file
docker compose -f docker-compose.prod.yml up -d
```

## Preventing Accidental Builds in Production

Add a safety check to your deployment script:

```bash
#!/bin/bash
# deploy.sh - safe production deployment

COMPOSE_FILE="docker-compose.prod.yml"

# Verify no 'build:' directives exist in the production file
if grep -q "build:" "$COMPOSE_FILE"; then
  echo "ERROR: Production compose file contains 'build:' directives"
  echo "Production deployments must use pre-built images only"
  exit 1
fi

# Verify VERSION is set
if [ -z "$VERSION" ]; then
  echo "ERROR: VERSION environment variable is required"
  echo "Usage: VERSION=1.2.3 ./deploy.sh"
  exit 1
fi

# Pull all images before stopping current services
echo "Pulling images for version ${VERSION}..."
docker compose -f "$COMPOSE_FILE" pull

# Deploy with zero-downtime rolling update
echo "Deploying version ${VERSION}..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# Verify all services are running
sleep 5
docker compose -f "$COMPOSE_FILE" ps
```

## Pinning Image Versions

Never use `latest` in production. Always pin to specific versions or digests:

```yaml
services:
  # Pin to a specific semantic version tag
  app:
    image: registry.example.com/myapp:2.1.0

  # Pin to a git SHA for exact reproducibility
  app:
    image: registry.example.com/myapp:abc123f

  # Pin to a digest for maximum security (immutable reference)
  app:
    image: registry.example.com/myapp@sha256:a1b2c3d4e5f6...
```

Digest pinning is the most secure because tags can be overwritten, but digests are immutable. Get the digest of an image:

```bash
# Get the digest of a specific image tag
docker inspect --format='{{index .RepoDigests 0}}' registry.example.com/myapp:2.1.0
```

## CI/CD Pipeline Integration

Your CI pipeline builds, tags, and pushes images. The production server only pulls:

```yaml
# .github/workflows/deploy.yml - GitHub Actions example
name: Build and Deploy

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Log in to registry
        run: echo "${{ secrets.REGISTRY_TOKEN }}" | docker login registry.example.com -u deploy --password-stdin

      - name: Build and push images
        run: |
          VERSION=${GITHUB_REF_NAME#v}
          docker build -t registry.example.com/myapp/web:${VERSION} ./web
          docker build -t registry.example.com/myapp/api:${VERSION} ./api
          docker build -t registry.example.com/myapp/worker:${VERSION} ./worker
          docker push registry.example.com/myapp/web:${VERSION}
          docker push registry.example.com/myapp/api:${VERSION}
          docker push registry.example.com/myapp/worker:${VERSION}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          VERSION=${GITHUB_REF_NAME#v}
          ssh deploy@prod-server "cd /opt/myapp && VERSION=${VERSION} docker compose -f docker-compose.prod.yml pull && VERSION=${VERSION} docker compose -f docker-compose.prod.yml up -d"
```

## Pull Policy Configuration

Control when Docker Compose pulls images using the `pull_policy` option:

```yaml
services:
  app:
    image: registry.example.com/myapp:${VERSION}
    pull_policy: always    # Always pull, even if image exists locally

  db:
    image: postgres:16-alpine
    pull_policy: missing   # Only pull if not available locally

  monitoring:
    image: prom/prometheus:latest
    pull_policy: always    # Always pull latest to get updates
```

For production, use `pull_policy: always` on your application images to ensure you get the exact version from the registry. Use `missing` for stable infrastructure images like databases.

You can also pull all images explicitly before starting:

```bash
# Pull all images defined in the compose file
docker compose -f docker-compose.prod.yml pull

# Pull a specific service's image
docker compose -f docker-compose.prod.yml pull api
```

## Private Registry Authentication

If your images are in a private registry, authenticate before pulling:

```bash
# Log in to a private registry
docker login registry.example.com -u deploy -p "${REGISTRY_TOKEN}"

# Now docker compose pull will work with private images
docker compose -f docker-compose.prod.yml pull
```

For automated deployments, use credential helpers or store the auth in Docker's config:

```bash
# Store credentials persistently (encrypted on disk)
docker login registry.example.com

# Credentials are saved in ~/.docker/config.json
# The compose pull command will use them automatically
```

## Multi-Architecture Images

When deploying to mixed architectures (amd64 and arm64 servers), make sure your CI builds multi-arch images:

```bash
# Build multi-arch images in CI
docker buildx build --platform linux/amd64,linux/arm64 \
  -t registry.example.com/myapp:${VERSION} \
  --push ./app
```

The production compose file does not need any changes. Docker automatically pulls the correct architecture.

## Rollback Strategy

With pre-built images, rollback is just deploying the previous version:

```bash
# Deploy current version
VERSION=2.1.0 docker compose -f docker-compose.prod.yml up -d

# Something is broken - rollback to previous version
VERSION=2.0.9 docker compose -f docker-compose.prod.yml up -d
```

Keep a deployment log so you know which versions have been deployed:

```bash
#!/bin/bash
# Record each deployment
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) ${VERSION} deployed by $(whoami)" >> /opt/myapp/deploy.log
```

## Health Checks for Pre-Built Images

Always include health checks so you know when services are ready:

```yaml
services:
  api:
    image: registry.example.com/myapp/api:${VERSION}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
    restart: unless-stopped
```

After deployment, verify health:

```bash
# Check health status of all services
docker compose -f docker-compose.prod.yml ps

# Wait for all services to be healthy
docker compose -f docker-compose.prod.yml up -d --wait
```

## Summary

Using pre-built images in production makes deployments faster, more reliable, and reproducible. Build once in CI, push to a registry, and deploy by pulling the exact tagged image. Keep your development compose file with `build:` directives and your production file with only `image:` directives. Pin versions explicitly, set `pull_policy: always` for application images, and keep your rollback path simple by redeploying the previous version tag.
