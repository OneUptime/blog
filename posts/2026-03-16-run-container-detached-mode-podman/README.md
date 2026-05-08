# How to Run a Container in Detached Mode with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Detached Mode

Description: Learn how to run Podman containers in detached (background) mode, manage them, and monitor their output effectively.

---

> Detached mode runs containers in the background, freeing your terminal while services continue to operate.

Most production and development services need to run in the background. A web server, database, or API service should keep running without tying up your terminal. Podman's detached mode (the `-d` flag) starts containers in the background and returns control to your shell immediately. This guide covers everything about running and managing detached containers.

---

## Running in Detached Mode

Use the `-d` flag to start a container in the background:

```bash
# Run Nginx in the background

podman run -d nginx
```

Podman prints the full container ID and returns to your prompt:

```text
a3f5b2c1d4e6f7890123456789abcdef0123456789abcdef0123456789abcdef
```

## Naming Detached Containers

Always name your detached containers for easy management:

```bash
# Run with a name
podman run -d --name web-server nginx

# Now you can reference it by name
podman logs web-server
podman stop web-server
```

## Checking Running Containers

View your detached containers:

```bash
# List running containers
podman ps

# Output:
# CONTAINER ID  IMAGE                           COMMAND               CREATED        STATUS        PORTS       NAMES
# a3f5b2c1d4e6  docker.io/library/nginx:latest  nginx -g daemon o...  5 seconds ago  Up 5 seconds  80/tcp      web-server

# List with more detail
podman ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
```

## Viewing Logs from Detached Containers

Since detached containers do not print to your terminal, use the `logs` command:

```bash
# View all logs
podman logs web-server

# Follow logs in real-time (like tail -f)
podman logs -f web-server

# Show timestamps
podman logs -t web-server

# Show only the last 20 lines
podman logs --tail 20 web-server

# Show logs since a specific time
podman logs --since 2m web-server
```

## Detached Mode with Port Mapping

Expose container ports to the host:

```bash
# Run a web server accessible on localhost:8080
podman run -d --name web -p 8080:80 nginx

# Run a database accessible on localhost:5432
podman run -d --name db -p 5432:5432 -e POSTGRES_PASSWORD=secret postgres:16

# Verify the ports
podman port web
# 80/tcp -> 0.0.0.0:8080

# Test the web server
curl http://localhost:8080
```

## Attaching to a Detached Container

You can attach to a detached container to see its live output:

```bash
# Attach to a container (see its stdout/stderr)
podman attach web-server

# Detach again without stopping: press Ctrl+P then Ctrl+Q
```

Note that attaching shows the container's main process output. To get an interactive shell, use `exec` instead:

```bash
# Get a shell in a running detached container
podman exec -it web-server bash
```

## Running Multiple Detached Services

Build a complete stack with detached containers:

```bash
# Create a network for the services
podman network create app-net

# Start a database
podman run -d --name postgres \
    --network app-net \
    -e POSTGRES_PASSWORD=secret \
    -e POSTGRES_DB=myapp \
    -v pgdata:/var/lib/postgresql/data \
    postgres:16

# Start a Redis cache
podman run -d --name redis \
    --network app-net \
    redis:7

# Start a web application
podman run -d --name webapp \
    --network app-net \
    -p 3000:3000 \
    -e DATABASE_URL=postgres://postgres:secret@postgres:5432/myapp \
    -e REDIS_URL=redis://redis:6379 \
    myapp:latest

# Check all services are running
podman ps
```

## Restarting Detached Containers

Manage the lifecycle of background containers:

```bash
# Stop a container
podman stop web-server

# Start it again
podman start web-server

# Restart (stop + start)
podman restart web-server

# Stop with a timeout (seconds to wait before killing)
podman stop -t 30 web-server
```

## Auto-Restart on Failure

Configure containers to restart automatically:

```bash
# Restart always (including after host reboot with systemd)
podman run -d --name web --restart always -p 8080:80 nginx

# Restart only on failure
podman run -d --name api --restart on-failure -p 3000:3000 myapi

# Restart on failure with a maximum retry count
podman run -d --name worker --restart on-failure:5 myworker
```

## Monitoring Detached Containers

Keep an eye on resource usage:

```bash
# View resource usage statistics
podman stats

# Stats for specific containers
podman stats web-server postgres redis

# One-shot stats (no streaming)
podman stats --no-stream

# Check container status
podman inspect web-server --format '{{.State.Status}}'
```

## Cleaning Up Detached Containers

Remove containers when they are no longer needed:

```bash
# Stop and remove a specific container
podman stop web-server
podman rm web-server

# Force-remove a running container
podman rm -f web-server

# Remove all stopped containers
podman container prune

# Stop and remove all containers
podman rm -f $(podman ps -aq)
```

## Quick Reference

| Command | Purpose |
|---|---|
| `podman run -d <image>` | Run in detached mode |
| `podman logs -f <name>` | Follow container logs |
| `podman attach <name>` | Attach to container output |
| `podman exec -it <name> bash` | Shell into running container |
| `podman stats` | Monitor resource usage |
| `podman stop <name>` | Stop a detached container |

## Summary

Detached mode is how you run long-lived services with Podman. Use `-d` to start containers in the background, `--name` for easy identification, and `podman logs` to monitor output. Combine detached containers with port mapping, networks, and volumes to build complete service stacks. Always name your containers, set appropriate restart policies, and clean up stopped containers to keep your environment organized.
