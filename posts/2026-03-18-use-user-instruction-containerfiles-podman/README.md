# How to Use USER Instruction in Containerfiles for Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Containerfile, User, Security, Container Hardening

Description: Learn how to use the USER instruction in Podman Containerfiles to run containers as non-root users, improve security posture, and follow container hardening best practices.

---

> Running containers as root is one of the most common security mistakes. The USER instruction lets you switch to a non-root user, dramatically reducing the impact of container breakouts and application vulnerabilities.

By default, containers run as the root user. This means any process inside the container has full administrative privileges within that container, and depending on the configuration, potentially on the host system as well. The USER instruction in a Containerfile changes which user runs subsequent instructions and the container's main process, forming a critical layer of defense in your container security strategy.

This guide covers everything you need to know about the USER instruction in Podman Containerfiles, from basic usage to advanced patterns for rootless containers.

---

## Why Running as Root Is Dangerous

When a container runs as root:

- A compromised application has full control over the container filesystem
- Container escape vulnerabilities are more impactful when the attacker is root
- Processes can modify system files, install packages, and change configurations
- Bind-mounted host directories are writable with root permissions

Podman mitigates some of these risks with its rootless mode, but the USER instruction provides defense in depth regardless of how Podman itself is running.

## Basic Syntax

The USER instruction accepts a username or UID, optionally with a group or GID:

```dockerfile
# By username

USER appuser

# By UID
USER 1001

# With group
USER appuser:appgroup

# By UID and GID
USER 1001:1001
```

## Creating and Using a Non-Root User

The most common pattern is creating a dedicated user for your application:

```dockerfile
FROM python:3.12-slim

# Create a non-root user and group
RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup --shell /bin/false --create-home appuser

WORKDIR /app

# Install dependencies as root (needs write access to system directories)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files with correct ownership
COPY --chown=appuser:appgroup . .

# Switch to non-root user for runtime
USER appuser

EXPOSE 8000
CMD ["python", "app.py"]
```

On Alpine-based images, use `addgroup` and `adduser` instead:

```dockerfile
FROM node:24-alpine

# Alpine uses different commands for user creation
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup -s /bin/false

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --chown=appuser:appgroup . .

USER appuser

EXPOSE 3000
CMD ["node", "server.js"]
```

## Using Numeric UIDs

Using numeric UIDs instead of usernames is often preferred in production because it avoids username lookups in `/etc/passwd` and works with minimal or distroless images that may not contain the user name you want:

```dockerfile
FROM golang:1.26-alpine AS builder

WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -o server .

FROM gcr.io/distroless/static-debian12

# Numeric UIDs do not require a passwd entry
COPY --from=builder /app/server /server

USER 1001

EXPOSE 8080
CMD ["/server"]
```

```dockerfile
FROM python:3.12-slim

# Create user with specific UID/GID
RUN groupadd --gid 10001 app && \
    useradd --uid 10001 --gid app --no-create-home app

WORKDIR /app
COPY --chown=10001:10001 . .
RUN pip install --no-cache-dir -r requirements.txt

USER 10001

CMD ["python", "app.py"]
```

## USER Instruction Scope

The USER instruction affects all subsequent instructions in the Containerfile:

```dockerfile
FROM ubuntu:24.04

# These run as root
RUN apt-get update && apt-get install -y python3
RUN groupadd --gid 1001 app && useradd --uid 1001 --gid app app

# Everything after this runs as 'app'
USER app

# This RUN executes as 'app', not root
RUN whoami  # Outputs: app

# COPY destination is owned by root unless --chown is used
COPY app.py /app/  # Owned by root:root (might not be writable)

# CMD runs as 'app'
CMD ["python3", "/app/app.py"]
```

You can switch users multiple times:

```dockerfile
FROM python:3.12-slim

RUN groupadd --gid 1001 app && useradd --uid 1001 --gid app app

# Install system packages as root
USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages as root (needs /usr/local access)
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Switch to non-root for application code
USER app
COPY --chown=app:app . .

CMD ["python", "app.py"]
```

## File Ownership Patterns

Proper file ownership is essential when running as a non-root user:

### Using --chown with COPY

```dockerfile
FROM node:24-alpine

RUN addgroup -g 1001 -S app && adduser -u 1001 -S app -G app

WORKDIR /app

# Set ownership during copy
COPY --chown=app:app package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --chown=app:app . .

USER app
CMD ["node", "server.js"]
```

### Pre-Creating Directories

```dockerfile
FROM python:3.12-slim

RUN groupadd --gid 1001 app && \
    useradd --uid 1001 --gid app app && \
    mkdir -p /app/data /app/logs /app/cache && \
    chown -R app:app /app

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=app:app . .

USER app
CMD ["python", "app.py"]
```

### Handling Writable Directories

```dockerfile
FROM node:24-alpine

RUN addgroup -g 1001 -S app && adduser -u 1001 -S app -G app

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --chown=app:app . .

# Create writable directories for the app user
RUN mkdir -p /app/uploads /app/tmp && \
    chown app:app /app/uploads /app/tmp

USER app

EXPOSE 3000
CMD ["node", "server.js"]
```

## Using Existing Users from Base Images

Many base images come with non-root users already defined:

```dockerfile
# Node.js images include a 'node' user
FROM node:24-alpine

WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --chown=node:node . .

USER node
CMD ["node", "server.js"]
```

```dockerfile
# Nginx images include an 'nginx' user
FROM nginx:alpine

COPY --chown=nginx:nginx dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/nginx.conf

# Note: rootless Podman cannot publish host ports < 1024 by default
# Use a custom config that listens on 8080 instead
USER nginx
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

```dockerfile
# Python images don't include a non-root user by default
# Create one explicitly
FROM python:3.12-slim

RUN useradd --uid 1001 --create-home appuser
```

## Multi-Stage Builds with USER

Each build stage has its own USER context:

```dockerfile
# Build stage runs as root (default)
FROM golang:1.26-alpine AS builder

WORKDIR /app
COPY . .
RUN go build -o server .

# Runtime stage with non-root user
FROM alpine:3.23

RUN addgroup -g 1001 -S app && adduser -u 1001 -S app -G app

WORKDIR /app
COPY --from=builder --chown=app:app /app/server .

USER app

EXPOSE 8080
CMD ["./server"]
```

## Podman Rootless Mode and USER

Podman's rootless mode adds an extra layer of security. When Podman runs rootless, the root user inside the container is mapped to a non-root user on the host:

```bash
# Even with USER root in the Containerfile,
# the process runs as a non-root user on the host
podman run --rm alpine id
# uid=0(root) gid=0(root) -- but mapped to non-root on host

# Keep user namespace mapping when using bind mounts
podman run --userns=keep-id -v ./data:/app/data:Z myapp
# The container user matches your host UID
```

### Using --userns=keep-id

When you need file ownership to match between host and container:

```bash
# Your host UID maps directly into the container
podman run --userns=keep-id \
    -v ./project:/app:Z \
    -w /app \
    myapp
```

## Entrypoint Scripts with USER

Sometimes you need root for initialization but want to run the application as a non-root user:

```dockerfile
FROM python:3.12-slim

RUN groupadd --gid 1001 app && \
    useradd --uid 1001 --gid app --create-home app

WORKDIR /app

COPY requirements.txt .
RUN apt-get update && apt-get install -y --no-install-recommends \
    gosu \
    && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=app:app . .
COPY --chmod=755 entrypoint.sh /usr/local/bin/

# Start as root, the entrypoint drops privileges
ENTRYPOINT ["entrypoint.sh"]
CMD ["python", "app.py"]
```

The entrypoint script:

```bash
#!/bin/bash
set -e

# Run initialization tasks as root
echo "Initializing application..."

# Fix permissions if needed
chown -R app:app /app/data 2>/dev/null || true

# Drop privileges and run the application as 'app'
exec gosu app "$@"
```

Alternatively, use `tini` for proper signal handling:

```dockerfile
FROM node:24-alpine

RUN apk add --no-cache tini
RUN addgroup -g 1001 -S app && adduser -u 1001 -S app -G app

WORKDIR /app
COPY --chown=app:app . .
RUN npm ci --omit=dev

USER app
ENTRYPOINT ["tini", "--"]
CMD ["node", "server.js"]
```

## Verifying USER Configuration

Check that your container runs as the expected user:

```bash
# Check the running user
podman run --rm myapp whoami

# Check UID and GID
podman run --rm myapp id

# Verify file ownership
podman run --rm myapp ls -la /app/

# Override user at runtime (for debugging)
podman run --rm --user root myapp whoami
```

## Common Mistakes

```dockerfile
# Mistake 1: Setting USER too early
FROM python:3.12-slim
USER appuser  # Fails: user doesn't exist yet
RUN apt-get update  # Fails: no root access

# Mistake 2: Not setting ownership on copied files
USER app
COPY . /app/  # Files owned by root, app can't write to them

# Mistake 3: Forgetting writable directories
USER app
CMD ["python", "app.py"]
# App crashes because it can't write to /app/logs/

# Mistake 4: Creating user without specific UID
RUN useradd appuser  # UID assigned dynamically, unpredictable
# Better: useradd --uid 1001 appuser

# Mistake 5: Publishing privileged host ports with rootless Podman
USER app
EXPOSE 80  # Rootless Podman cannot publish host port 80 by default
# Fix: Listen on and publish port 8080 or higher
```

## Security Checklist

```dockerfile
FROM node:24-alpine

# 1. Create a dedicated user with specific UID/GID
RUN addgroup -g 1001 -S app && \
    adduser -u 1001 -S app -G app -s /bin/false

# 2. Install dependencies as root
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 3. Copy files with correct ownership
COPY --chown=app:app . .

# 4. Create necessary writable directories
RUN mkdir -p /app/tmp && chown app:app /app/tmp

# 5. Drop privileges
USER app

# 6. Use a non-privileged port
EXPOSE 3000

# 7. Use exec form for CMD to get proper signal handling
CMD ["node", "server.js"]
```

## Conclusion

The USER instruction is a fundamental security measure for containerized applications. Always create a dedicated non-root user with a specific UID, install system packages and dependencies before switching users, set proper file ownership with `--chown`, and ensure your application uses non-privileged ports. Combined with Podman's rootless mode, the USER instruction provides defense in depth that limits the damage from application vulnerabilities and container escapes. Make it a standard part of every production Containerfile, and your containers will be significantly harder for attackers to exploit.
