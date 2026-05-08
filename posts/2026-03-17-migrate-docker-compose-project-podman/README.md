# How to Migrate a Docker Compose Project to Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Docker Compose, Migration, podman-compose

Description: Learn how to migrate an existing Docker Compose project to Podman with minimal changes, covering common compatibility issues and solutions.

---

> Migrating from Docker Compose to Podman requires only a few adjustments - mainly image names, volume labels, and rootless networking.

Most Docker Compose projects work with Podman with minimal changes. The main differences involve fully qualified image names, SELinux volume labels, rootless port restrictions, and the absence of a long-running daemon. This guide walks through a complete migration.

---

## Step 1: Install Podman and podman-compose

```bash
# Install Podman

sudo dnf install podman    # Fedora/RHEL
sudo apt install podman    # Ubuntu/Debian

# Install podman-compose
pip3 install podman-compose

# Verify
podman --version
podman-compose --version
```

## Step 2: Update Image Names

```yaml
# Before (Docker shorthand):
services:
  web:
    image: nginx:alpine
  db:
    image: postgres:16

# After (fully qualified):
services:
  web:
    image: docker.io/library/nginx:alpine
  db:
    image: docker.io/library/postgres:16
```

## Step 3: Fix Volume Permissions

```yaml
# Before (Docker):
volumes:
  - ./data:/app/data

# After (Podman with SELinux):
volumes:
  - ./data:/app/data:Z
```

## Step 4: Handle Port Restrictions

```yaml
# Before (Docker runs as root by default):
ports:
  - "80:80"
  - "443:443"

# After (rootless Podman cannot bind below 1024):
ports:
  - "8080:80"
  - "8443:443"

# Or allow low ports system-wide:
# sudo sysctl net.ipv4.ip_unprivileged_port_start=80
```

## Step 5: Keep or Rename Dockerfile

```bash
# Podman accepts both Dockerfile and Containerfile
mv Dockerfile Containerfile
```

```yaml
# If you rename it, specify it in compose:
services:
  app:
    build:
      context: .
      dockerfile: Containerfile
```

## Step 6: Test the Migration

```bash
# Run the compose file with podman-compose
podman-compose up -d

# Check all services are running
podman-compose ps

# View logs for any errors
podman-compose logs

# Test your application
curl http://localhost:8080
```

## Common Issues and Fixes

```bash
# Issue: "Error: short-name resolution"
# Fix: use fully qualified image names or configure registries
# /etc/containers/registries.conf:
# unqualified-search-registries = ["docker.io"]

# Issue: "permission denied" on volumes
# Fix: add :Z label or use --userns=keep-id

# Issue: containers cannot resolve each other by name
# Fix: ensure services are on the same compose network

# Issue: "address already in use"
# Fix: stop any Docker services using the same ports
sudo systemctl stop docker
```

## Migration Checklist

```bash
#!/bin/bash
# migrate-check.sh - verify compose file compatibility

COMPOSE_FILE="${1:-docker-compose.yml}"

echo "Checking $COMPOSE_FILE for migration issues..."

# Check for short image names
if grep -P '^\s+image:\s+[a-z]+:' "$COMPOSE_FILE" | grep -v '/'; then
  echo "WARNING: Found short image names - use fully qualified paths"
fi

# Check for privileged ports
if grep -P '"\d+:' "$COMPOSE_FILE" | grep -oP '"\K\d+' | while read p; do
  [ "$p" -lt 1024 ] && echo "WARNING: Port $p requires root or sysctl change"
done; then true; fi

echo "Migration check complete."
```

## Using Docker Compose with Podman Socket

If you prefer keeping the Docker Compose tool:

```bash
# Enable the Podman socket
systemctl --user enable --now podman.socket
export DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock

# Use docker compose directly with Podman backend
docker compose up -d
```

## Summary

Migrating from Docker Compose to Podman involves updating image names to fully qualified paths, adding SELinux volume labels, adjusting privileged port bindings, and testing with podman-compose. Most projects require only these minor changes. For closer Compose compatibility, use the Docker Compose tool with the Podman socket.
