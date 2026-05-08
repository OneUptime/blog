# How to Remove a Container in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Lifecycle, Container Management

Description: Learn how to remove stopped containers in Podman to free up resources and keep your environment clean.

---

> Regularly removing unused containers prevents disk space waste and keeps your container environment manageable.

After a container has finished its work, it remains on disk in a stopped state, consuming storage space. The `podman rm` command removes these containers, freeing up resources. This guide covers all the ways to remove containers in Podman.

---

## Basic Container Removal

Remove a stopped container by name or ID.

```bash
# Create and run a container that exits

podman run --name my-task docker.io/library/alpine:latest echo "Task complete"

# Remove the stopped container
podman rm my-task

# Verify it is gone
podman ps -a --filter name=my-task
```

## Removing by Container ID

```bash
# List stopped containers to find their IDs
podman ps -a --filter status=exited --format "{{.ID}}\t{{.Names}}\t{{.Status}}"

# Remove by ID (full or partial)
podman rm abc123def456

# Remove using partial ID
podman rm abc1
```

## Removing Multiple Containers

```bash
# Remove multiple containers at once
podman rm container-1 container-2 container-3

# Remove all containers matching a pattern
podman ps -a --filter name=test --format "{{.Names}}" | xargs -r podman rm
```

## Removing with Volumes

By default, `podman rm` does not remove anonymous volumes created by the container. Use `--volumes` (or `-v`) to remove them.

```bash
# Create a container with an anonymous volume
podman run --name vol-test -v /data docker.io/library/alpine:latest echo "done"

# Remove the container and its anonymous volumes
podman rm -v vol-test
```

## Removing and Getting the Container ID

The `podman rm` command outputs the container ID or name upon successful removal.

```bash
# Remove and capture the output
REMOVED=$(podman rm my-task)
echo "Removed container: $REMOVED"
```

## Preventing Removal of Running Containers

By default, you cannot remove a running container.

```bash
# Start a running container
podman run -d --name running-container docker.io/library/alpine:latest sleep 300

# This will fail
podman rm running-container 2>&1 || echo "Cannot remove a running container"

# Stop it first, then remove
podman stop running-container
podman rm running-container
```

## Stop and Remove in One Step

Combine stop and remove for a clean workflow.

```bash
# Method 1: Chain the commands
podman stop my-container && podman rm my-container

# Method 2: Use the --force flag (covered in the next blog post)
podman rm -f my-container
```

## Using --rm Flag for Auto-Removal

The best way to avoid leftover containers is to use `--rm` when running.

```bash
# Container is automatically removed after it exits
podman run --rm docker.io/library/alpine:latest echo "I will be cleaned up automatically"

# Verify nothing is left
podman ps -a --filter ancestor=docker.io/library/alpine:latest
```

## Removing Containers by Creation Time

```bash
# Remove containers created more than 24 hours ago
podman rm --filter status=exited --filter until=24h
```

## Scripting Container Cleanup

```bash
#!/bin/bash
# cleanup.sh - Clean up stopped containers

echo "Stopped containers before cleanup:"
podman ps -a --filter status=exited --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"

# Count containers to remove
COUNT=$(podman ps -a --filter status=exited -q | wc -l)

if [ "$COUNT" -gt 0 ]; then
  echo "Removing $COUNT stopped containers..."
  podman ps -a --filter status=exited -q | xargs -r podman rm -v
  echo "Cleanup complete"
else
  echo "No stopped containers to remove"
fi
```

## Removing Containers with Dependencies

If a container is required by other containers, remove the dependents first or use `--depend`.

```bash
# Remove containers in the correct order
podman rm dependent-container
podman rm my-container

# Or remove the container and its dependents recursively
podman rm --depend my-container
```

## Summary

The `podman rm` command removes stopped containers and frees disk space. Use `-v` to also remove anonymous volumes, combine with `podman stop` for running containers, and use the `--rm` flag during `podman run` to auto-clean containers after exit. Regular cleanup of stopped containers is essential for maintaining a healthy container environment.
