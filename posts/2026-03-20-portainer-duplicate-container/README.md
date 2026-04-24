# How to Duplicate a Container in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Operation, DevOps

Description: Learn how to duplicate an existing Docker container in Portainer to create a copy with the same configuration for scaling or testing purposes.

## Introduction

Portainer's duplicate container feature creates a new container pre-populated with the same settings as an existing one. This is useful for scaling services, creating test copies of production containers, or applying incremental configuration changes without starting from scratch.

## Prerequisites

- Portainer installed with a connected Docker environment
- An existing container to duplicate

## Step 1: Find the Duplicate Option

1. Navigate to **Containers** in Portainer.
2. Click on the container name you want to duplicate.
3. On the container details page, look for the **Duplicate/Edit** button.

In some Portainer versions:
- The button appears as **Duplicate/Edit** on the container details page.
- Or a duplicate icon in the container list actions.

## Step 2: Review the Pre-Populated Form

Clicking **Duplicate/Edit** opens the container creation form pre-filled with all the original container's settings:

- Image name and tag
- Port mappings
- Volume mounts
- Environment variables
- Labels
- Restart policy
- Resource limits
- Networking configuration
- Command and entrypoint

## Step 3: Modify the Duplicate

Before deploying, change the settings that need to differ from the original:

### Change the Container Name

The most important change - you can't have two containers with the same name:

```text
Original name:   web-server
Duplicate name:  web-server-2
```

### Adjust Port Mappings

Change host ports to avoid conflicts:

```text
Original:   8080 → 80
Duplicate:  8081 → 80
```

### Modify Environment Variables

For copies with different configurations:

```text
Original:   INSTANCE_ID=1, WORKER_TYPE=primary
Duplicate:  INSTANCE_ID=2, WORKER_TYPE=secondary
```

### Change Labels

Update labels to reflect the new instance:

```text
Original:   instance=1, role=primary
Duplicate:  instance=2, role=secondary
```

## Step 4: Deploy the Duplicate

After modifying the necessary settings:
1. Review all configurations.
2. Click **Deploy the container**.

The new container starts alongside the original.

## Common Use Cases

### Scaling a Web Service

Quickly add another instance of a web server:

```text
Container: web-app (port 8080→80)
Duplicate: web-app-2 (port 8081→80)

# Then point a load balancer at both ports

```

### Testing Configuration Changes

Create a copy to test changes without touching the running original:

```text
Container: production-api (env: LOG_LEVEL=warn)
Duplicate: production-api-test (env: LOG_LEVEL=debug)
```

Test the duplicate, and if everything works, apply the changes to the original.

### Creating Dev Copy of Production Container

```text
Container: prod-postgres (data volume: prod-data)
Duplicate: dev-postgres (data volume: dev-data, password: devpassword)
```

Change only the volume mount and password - keep everything else identical.

## Using Docker Compose for Proper Scaling

While duplicating containers manually works for quick tasks, use Docker Compose for repeatable single-host deployments and scaling:

```yaml
# compose.yaml with scaling
services:
  web:
    image: myorg/webapp:latest
    restart: unless-stopped
    scale: 3   # Run 3 copies automatically
    ports:
      - "8080-8082:8080"  # Publish port 8080 on available host ports in this range
```

Or with a reverse proxy:

```yaml
services:
  web:
    image: myorg/webapp:latest
    scale: 3
    # No direct host port mapping - web is only exposed on the internal Compose network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - web
```

Nginx configuration:

```nginx
# nginx.conf snippet for proxying to the web service
upstream web_backend {
    server web:8080;  # Reach the web service by name on the Compose network
}
```

## Limitations of Manual Duplication

- **No automatic port assignment**: You must manually change ports to avoid conflicts.
- **No orchestration**: Duplicated containers aren't managed as a group.
- **No auto-scaling**: Each duplicate is individually managed.
- **Shared volumes**: Be careful - duplicated containers may share the same volume unless you change the volume configuration.

For production scaling needs, use Docker Swarm services or Kubernetes instead.

## Duplicating a Container vs. Recreating It

| Action | Purpose |
|--------|---------|
| **Duplicate** | Create a second copy alongside the original |
| **Edit (same name)** | Update settings; Portainer recreates the container and replaces the original after confirmation |
| **Recreate** | Manually remove the old container, then create a new one with updated config |

## Step 5: Track Duplicated Containers

Use labels to track which containers are duplicates and of what:

```text
Labels:
  com.example.cloned-from: original-container-name
  com.example.instance: 2
  com.example.created-by: john-doe
```

This makes it easy to identify and manage duplicated containers in large environments.

## Conclusion

Duplicating containers in Portainer is a quick way to create copies of existing containers for scaling, testing, or creating dev copies of production configs. It's most useful for ad-hoc operations where you need a second instance quickly. For systematic single-host scaling, use Docker Compose. For orchestrated production scaling, use Docker Swarm services or Kubernetes to manage multiple instances as a unit rather than individually.
