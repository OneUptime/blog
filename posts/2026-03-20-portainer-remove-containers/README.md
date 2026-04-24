# How to Remove Containers in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Cleanup, DevOps

Description: Learn how to remove stopped and running Docker containers in Portainer, including bulk removal and cleaning up orphaned containers.

## Introduction

Stopped containers accumulate over time, consuming disk space (for their writable layer) and cluttering your container list. Portainer provides simple remove controls for individual and bulk container deletion. This guide covers how to safely remove containers and recover the disk space.

## Prerequisites

- Portainer installed with a connected Docker environment

## Understanding What Removing a Container Does

When you remove a container:
- The container's writable filesystem layer is deleted.
- The container's metadata (name, configuration) is removed.
- **Named volumes are NOT removed** by default (data is preserved).
- **Anonymous volumes** may be removed with the container (using `-v` flag).
- The image itself is NOT removed.

## Step 1: Remove a Stopped Container

1. Navigate to **Containers** in Portainer.
2. Ensure the container is stopped (stopped containers show "Exited").
3. Click the **Remove** button (trash icon) next to the container.
4. Confirm the removal in the dialog.

```bash
# Equivalent Docker CLI:

docker rm my-container
```

## Step 2: Remove a Running Container

Running containers should be stopped before removal in Portainer:

1. In Portainer, open the container you want to remove.
2. Click **Stop** and wait for the container to exit.
3. Click **Remove**.
4. Confirm the removal.

```bash
# Docker CLI force remove:
docker rm --force my-running-container
```

`docker rm --force` sends `SIGKILL` to the container's main process and then removes it. If you want a graceful shutdown, stop the container first and then remove it.

## Step 3: Remove Multiple Containers at Once

1. Navigate to **Containers**.
2. Check the checkboxes next to containers to remove.
3. Click **Remove**.
4. Confirm the bulk removal.

## Step 4: Remove a Container and Its Anonymous Volumes

By default, anonymous volumes are NOT removed with the container. To remove them:

```bash
# Remove container and its anonymous volumes:
docker rm --volumes my-container
```

In Portainer's remove dialog, choose to automatically remove **non-persistent volumes**.

Note: Named volumes (created with `docker volume create` or named volumes in compose files) are never automatically removed. Manage them separately in **Volumes**.

## Step 5: Bulk Cleanup with Docker Prune

Remove all stopped containers at once:

```bash
# Remove all stopped containers:
docker container prune

# Remove all stopped containers (no confirmation prompt):
docker container prune --force

# Remove containers stopped more than 24 hours ago:
docker container prune --filter "until=24h"
```

Run this directly on the Docker host (for example over SSH) or schedule it as a cron job.

## Step 6: Clean Up After a Stack Removal

When you remove a Portainer stack:
- The stack is removed from the selected environment.
- Named volumes used by the stack are NOT removed automatically.

If you no longer need the stack's data after removing the stack:
1. Navigate to **Volumes**.
2. Locate the now-unused volume.
3. Click **Remove**.
4. Confirm the deletion.

## Preventing Accidental Removal

For critical containers, Portainer Business Edition's RBAC (Role-Based Access Control) can restrict who can remove containers.

For development environments, use container labels to mark containers as "protected":

```bash
# Label a container as protected
docker run -d \
  --name critical-db \
  --label "com.example.protected=true" \
  postgres:15

# You can use this label in scripts to avoid accidental removal:
# Only remove containers without the protected label
docker ps -aq --filter "status=exited" | while read id; do
  if ! docker inspect "$id" | jq -e '.[].Config.Labels["com.example.protected"] == "true"' > /dev/null; then
    docker rm "$id"
  fi
done
```

## Step 7: Automated Cleanup Workflow

Schedule periodic cleanup to prevent container buildup:

```bash
#!/bin/bash
# container-cleanup.sh
# Run daily via cron: 0 3 * * * /opt/scripts/container-cleanup.sh

echo "=== Container Cleanup: $(date) ==="

# Remove containers that exited more than 1 day ago
REMOVED=$(docker container prune --filter "until=24h" --force)
echo "Pruned containers: ${REMOVED}"

# List remaining stopped containers:
STOPPED_COUNT=$(docker ps -aq --filter status=exited | wc -l)
echo "Remaining stopped containers: ${STOPPED_COUNT}"

echo "=== Cleanup complete ==="
```

## Removing Containers via Portainer API

For automation, remove containers via the API:

```bash
# Remove a specific container via Portainer API
PORTAINER_URL="https://portainer:9443"
API_KEY="your-api-key"
ENDPOINT_ID=1
CONTAINER_ID="abc123def456"

curl -X DELETE \
  -H "X-API-Key: ${API_KEY}" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${CONTAINER_ID}?force=1"
```

## Troubleshooting Removal Issues

```bash
# Error: "cannot remove a running container"
# Fix: stop first or use force remove
docker stop my-container && docker rm my-container
# Or:
docker rm --force my-container

# Error: "container has an active endpoint"
# Fix: disconnect from network first
docker network disconnect my-network my-container
docker rm my-container

# Error: "device or resource busy" (volume still mounted)
# Fix: ensure no other process is using the volume
lsof | grep /var/lib/docker/volumes/myvolume
```

## Conclusion

Removing containers in Portainer keeps your environment clean and recovers disk space from accumulated stopped containers. The key points to remember: named volumes are preserved by default when removing containers, `docker rm --force` kills and removes a running container, and regular pruning via Docker CLI prevents container sprawl. For critical containers, use Portainer Business Edition RBAC or labels in your own automation to prevent accidental deletion.
