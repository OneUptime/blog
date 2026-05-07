# How to Use tmpfs Volumes with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, tmpfs, Volumes, Memory, Performance

Description: Learn how to use tmpfs volumes in Podman for fast, ephemeral in-memory storage in containers.

---

> tmpfs volumes store data in memory rather than on disk, providing extremely fast I/O for temporary data that does not need to persist.

tmpfs mounts create a temporary filesystem in RAM. Data stored in tmpfs is fast to read and write but is lost when the container stops. This makes tmpfs ideal for caches, temporary files, and sensitive data that should not be written to disk.

---

## Creating a tmpfs Mount with --tmpfs

```bash
# Simple tmpfs mount

podman run -d --name app \
  --tmpfs /tmp \
  docker.io/library/nginx:latest

# tmpfs with size limit and options
podman run -d --name app-tmpfs \
  --tmpfs /tmp:rw,size=100m,noexec \
  docker.io/library/nginx:latest
```

## Using --mount for tmpfs

The `--mount` flag provides a more explicit syntax:

```bash
# tmpfs mount with --mount syntax
podman run -d --name cache-app \
  --mount type=tmpfs,target=/app/cache,tmpfs-size=256m \
  docker.io/library/node:20 tail -f /dev/null

# With multiple options
podman run -d --name secure-app \
  --mount type=tmpfs,target=/run/secrets,tmpfs-size=64m,tmpfs-mode=0700 \
  docker.io/library/alpine:latest tail -f /dev/null
```

## Creating a Named tmpfs Volume

```bash
# Create a named volume backed by tmpfs
podman volume create --driver local \
  --opt type=tmpfs \
  --opt device=tmpfs \
  --opt o=size=512m,nodev,nosuid \
  mem-cache

# Use the named tmpfs volume
podman run -d --name fast-app \
  -v mem-cache:/app/cache \
  docker.io/library/redis:latest
```

## Common tmpfs Options

```bash
# Size-limited tmpfs for cache data
podman run -d --name webapp \
  --tmpfs /app/cache:rw,size=200m \
  docker.io/library/nginx:latest

# Secure tmpfs for secrets (no exec, no setuid, restricted permissions)
podman run -d --name secure \
  --tmpfs /run/secrets:rw,size=10m,noexec,nosuid,mode=0700 \
  docker.io/library/alpine:latest tail -f /dev/null

# Large tmpfs for data processing
podman run --rm \
  --tmpfs /workspace:rw,size=2g \
  docker.io/library/python:3.12 \
  python -c "print('Processing in memory...')"
```

## tmpfs for Read-Only Root Filesystem

When running containers with `--read-only`, tmpfs provides writable areas:

```bash
# Read-only root with writable tmpfs directories
podman run -d --name locked-app \
  --read-only \
  --tmpfs /tmp:rw,size=100m \
  --tmpfs /run:rw,size=50m \
  --tmpfs /var/cache:rw,size=200m \
  docker.io/library/nginx:latest
```

## Multiple tmpfs Mounts

```bash
# Application with multiple tmpfs mounts for different purposes
podman run -d --name multi-tmp \
  --tmpfs /tmp:rw,size=100m \
  --tmpfs /app/cache:rw,size=500m,noexec \
  --tmpfs /app/sessions:rw,size=50m,noexec,nosuid \
  docker.io/library/node:20 tail -f /dev/null
```

## Verifying tmpfs Mounts

```bash
# Check mounts inside the container
podman exec fast-app mount | grep tmpfs

# Check available space
podman exec fast-app df -h /app/cache

# Verify the mount type and options
podman inspect fast-app --format '{{ json .Mounts }}'
```

## tmpfs vs Regular Volumes

| Feature | tmpfs | Regular Volume |
|---------|-------|---------------|
| Storage | RAM | Disk |
| Speed | Very fast | Disk speed |
| Persistence | Lost on stop | Persists |
| Size limit | System RAM | Disk space |
| Use case | Cache, temp files | Persistent data |

## Summary

tmpfs volumes in Podman provide fast, ephemeral in-memory storage for temporary data, caches, and secrets. Use `--tmpfs` for simple mounts or `--mount type=tmpfs` for explicit configuration. Set size limits to prevent runaway memory usage and combine with `--read-only` for secure container deployments. Data in tmpfs is automatically cleaned up when the container stops.
