# How to Stop Services with podman-compose down

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, podman-compose, Cleanup

Description: Learn how to stop and remove services, networks, and volumes created by podman-compose using the down command.

---

> podman-compose down stops containers and cleans up networks in one command, giving you a fresh slate for the next run.

The `podman-compose down` command stops all running containers defined in your compose file and removes them along with the networks that were created. You can also remove volumes and images to fully clean up.

---

## Basic Usage

```bash
# Stop and remove containers and networks

podman-compose down
```

This stops all running containers, removes them, and deletes the associated networks.

## What Gets Removed

```bash
# Before down
podman-compose ps
# Shows running containers

# After down
podman-compose down
podman-compose ps
# Shows no containers
```

Resources removed by default:
- Containers for all services
- Networks defined in the compose file
- The default network, if one is used

Resources preserved by default:
- Named and anonymous volumes
- Images

## Removing Volumes

```bash
# Stop containers and remove named and anonymous volumes too
podman-compose down -v

# This deletes data in volumes like database files
# Use with caution in development environments
```

## Removing Images

```bash
# Remove images used by services
podman-compose down --rmi all

# Only remove images that don't have a custom tag
podman-compose down --rmi local
```

## Stop vs Down

```bash
# Stop: stops containers but keeps them (can restart later)
podman-compose stop

# Restart stopped containers
podman-compose start

# Down: stops AND removes containers (requires 'up' to recreate)
podman-compose down
```

## Stopping Specific Services

```bash
# Stop only specific services without removing
podman-compose stop web api

# Remove stopped containers for specific services
podman-compose rm web api
```

## Timeout for Graceful Shutdown

```bash
# Allow 30 seconds for containers to gracefully shut down
podman-compose down -t 30

# Default timeout is 10 seconds before SIGKILL
```

## Full Cleanup Script

```bash
#!/bin/bash
# clean-all.sh - remove everything from a compose project
echo "Stopping all services..."
podman-compose down -v --rmi all

echo "Pruning unused resources..."
podman system prune -f

echo "Cleanup complete."
```

## Verifying Cleanup

```bash
# Check that no project containers remain
podman-compose ps

# Check that volumes are removed (if -v was used)
podman volume ls

# Check that networks are removed
podman network ls
```

## Summary

Use `podman-compose down` to stop and remove containers and networks. Add `-v` to remove volumes and `--rmi all` to remove images. For a partial stop that allows restart, use `podman-compose stop` instead. This gives you control over what gets cleaned up after each run.
