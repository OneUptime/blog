# How to Set Up Read-Only Containers in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Security, Container, Best Practice

Description: Configure containers to run with read-only root filesystems in Portainer to improve security posture.

## Introduction

Configure containers to run with read-only root filesystems in Portainer to improve security posture. This guide walks you through the process step by step with practical examples.

## Prerequisites

- Portainer installed (CE or BE)
- A Docker environment connected to Portainer
- Basic familiarity with Docker concepts

## Using the Portainer UI

### Step 1: Navigate to the Relevant Section

1. Log in to your Portainer instance
2. Select your environment from the home screen
3. Navigate to **Stacks** if you manage the workload with Compose, or **Containers** for a standalone container

### Step 2: Locate Your Container or Stack

Use the search and filter options in Portainer:

1. For a stack-managed workload, click **Stacks**, then either create a new stack in the Web editor or select an existing stack and open the **Editor** tab
2. For a standalone container, click **Containers** and use the search box to find your container
3. Open the container details page and click **Duplicate/Edit** if you need to recreate it with updated settings
4. After deployment, use **Inspect** to confirm the final runtime configuration

## Step-by-Step Instructions

### View Container Details

```bash
# Verify that the container root filesystem is read-only
docker inspect --format '{{ .HostConfig.ReadonlyRootfs }}' container-name

# Review the writable mounts attached to the container
docker inspect --format '{{ json .Mounts }}' container-name

# Via Portainer: Containers > container-name > Inspect
```

### Key Configuration Options

```yaml
# compose.yaml example for a Portainer stack
services:
  app:
    image: your-app:latest
    read_only: true
    restart: unless-stopped
    environment:
      NODE_ENV: production
    volumes:
      - app-data:/data
    tmpfs:
      - /tmp

volumes:
  app-data:
```

## Command Line Examples

Useful Docker commands for this task:

```bash
# List all containers
docker ps -a

# Verify the read-only root filesystem setting
docker inspect --format '{{ .HostConfig.ReadonlyRootfs }}' container-name

# Check which mounted paths remain writable
docker inspect --format '{{ json .Mounts }}' container-name

# Docker CLI equivalent for a read-only container
docker run -d \
  --name my-app \
  --read-only \
  -v app-data:/data \
  your-app:latest
```

## Portainer-Specific Features

Portainer provides several UI conveniences for this task:

1. **Stacks Web Editor**: Deploy a Compose file that includes `read_only: true`
2. **Stack Editor**: Update an existing stack and redeploy it from the **Editor** tab
3. **Duplicate/Edit**: Recreate an existing standalone container with the updated runtime settings
4. **Inspect View**: Confirm that `HostConfig.ReadonlyRootfs` is set to `true`
5. **Logs**: Review application errors after enabling a read-only root filesystem

## Troubleshooting Common Issues

**Issue: Application fails with "Read-only file system" errors**
```bash
# Confirm the root filesystem is read-only
docker inspect --format '{{ .HostConfig.ReadonlyRootfs }}' container-name

# Review the writable mount points available to the container
docker inspect --format '{{ json .Mounts }}' container-name
```

If the application needs to write to disk, move those writes to a volume such as `/data`. If it needs a temporary writable directory such as `/tmp`, add a `tmpfs` mount. Docker documents `tmpfs` mounts for Linux hosts.

**Issue: The change does not appear after editing**

For a standalone container, use **Duplicate/Edit** and then replace the old container. For a stack-managed workload, edit the Compose file and redeploy the stack, then re-run `docker inspect` to confirm the new container has `ReadonlyRootfs` enabled.

## Automating with the Portainer API

Automate this task via the Portainer API:

```bash
# Authenticate and get JWT token
TOKEN=$(curl -s -X POST \
  "https://portainer.example.com/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"password"}' | jq -r .jwt)

# List containers
curl -s -X GET \
  "https://portainer.example.com/api/endpoints/1/docker/containers/json?all=true" \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | {Id, Names, Status, Image}'

# Inspect a container and confirm the read-only root filesystem setting
curl -s -X GET \
  "https://portainer.example.com/api/endpoints/1/docker/containers/<container_id>/json" \
  -H "Authorization: Bearer $TOKEN" | jq '{Name, ReadonlyRootfs: .HostConfig.ReadonlyRootfs, Mounts: [.Mounts[] | {Destination, Type, RW}]}'
```

## Conclusion

Understanding how to Set Up Read-Only Containers in Portainer helps reduce unnecessary write access inside your containers. The most reliable approach is to set `read_only: true` in a Portainer-managed stack or recreate a standalone container with the equivalent Docker setting, then verify the result in Portainer's **Inspect** view or with `docker inspect`. If your application still needs writable paths, provide them explicitly with volumes or `tmpfs` mounts instead of leaving the entire root filesystem writable.
