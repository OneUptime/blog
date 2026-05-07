# How to Use Compose Watch with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, podman-compose, Watch, Hot Reload

Description: Learn how to use the Compose watch feature with Podman for automatic file syncing and container rebuilds during development.

---

> Compose watch monitors your source files and automatically syncs changes or rebuilds containers, eliminating manual restart cycles.

The Compose `watch` feature (introduced in Docker Compose v2.22) monitors your local files and reacts to changes. When using Docker Compose with the Podman socket, you can use `docker compose watch` to automatically sync files into running containers or trigger rebuilds when source code changes.

---

## Prerequisites

```bash
# Enable the Podman socket

systemctl --user enable --now podman.socket

# Set DOCKER_HOST for Docker Compose
export DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock

# Verify Docker Compose v2 is available
docker compose version
# Requires v2.22.0 or later for watch support
# Requires v2.23.0 or later for sync+restart
```

## Defining Watch Rules

```yaml
# docker-compose.yml
services:
  web:
    build:
      context: .
      dockerfile: Containerfile
    ports:
      - "3000:3000"
    develop:
      watch:
        # Sync source files without rebuild
        - action: sync
          path: ./src
          target: /app/src

        # Rebuild when dependencies change
        - action: rebuild
          path: ./package.json

        # Sync and restart the container
        - action: sync+restart
          path: ./config
          target: /app/config
```

## Watch Actions Explained

```yaml
develop:
  watch:
    # sync: copies changed files into the running container
    - action: sync
      path: ./src
      target: /app/src

    # rebuild: rebuilds the image and recreates the container
    - action: rebuild
      path: ./requirements.txt

    # sync+restart: syncs files then restarts the container process
    - action: sync+restart
      path: ./nginx.conf
      target: /etc/nginx/nginx.conf
```

## Starting Watch Mode

```bash
# Start services and begin watching for changes
docker compose watch

# Or start in the background first, then watch
docker compose up -d
docker compose watch
```

## Full Example: Node.js Application

```dockerfile
# Containerfile
FROM docker.io/library/node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      dockerfile: Containerfile
    ports:
      - "3000:3000"
    develop:
      watch:
        - action: sync
          path: ./src
          target: /app/src
          ignore:
            - "node_modules/"
            - "*.test.js"
        - action: rebuild
          path: ./package.json
```

```bash
# Start watching - changes to src/ are synced instantly
docker compose watch
```

## Ignoring Files

```yaml
develop:
  watch:
    - action: sync
      path: ./src
      target: /app/src
      ignore:
        - "node_modules/"
        - ".git/"
        - "*.test.js"
        - "__pycache__/"
```

## Multiple Services with Watch

```yaml
services:
  frontend:
    build: ./frontend
    develop:
      watch:
        - action: sync
          path: ./frontend/src
          target: /app/src
  backend:
    build: ./backend
    develop:
      watch:
        - action: sync
          path: ./backend/src
          target: /app/src
        - action: rebuild
          path: ./backend/requirements.txt
```

## Summary

Compose watch automates file syncing and container rebuilds during development. Use `sync` for hot-reloadable files, `rebuild` for dependency changes, and `sync+restart` for config files that need a process restart. This feature requires Docker Compose v2.22+ with the Podman socket, and `sync+restart` requires Docker Compose v2.23+.
