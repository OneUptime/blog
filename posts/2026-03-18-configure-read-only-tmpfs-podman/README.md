# How to Configure Read-Only Tmpfs in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Security, tmpfs, Filesystem

Description: Learn how to configure tmpfs mounts with read-only options in Podman to control ephemeral storage and minimize container attack surfaces.

---

> Tmpfs mounts give containers the writable space they need without persisting it in the container filesystem, keeping your security posture tight.

When running containers with a read-only root filesystem, applications often still need writable temporary directories. Tmpfs mounts provide temporary filesystems that disappear when the container stops. On Linux, tmpfs data can use swap unless swap is disabled, so avoid treating tmpfs as guaranteed RAM-only storage for secrets. This guide covers how to configure tmpfs mounts in Podman with fine-grained control over size, permissions, and read-only behavior.

---

## Understanding Tmpfs in Podman

A tmpfs mount creates a filesystem backed by memory and, when enabled, swap. Data written to a tmpfs mount does not persist in the container filesystem, making it useful for temporary files, caches, and runtime data. When the container is removed, the tmpfs content vanishes.

```bash
# Run a container with a basic tmpfs mount at /tmp

podman run --rm -it \
  --tmpfs /tmp \
  docker.io/library/alpine:latest \
  sh -c "echo 'hello' > /tmp/test.txt && cat /tmp/test.txt"
# Expected output: hello
```

## Configuring Tmpfs Size Limits

You can restrict how much memory a tmpfs mount may consume to prevent a runaway process from exhausting host memory.

```bash
# Mount a tmpfs at /tmp with a 16MB size limit
podman run --rm -it \
  --tmpfs /tmp:rw,size=16m \
  docker.io/library/alpine:latest \
  sh -c "dd if=/dev/zero of=/tmp/bigfile bs=1M count=20 2>&1 || echo 'Write limited by tmpfs size'"
```

```bash
# Mount multiple tmpfs with different size limits
podman run --rm -d \
  --read-only \
  --tmpfs /tmp:rw,size=32m \
  --tmpfs /var/cache:rw,size=64m \
  --tmpfs /run:rw,size=8m \
  --name sized-tmpfs \
  docker.io/library/nginx:alpine
```

## Setting Tmpfs Permissions

You can control the file mode on the tmpfs mount point.

```bash
# Create a tmpfs with restricted permissions (mode 700)
podman run --rm -it \
  --tmpfs /tmp:rw,size=16m,mode=700 \
  docker.io/library/alpine:latest \
  sh -c "ls -ld /tmp"
# Expected output: drwx------ ... /tmp
```

```bash
# Create a tmpfs with world-readable permissions and writes limited to the owner (mode 755)
podman run --rm -it \
  --tmpfs /app/cache:rw,size=32m,mode=755 \
  docker.io/library/alpine:latest \
  sh -c "ls -ld /app/cache"
```

## Making Tmpfs Read-Only

In some cases, you may want to mount a tmpfs as read-only. This is useful for creating empty directories that the container can see but not write to.

```bash
# Mount a read-only tmpfs
podman run --rm -it \
  --tmpfs /secure-dir:ro,size=1m \
  docker.io/library/alpine:latest \
  sh -c "touch /secure-dir/test 2>&1 || echo 'Cannot write to read-only tmpfs'"
# Expected output includes: Cannot write to read-only tmpfs
```

## Combining Read-Only Root with Writable Tmpfs

The most common pattern combines a read-only root filesystem with specific writable tmpfs mounts.

```bash
# Run a Node.js application with read-only root and targeted tmpfs
podman run --rm -d \
  --read-only \
  --tmpfs /tmp:rw,size=64m,mode=1777 \
  --tmpfs /app/node_modules/.cache:rw,size=128m \
  --tmpfs /home/node/.npm:rw,size=32m \
  --name node-app \
  docker.io/library/node:20-alpine \
  sh -c "node -e \"require('http').createServer((req,res)=>{res.end('ok')}).listen(3000)\" "
```

```bash
# Verify the container is running with the correct mounts
podman inspect node-app --format '{{json .HostConfig.Tmpfs}}' | python3 -m json.tool
```

## Using Tmpfs with noexec and nosuid

For additional security, you can prevent execution of binaries and setuid programs on tmpfs mounts.

```bash
# Mount tmpfs with noexec and nosuid flags
podman run --rm -it \
  --tmpfs /tmp:rw,size=32m,noexec,nosuid \
  docker.io/library/alpine:latest \
  sh -c "
    # Write a script to tmpfs
    echo '#!/bin/sh' > /tmp/test.sh
    echo 'echo hello' >> /tmp/test.sh
    chmod +x /tmp/test.sh
    # Attempt to execute it - should fail with noexec
    /tmp/test.sh 2>&1 || echo 'Execution blocked by noexec'
  "
```

## Inspecting Tmpfs Mounts on a Running Container

```bash
# Check all tmpfs mounts for a container
podman inspect node-app --format '{{range .HostConfig.Tmpfs}}{{println .}}{{end}}'
```

```bash
# Use mount command inside the container to see tmpfs mounts
podman exec node-app mount | grep tmpfs
```

## Tmpfs in Podman Compose

```yaml
# docker-compose.yml
services:
  app:
    image: docker.io/library/python:3.12-slim
    read_only: true
    tmpfs:
      - /tmp:size=64m,mode=1777
      - /run:size=8m
      - /var/cache:size=32m
    command: python -m http.server 8000
    ports:
      - "8000:8000"
```

```bash
# Start the compose stack
podman-compose up -d
```

## Cleanup

```bash
# Stop and remove containers
podman stop node-app sized-tmpfs 2>/dev/null
podman rm node-app sized-tmpfs 2>/dev/null
```

## Summary

Configuring tmpfs mounts in Podman gives you precise control over ephemeral writable storage within otherwise locked-down containers. By setting size limits, restricting permissions, and applying noexec and nosuid flags, you ensure that temporary storage serves its purpose without becoming a security liability. When paired with a read-only root filesystem, tmpfs mounts strike the right balance between functionality and security.
