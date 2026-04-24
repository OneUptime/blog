# How to Recreate a Container with Updated Settings in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Operation, DevOps

Description: Learn how to recreate a Docker container in Portainer to apply configuration changes or update to a new image version without losing your setup.

## Introduction

When you need to change a container's configuration - environment variables, port mappings, volume mounts, labels, or image version - Docker generally requires creating a new container. Portainer's **Duplicate/Edit** workflow makes this straightforward. This guide explains how to safely recreate containers with updated settings.

## Prerequisites

- Portainer installed with a connected Docker environment
- A running container to recreate

## Why Recreate Is Needed

Unlike virtual machines, you cannot modify many Docker container settings after the container is created. To apply changes such as:

- Environment variables → Recreate
- Port mappings → Recreate
- Volume mounts → Recreate
- Image version → Recreate
- Labels → Recreate

Some things can be changed without recreation:
- Restart policy via `docker update`
- Certain resource limits via `docker update`
- Run exec commands inside the container
- Modify files in the container's writable layer (non-persistent)

## Method 1: Edit and Recreate (Portainer's Built-in Flow)

### Step 1: Open Container Settings

1. Navigate to **Containers** in Portainer.
2. Click on the container name.
3. Click **Duplicate/Edit** button.

### Step 2: Modify the Settings

The form opens pre-filled with current settings. Change whatever needs updating:

```text
Original image:  myorg/myapp:v2.0.0
Updated image:   myorg/myapp:v2.1.0

Original env:    LOG_LEVEL=info
Updated env:     LOG_LEVEL=warn

Original port:   8080 → 80
Updated port:    8080 → 80 (unchanged)
```

### Step 3: Deploy the Updated Container

Scroll to the bottom and click **Deploy the container**.

Important: Editing a container creates a NEW container with the updated settings. When Portainer prompts you, click **Replace** to swap it in for the existing container.

If you want to keep both containers instead of replacing the old one, give the new container a different name before deploying. Docker cannot keep two containers with the same name.

## Method 2: Pull New Image and Recreate (Image Update)

For image version updates:

1. Navigate to **Images**.
2. Pull the new image version.
3. Navigate to **Containers**.
4. Click the container name.
5. Click **Duplicate/Edit**.
6. Update the image tag.
7. Click **Deploy the container**.
8. Click **Replace** when prompted.

Or use Portainer's image update indicator to check whether a newer image is available:

1. In the container list, look for the image update indicator.
2. Click it to recheck that container's image status if needed.
3. If an update is available, pull the image and redeploy the container with **Duplicate/Edit** and **Replace**.

## Method 3: Blue-Green Deployment (Zero Downtime)

For production containers, avoid downtime with a blue-green approach:

```bash
#!/bin/bash
# blue-green-deploy.sh

# Deploys new version with zero downtime using Portainer API

PORTAINER_URL="${PORTAINER_URL}"
API_KEY="${PORTAINER_API_KEY}"
ENDPOINT_ID="${PORTAINER_ENDPOINT_ID:-1}"

# Create new "green" container with updated image
GREEN_ID=$(curl -fsS -X POST \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/create?name=web-app-green" \
  -d '{
    "Image": "myorg/myapp:v2.1.0",
    "ExposedPorts": {"8080/tcp": {}},
    "HostConfig": {
      "PortBindings": {"8080/tcp": [{"HostPort": "8081"}]},
      "RestartPolicy": {"Name": "unless-stopped"}
    }
  }' | jq -r '.Id')

# Start green container
curl -fsS -X POST \
  -H "X-API-Key: ${API_KEY}" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${GREEN_ID}/start"

# Test it on port 8081
# Switch load balancer to green
# Stop blue container (old version on port 8080)
# Remove blue container
```

## Method 4: Docker Compose Stack Redeploy

For containers managed as Portainer stacks, updating is simpler. If the stack was deployed from the Web editor, you can edit it directly in Portainer:

1. Navigate to **Stacks**.
2. Click the stack name.
3. Click **Editor** to view/edit the compose file.
4. Update the image tag or configuration.
5. Click **Update the stack**.

If the stack was deployed from a Git repository, update the compose file in the repository and then pull/redeploy the stack from Portainer instead of editing it directly in the UI.

```yaml
# Updated stack - change the image version
services:
  web:
    image: myorg/webapp:v2.1.0  # Changed from v2.0.0
    restart: unless-stopped
    environment:
      - LOG_LEVEL=warn  # Changed from info
    ports:
      - "8080:80"
```

Portainer will redeploy the stack and recreate containers whose configuration changed, preserving mounted volumes.

## Step 5: Handling Named Volumes During Recreation

Named volumes persist through container recreation:

```yaml
services:
  app:
    image: myorg/app:v2.1.0
    volumes:
      # Named volume - data persists through recreation
      - app_data:/app/data
      # Bind mount - always points to host path
      - /etc/app/config:/app/config:ro

volumes:
  app_data:  # Data here survives container removal/recreation
```

This means you can safely recreate the container - your data in named volumes is untouched.

## Step 6: Verify After Recreation

After recreating:

1. Check the container is **Running** in Portainer.
2. Verify the new settings took effect:

```bash
# Verify image version:
docker inspect my-container | jq '.[].Config.Image'

# Verify environment variables:
docker exec my-container env | grep LOG_LEVEL

# Verify the app is working:
curl http://localhost:8080/health
```

## Best Practices

- **Test recreations in staging first** - validate the new settings work before production.
- **Keep volume names the same** when recreating - data persists automatically.
- **Use Portainer stacks** for multi-container applications - stack updates handle recreation automatically.
- **Document configuration changes** - add comments in compose files.
- **Automate recreations** via Portainer webhooks for CI/CD pipelines when using Portainer Business Edition.

## Conclusion

Recreating containers in Portainer is the correct approach for applying configuration changes and image updates. The key is to ensure named volumes preserve your data across recreations. For multi-container applications, use Portainer Stacks for a cleaner update workflow, and for production environments, consider blue-green deployments to minimize downtime during updates.
