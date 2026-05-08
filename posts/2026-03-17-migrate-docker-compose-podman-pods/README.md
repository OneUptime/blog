# How to Migrate Docker Compose Services to Podman Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Pod, Docker Compose, Migration

Description: Learn how to migrate a Docker Compose application to Podman pods for a daemonless container experience.

---

> Migrating from Docker Compose to Podman pods gives you daemonless containers while maintaining the multi-service architecture.

Docker Compose groups services that communicate over a shared network. Podman pods provide a similar grouping where containers share a network namespace. Migrating involves translating your docker-compose.yml services into pod creation and container run commands.

---

## Example Docker Compose File

Consider this typical Docker Compose setup:

```yaml
# compose.yaml

services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
  api:
    image: node:20-alpine
    environment:
      - DATABASE_URL=postgresql://app:secret@db:5432/mydb
      - REDIS_URL=redis://cache:6379
  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=app
      - POSTGRES_PASSWORD=secret
      - POSTGRES_DB=mydb
    volumes:
      - db-data:/var/lib/postgresql/data
  cache:
    image: redis:7-alpine
volumes:
  db-data:
```

## Step 1: Create the Pod

```bash
# Ports are defined at the pod level, not per container
podman pod create --name myapp -p 8080:80
```

## Step 2: Create Volumes

```bash
# Create named volumes that were in the compose file
podman volume create db-data
```

## Step 3: Start Containers in the Pod

```bash
# Start the database
podman run -d --pod myapp --name db \
  -e POSTGRES_USER=app \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=mydb \
  -v db-data:/var/lib/postgresql/data \
  docker.io/library/postgres:16-alpine

# Start the cache
podman run -d --pod myapp --name cache \
  docker.io/library/redis:7-alpine

# Start the API server (use localhost instead of service names for DB/cache)
podman run -d --pod myapp --name api \
  -e DATABASE_URL=postgresql://app:secret@localhost:5432/mydb \
  -e REDIS_URL=redis://localhost:6379 \
  docker.io/library/node:20-alpine sleep 3600

# Start the web server
podman run -d --pod myapp --name web \
  -v ./nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  docker.io/library/nginx:alpine
```

## Key Differences to Note

```bash
# 1. Service names become localhost
# Docker Compose: postgresql://app:secret@db:5432/mydb
# Podman Pod:     postgresql://app:secret@localhost:5432/mydb

# 2. Ports are on the pod, not individual containers
# Docker Compose: ports on each service
# Podman Pod:     -p on podman pod create

# 3. No automatic dependency ordering
# Docker Compose: depends_on controls startup order
# Podman Pod:     start containers in the right order manually
```

## Creating a Migration Script

```bash
#!/bin/bash
# migrate.sh - Start the application with Podman pods

set -e

POD_NAME="myapp"

# Clean up existing pod if present
podman pod rm --force "$POD_NAME" 2>/dev/null || true

# Create pod with published ports
podman pod create --name "$POD_NAME" -p 8080:80

# Create volumes
podman volume create db-data 2>/dev/null || true

# Start services in dependency order
podman run -d --pod "$POD_NAME" --name db \
  -e POSTGRES_USER=app -e POSTGRES_PASSWORD=secret -e POSTGRES_DB=mydb \
  -v db-data:/var/lib/postgresql/data \
  docker.io/library/postgres:16-alpine

sleep 3  # Give the database a brief startup window

podman run -d --pod "$POD_NAME" --name cache docker.io/library/redis:7-alpine

podman run -d --pod "$POD_NAME" --name api \
  -e DATABASE_URL=postgresql://app:secret@localhost:5432/mydb \
  -e REDIS_URL=redis://localhost:6379 \
  docker.io/library/node:20-alpine sleep 3600

podman run -d --pod "$POD_NAME" --name web \
  -v ./nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  docker.io/library/nginx:alpine

echo "Application started. Access at http://localhost:8080"
```

## Summary

Migrate from Docker Compose to Podman pods by creating a pod with published ports, then running each service as a container inside the pod. Replace service-name-based hostnames with localhost, define ports at the pod level, and manage startup order and readiness manually or with init containers.
