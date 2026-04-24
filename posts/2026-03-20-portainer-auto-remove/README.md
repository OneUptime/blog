# How to Set Up Auto-Remove for Containers in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Automation, DevOps

Description: Learn how to configure Docker container auto-remove in Portainer so containers are automatically deleted when they stop, keeping your environment clean.

## Introduction

The auto-remove flag (`--rm` in Docker CLI) causes a container to be automatically deleted when it exits. This is ideal for one-shot tasks, CI/CD jobs, and database migrations where you don't want stopped containers accumulating on your host. Portainer provides a checkbox to enable this behavior when creating a container.

## Prerequisites

- Portainer installed with a connected Docker environment

## When to Use Auto-Remove

**Good use cases:**
- Database migration containers
- Initialization scripts
- One-time data processing jobs
- CI/CD pipeline steps
- Debugging containers
- Testing new images

**Bad use cases:**
- Production services (use `restart: always` instead)
- Containers you want to inspect after failure
- Containers with important logs you need to retain

## Step 1: Enable Auto-Remove in Portainer

1. Navigate to **Containers > Add container**.
2. Set the container name and image.
3. Scroll to the **Actions** section.
4. Find the **Auto remove** toggle.
5. Enable it.

```bash
# Equivalent Docker CLI command:

docker run --rm \
  --name my-migration \
  myorg/migrate:latest \
  python manage.py migrate
```

## Step 2: Auto-Remove and Restart Policy Conflict

Auto-remove (`--rm`) and restart policies are mutually exclusive. Docker returns an error if you try to combine them.

```bash
# This combination fails because --rm and --restart conflict
docker run --rm --restart always myimage

# In Portainer, keep the restart policy set to No when using Auto remove
```

For one-shot tasks, ensure restart policy is set to **No** (none).

## Step 3: Common Auto-Remove Patterns

### Database Migration Pattern

```yaml
# docker-compose.yml: run migration once; clean up separately if needed
services:
  # Migration container - runs once; Compose does not auto-remove it
  db-migrate:
    image: myorg/myapp:latest
    command: ["python", "manage.py", "migrate", "--noinput"]
    environment:
      - DATABASE_URL=${DATABASE_URL}
    restart: "no"
    # Note: Compose service definitions do not have auto-remove
    # Use restart: "no" and clean up exited containers separately

  app:
    image: myorg/myapp:latest
    depends_on:
      db-migrate:
        condition: service_completed_successfully
    restart: unless-stopped
```

For individual containers with auto-remove, create them through Portainer's container creation form (not via compose stacks, which don't have `auto_remove`).

### Scheduled Cleanup Jobs

```bash
#!/bin/bash
# Run a cleanup job that deletes itself when done
docker run --rm \
  --name cleanup-job-$(date +%s) \
  -v /data:/data \
  alpine:latest \
  sh -c "find /data -name '*.tmp' -mtime +7 -delete && echo 'Cleanup done'"
```

In Portainer:
1. Create container with image `alpine:latest`.
2. Set command: `sh -c "find /data -name '*.tmp' -mtime +7 -delete"`.
3. Mount the volume.
4. Enable **Auto remove**.
5. Start the container - it runs and disappears.

### Testing a New Image

```text
# Quick test: run a container to explore an image
# Enable auto-remove so it cleans up automatically
Image: ubuntu:22.04
Command: /bin/bash -c "ls -la / && uname -a && exit"
Auto remove: ✓ Enabled
```

## Step 4: Running One-Off Containers via Docker API

For automation, you can trigger auto-remove containers via the Portainer API:

```bash
# Via Portainer API: create and start a one-shot container
PORTAINER_URL="https://portainer-url:9443"
API_KEY="your-api-key"
ENDPOINT_ID=1

# Create the container
CONTAINER_ID=$(curl -s -X POST \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/create" \
  -d '{
    "Image": "alpine:latest",
    "Cmd": ["echo", "hello from one-shot container"],
    "HostConfig": {
      "AutoRemove": true,
      "RestartPolicy": {"Name": "no"}
    }
  }' | jq -r '.Id')

# Start the container
curl -s -X POST \
  -H "X-API-Key: ${API_KEY}" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${CONTAINER_ID}/start"

echo "Container ${CONTAINER_ID} started - will auto-remove on exit"
```

## Step 5: Alternative - Portainer Edge Jobs

For recurring host-side tasks on edge devices, use **Edge Jobs** instead of relying on auto-remove containers:

- Edge Jobs schedule scripts on Edge hosts.
- They run via the host's `crontab`, not in a container.
- They require Edge Compute features to be enabled.
- They are currently available for Docker Standalone edge environments that use `/etc/cron.d` for scheduling.

## Verify Auto-Remove Behavior

```bash
# After a container with --rm exits, verify it's gone:
docker ps -a | grep my-container
# Should return nothing if auto-removed

# In Portainer: the container disappears from the Containers list after exit
```

## Best Practices

- **Use auto-remove for all one-shot tasks** to prevent stopped container buildup.
- **Name containers meaningfully** even with auto-remove - the name helps identify them in logs.
- **Capture logs before the container is removed** if you need them - pipe to a file or log driver.
- **Don't use auto-remove for production services** - use restart policies instead.
- **Use Portainer Edge Jobs** for scheduled host-side tasks on edge devices.

## Conclusion

Auto-remove is a simple but valuable feature for keeping your Docker environment clean. By enabling it for one-shot containers in Portainer, you ensure that migration jobs, initialization scripts, and test containers don't accumulate as stopped containers. For recurring host-side tasks on edge devices, consider Portainer Edge Jobs instead.
