# How to Edit an Existing Stack in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Stack, Docker Compose, DevOps

Description: Learn how to modify and update existing Docker Compose stacks in Portainer, including adding services, changing images, and updating environment variables.

## Introduction

Once a stack is deployed in Portainer, you will inevitably need to modify it - adding a new service, updating an image version, changing environment variables, adjusting resource limits, or restructuring the network configuration. Portainer provides a built-in editor for stacks deployed via the web editor, and update controls for Git-based stacks. Understanding how Portainer applies updates helps you make changes safely without unnecessary downtime.

## Prerequisites

- Portainer with at least one deployed stack
- Understanding of Docker Compose update behavior

## How Stack Updates Work

When you update a stack in Portainer:
1. Portainer passes the updated definition to the underlying Docker deployment mechanism.
2. For Docker Compose-based updates, services whose configuration or image changed are recreated, while unchanged services are left running.
3. Networks and volumes are created if new, but existing named volumes are not removed automatically.

## Step 1: Open the Stack Editor

1. Navigate to **Stacks** in Portainer.
2. Click the stack name you want to edit.
3. If the stack was deployed with the **Web editor**, click the **Editor** tab to view and edit the Compose YAML.
4. If the stack was deployed from **Git**, edit the Compose file in the repository, then use **Pull and redeploy** in Portainer. If needed, you can **Detach from Git** to make the stack editable in Portainer, but it can no longer be updated from Git afterward.

## Step 2: Add a New Service

To add a Redis cache service to an existing stack:

```yaml
# Add this service block to the existing Compose YAML:

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: ["redis-server", "--appendonly", "yes"]
    networks:
      - backend     # Must match an existing network
    volumes:
      - redis_data:/data

# Also add to the volumes section:
volumes:
  postgres_data:    # (existing)
  redis_data:       # (new)
```

After adding, click **Update the stack** - only the new `redis` container is created. Existing containers continue running.

## Step 3: Update a Service Image

To upgrade nginx from `alpine` to a specific version:

```yaml
# Before:
  nginx:
    image: nginx:alpine

# After:
  nginx:
    image: nginx:1.25-alpine
```

After clicking **Update the stack**, only the `nginx` container is recreated with the new image.

To always re-pull a tag that hasn't changed in the Compose file for a Git-based stack:
1. Click **Pull and redeploy**.
2. Enable **Re-pull image**.
3. Redeploy the stack.

## Step 4: Modify Environment Variables

Environment variables can be updated two ways:

**Method 1: In the Compose YAML** (for direct values in the service definition):
```yaml
services:
  api:
    environment:
      - LOG_LEVEL=debug      # Changed from info to debug
      - WORKERS=4            # Added new variable
```

**Method 2: In the Environment Variables section** (for values referenced as `${VAR}` in the Compose file):
```yaml
services:
  api:
    environment:
      LOG_LEVEL: ${LOG_LEVEL}
      WORKERS: ${WORKERS}
```

1. In the stack detail page, expand the Environment variables section.
2. Add, edit, or remove environment variables.
3. Click **Update the stack**.

## Step 5: Change Resource Limits

For Docker Swarm, add or update resource constraints:

```yaml
# Before (no limits):
  api:
    image: myorg/api:latest

# After (with limits):
  api:
    image: myorg/api:latest
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 512M
        reservations:
          memory: 256M
```

For Docker Standalone (not Swarm), use:
```yaml
  api:
    image: myorg/api:latest
    mem_limit: 512m
    cpus: 0.5
```

## Step 6: Rename a Service

Renaming a service effectively creates a new container - Docker Compose tracks services by name:

```yaml
# Before:
  app:
    image: myorg/app:latest

# After (renamed):
  api:
    image: myorg/app:latest
```

After updating: Portainer creates the new `api` container. On Docker Compose-based stacks, the old `app` container can remain as an orphan unless you remove it; on Docker Swarm, use **Prune services** when updating if you removed services from the stack. Data in named volumes is preserved.

## Step 7: Roll Back to Previous Configuration

For stacks deployed with the Web editor, Portainer can keep previous versions of the stack file. To roll back:

1. Open the stack's **Editor** tab.
2. Use the **Version** dropdown to select a previous stack file version.
3. Click **Update the stack**.

```bash
# Keep a backup before editing if you want a local copy:
# In Portainer, copy the current Compose YAML before making changes
# Paste it into a file:
cat > stack-backup-$(date +%Y%m%d).yml << 'EOF'
(paste current content here)
EOF
```

For Git-based stacks:
- Changes to the repo are tracked by commit history.
- To roll back, revert the repository to the desired state, or select an earlier branch or tag as the **Repository reference**.
- In Portainer: **Stacks** → click stack → use **Pull and redeploy** after updating the repository or changing the **Repository reference**.

## Conclusion

Editing stacks in Portainer is straightforward - use the editor for Web editor stacks, or update the Git repo and redeploy for Git-based stacks. Portainer applies only the relevant changes: new services are created, changed services are recreated or updated, and unchanged services are typically left running. For production stacks, use Git-based deployment so every edit is a commit, enabling rollback to any previous state. Before making significant changes, copy the current Compose YAML as a backup or ensure your Git history is up to date.
