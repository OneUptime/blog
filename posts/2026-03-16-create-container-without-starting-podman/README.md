# How to Create a Container Without Starting It in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Lifecycle, Container Management

Description: Learn how to use podman create to set up containers without starting them, allowing you to configure and inspect them before execution.

---

> Creating containers without starting them gives you a chance to inspect, configure, and prepare them before they begin running.

The `podman create` command sets up a container with all its configuration but does not start it. This is useful when you need to prepare containers in advance, inspect their configuration, copy files into them, or coordinate the startup of multiple containers. This guide walks you through the process.

---

## Basic Container Creation

The `podman create` command accepts the same arguments as `podman run` but stops short of starting the container.

```bash
# Create a container without starting it

podman create --name my-alpine docker.io/library/alpine:latest echo "Hello World"
```

The command outputs the container ID. You can verify the container exists but is not running:

```bash
# Check the container status
podman ps -a --filter name=my-alpine --format "{{.Names}} {{.Status}}"
```

## Starting the Created Container

Once you are ready, start the container with `podman start`.

```bash
# Start the previously created container
podman start my-alpine

# View the output
podman logs my-alpine
```

## Creating with Full Configuration

You can apply all runtime options during creation.

```bash
# Create a fully configured container
podman create \
  --name web-server \
  -p 8080:80 \
  -v /tmp/html:/usr/share/nginx/html:z \
  --memory 256m \
  --cpus 1.0 \
  --env NGINX_HOST=localhost \
  --restart on-failure:3 \
  docker.io/library/nginx:latest

# Verify the configuration before starting
podman inspect web-server --format '{{.HostConfig.Memory}}'

# Start when ready
podman start web-server
```

## Inspecting Before Starting

One key advantage of creating without starting is the ability to inspect the container configuration.

```bash
# Create a container
podman create --name inspect-me \
  --env APP_ENV=production \
  --env DB_HOST=db.example.com \
  -p 3000:3000 \
  docker.io/library/node:20-alpine \
  node server.js

# Inspect the full configuration
podman inspect inspect-me

# Check specific settings
podman inspect inspect-me --format '{{.Config.Env}}'
podman inspect inspect-me --format '{{.HostConfig.PortBindings}}'

# Clean up
podman rm inspect-me
```

## Copying Files Before Starting

You can copy files into a created container before it starts.

```bash
# Create a container
podman create --name app-container \
  docker.io/library/alpine:latest \
  /bin/sh -c 'cat /tmp/config.json'

# Copy a configuration file into the container
echo '{"key": "value", "env": "production"}' > /tmp/config.json
podman cp /tmp/config.json app-container:/tmp/config.json

# Now start the container - it will read the copied file
podman start --attach app-container

# Clean up
podman rm app-container
```

## Creating Multiple Containers for Coordinated Startup

Create several containers first, then start them in the correct order.

```bash
# Create the network first if needed
podman network create mynet 2>/dev/null

# Create the database container
podman create \
  --name app-db \
  --network mynet \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=myapp \
  docker.io/library/postgres:16

# Create the application container
podman create \
  --name app-web \
  --network mynet \
  -e DATABASE_URL=postgres://postgres:secret@app-db:5432/myapp \
  -p 8080:8080 \
  docker.io/library/alpine:latest \
  echo "App connected to database"

# Start in the correct order
podman start app-db
echo "Waiting for database to initialize..."
sleep 3
podman start app-web

# Check both containers
podman ps -a --filter name=app

# Clean up
podman rm -f app-db app-web
podman network rm mynet 2>/dev/null
```

## Creating Containers in a Script

```bash
#!/bin/bash
# setup-containers.sh - Pre-create containers for later startup

# Create containers during setup phase
echo "Creating containers..."
podman create --name redis-cache \
  -p 6379:6379 \
  docker.io/library/redis:7

podman create --name nginx-proxy \
  -p 80:80 \
  -v ./nginx.conf:/etc/nginx/nginx.conf:z,ro \
  docker.io/library/nginx:latest

echo "Containers created. Start them with:"
echo "  podman start redis-cache nginx-proxy"
```

## Listing Created (Not Running) Containers

```bash
# Show all containers including created but not started
podman ps -a --filter status=created

# Show only names and status
podman ps -a --filter status=created --format "{{.Names}}\t{{.Status}}"
```

## Removing Created Containers

```bash
# Remove a specific created container
podman rm my-alpine

# Remove all containers in "created" state
podman ps -a --filter status=created -q | xargs -r podman rm
```

## Summary

The `podman create` command lets you prepare containers with full configuration before starting them. This enables pre-start inspection, file copying, and coordinated multi-container startup. Use `podman inspect` to verify configuration, `podman cp` to inject files, and `podman start` when you are ready to launch the container.
