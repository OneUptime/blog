# How to Run Docker Containers as Non-Root Users

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Security, Non-Root, Containers, DevSecOps

Description: Learn how to configure Docker containers to run as non-root users for improved security, including Dockerfile best practices, runtime options, and handling permission challenges.

---

By default, processes inside Docker containers run as root. If an attacker exploits a vulnerability in your application, they have root access inside the container and potentially pathways to the host system. Running containers as non-root users is a fundamental security practice that limits the blast radius of container compromises.

## Why Non-Root Matters

Running as root inside a container is dangerous because:

1. **Container escapes**: Some vulnerabilities allow escaping to the host. Root in container = root on host.
2. **Privilege escalation**: Root can modify system files, install packages, and access sensitive data.
3. **Unnecessary capabilities**: Root has capabilities your application doesn't need.
4. **Compliance requirements**: Many security standards (PCI-DSS, HIPAA) require non-root execution.

## Method 1: USER Instruction in Dockerfile

The most common approach is creating a non-root user in your Dockerfile.

### Basic Pattern

```dockerfile
FROM node:18-slim

# Create a non-root user and group
RUN groupadd --gid 1000 appgroup && \
    useradd --uid 1000 --gid appgroup --shell /bin/bash --create-home appuser

# Set working directory
WORKDIR /app

# Copy files and set ownership
COPY --chown=appuser:appgroup package*.json ./
RUN npm ci --only=production

COPY --chown=appuser:appgroup . .

# Switch to non-root user
USER appuser

# App runs as appuser, not root
CMD ["node", "server.js"]
```

### Alpine Linux Example

```dockerfile
FROM alpine:3.19

# Alpine uses addgroup/adduser
RUN addgroup -g 1000 appgroup && \
    adduser -u 1000 -G appgroup -s /bin/sh -D appuser

WORKDIR /app
COPY --chown=appuser:appgroup . .

USER appuser
CMD ["./myapp"]
```

### Python Example

```dockerfile
FROM python:3.11-slim

# Create user
RUN useradd --create-home --shell /bin/bash appuser

# Install dependencies as root
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application with correct ownership
COPY --chown=appuser:appuser . .

# Switch to non-root
USER appuser

CMD ["python", "app.py"]
```

## Method 2: Runtime User Override

Override the user at runtime without modifying the image.

### docker run

```bash
# Run as specific UID
docker run --user 1000 nginx

# Run as specific UID:GID
docker run --user 1000:1000 nginx

# Run as current host user
docker run --user $(id -u):$(id -g) nginx
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    image: nginx
    user: "1000:1000"

  # Using environment variable
  worker:
    image: my-worker
    user: "${UID}:${GID}"
```

Run with:
```bash
UID=$(id -u) GID=$(id -g) docker-compose up
```

## Method 3: Kubernetes Security Context

In Kubernetes, use security contexts to enforce non-root execution.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    runAsGroup: 1000
    fsGroup: 1000
  containers:
    - name: app
      image: my-app
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop:
            - ALL
```

## Handling Common Permission Issues

### Issue 1: Writing to Directories

If your app needs to write files, create directories with correct ownership.

```dockerfile
FROM node:18-slim

RUN groupadd -g 1000 appgroup && \
    useradd -u 1000 -g appgroup -m appuser

# Create writable directories before switching user
RUN mkdir -p /app/logs /app/tmp /app/uploads && \
    chown -R appuser:appgroup /app

WORKDIR /app
USER appuser

COPY --chown=appuser:appgroup . .

CMD ["node", "server.js"]
```

### Issue 2: Binding to Privileged Ports

Non-root users can't bind to ports below 1024. Use higher ports or port mapping.

```dockerfile
# Use port 8080 instead of 80
FROM nginx:alpine

# Copy custom config using port 8080
COPY nginx.conf /etc/nginx/nginx.conf

# Create non-root user
RUN adduser -D -u 1000 nginx-user && \
    chown -R nginx-user:nginx-user /var/cache/nginx /var/log/nginx /etc/nginx/conf.d

USER nginx-user

EXPOSE 8080
```

```nginx
# nginx.conf
server {
    listen 8080;  # Non-privileged port
    ...
}
```

Map to port 80 at runtime:
```bash
docker run -p 80:8080 my-nginx
```

### Issue 3: Package Installation

Install packages as root, then switch to non-root user.

```dockerfile
FROM ubuntu:22.04

# Install packages as root
RUN apt-get update && \
    apt-get install -y curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m appuser

# Switch to non-root for application
USER appuser
WORKDIR /home/appuser

CMD ["./start.sh"]
```

### Issue 4: Volume Permissions

Volume permissions can be tricky. The container user must have access to mounted directories.

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    image: my-app
    user: "1000:1000"
    volumes:
      - ./data:/app/data

  # Init container to fix permissions
  init-permissions:
    image: alpine
    volumes:
      - ./data:/app/data
    command: chown -R 1000:1000 /app/data
```

Or set permissions on the host:
```bash
mkdir -p ./data
chown -R 1000:1000 ./data
docker-compose up app
```

### Issue 5: Existing Images That Run as Root

For images you can't modify, use runtime options.

```yaml
services:
  postgres:
    image: postgres:15
    user: "999:999"  # postgres user's UID in the image
    volumes:
      - postgres-data:/var/lib/postgresql/data
```

Check what user the image expects:
```bash
docker run --rm postgres:15 id
# uid=999(postgres) gid=999(postgres) groups=999(postgres)
```

## Verifying Non-Root Execution

### Check Running User

```bash
# Inside running container
docker exec my-container whoami
docker exec my-container id

# From docker inspect
docker inspect --format '{{.Config.User}}' my-container
```

### Test That Root is Blocked

```bash
# This should fail if properly configured
docker exec -u root my-container whoami
# Error response from daemon: container ... must run as non-root

# In Kubernetes with runAsNonRoot: true
# Pod will fail to start if image runs as root
```

## Best Practices

### 1. Use Specific UID/GID

```dockerfile
# Consistent UID/GID across images
RUN groupadd --gid 10001 appgroup && \
    useradd --uid 10001 --gid appgroup appuser
```

### 2. Don't Change User Back to Root

```dockerfile
USER appuser

# BAD: switching back to root
USER root
RUN apt-get update

# GOOD: do all root operations before USER instruction
```

### 3. Use --chown with COPY

```dockerfile
# GOOD: files owned by appuser from the start
COPY --chown=appuser:appgroup . .

# BAD: copy as root then change ownership (extra layer)
COPY . .
RUN chown -R appuser:appgroup .
```

### 4. Set HOME Environment Variable

```dockerfile
USER appuser
ENV HOME=/home/appuser
WORKDIR /home/appuser
```

### 5. Drop Capabilities

Even as non-root, drop unnecessary capabilities.

```bash
docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE my-app
```

```yaml
# Kubernetes
securityContext:
  capabilities:
    drop:
      - ALL
    add:
      - NET_BIND_SERVICE  # Only if needed
```

## Complete Secure Dockerfile Example

```dockerfile
# Build stage
FROM node:18-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Production stage
FROM node:18-slim

# Create non-root user with specific UID
RUN groupadd --gid 10001 appgroup && \
    useradd --uid 10001 --gid appgroup --shell /bin/bash --create-home appuser

# Create necessary directories
RUN mkdir -p /app/logs && chown -R appuser:appgroup /app

WORKDIR /app

# Copy from builder with correct ownership
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --chown=appuser:appgroup . .

# Use non-privileged port
ENV PORT=8080
EXPOSE 8080

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["node", "server.js"]
```

## Summary

| Method | When to Use |
|--------|-------------|
| `USER` in Dockerfile | Building your own images |
| `--user` at runtime | Overriding existing images |
| Kubernetes securityContext | Kubernetes deployments |
| `runAsNonRoot: true` | Enforcing non-root policy |

Running containers as non-root is a fundamental security practice. Start by adding `USER` instructions to your Dockerfiles, handle permission issues proactively, and use runtime enforcement as an additional safety net.
