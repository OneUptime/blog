# How to Use Compose Volumes with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, podman-compose, Volumes, Storage

Description: Learn how to use named volumes, bind mounts, and tmpfs mounts in podman-compose for persistent and temporary storage.

---

> Compose volumes provide persistent storage for databases and application data, while bind mounts enable live code editing during development.

podman-compose supports common Linux volume types from the Compose specification: named volumes for persistent data, bind mounts for development workflows, and tmpfs mounts for temporary in-memory storage. This guide covers each type and when to use them.

---

## Named Volumes

Named volumes persist data across container restarts and are managed by Podman.

```yaml
# docker-compose.yml

version: "3.8"
services:
  db:
    image: docker.io/library/postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

```bash
# Start the service - volume is created automatically
podman-compose up -d

# Verify the volume exists
podman volume ls
# Output includes a project-scoped volume such as <project>_pgdata

# Data persists even after 'down'
podman-compose down
podman volume ls
# pgdata still exists
```

## Bind Mounts

Bind mounts map a host directory directly into the container.

```yaml
# docker-compose.yml
version: "3.8"
services:
  app:
    image: docker.io/library/node:20-alpine
    working_dir: /app
    volumes:
      # Bind mount the current directory
      - ./src:/app/src
      # Read-only bind mount
      - ./config:/app/config:ro
    command: node src/server.js
```

```bash
# Changes to ./src on the host are immediately visible in the container
podman-compose up -d

# Edit src/server.js on the host
# The container sees the change instantly
```

## Bind Mounts with SELinux

```yaml
services:
  app:
    image: docker.io/library/nginx:alpine
    volumes:
      # :Z for SELinux private label (single container access)
      - ./html:/usr/share/nginx/html:Z
      # :z for shared label (multiple containers can access)
      - ./shared:/shared:z
```

## tmpfs Mounts

tmpfs mounts store data in memory - fast but not persistent.

```yaml
# docker-compose.yml
version: "3.8"
services:
  app:
    image: docker.io/library/python:3.12-slim
    tmpfs:
      - /tmp
      - /app/cache:size=100m
```

## Long Syntax for Volumes

```yaml
services:
  app:
    image: docker.io/library/nginx:alpine
    volumes:
      - type: volume
        source: app-data
        target: /data
      - type: bind
        source: ./static
        target: /usr/share/nginx/html
        read_only: true
      - type: tmpfs
        target: /tmp
        tmpfs:
          size: 50000000

volumes:
  app-data:
```

## Sharing Volumes Between Services

```yaml
# docker-compose.yml
version: "3.8"
services:
  writer:
    image: docker.io/library/busybox:latest
    command: sh -c "while true; do date >> /data/log.txt; sleep 5; done"
    volumes:
      - shared-data:/data
  reader:
    image: docker.io/library/busybox:latest
    command: sh -c "while [ ! -f /data/log.txt ]; do sleep 1; done; tail -f /data/log.txt"
    volumes:
      - shared-data:/data:ro

volumes:
  shared-data:
```

## Volume Driver Options

```yaml
volumes:
  nfs-data:
    driver: local
    driver_opts:
      type: nfs
      o: addr=nfs-server.example.com,rw
      device: ":/exports/data"
```

## Cleaning Up Volumes

```bash
# Remove containers and volumes
podman-compose down -v

# Remove a specific volume
podman volume rm <project>_pgdata

# Remove all unused volumes
podman volume prune -f
```

## Summary

Use named volumes for persistent data like databases, bind mounts for development workflows with live code syncing, and tmpfs for temporary in-memory storage. Add `:Z` or `:z` for SELinux environments, and use `podman-compose down -v` to clean up volumes when needed.
