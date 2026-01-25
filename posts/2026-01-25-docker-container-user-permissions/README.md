# How to Set Up Docker Container User Permissions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Security, DevOps, Linux, Permissions

Description: Configure container user permissions properly to avoid running as root, handle volume ownership, and implement the principle of least privilege in Docker containers.

---

Running containers as root is a security risk. If an attacker escapes the container, they have root access to the host. This guide covers setting up proper user permissions in Docker containers, handling volume ownership issues, and implementing security best practices.

## The Problem with Root

By default, Docker containers run as root (UID 0). This user inside the container maps to root on the host:

```bash
# Default container runs as root
docker run --rm alpine whoami
# root

docker run --rm alpine id
# uid=0(root) gid=0(root)

# Files created in volumes are owned by root on host
docker run --rm -v $(pwd)/data:/data alpine touch /data/file.txt
ls -la data/file.txt
# -rw-r--r-- 1 root root 0 Jan 25 10:00 file.txt
```

## Creating Non-Root Users in Dockerfiles

Add a dedicated user for your application:

```dockerfile
FROM node:18-alpine

# Create app user with specific UID/GID
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Create app directory with correct ownership
WORKDIR /app
RUN chown -R appuser:appgroup /app

# Copy files with correct ownership
COPY --chown=appuser:appgroup package*.json ./
RUN npm ci --only=production

COPY --chown=appuser:appgroup . .

# Switch to non-root user before running
USER appuser

EXPOSE 3000
CMD ["node", "server.js"]
```

For Debian/Ubuntu based images:

```dockerfile
FROM python:3.11-slim

# Create user with home directory
RUN useradd --create-home --shell /bin/bash appuser

WORKDIR /home/appuser/app
COPY --chown=appuser:appuser requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=appuser:appuser . .

USER appuser
CMD ["python", "app.py"]
```

## Handling Volume Permissions

Volume permission issues are the most common frustration with non-root containers. The container user needs to match the host user owning the volume.

### Solution 1: Match UID/GID with Host User

```bash
# Find your user ID on the host
id -u  # e.g., 1000
id -g  # e.g., 1000

# Build with matching UID/GID
docker build --build-arg UID=$(id -u) --build-arg GID=$(id -g) -t myapp .
```

```dockerfile
FROM node:18-alpine

ARG UID=1000
ARG GID=1000

# Create user matching host user IDs
RUN addgroup -g $GID -S appgroup && \
    adduser -u $UID -S appuser -G appgroup

WORKDIR /app
RUN chown -R appuser:appgroup /app

USER appuser
# ... rest of Dockerfile
```

### Solution 2: Use an Entrypoint Script

Handle permission setup at runtime:

```dockerfile
FROM node:18-alpine

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.js"]
```

```bash
#!/bin/sh
# entrypoint.sh

# If running as root, fix permissions and switch to appuser
if [ "$(id -u)" = "0" ]; then
  # Create user if it does not exist
  if ! id -u appuser > /dev/null 2>&1; then
    addgroup -g ${GID:-1000} -S appgroup
    adduser -u ${UID:-1000} -S appuser -G appgroup
  fi

  # Fix ownership of mounted volumes
  chown -R appuser:appgroup /app/data 2>/dev/null || true

  # Re-exec as appuser
  exec su-exec appuser "$@"
fi

# If already running as non-root, just execute
exec "$@"
```

### Solution 3: Run with --user Flag

Override the user at runtime:

```bash
# Run as current host user
docker run --rm -u $(id -u):$(id -g) -v $(pwd)/data:/data myapp

# Verify user inside container
docker run --rm -u $(id -u):$(id -g) alpine id
```

In Docker Compose:

```yaml
version: '3.8'
services:
  api:
    image: myapp:latest
    user: "${UID:-1000}:${GID:-1000}"
    volumes:
      - ./data:/app/data
```

## Handling Read-Only Root Filesystem

For maximum security, make the root filesystem read-only:

```yaml
version: '3.8'
services:
  api:
    image: myapp:latest
    read_only: true
    tmpfs:
      # Allow writes to /tmp
      - /tmp:mode=1777,size=100m
      # Allow writes to app-specific directories
      - /app/cache:mode=0755,uid=1000,gid=1000
    volumes:
      # Persistent data with correct permissions
      - api-data:/app/data
```

```bash
# Run command equivalent
docker run --rm \
  --read-only \
  --tmpfs /tmp:mode=1777 \
  --user 1000:1000 \
  myapp
```

## User Namespace Remapping

User namespace remapping adds another layer of security by mapping container UIDs to unprivileged host UIDs:

```json
// /etc/docker/daemon.json
{
  "userns-remap": "default"
}
```

```bash
# After enabling userns-remap
# Container root (UID 0) maps to host subordinate UID
docker run --rm alpine id
# uid=0(root) gid=0(root)  <- Inside container

# But on host, files are owned by subordinate UID
docker run --rm -v $(pwd)/test:/test alpine touch /test/file
ls -la test/file
# -rw-r--r-- 1 100000 100000 0 Jan 25 10:00 file
```

## Security Best Practices

### 1. Drop All Capabilities

```yaml
version: '3.8'
services:
  api:
    image: myapp:latest
    user: "1000:1000"
    cap_drop:
      - ALL
    # Add back only what is needed
    cap_add:
      - NET_BIND_SERVICE  # If binding to ports < 1024
```

### 2. Use No New Privileges

Prevent privilege escalation:

```yaml
services:
  api:
    image: myapp:latest
    security_opt:
      - no-new-privileges:true
```

### 3. Seccomp Profiles

Restrict system calls:

```yaml
services:
  api:
    image: myapp:latest
    security_opt:
      - seccomp:/path/to/seccomp-profile.json
```

## Debugging Permission Issues

### Check Current User and Groups

```bash
# Inside container
docker exec mycontainer id
docker exec mycontainer whoami

# Check file permissions
docker exec mycontainer ls -la /app
docker exec mycontainer stat /app/data
```

### Test Write Access

```bash
# Test if user can write to volume
docker exec mycontainer touch /app/data/test.txt

# Check effective permissions
docker exec mycontainer test -w /app/data && echo "Writable" || echo "Not writable"
```

### Compare Host and Container Ownership

```bash
# On host
ls -la ./data
stat ./data

# In container
docker exec mycontainer ls -la /app/data
docker exec mycontainer stat /app/data

# Numeric IDs for comparison
ls -ln ./data
docker exec mycontainer ls -ln /app/data
```

## Multi-User Containers

Some applications need multiple users (e.g., web server + application):

```dockerfile
FROM nginx:alpine

# Create multiple users
RUN addgroup -g 1001 -S webgroup && \
    adduser -u 1001 -S webuser -G webgroup && \
    adduser -u 1002 -S appuser -G webgroup

# Set up directories with appropriate ownership
RUN mkdir -p /var/cache/nginx /var/log/nginx && \
    chown -R webuser:webgroup /var/cache/nginx /var/log/nginx

# Set up application directory
COPY --chown=appuser:webgroup /app /app

# Run nginx as webuser (configured in nginx.conf)
USER webuser
```

## Init Systems and PID 1

When not running as root, handle process reaping properly:

```yaml
version: '3.8'
services:
  api:
    image: myapp:latest
    init: true  # Use tini as PID 1
    user: "1000:1000"
```

Or include tini in your image:

```dockerfile
FROM node:18-alpine

# Install tini
RUN apk add --no-cache tini

# Set up user
RUN adduser -D -u 1000 appuser
USER appuser

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
```

## Complete Example

Here is a production-ready Dockerfile with proper user setup:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine

# Install tini for proper init
RUN apk add --no-cache tini

# Create non-root user
ARG UID=1000
ARG GID=1000
RUN addgroup -g $GID -S appgroup && \
    adduser -u $UID -S appuser -G appgroup

# Set up application directory
WORKDIR /app
RUN chown -R appuser:appgroup /app

# Copy node_modules from builder
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules

# Copy application code
COPY --chown=appuser:appgroup . .

# Switch to non-root user
USER appuser

# Use tini as init
ENTRYPOINT ["/sbin/tini", "--"]

EXPOSE 3000
CMD ["node", "server.js"]
```

---

Running containers as non-root users is essential for security. Match UIDs with host users for volume access, use entrypoint scripts for dynamic permission handling, and always drop unnecessary capabilities. The extra setup effort pays off by limiting the blast radius if a container is compromised.
