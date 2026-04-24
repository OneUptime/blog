# How to Remove Persistent Volumes in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Volumes, Storage, DevOps

Description: Learn how to safely remove persistent volumes in Portainer, including how to identify unused volumes and clean up storage without losing critical data.

## Introduction

Docker volumes persist data beyond the lifecycle of individual containers. When volumes are no longer needed, they continue to consume disk space. Portainer makes it straightforward to identify and remove these volumes, but it is important to do so carefully to avoid accidental data loss.

## Prerequisites

- Portainer CE or BE installed
- Docker environment connected to Portainer
- Admin access to Portainer

## Understanding Volume Lifecycle

A Docker volume can be in one of two states:
- **In use**: Attached to one or more running or stopped containers
- **Dangling (unused)**: Not attached to any container

Portainer will only let you remove volumes that are not currently in use by any container.

## Removing a Volume via the Portainer UI

### Step 1: Navigate to Volumes

1. Log into Portainer.
2. Select your environment from the left sidebar.
3. Click **Volumes** in the navigation menu.

### Step 2: Identify Unused Volumes

Volumes with no containers listed under them are candidates for removal. Use the **Containers** column as an initial check, then verify that no containers or external workloads still depend on the volume.

### Step 3: Remove the Volume

1. Check the checkbox next to the volume you want to delete.
2. Click the **Remove** button at the top of the list.
3. Confirm the deletion in the popup dialog.

> **Warning**: Removing a volume is permanent. All data stored in that volume will be deleted and cannot be recovered unless you have an external backup.

## Removing Multiple Volumes at Once

Portainer allows bulk deletion:

1. Check the checkboxes for all volumes you want to remove.
2. Click **Remove** in the toolbar.
3. Confirm in the dialog.

## Removing Volumes via the Portainer API

For automated cleanup workflows, use the Portainer API:

```bash
# Step 1: Get JWT token

TOKEN=$(curl -s -X POST https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' | jq -r '.jwt')

# Step 2: List all volumes for endpoint ID 1
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoints/1/docker/volumes" | jq '.Volumes[]? | {Name: .Name, Driver: .Driver}'

# Step 3: Delete a specific volume by name
VOLUME_NAME="myapp_old_data"
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoints/1/docker/volumes/${VOLUME_NAME}"
```

## Pruning Unused Volumes

Docker provides a prune operation to remove unused volumes. On current Docker Engine API versions, `POST /volumes/prune` removes unused anonymous volumes by default. To prune unused named volumes as well, add `all=true`. You can trigger this through the Portainer API:

```bash
# Prune unused anonymous volumes on endpoint 1
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoints/1/docker/volumes/prune"

# To prune unused named volumes as well, add all=true
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoints/1/docker/volumes/prune?all=true"

# Response can show deleted volumes and space reclaimed:
# {"VolumesDeleted":["vol1","vol2"],"SpaceReclaimed":1073741824}
```

## Scripted Cleanup of Old Volumes

```bash
#!/bin/bash
# cleanup-unused-volumes.sh

PORTAINER_URL="https://portainer.example.com"
PORTAINER_API_KEY="your-access-token"
ENDPOINT_ID=1

echo "Pruning unused Docker volumes..."
RESULT=$(curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/volumes/prune")

DELETED=$(echo "$RESULT" | jq -r '(.VolumesDeleted // []) | length')
SPACE=$(echo "$RESULT" | jq -r '.SpaceReclaimed // 0')
SPACE_MB=$(awk -v space="$SPACE" 'BEGIN { printf "%.2f", space / 1048576 }')

echo "Deleted ${DELETED} volume(s), reclaimed ${SPACE_MB} MB"
```

## Safety Checklist Before Removing Volumes

Before deleting any volume, verify:

- [ ] No containers (running or stopped) depend on the volume
- [ ] No scheduled jobs or cron tasks reference the volume
- [ ] You have an up-to-date backup if the data might be needed later
- [ ] The volume is not part of a Docker Compose stack that might recreate it

## Conclusion

Removing persistent volumes in Portainer is a straightforward process through the UI or API. Always check volume attachment status before deletion, use the prune operation for routine cleanup, and ensure critical data is backed up before any removal operation. Regular volume hygiene helps prevent storage exhaustion and keeps your Docker host performing optimally.
