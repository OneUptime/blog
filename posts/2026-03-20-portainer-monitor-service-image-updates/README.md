# How to Monitor Service Image Updates in Portainer on Swarm - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Image, Update, DevOps

Description: Learn how to use Portainer to monitor Docker image updates for Swarm services and automate or trigger image refreshes.

## Introduction

Keeping service images up to date is an ongoing operational concern in Docker Swarm. Portainer provides visibility into which services are running outdated images and tools to update them. This guide covers monitoring image staleness and strategies for keeping your Swarm services current.

## Prerequisites

- Portainer CE or BE on Docker Swarm
- Running Swarm services
- Access to Docker Hub or a private registry from Portainer

## Step 1: Check Current Image Versions

From the Services list, the **Image** column shows the current image and tag for each service:

```text
Service         Image                  Replicas
web-frontend    nginx:alpine           3/3
api-backend     myapp:v2.1             4/4
database        postgres:15-alpine     1/1
```

To see the exact image reference Swarm has pinned for the service (including the digest), use the CLI:

```bash
# CLI: Check exact image digest in use

docker service inspect web-frontend --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}'
# Output: nginx:alpine@sha256:abc123...
```

## Step 2: Enable the Image Up-to-date Indicator (Portainer BE)

Portainer Business Edition can show whether a service image is up to date:

1. Open your Swarm environment
2. Go to **Swarm → Setup**
3. Enable **Show an image(s) up to date indicator for Stacks, Services and Containers**
4. Return to **Services** and use the **Images up to date** column
5. Click **Reload image indicators** to recheck all services, or click a single service's indicator to recheck just that service

## Step 3: Manual Image Update Check

To check if an image has updates:

```bash
# Pull the latest version of the image
docker pull nginx:alpine

# Inspect the digest that the tag currently resolves to locally
docker inspect nginx:alpine --format '{{index .RepoDigests 0}}'
# If the digest differs from what's in the service, an update is available

# Check what the service is running
docker service inspect web-frontend --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}'
```

## Step 4: Update a Service to the Latest Image

### Via Portainer UI

1. Click on the service
2. Click **Edit this service**
3. Leave the same tag if you want to stay on that tag, or change it to a new tag
4. If you want Portainer to resolve the tag again, enable **Pull latest image**
5. Click **Update the service**

A rolling restart alone does not change the image digest already pinned in the service spec.

### Via CLI

```bash
# Re-resolve the current tag and update if it now points to a new digest
docker service update --image nginx:alpine web-frontend

# Update to a specific new tag
docker service update --image nginx:1.25-alpine web-frontend

# Rolling restart without changing the pinned image digest
docker service update --force web-frontend
```

## Step 5: Automate Image Refreshes with Portainer Service Webhooks

For Swarm services, Portainer service webhooks let you trigger a redeploy from Docker Hub or your CI/CD system:

1. Open the service in Portainer
2. Toggle **Service webhook** on
3. Copy the generated webhook URL
4. Configure Docker Hub or your pipeline to send a `POST` request to that URL

```bash
# Redeploy using the current tag
curl -X POST "https://portainer.example.com:9443/api/webhooks/<webhook-id>"

# Redeploy and switch the service to a different tag
curl -X POST "https://portainer.example.com:9443/api/webhooks/<webhook-id>?tag=1.25-alpine"
```

## Step 6: Use Image Tags vs Digests

### Using Tags (Flexible)

```yaml
services:
  web:
    image: nginx:alpine    # Mutable tag; may resolve to a new digest over time
```

Tags like `latest` or `alpine` float - they can point to new image digests.

### Using Digests (Immutable)

```yaml
services:
  web:
    image: nginx:alpine@sha256:abc123def456...  # Always this exact image
```

Using digests ensures reproducibility but requires explicit updates.

### Release Tags (Safer Than Floating Tags)

```yaml
services:
  web:
    image: nginx:1.25-alpine     # Specific minor line; may move when the publisher updates this tag
  api:
    image: myapp:v2.1.3          # Specific release tag by convention, but still mutable unless the registry enforces immutability
```

These are usually steadier than `latest`, but only digests are guaranteed immutable.

## Step 7: Image Update Policy for Production

Implement a structured update process:

```bash
#!/bin/bash
# update-service-images.sh
# Run monthly to refresh tag-based production services

declare -A IMAGES=(
    [web-frontend]=nginx:alpine
    [api-backend]=myapp:v2.1
)
LOG_FILE="/var/log/image-updates.log"

for svc in "${!IMAGES[@]}"; do
    echo "$(date): Checking $svc" >> "$LOG_FILE"

    # Get current image
    CURRENT=$(docker service inspect "$svc" --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}')

    # Re-resolve the configured tag to the registry's current digest
    docker service update --image "${IMAGES[$svc]}" "$svc" >/dev/null

    # Get new image
    NEW=$(docker service inspect "$svc" --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}')

    if [ "$CURRENT" != "$NEW" ]; then
        echo "$(date): $svc updated: $CURRENT -> $NEW" >> "$LOG_FILE"
    else
        echo "$(date): $svc unchanged" >> "$LOG_FILE"
    fi
done
```

## Conclusion

Monitoring and managing image updates for Swarm services is an important part of cluster maintenance. Portainer gives you visibility into current image versions, and service webhooks or explicit service updates let you refresh Swarm services in a controlled way. For production systems, implement a structured update policy that balances keeping images current with the stability needed for reliable operations.
