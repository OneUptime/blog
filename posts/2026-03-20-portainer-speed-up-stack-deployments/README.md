# How to Speed Up Stack Deployments in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Stack Deployment, Performance, Docker, Registry, Image Pull

Description: Learn how to speed up Portainer stack deployments by pre-pulling images, configuring local registries, and optimizing stack files.

---

Slow stack deployments in Portainer are often caused by registry checks and authentication delays before deployment starts, and image pulls add more time when images are not already cached on the Docker hosts. This guide covers pre-pulling images, configuring a local registry mirror, and structuring stacks for faster deployments.

## Why Deployments Are Slow

The main causes of slow deployments:

1. **Registry checks in Portainer** - Portainer verifies access to configured registries before deployment
2. **Registry authentication or network timeouts** - slow or failing auth checks delay the deployment
3. **Large images or cache misses** - pulling a 2 GB image takes minutes on a slow connection
4. **No local cache across hosts** - each Docker host or node needs its own cached copy of an image

## Solution 1: Pre-Pull Images Before Deployment

Pull images in advance so the Docker host can reuse already-downloaded images. Using fixed image tags instead of `latest` makes cache hits more predictable:

```bash
#!/bin/bash
# pre-pull-stack.sh docker-compose.yml

COMPOSE_FILE="${1:-docker-compose.yml}"

echo "Pre-pulling images from $COMPOSE_FILE..."
docker compose -f "$COMPOSE_FILE" pull

echo "All images pre-pulled. Deploy the stack in Portainer."
```

## Solution 2: Configure a Local Registry Mirror

A pull-through cache proxy eliminates repeat downloads. Deploy one via Portainer:

```yaml
services:
  registry-mirror:
    image: registry:3
    environment:
      REGISTRY_PROXY_REMOTEURL: https://registry-1.docker.io
      REGISTRY_STORAGE_DELETE_ENABLED: "true"
    volumes:
      - registry_cache:/var/lib/registry
    ports:
      - "5001:5000"

volumes:
  registry_cache:
```

Configure Docker on each host to use the mirror in `/etc/docker/daemon.json`:

```json
{
  "registry-mirrors": ["http://registry-mirror-host:5001"],
  "insecure-registries": ["registry-mirror-host:5001"]
}
```

Restart Docker after this change. For production, prefer TLS instead of an insecure registry. Subsequent pulls for cached images serve locally at LAN speed.

## Solution 3: Use a Local Private Registry

Host your own registry for custom images to avoid public internet pulls:

```yaml
services:
  registry:
    image: registry:3
    environment:
      REGISTRY_HTTP_SECRET: mysecret
    volumes:
      - registry_data:/var/lib/registry
    ports:
      - "5000:5000"

volumes:
  registry_data:
```

Push your images to the local registry:

```bash
docker tag my-app:1.0.0 registry.example.local:5000/my-app:1.0.0
docker push registry.example.local:5000/my-app:1.0.0
```

Update stacks to pull from the local registry:

```yaml
services:
  api:
    image: registry.example.local:5000/my-app:1.0.0
```

Use a registry hostname that is reachable from the Docker host or nodes Portainer manages. If the registry is plain HTTP, configure it as an insecure registry or use TLS.

## Solution 4: Multi-Stage Build Optimization

Reduce image sizes with multi-stage builds to minimize pull time:

```dockerfile
# Build stage - install production dependencies
FROM node:20-bookworm AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Runtime stage - smaller base image
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

A well-optimized multi-stage build can significantly reduce image size and cut pull time.

## Solution 5: Parallel Image Pulls

Pull all images simultaneously before deploying:

```bash
# Pull images in parallel with Docker Compose
docker compose --parallel 10 -f docker-compose.yml pull
echo "All pulls complete"
```

## Measuring Deployment Time

Benchmark your deployment to know which optimizations help most:

```bash
time docker compose -f docker-compose.yml up -d

# With pre-pulled images:
docker compose -f docker-compose.yml pull && time docker compose -f docker-compose.yml up -d
```

## Portainer Stack Deployment Timeout

If stack deployments are slow or appear to time out in Portainer, first check the registries configured for the environment. Portainer's documentation calls out registry access checks and authentication timeouts as common causes of slow stack deployments. Pre-pulling images can reduce download time, but it does not fix incorrect registry credentials or network connectivity issues.
