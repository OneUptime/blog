# How to Deploy Applications to Low-Bandwidth Edge Sites with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Edge Computing, Portainer, Low Bandwidth, IoT, Docker, Optimization, Remote Sites

Description: Optimize Portainer Edge deployments for sites with slow or unreliable network connections by minimizing image transfer sizes, using local registries, and configuring offline operation.

---

Edge sites in remote locations often have limited bandwidth - satellite links, cellular connections, or metered internet. Deploying containers to these sites requires careful attention to image sizes, transfer strategies, and offline operation capabilities.

## Challenges at Low-Bandwidth Sites

- Large Docker images can take hours to pull over slow links
- Network interruptions can corrupt in-progress pulls
- Portainer connectivity to edge agents may be intermittent
- Image updates need to be staged and scheduled

## Strategy 1: Use Minimal Base Images

Choose the smallest viable base image for your containers:

```dockerfile
# Instead of full Ubuntu (~28MB compressed, ~77MB on disk):

FROM ubuntu:22.04

# Use Alpine (~3.4MB compressed):
FROM alpine:3.19

# Or distroless for runtime-only (smaller, more secure):
FROM gcr.io/distroless/static-debian12

# For Go applications - single binary, no runtime needed:
FROM scratch
COPY myapp /myapp
ENTRYPOINT ["/myapp"]
```

## Strategy 2: Deploy a Local Registry at the Edge Site

Run a Docker Registry mirror at the edge site so images are only pulled from the internet once:

```yaml
# local-registry-stack.yml
version: "3.8"

services:
  registry:
    image: registry:2.8
    environment:
      - REGISTRY_PROXY_REMOTEURL=https://registry-1.docker.io
      - REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY=/var/lib/registry
    volumes:
      - registry-data:/var/lib/registry
    ports:
      - "5000:5000"
    restart: unless-stopped

volumes:
  registry-data:
```

Configure Docker on edge nodes to use the local registry mirror:

```json
// /etc/docker/daemon.json on edge nodes
{
  "registry-mirrors": ["http://localhost:5000"]
}
```

## Strategy 3: Schedule Updates During Off-Hours

Use Portainer Edge Jobs to trigger image pulls at night when bandwidth is less critical:

1. Go to **Edge Jobs > Add Edge Job**
2. Set a cron schedule: `0 2 * * *` (2:00 AM daily)
3. Script content:

```bash
#!/bin/bash
# Pull updated images during low-traffic hours
# This runs on the edge device via Portainer Edge Job

docker pull myregistry/app:latest
docker pull myregistry/collector:latest

# Prune unused images to free disk space
docker image prune -f
```

## Strategy 4: Use Image Layer Caching

Structure your Dockerfiles to maximize layer reuse:

```dockerfile
# Good: Dependencies in a separate layer (cached when only app code changes)
FROM node:20-alpine

WORKDIR /app

# Copy dependency files first - these change rarely
COPY package*.json ./
RUN npm ci --omit=dev

# Copy app code last - this changes frequently but reuses the npm layer
COPY src/ ./src/

CMD ["node", "src/index.js"]
```

## Strategy 5: Configure Portainer Edge Agent Polling

Reduce Edge Agent check-in frequency for sites with very limited bandwidth:

In **Environments > Edge Environment > Settings**, set:

- **Check-in interval**: 120 seconds (default is 5 seconds)
- This reduces from ~17,000 pings/day to ~720 pings/day

## Strategy 6: Delta Updates with Watchtower

Deploy Watchtower alongside your applications to handle incremental updates:

```yaml
services:
  watchtower:
    image: containrrr/watchtower:1.7.1
    environment:
      # Check for updates once per day at 3 AM
      - WATCHTOWER_SCHEDULE=0 0 3 * * *
      # Only update containers with the watch label
      - WATCHTOWER_LABEL_ENABLE=true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    restart: unless-stopped
```

Label your application containers:

```yaml
services:
  myapp:
    image: myregistry/myapp:latest
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
```

## Offline Operation

Configure your application stacks with `restart: always` so containers automatically restart after power cycles or Docker daemon restarts, without needing to contact the Portainer server:

```yaml
services:
  data-collector:
    image: myregistry/collector:1.2.3  # Pin to exact version - no pull needed
    restart: always                     # Restart even if Portainer is unreachable
```

## Summary

Low-bandwidth edge deployments require a deliberate approach to image management and update scheduling. With local registries, minimal images, and off-hours scheduling via Portainer Edge Jobs, you can maintain reliable deployments even over slow satellite or cellular links.
