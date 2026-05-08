# How to Mount a Host Directory as a Volume in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Volumes, Bind Mounts, Storage

Description: Learn how to mount host directories into Podman containers for development workflows, data sharing, and configuration management.

---

> Mounting host directories into containers gives you direct access to files on the host, making it ideal for development where you want changes reflected immediately.

Sometimes you need containers to access files directly from the host filesystem. Whether you are developing an application, sharing configuration files, or processing data stored on the host, mounting a host directory is the solution. This guide shows you how to do it with Podman.

---

## Basic Host Directory Mount

```bash
# Mount a host directory into a container

podman run --rm -v /path/on/host:/path/in/container alpine:latest ls /path/in/container
```

The syntax is `-v <host-path>:<container-path>`.

## Development Workflow Example

Mount your project directory so code changes are immediately visible inside the container:

```bash
# Mount the current project directory
podman run --rm -it \
    -v $(pwd):/app:Z \
    -w /app \
    node:20-alpine \
    npm run dev
```

The `:Z` suffix handles SELinux relabeling on systems with SELinux enabled (like Fedora and RHEL).

## Read-Only Mounts

Prevent the container from modifying host files:

```bash
# Mount a configuration directory as read-only
podman run --rm \
    -v /etc/myapp/config:/app/config:ro \
    myapp:latest

# The container can read but not modify files in /app/config
```

## SELinux Options

On SELinux-enabled systems, you need to label the mount:

```bash
# :Z - Private unshared label (most common)
podman run -v /data:/data:Z myapp:latest

# :z - Shared label (multiple containers can access)
podman run -v /shared:/shared:z myapp:latest

# Without the label on SELinux systems, you may get "Permission denied"
```

## Mount Options

```bash
# Read-only mount
podman run -v /host/path:/container/path:ro alpine:latest

# Read-write mount (default)
podman run -v /host/path:/container/path:rw alpine:latest

# Combine options
podman run -v /host/path:/container/path:ro,Z alpine:latest
```

## Practical Examples

### Serving static files with Nginx:

```bash
# Serve files from a host directory
podman run -d --name web \
    -v /srv/www/html:/usr/share/nginx/html:ro,Z \
    -p 8080:80 \
    nginx:alpine
```

### Processing data files:

```bash
# Mount a data directory for processing
podman run --rm \
    -v /data/input:/input:ro,Z \
    -v /data/output:/output:Z \
    python:3.11 \
    python /input/process.py --output /output/results.csv
```

### Sharing configuration files:

```bash
# Mount a custom nginx config
podman run -d --name nginx \
    -v /srv/nginx/custom.conf:/etc/nginx/nginx.conf:ro,Z \
    -v /srv/nginx/logs:/var/log/nginx:Z \
    -p 80:80 \
    nginx:alpine
```

## Using --mount Instead of -v

The `--mount` flag provides a more explicit syntax:

```bash
# Equivalent to -v /data:/app/data:ro
podman run --rm \
    --mount type=bind,source=/data,target=/app/data,readonly=true \
    alpine:latest \
    ls /app/data
```

## Permissions and Ownership

Rootless Podman maps user IDs differently, which can cause permission issues:

```bash
# Check the UID mapping
podman unshare cat /proc/self/uid_map

# If the container process runs as a different UID, fix with userns
podman run --rm \
    --userns=keep-id \
    -v $(pwd):/app:Z \
    -w /app \
    node:20-alpine \
    ls -la

# The --userns=keep-id flag maps your host UID to the same UID inside the container
```

## Mounting Multiple Directories

```bash
# Mount several host directories
podman run -d --name myapp \
    -v /app/src:/app/src:Z \
    -v /app/config:/app/config:ro,Z \
    -v /app/logs:/app/logs:Z \
    -v /data/uploads:/app/uploads:Z \
    myapp:latest
```

## Creating the Host Directory First

If the host directory does not exist, Podman returns an error. Create it explicitly before mounting it:

```bash
# Create the directory with proper permissions
mkdir -p /data/myapp
chmod 755 /data/myapp

# Then mount it
podman run -v /data/myapp:/app/data:Z myapp:latest
```

## Summary

Mount host directories into Podman containers with `-v /host/path:/container/path`. Add `:ro` for read-only access and `:Z` or `:z` on SELinux systems. Use `--userns=keep-id` in rootless mode to handle UID mapping. Host directory mounts are ideal for development workflows, configuration sharing, and processing host-resident data.
