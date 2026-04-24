# How to Attach Volumes to Running Containers in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Volumes, Storage, DevOps

Description: Learn how to add volumes to running containers in Portainer and how to work around Docker's limitation of not supporting live volume attachment.

## Introduction

Docker doesn't support adding volumes to a running container - volumes must be configured at creation time. However, Portainer's duplicate/edit and recreate features make it easy to add new volumes to existing containers with minimal downtime. This guide covers how to add volumes and alternative approaches for accessing container data.

## Prerequisites

- Portainer installed with a connected Docker environment
- A running container to which you want to add a volume

## The Challenge: Docker's Immutable Volume Configuration

Unlike cloud VMs where you can attach a disk while running, Docker requires volumes to be specified when a container is created. To add a volume to a running container, you must:

1. Stop the container.
2. Create a new container with the volume configuration.
3. Start the new container.

Portainer simplifies this process.

## Method 1: Recreate Container with Added Volume (Portainer)

### Step 1: Stop the Running Container

1. Navigate to **Containers** in Portainer.
2. Click on the container name.
3. Click **Stop**.

### Step 2: Open Edit/Duplicate

1. Click **Duplicate/Edit** on the container details page.
2. The form opens pre-filled with current settings.

### Step 3: Add the New Volume

1. Scroll to the **Volumes** tab.
2. Click **+ map additional volume**.
3. Configure:
   ```text
   Volume:          my-new-volume
   Container path:  /app/data
   Mode:            Read/Write
   ```

### Step 4: Deploy the Updated Container

1. Click **Deploy the container**.
2. When Portainer asks for confirmation, click **Replace**.
3. The replacement container keeps the same name and config, plus the new volume.

## Method 2: Docker Compose Stack Update

For stack-managed containers, update the Compose file.

Original stack:

```yaml
services:
  app:
    image: myorg/myapp:latest
    restart: unless-stopped
    volumes:
      - app_data:/app/data     # Existing volume

volumes:
  app_data:
```

Updated stack (add new volumes):

```yaml
services:
  app:
    image: myorg/myapp:latest
    restart: unless-stopped
    volumes:
      - app_data:/app/data        # Existing volume (preserved)
      - app_uploads:/app/uploads  # New volume
      - app_logs:/app/logs        # Another new volume

volumes:
  app_data:     # Existing - data preserved
  app_uploads:  # New
  app_logs:     # New
```

In Portainer:
1. Navigate to **Stacks**.
2. Click the stack name.
3. If the stack was deployed using the Web Editor or uploaded, click **Editor** and update the Compose file. For Git-backed stacks, update the Compose file in the repository instead.
4. Click **Update the stack**. For Git-backed stacks, redeploy after the repository change.

Portainer recreates containers with the new volume configuration while preserving existing named volume data.

## Method 3: Access Container Data Without Adding Volumes

If you just need to inspect or copy data from a running container without recreating it, use exec or copy:

```bash
# Inspect files inside a running container:
docker exec my-container ls -la /app/data

# Copy files OUT of a running container:
docker cp my-container:/app/data/important.db ./backup-important.db

# Copy files INTO a running container:
docker cp ./new-config.yaml my-container:/app/config.yaml
```

## Method 4: Volumes-from Pattern

Share volumes from an existing container to a new one:

```bash
# Container A has a volume mounted at /app/data
docker run -d --name app-a \
  -v app_data:/app/data \
  myapp:latest

# Container B shares all volumes from Container A
docker run -d --name app-b \
  --volumes-from app-a \
  backup-agent:latest

# Now app-b can access app-a's volumes
```

In Portainer, this can be done by using the same named volume in multiple containers.

## Method 5: Near-Zero Downtime Rollout

For production workloads that can't afford a hard stop on a single container, start a replacement container with the new volume, verify it, then switch traffic over using your reverse proxy or load balancer. A single standalone container still has to be recreated to add the volume.

```bash
# Start a replacement container with the extra volume on a temporary port.
# Reuse the current container's image, env vars, and existing mounts as needed.
docker volume create app-uploads

docker run -d \
  --name my-prod-app-v2 \
  -p 127.0.0.1:8081:8080 \
  --restart unless-stopped \
  -v app-uploads:/app/uploads \
  myorg/myapp:latest

# Verify my-prod-app-v2, then switch traffic to it and remove the old container.
```

## Best Practices for Volume Planning

Anticipate volume needs before deployment to avoid recreations:

```yaml
# Plan volumes upfront - add all that might be needed
services:
  app:
    image: myapp:latest
    volumes:
      - app_data:/app/data         # Application data
      - app_uploads:/app/uploads   # User uploads
      - app_logs:/app/logs         # Application logs
      - app_cache:/app/cache       # Cache directory
      - app_tmp:/tmp               # Temporary files
    # Even if some are empty now, they're ready when needed

volumes:
  app_data:
  app_uploads:
  app_logs:
  app_cache:
  app_tmp:
```

## Verify Volume Attachment

After recreating the container:

```bash
# Verify volumes are attached:
docker inspect my-container | jq '.[].Mounts'

# Check the container can write to the new volume:
docker exec my-container touch /app/uploads/test.txt
docker exec my-container ls /app/uploads/
# Should show test.txt
```

In Portainer: Container details → **Inspect** tab → `Mounts` section.

## Conclusion

While Docker requires container recreation to add volumes, Portainer's edit and recreate flow makes this process straightforward. Plan your volume configuration before initial deployment to minimize recreations in production. When you do need to add volumes, use the duplicate/edit approach for individual containers or update the Compose file for stack-managed workloads. For data access without recreation, use `docker exec` or `docker cp` to work with container data directly.
