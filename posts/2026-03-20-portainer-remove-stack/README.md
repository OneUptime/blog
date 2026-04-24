# How to Remove a Stack in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Stack, Cleanup, DevOps

Description: Learn how to safely remove Docker Compose stacks in Portainer, understanding what gets deleted and how to preserve important data.

## Introduction

Removing a stack in Portainer stops and removes the stack's containers and Compose-managed networks, while leaving named volumes in place. Understanding exactly what gets removed - and what doesn't - is critical to avoid accidental data loss. For Docker Compose stacks, Portainer's delete flow behaves like `docker compose down` without `--volumes`; if you also want named volumes removed, use the CLI or delete the volumes separately.

## Prerequisites

- Portainer with at least one deployed stack
- Understanding of which data you need to preserve

## What Gets Removed (and What Doesn't)

| Resource | Removed by Portainer stack removal | With `docker compose down --volumes` |
|----------|------------------------------------|--------------------------------------|
| Containers | Yes | Yes |
| Compose-defined networks (non-external) | Yes | Yes |
| Named volumes declared in Compose (non-external) | **No** | Yes |
| Bind mounts (host paths) | No (files remain on host) | No |
| Images | No | No |
| Portainer stack metadata | Yes | No |

By default, named volumes persist after Portainer stack removal to prevent accidental data loss. External networks and external volumes are not removed.

## Step 1: Back Up Volumes Before Removal

Before removing a stack, back up any important data:

```bash
# Identify named volumes used by the stack:
docker ps -aq --filter "label=com.docker.compose.project=myapp" | xargs docker inspect \
  --format '{{.Name}}: {{range .Mounts}}{{if .Name}}{{.Name}} {{end}}{{end}}'

# Backup a volume:
docker run --rm \
  -v myapp_postgres_data:/source:ro \
  -v /backup:/backup \
  alpine tar czf /backup/postgres_data_backup_$(date +%Y%m%d_%H%M%S).tar.gz \
  -C /source .

echo "Backup complete: $(ls -lh /backup/)"
```

## Step 2: Remove the Stack via Portainer UI

### Remove Without Deleting Volumes (Current Behavior)

1. Navigate to **Stacks** in Portainer.
2. Check the checkbox next to the stack.
3. Click **Remove**.
4. When the confirmation dialog appears, click **Remove**.

Result: containers and networks are removed, named volumes remain for data preservation.

### Remove Including Volumes (Use CLI Instead)

Portainer's current stack removal flow does not offer a **Remove associated volumes** checkbox for Docker Compose stacks.

If you also want to delete named volumes, use the CLI commands in Step 3 or remove the volumes explicitly in Step 4.

## Step 3: Remove Stack Resources via CLI

These commands remove Compose-managed resources on the Docker host. If the stack was created in Portainer, remove it in Portainer or via the Portainer API as well so the Portainer stack record is deleted.

```bash
# Remove stack without volumes (preserves data):
docker compose -p myapp down

# Remove stack AND all volumes (destructive!):
docker compose -p myapp down --volumes

# Remove stack, volumes, AND locally built images:
docker compose -p myapp down --volumes --rmi local

# Remove stack, volumes, ALL images (including pulled images):
docker compose -p myapp down --volumes --rmi all
```

## Step 4: Clean Up Orphaned Resources After Removal

Even after stack removal, some resources may persist:

```bash
# Check for orphaned volumes (not referenced by any container):
docker volume ls -f dangling=true

# Remove specific orphaned volumes:
docker volume rm myapp_postgres_data myapp_uploads

# Or prune all unused volumes:
docker volume prune --force   # WARNING: removes ALL unused volumes

# Check for orphaned networks:
docker network ls --filter type=custom
docker network prune --force  # Removes all custom networks with no containers

# Remove images from the stack (if no longer needed):
docker image rm myorg/api:latest myorg/web:latest
```

## Step 5: Remove a Stack That Won't Delete

If Portainer shows an error removing a stack:

```bash
# Check if containers are in a bad state:
docker ps -a --filter "label=com.docker.compose.project=myapp"

# Force remove stuck containers:
containers=$(docker ps -aq --filter "label=com.docker.compose.project=myapp")
[ -z "$containers" ] || docker rm -f $containers

# Then remove the network manually:
docker network rm myapp_default myapp_frontend myapp_backend

# Remove the stack from Portainer so its metadata is cleaned up as well:
# Portainer UI → Stacks → Remove
```

## Step 6: Verify Complete Removal

Confirm the stack and its resources are fully gone:

```bash
# No containers from the stack:
docker ps -a --filter "label=com.docker.compose.project=myapp"
# Should return no rows

# Network is removed:
docker network ls | grep myapp
# Should return nothing

# Check if volumes still exist (expected after Portainer removal, or if you didn't include --volumes):
docker volume ls | grep myapp
# myapp_postgres_data  ← This volume persists, which is intentional
```

## Step 7: Scheduled Stack Cleanup

For ephemeral stacks in CI/CD environments:

```bash
#!/bin/bash
# cleanup-old-stacks.sh - Remove stacks older than N days

ENDPOINT_ID=1
DAYS=7
CUTOFF=$(date -u -d "${DAYS} days ago" +%s)

# Via Portainer API:
curl -s "${PORTAINER_URL}/api/stacks" \
  -H "X-API-Key: ${PORTAINER_TOKEN}" | \
  jq -r --argjson cutoff "$CUTOFF" --argjson endpoint "$ENDPOINT_ID" '
    .[]
    | select(.Name | startswith("review-"))
    | select(.EndpointId == $endpoint)
    | select(.CreationDate < $cutoff)
    | .Id
  ' | while read -r stack_id; do
    echo "Removing stack: ${stack_id}"
    curl -X DELETE \
      "${PORTAINER_URL}/api/stacks/${stack_id}?endpointId=${ENDPOINT_ID}" \
      -H "X-API-Key: ${PORTAINER_TOKEN}"
  done
```

## Conclusion

Removing a stack in Portainer removes the stack record plus its containers and Compose-managed networks, but leaves named volumes in place. Always back up important volumes before removal if you plan to delete them. Use the CLI (`docker compose down --volumes`) when you also want Compose-managed volumes removed, and use the Portainer UI or Portainer API when you want the Portainer stack record removed. After removal, run `docker volume prune` and `docker network prune` to clean up any lingering orphaned resources.
