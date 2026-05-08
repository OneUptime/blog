# How to Run a Container with a Specific User in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Security, User Management

Description: Learn how to run Podman containers as a specific user for security hardening, file permission management, and principle of least privilege.

---

> Running containers as a specific user limits the damage from container breakouts and ensures proper file ownership.

By default, many container images run their processes as root. This is a security risk - especially for rootful containers, where a container breakout can expose host root privileges. Running containers as a non-root user is a security best practice that limits the impact of potential vulnerabilities. This guide covers all methods for specifying the user.

---

## Running as a Specific User

Use the `--user` or `-u` flag to specify the user:

```bash
# Run as user with UID 1000

podman run -it --rm --user 1000 alpine id
# Output: uid=1000 gid=0(root)

# Run as a specific user and group
podman run -it --rm --user 1000:1000 alpine id
# Output: uid=1000 gid=1000

# Run as a named user (must exist in the image)
podman run -it --rm --user nobody alpine id
# Output: uid=65534(nobody) gid=65534(nobody)
```

## Running as a Named User

Some images include non-root users you can reference by name:

```bash
# Node.js image includes a 'node' user
podman run -it --rm --user node node:20 id
# Output: uid=1000(node) gid=1000(node)

# PostgreSQL image includes a 'postgres' user
podman run -it --rm --user postgres postgres:16 id

# Nginx image includes an 'nginx' user
podman run -it --rm --user nginx nginx id
```

## Checking the Default User

See which user an image runs as by default:

```bash
# Check the default user in the image config
podman image inspect nginx --format '{{.User}}'

# If empty, the container runs as root (UID 0)
podman run --rm nginx id
# Output: uid=0(root) gid=0(root)
```

## User with Volume Mounts

When mounting host directories, the container user must have access to the files:

```bash
# For rootful containers, create a directory owned by UID 1000
mkdir -p ./data
sudo chown 1000:1000 ./data

# Run as UID 1000 with the mounted directory
podman run -it --rm \
    --user 1000:1000 \
    -v ./data:/app/data \
    alpine sh -c "touch /app/data/test.txt && ls -la /app/data/"

# The file is created as UID 1000 on the host
ls -la ./data/
```

## Using --userns=keep-id

The `--userns=keep-id` flag maps your host UID into the container, which is particularly useful for development:

```bash
# Your host UID is mapped into the container
podman run -it --rm --userns=keep-id alpine id
# Output: uid=1000 gid=1000

# Files created in mounted volumes will have your host UID
podman run -it --rm \
    --userns=keep-id \
    -v $(pwd):/workspace \
    -w /workspace \
    node:20 sh -c "npm init -y && ls -la package.json"

# package.json is owned by your user on the host
```

## Non-Root User in Dockerfiles

The best practice is to define a non-root user in your Dockerfile:

```bash
# Example: Create and use a non-root user in a Dockerfile
cat > Dockerfile << 'EOF'
FROM node:20-alpine

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set working directory
WORKDIR /app

# Copy application files
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Change ownership to the app user
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

EXPOSE 3000
CMD ["node", "server.js"]
EOF

# Build and run - the container runs as appuser
podman build -t myapp .
podman run -d --name app -p 3000:3000 myapp

# Verify
podman exec app id
# Output: uid=100(appuser) gid=101(appgroup)
```

## Overriding the Image User

You can override the USER specified in the Dockerfile:

```bash
# The image's Dockerfile sets USER appuser
# But you can override it at runtime
podman run -it --rm --user root myapp bash

# This is useful for debugging but should not be used in production
```

## Running with Capabilities Instead of Root

Instead of running as root, grant specific capabilities:

```bash
# Run as non-root but with NET_BIND_SERVICE capability
podman run -d --name web \
    --user 1000:1000 \
    --cap-add NET_BIND_SERVICE \
    -p 8080:80 \
    my-web-server

# Drop all capabilities and add only what is needed
podman run -d --name app \
    --user 1000:1000 \
    --cap-drop ALL \
    --cap-add NET_BIND_SERVICE \
    -p 8080:80 \
    my-web-server
```

## Checking Running User Inside Containers

```bash
# Start a container
podman run -d --name app --user 1000:1000 alpine sleep 300

# Check which user processes are running as
podman top app user,pid,comm

# Check from inside the container
podman exec app id
```

## Troubleshooting Permission Issues

```bash
# Issue: Permission denied when writing to mounted volume
# Solution for rootful containers: Match the container user to the host file owner
ls -la ./data  # Check host ownership
podman run --user $(stat -c %u ./data):$(stat -c %g ./data) -v ./data:/data alpine touch /data/test

# Issue: A non-root process cannot bind to a low port inside the container
# Solution: Add NET_BIND_SERVICE capability
podman run --user 1000 --cap-add NET_BIND_SERVICE -p 8080:80 nginx

# Issue: Application fails because it expects to run as root
# Solution: Use --userns=keep-id or fix file permissions in the image
podman run --userns=keep-id myapp
```

## Quick Reference

| Command | Purpose |
|---|---|
| `--user 1000` | Run as UID 1000 |
| `--user 1000:1000` | Run as UID 1000, GID 1000 |
| `--user nobody` | Run as named user |
| `--userns=keep-id` | Map host UID into container |
| `--cap-add NET_BIND_SERVICE` | Add specific capability |

## Summary

Running containers as a specific user is a fundamental security practice. Use `--user` to specify a UID/GID, `--userns=keep-id` for development with volume mounts, and define a non-root USER in your Dockerfiles for production images. Prefer granting specific capabilities over running as root. This approach follows the principle of least privilege and significantly reduces the attack surface of your containerized applications.
