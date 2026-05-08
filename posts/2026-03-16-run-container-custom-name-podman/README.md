# How to Run a Container with a Custom Name in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Management

Description: Learn how to assign custom names to Podman containers for easier management, referencing, and organization of your container environment.

---

> Custom container names replace random generated names with meaningful labels, making container management straightforward and predictable.

By default, Podman assigns random names to containers. While functional, these names like `fervent_archimedes` or `laughing_galileo` are not helpful when managing multiple services. Custom names let you identify containers at a glance and reference them in scripts. This guide covers naming conventions and best practices.

---

## Assigning a Custom Name

Use the `--name` flag to give your container a meaningful name:

```bash
# Run a container with a custom name

podman run -d --name web-server nginx

# Now reference it by name
podman logs web-server
podman stop web-server
podman start web-server
```

## Why Custom Names Matter

Compare managing containers with and without names:

```bash
# Without names - hard to identify
podman ps
# CONTAINER ID  IMAGE   NAMES
# a3f5b2c1d4e6  nginx   fervent_archimedes
# 7b8c9d0e1f2a  redis   laughing_galileo

# With names - immediately clear
podman ps
# CONTAINER ID  IMAGE   NAMES
# a3f5b2c1d4e6  nginx   web-server
# 7b8c9d0e1f2a  redis   cache
```

## Naming Rules

Container names must follow these rules:

```bash
# Valid names - alphanumeric, hyphens, underscores, periods
podman run -d --name web-server nginx           # hyphens
podman run -d --name web_server nginx           # underscores
podman run -d --name web.server nginx           # periods
podman run -d --name webserver01 nginx          # numbers

# Names must be unique - this fails if web-server already exists
podman run -d --name web-server nginx
# Error: container name "web-server" is already in use
```

## Handling Name Conflicts

When a name is already taken, you need to remove the existing container first:

```bash
# Check if the name is in use (including stopped containers)
podman ps -a --filter name=web-server

# Remove the existing container
podman rm web-server

# Or force-remove if it is still running
podman rm -f web-server

# Now create the new container
podman run -d --name web-server nginx
```

## Replace Existing Container

Use the `--replace` flag to automatically remove an existing container with the same name:

```bash
# Replace any existing container with this name
podman run -d --name web-server --replace nginx

# This is useful in scripts where you redeploy frequently
podman run -d --name api --replace -p 3000:3000 myapi:latest
```

## Naming Conventions

Adopt consistent naming conventions for your containers:

```bash
# By service type
podman run -d --name postgres -p 5432:5432 postgres:16
podman run -d --name redis -p 6379:6379 redis:7
podman run -d --name nginx -p 8080:80 nginx

# By project and service
podman run -d --name myapp-web -p 8080:80 nginx
podman run -d --name myapp-api -p 3000:3000 myapi
podman run -d --name myapp-db -p 5432:5432 postgres:16

# By environment and service
podman run -d --name dev-web -p 8080:80 nginx
podman run -d --name staging-web -p 8081:80 nginx

# By version
podman run -d --name api-v2 -p 3000:3000 myapi:v2
```

## Using Names in Container Operations

Names work everywhere container IDs do:

```bash
# Start a named container
podman run -d --name app -p 3000:3000 myapp

# All management commands accept names
podman logs app
podman logs -f app
podman stop app
podman start app
podman restart app
podman inspect app
podman exec -it app bash
podman top app
podman stats app
podman port app
podman rm app
```

## Using Names for Inter-Container Communication

On a custom network, containers can reach each other by name:

```bash
# Create a network
podman network create backend

# Start services with descriptive names
podman run -d --name postgres --network backend \
    -e POSTGRES_PASSWORD=secret postgres:16

podman run -d --name redis --network backend redis:7

# The application can connect using container names as hostnames
podman run -d --name api --network backend \
    -e DB_HOST=postgres \
    -e CACHE_HOST=redis \
    -p 3000:3000 myapi
```

## Filtering Containers by Name

Use name filters to find specific containers:

```bash
# Filter by exact name
podman ps -a --filter name=^web-server$

# Filter by name pattern
podman ps -a --filter name=myapp

# Use in scripts
if podman ps -a --format "{{.Names}}" | grep -q "^web-server$"; then
    echo "Container web-server exists"
fi
```

## Script for Safe Named Container Deployment

```bash
#!/bin/bash
# Deploy a named container, replacing if it exists

NAME="${1:?Usage: $0 <name> <image> [port]}"
IMAGE="${2:?Usage: $0 <name> <image> [port]}"
PORT="${3:-}"

PORT_FLAG=""
if [ -n "$PORT" ]; then
    PORT_FLAG="-p ${PORT}"
fi

echo "Deploying container: $NAME"
podman run -d --name "$NAME" --replace $PORT_FLAG "$IMAGE"

echo "Container '$NAME' is running:"
podman ps --filter name="^${NAME}$"
```

Usage:

```bash
chmod +x deploy.sh
./deploy.sh web-server nginx 8080:80
./deploy.sh api myapi:latest 3000:3000
```

## Quick Reference

| Command | Purpose |
|---|---|
| `podman run --name <name> <image>` | Create a named container |
| `podman run --name <name> --replace <image>` | Replace existing container |
| `podman ps --filter name=<name>` | Find container by name |
| `podman rm -f <name>` | Remove a named container |

## Summary

Custom container names are a simple practice with a big impact on container management. Use the `--name` flag on every `podman run` command, adopt consistent naming conventions, and use `--replace` for redeployment scripts. Named containers make your environment readable, scriptable, and easy to manage.
