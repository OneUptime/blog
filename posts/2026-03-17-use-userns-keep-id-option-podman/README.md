# How to Use the --userns=keep-id Option in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Rootless, User Namespaces, keep-id

Description: Learn how to use the --userns=keep-id option in Podman to preserve your host UID inside the container for seamless file permission handling.

---

> The `--userns=keep-id` option maps your host UID and GID directly into the container, eliminating the file permission mismatches that commonly occur with rootless containers and bind mounts.

One of the most common challenges with rootless Podman is file permission mismatches. By default, container root (UID 0) maps to your host UID, but if the container process runs as a non-root UID, it maps to a high-numbered subordinate UID that may not have access to your files. The `keep-id` option solves this by preserving your host UID inside the container.

---

## Basic Usage

```bash
# Without keep-id: your host UID appears as root inside

podman run --rm alpine:latest id
# Output: uid=0(root) gid=0(root)

# With keep-id: your host UID is preserved inside
podman run --rm --userns=keep-id alpine:latest id
# Output: uid=1000(username) gid=1000(username)
```

## Solving Bind Mount Permission Issues

```bash
# Default rootless behavior: container root maps to your host user
mkdir -p /tmp/test-project
podman run --rm -v /tmp/test-project:/app alpine:latest touch /app/file.txt
ls -la /tmp/test-project/file.txt
# Owned by your user (because container root maps to your UID)

# But if the container runs as non-root user, it fails
podman run --rm --user 1000 -v /tmp/test-project:/app alpine:latest touch /app/file2.txt
# Permission denied!

# Solution: use keep-id
podman run --rm --userns=keep-id -v /tmp/test-project:/app alpine:latest touch /app/file3.txt
ls -la /tmp/test-project/file3.txt
# Owned by your user, works perfectly
# On SELinux systems, add :Z or :z to the volume option if labeling blocks access

rm -rf /tmp/test-project
```

## Development Workflow with keep-id

```bash
# Run a development server with your project files
podman run -it --rm \
  --userns=keep-id \
  -v ./:/app \
  -w /app \
  -p 3000:3000 \
  node:18-alpine npm run dev

# Files created by the development server are owned by your user
# No permission issues when editing from your host editor
```

## Keep-id with Specific UID and GID

```bash
# Map to a specific UID inside the container
podman run --rm \
  --userns=keep-id:uid=1000,gid=1000 \
  alpine:latest id

# This ensures UID 1000 inside matches your host UID
```

## Common Development Scenarios

```bash
# Python development with keep-id
podman run -it --rm \
  --userns=keep-id \
  -v ./:/app \
  -w /app \
  python:3.11-slim pip install -e .

# Go development with keep-id
podman run -it --rm \
  --userns=keep-id \
  -v ./:/app \
  -w /app \
  golang:1.21 go build ./...

# Rust development with keep-id
podman run -it --rm \
  --userns=keep-id \
  -v ./:/app \
  -w /app \
  rust:latest cargo build
```

## Keep-id with Running Services

```bash
# Run a database with data directory owned by your user
podman run -d \
  --name dev-db \
  --user postgres \
  --userns=keep-id:uid=999,gid=999 \
  -v ./pgdata:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=devpass \
  -p 5432:5432 \
  postgres:15

# UID/GID 999 matches the postgres user in the official postgres:15 image
```

## Checking the Active Mapping

```bash
# Verify the UID mapping with keep-id
podman run --rm --userns=keep-id alpine:latest cat /proc/self/uid_map

# Compare with the default mapping
podman run --rm alpine:latest cat /proc/self/uid_map
```

## Limitations

```bash
# keep-id may not work with containers that require root inside
# For example, containers that need to bind to port 80
podman run --rm --userns=keep-id -p 8080:80 nginx:latest
# Nginx may fail because it cannot run as non-root on port 80

# Solution: use the unprivileged nginx image
podman run --rm --userns=keep-id -p 8080:8080 nginxinc/nginx-unprivileged:latest
```

## Summary

The `--userns=keep-id` option is the go-to solution for rootless Podman development workflows. It maps your host UID directly into the container, eliminating permission mismatches with bind mounts. This makes it ideal for development where you edit files on the host and run builds or servers inside the container. The main limitation is that containers expecting to run as root may not work, but unprivileged variants of most images are available.
