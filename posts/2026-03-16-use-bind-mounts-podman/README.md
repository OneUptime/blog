# How to Use Bind Mounts with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Volumes, Bind Mounts, Storage

Description: Learn how to use bind mounts in Podman to map specific host files and directories into containers, with practical examples for development, testing, and production.

---

> Bind mounts give containers direct access to specific files and directories on the host, providing a simple way to share data without Podman-managed volumes.

Bind mounts map a specific path on the host to a path inside the container. Unlike named volumes, which Podman manages in its storage directory, bind mounts point directly to existing host filesystem locations. This guide covers their usage, options, and best practices.

---

## Bind Mount Syntax

Podman supports two syntaxes for bind mounts:

```bash
# Short syntax with -v

podman run -v /host/path:/container/path myimage

# Long syntax with --mount
podman run --mount type=bind,source=/host/path,target=/container/path myimage
```

## Mounting a File vs. a Directory

You can bind mount individual files or entire directories:

```bash
# Mount a single file
podman run --rm \
    -v /etc/hostname:/app/hostname:ro \
    alpine:latest \
    cat /app/hostname

# Mount a directory
podman run --rm \
    -v /var/log/myapp:/logs:ro \
    alpine:latest \
    ls /logs
```

## Read-Only and Read-Write

```bash
# Read-only bind mount (container cannot modify files)
podman run --rm \
    -v /config:/app/config:ro \
    myapp:latest

# Read-write (default)
podman run --rm \
    -v /data:/app/data:rw \
    myapp:latest

# Using --mount syntax
podman run --rm \
    --mount type=bind,source=/config,target=/app/config,readonly \
    myapp:latest
```

## SELinux Labels

On SELinux-enabled systems, bind mounts require proper labeling:

```bash
# Private label (only this container accesses the mount)
podman run -v /data:/data:Z myapp:latest

# Shared label (multiple containers can access the same mount)
podman run -v /shared:/shared:z myapp:latest

# The Z and z options relabel the host directory
# Use Z for single-container access, z for multi-container access
```

## Development Workflow: Live Code Reloading

```bash
# Mount source code for live development
podman run -d --name dev-server \
    -v "$(pwd)"/src:/app/src:Z \
    -v "$(pwd)"/package.json:/app/package.json:ro,Z \
    -p 3000:3000 \
    node:20-alpine \
    sh -c "cd /app && npm install && npm run dev"

# Edit files on your host, changes reflect immediately in the container
```

## Bind Mount for Configuration

```bash
# Mount a custom configuration file
podman run -d --name redis \
    -v "$(pwd)"/redis.conf:/usr/local/etc/redis/redis.conf:ro,Z \
    -p 6379:6379 \
    redis:alpine \
    redis-server /usr/local/etc/redis/redis.conf
```

## Bind Mount for Logs

```bash
# Write container logs to a host directory
mkdir -p /var/log/myapp

podman run -d --name myapp \
    -v /var/log/myapp:/app/logs:Z \
    myapp:latest

# Logs are now accessible on the host
tail -f /var/log/myapp/app.log
```

## Handling Permissions in Rootless Mode

```bash
# Problem: Container user cannot write to host directory
# Solution 1: Use --userns=keep-id
podman run --rm \
    --userns=keep-id \
    -v "$(pwd)"/data:/app/data:Z \
    myapp:latest

# Solution 2: Set permissions on the host directory
chmod 777 /data/shared
podman run -v /data/shared:/app/data:Z myapp:latest

# Solution 3: Run as a specific user
podman run --rm \
    --user $(id -u):$(id -g) \
    -v "$(pwd)"/data:/app/data:Z \
    myapp:latest
```

## Propagation Options

Control how mount events propagate between the host and container:

```bash
# Default propagation (rprivate)
podman run -v /data:/data myapp:latest

# Shared propagation (mounts in host/container visible to each other)
podman run -v /data:/data:shared myapp:latest

# Slave propagation (host mounts visible in container, not vice versa)
podman run -v /data:/data:slave myapp:latest

# Using --mount syntax
podman run --mount type=bind,source=/data,target=/data,bind-propagation=shared myapp:latest
```

## Multiple Bind Mounts

```bash
# Mount several paths
podman run -d --name webapp \
    -v "$(pwd)"/src:/app/src:Z \
    -v "$(pwd)"/public:/app/public:ro,Z \
    -v "$(pwd)"/config:/app/config:ro,Z \
    -v /tmp/app-cache:/app/cache:Z \
    -p 8080:8080 \
    webapp:latest
```

## Bind Mount Gotchas

```bash
# Gotcha 1: Non-existent host paths fail
podman run --rm -v /nonexistent/path:/data alpine:latest ls -la /data
# Podman returns an error; pre-create host files and directories before mounting

# Gotcha 2: Bind mount hides existing container content
# If /app/config has files in the image, mounting over it hides them
podman run -v /empty/dir:/app/config myapp:latest
# The original /app/config files are hidden

# Gotcha 3: Relative host paths must start with ./
# A source like data:/app/data is treated as a named volume, not ./data
podman run -v "$(pwd)/data":/app/data:Z myapp:latest
```

## Summary

Bind mounts map host paths directly into containers using `-v /host:/container` or `--mount type=bind`. They are ideal for development, configuration injection, and log collection. Use `:ro` for read-only access, `:Z` or `:z` for SELinux, and `--userns=keep-id` for rootless permission handling. Use absolute host paths, or relative host paths that start with `./`.
