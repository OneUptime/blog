# How to Force Pull Latest Images When Updating Stacks in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Stack, Image, DevOps

Description: Learn how to force Portainer to pull the latest version of Docker images when updating stacks, ensuring mutable tags like latest always use fresh images.

## Introduction

Docker caches images locally to speed up deployments, and stack redeploys can continue using the image digest that was already resolved for an unchanged tag. This is especially noticeable with mutable tags like `latest`, `main`, or `stable`. Without explicitly re-pulling the image, a stack update can leave the old image running even when the upstream tag now points to a newer digest. Portainer's **Re-pull image** option and CLI techniques solve this problem.

## Prerequisites

- Portainer with an existing deployed stack
- Understanding of Docker image tag mutability

## Why Force Pull Is Needed

```bash
Scenario:
1. You build and push myorg/api:latest to Docker Hub
2. Docker host already has myorg/api:latest cached
3. Stack update runs without a re-pull
4. The stack keeps using the previously resolved image digest

Fix: Re-pull makes Docker or Swarm check the registry again
     for the tag's current digest before redeploying
```

## Step 1: Force Pull During Stack Update (Portainer UI)

When manually redeploying an existing stack:

1. Navigate to **Stacks** → click the stack name.
2. Choose **Pull and redeploy** or open the stack update action.
3. Enable **Re-pull image** (or **Re-pull image and redeploy**, depending on the screen).
4. Confirm the redeploy or update.

Portainer will check the registry for the current digest of each tagged image before redeploying the stack.

## Step 2: Force Pull with Git-Based Stacks

For Git-based stacks with automatic updates:

1. Navigate to **Stacks** → click the stack name.
2. In the **Automatic updates** section.
3. Enable **Re-pull image**.
4. This applies whenever an update is triggered by polling or webhook.

## Step 3: Force Pull via CLI

```bash
# Pull the latest image manually:

docker pull myorg/api:latest

# For Compose stacks:
docker compose pull --policy always
docker compose up -d

# For a specific service only:
docker compose pull --policy always api
docker compose up -d api

# For Swarm services:
docker service update --image myorg/api:latest my-stack_api
# Swarm resolves the tag to its current digest and rolls the service if it changed
```

## Step 4: Use Image Digests for Certainty

For production, use immutable image digests instead of mutable tags:

```yaml
# Mutable tag - might not get re-pulled:
services:
  api:
    image: myorg/api:latest

# Immutable digest - always points to exact image:
services:
  api:
    image: myorg/api@sha256:abc123def456789...
```

Get the digest after building:

```bash
# After docker push:
docker image inspect myorg/api:latest --format '{{index .RepoDigests 0}}'
# myorg/api@sha256:abc123def456789...

# Use this digest in docker-compose.yml to pin the exact image
```

## Step 5: Update Image Tags via CI/CD

The best practice for production is to update the image tag in the Compose file (or environment variable) on each deployment:

```yaml
# docker-compose.yml - uses IMAGE_TAG variable:
services:
  api:
    image: myorg/api:${IMAGE_TAG:-latest}
```

In your CI/CD pipeline (GitHub Actions example for a Git-based stack):

```yaml
- name: Deploy new image version
  env:
    PORTAINER_URL: ${{ secrets.PORTAINER_URL }}
    PORTAINER_TOKEN: ${{ secrets.PORTAINER_TOKEN }}
    STACK_ID: ${{ secrets.STACK_ID }}
  run: |
    # Redeploy the Git-based stack with an updated IMAGE_TAG env var:
    curl -X PUT \
      "${PORTAINER_URL}/api/stacks/${STACK_ID}/git/redeploy" \
      -H "X-API-Key: ${PORTAINER_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{
        \"Env\": [
          {\"name\": \"IMAGE_TAG\", \"value\": \"${{ github.sha }}\"}
        ],
        \"Prune\": false,
        \"RepullImageAndRedeploy\": true
      }"
```

## Step 6: Verify the Image Was Updated

After a force pull update, confirm the new image is running:

```bash
# Check the image ID of the running container:
docker inspect my-stack_api_1 --format '{{.Image}}'
# sha256:abc123... (the local image ID in use)

# Compare with the locally tagged image:
docker image inspect myorg/api:latest --format '{{.Id}}'

# Check the pulled repo digest:
docker image inspect myorg/api:latest --format '{{index .RepoDigests 0}}'

# View recent image layers:
docker history myorg/api:latest | head -3
```

## Step 7: Automate Forced Updates with Watchtower

For automatic image updates without manual intervention:

```yaml
# docker-compose.yml - add Watchtower to auto-update other containers
services:
  watchtower:
    image: containrrr/watchtower:latest
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 300 --cleanup   # Check every 5 minutes, remove old images
```

Note: Watchtower is powerful but can cause unexpected restarts in production. Use with caution and prefer explicit image tag updates via CI/CD for production services.

## Conclusion

Force pulling images in Portainer helps ensure mutable tags like `latest` deploy the newest version of your application. Use **Pull and redeploy** with **Re-pull image** for manual redeploys and enable **Re-pull image** for automatic Git-based updates. For production environments, the most reliable approach is to use specific image tags (version numbers or commit SHAs) that change with each build, making the image version explicit in your Compose file and eliminating reliance on mutable tags.
