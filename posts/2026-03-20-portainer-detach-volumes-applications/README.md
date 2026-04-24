# How to Detach Volumes from Applications in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Volumes, Storage, DevOps

Description: Learn how to safely detach volumes from running and stopped applications in Portainer without losing data, using both the UI and API approaches.

## Introduction

Detaching a volume from an application in Docker is not a live operation like in virtual machine environments. Instead, you stop the container, recreate it without the volume binding, and the volume remains intact for future use or backup. Portainer simplifies this workflow through its UI and API.

## Prerequisites

- Portainer CE or BE installed
- Running containers with attached volumes
- Admin or operator access

## Understanding Volume Detachment in Docker

In Docker, volumes are attached to containers at creation time via mount definitions. You cannot detach a volume from a running container without recreating the container. The workflow is:

1. Stop the container
2. Remove the container (data in volume is preserved)
3. Recreate the container without the volume mount

## Step 1: Identify Which Volumes Are Attached

In Portainer:

1. Go to **Containers**.
2. Click on the container name.
3. Scroll to the **Volumes** section to see all mounts.

Or check from **Volumes** → click a volume → see which containers are using it.

## Step 2: Stop the Container

1. In Portainer, navigate to **Containers**.
2. Click the checkbox next to the target container.
3. Click **Stop** in the toolbar.

Or via the Portainer API:

```bash
# Stop container by ID

API_KEY="your_access_token"
CONTAINER_ID="abc123def456"
curl -s -X POST -H "X-API-Key: $API_KEY" \
  "https://portainer.example.com/api/endpoints/1/docker/containers/${CONTAINER_ID}/stop"
```

## Step 3: Inspect and Record the Container Configuration

Before removing the container, capture its current configuration so you can recreate it without the volume:

```bash
# Get container inspect to see current config
curl -s -H "X-API-Key: $API_KEY" \
  "https://portainer.example.com/api/endpoints/1/docker/containers/${CONTAINER_ID}/json" \
  | jq '{Image: .Config.Image, Env: .Config.Env, ExposedPorts: .Config.ExposedPorts, PortBindings: .HostConfig.PortBindings, Mounts: .Mounts}'
```

Note the volume mounts in the `Mounts` array. You will recreate the container omitting the volume you want to detach while preserving the settings you still need, such as `ExposedPorts`, environment variables, and port bindings.

## Step 4: Remove the Container

```bash
# Remove the stopped container (volume data is preserved)
curl -s -X DELETE -H "X-API-Key: $API_KEY" \
  "https://portainer.example.com/api/endpoints/1/docker/containers/${CONTAINER_ID}?force=false&v=false"
```

In the Portainer UI:
1. Select the stopped container.
2. Click **Remove**.
3. Ensure **Remove associated volumes** is **unchecked** to preserve data.

## Step 5: Recreate the Container Without the Volume

Via the Portainer UI:

1. Go to **Containers** → **Add container**.
2. Enter the same image, environment variables, and port mappings.
3. In the **Volumes** section, do NOT add the volume you want to detach.
4. Click **Deploy the container**.

Via the Portainer API:

```bash
# Create container without the previously attached volume
CREATE_RESPONSE=$(curl -s -X POST -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  "https://portainer.example.com/api/endpoints/1/docker/containers/create?name=myapp" \
  -d '{
    "Image": "myapp:latest",
    "Env": ["APP_ENV=production"],
    "ExposedPorts": {
      "3000/tcp": {}
    },
    "HostConfig": {
      "PortBindings": {
        "3000/tcp": [{"HostPort": "3000"}]
      }
    }
  }')

NEW_CONTAINER_ID=$(printf '%s' "$CREATE_RESPONSE" | jq -r '.Id')

# Start the new container
curl -s -X POST -H "X-API-Key: $API_KEY" \
  "https://portainer.example.com/api/endpoints/1/docker/containers/${NEW_CONTAINER_ID}/start"
```

In this example, the recreated container keeps its published port but omits any `Binds` or `Mounts` entry for the detached volume.

## Handling Docker Compose Stacks

For stacks deployed via Docker Compose in Portainer:

1. Go to **Stacks** → select your stack.
2. If the stack was deployed using the **Web Editor** or an uploaded compose file, click **Editor** to view/edit the compose file.
3. If the stack was deployed from Git, edit the compose file in the repository and redeploy the stack.
4. Remove the volume reference from the service definition.
5. Click **Update the stack**.

```yaml
# Before: service with volume attached
services:
  app:
    image: myapp:latest
    volumes:
      - app_data:/data  # Remove this line to detach

volumes:
  app_data:

# After: service without the volume
services:
  app:
    image: myapp:latest
    # No volumes section
```

## Verifying the Detachment

After recreating the container:

```bash
# Verify the detached volume is no longer attached to the new container
curl -s -H "X-API-Key: $API_KEY" \
  "https://portainer.example.com/api/endpoints/1/docker/containers/myapp/json" \
  | jq '.Mounts | map({Name, Source, Destination, Type})'
# Confirm the detached volume or mount path is no longer listed
```

## Conclusion

Detaching volumes from applications in Portainer requires stopping and recreating the container without the volume mount. The volume and its data remain intact for backup, migration, or reattachment to another container. Always record your container configuration before making changes, and use stack-based management for easier volume lifecycle control.
