# How to Enable Docker Compose Compatibility Mode in podman-compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, podman-compose, Compatibility, Docker

Description: Learn how to enable Docker Compose compatibility mode in podman-compose to maximize compatibility with existing Docker Compose files and workflows.

---

> Compatibility mode in podman-compose aligns container naming and behavior with Docker Compose conventions for seamless migration.

When migrating from Docker Compose to podman-compose, subtle differences in naming conventions and default behavior can break scripts and CI pipelines. Enabling compatibility mode makes podman-compose behave more like Docker Compose, reducing friction during migration.

---

## Default vs Compatible Naming

```bash
# Default podman-compose naming

podman-compose up -d
podman ps --format "{{.Names}}"
# Output: projectname_web_1

# Docker Compose v2 uses hyphens
# Output would be: projectname-web-1
```

## Enabling Compatibility Mode

```yaml
# compose.yaml
x-podman:
  docker_compose_compat: true
```

```bash
# Or enable the same compatibility settings with an environment variable
PODMAN_COMPOSE_DOCKER_COMPOSE_COMPAT=true podman-compose up -d
```

## Docker Compose Binary Alias

Create an alias so you can use `docker-compose` commands with Podman.

```bash
# Create an alias for docker-compose
alias docker-compose='podman-compose'

# Add to your shell profile for persistence
echo "alias docker-compose='podman-compose'" >> ~/.bashrc
source ~/.bashrc

# Now use docker-compose commands
docker-compose up -d
docker-compose ps
docker-compose down
```

## Using the Podman Socket for Full Compatibility

For maximum compatibility, use the official Docker Compose with the Podman socket.

```bash
# Enable the Podman socket
systemctl --user enable --now podman.socket

# Set the Docker host
export DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock

# Use official docker compose (v2)
docker compose up -d
```

## Handling Image Name Differences

```yaml
# Docker Compose allows short image names
# image: nginx:alpine

# Podman may require fully qualified names unless unqualified registries are configured
# image: docker.io/library/nginx:alpine

# Configure unqualified search registries to accept short names
```

```bash
# Add Docker Hub to unqualified search registries
# Edit /etc/containers/registries.conf
# unqualified-search-registries = ["docker.io"]
```

## Container Name Compatibility

```yaml
# docker-compose.yml
services:
  web:
    image: docker.io/library/nginx:alpine
    # Explicitly set the container name for consistency
    container_name: web
    ports:
      - "8080:80"
```

```bash
# With container_name set, the name is consistent across tools
podman-compose up -d
podman ps --format "{{.Names}}"
# Output: web
```

## Network Compatibility

```bash
# podman-compose creates networks with the project prefix
# To match Docker Compose behavior, use explicit network names
```

```yaml
# docker-compose.yml
services:
  web:
    image: docker.io/library/nginx:alpine
    networks:
      - frontend
networks:
  frontend:
    name: frontend
    # Using 'name' ensures the network has a predictable name
```

## CI/CD Compatibility Script

```bash
#!/bin/bash
# compat-compose.sh - wrapper for CI/CD compatibility
if command -v docker-compose &> /dev/null; then
  docker-compose "$@"
elif command -v podman-compose &> /dev/null; then
  podman-compose "$@"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
  docker compose "$@"
else
  echo "No compose tool found"
  exit 1
fi
```

## Summary

Enable Docker Compose compatibility in podman-compose with the `x-podman` compatibility settings or the matching environment variables, and use explicit container names, fully qualified image names, and named networks where you need predictable behavior. For full compatibility, use the official Docker Compose with the Podman socket. Create aliases and wrapper scripts to keep CI/CD pipelines working across both tools.
