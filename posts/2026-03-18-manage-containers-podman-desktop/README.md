# How to Manage Containers with Podman Desktop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Desktop, Container Management

Description: Learn how to create, start, stop, inspect, and delete containers using the Podman Desktop graphical interface.

---

> Podman Desktop provides a visual interface for the complete container lifecycle, from creation through monitoring to cleanup, without needing to memorize CLI commands.

Managing containers is the core function of Podman Desktop. The graphical interface makes it easy to see running containers at a glance, inspect their details, view logs, and perform lifecycle operations. This post walks through all the container management tasks you can perform with Podman Desktop, along with the equivalent CLI commands for reference.

---

## Viewing Containers

The Containers tab in Podman Desktop shows all containers on your system.

```bash
# CLI equivalent: list all containers (running and stopped)

podman ps -a

# List only running containers
podman ps

# List containers with specific format
podman ps --format "table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}"
```

In Podman Desktop, click on "Containers" in the left sidebar to see the full list. Each container shows its name, image, status, ports, and age.

## Creating and Running a Container

You can run new containers from the Podman Desktop interface or the CLI.

```bash
# Run an Nginx web server container
podman run -d \
    --name my-nginx \
    -p 8080:80 \
    docker.io/library/nginx:latest

# Run a PostgreSQL database container
podman run -d \
    --name my-postgres \
    -e POSTGRES_PASSWORD=mysecretpassword \
    -p 5432:5432 \
    docker.io/library/postgres:16

# Run a Redis cache container
podman run -d \
    --name my-redis \
    -p 6379:6379 \
    docker.io/library/redis:7
```

In Podman Desktop, you can create containers by going to Images, finding the image, and clicking the Run button. A dialog lets you set the container name, port mappings, environment variables, and volumes.

## Starting and Stopping Containers

Control the container lifecycle through the interface or CLI.

```bash
# Stop a running container
podman stop my-nginx

# Start a stopped container
podman start my-nginx

# Restart a container
podman restart my-nginx

# Pause a running container (freezes processes)
podman pause my-nginx

# Unpause a paused container
podman unpause my-nginx
```

In Podman Desktop, each container row has action icons for Start, Stop, and Delete, with additional actions such as Restart available from the overflow menu. Click the appropriate action for the desired operation.

## Inspecting Container Details

Get detailed information about a container.

```bash
# Inspect a container for full details
podman inspect my-nginx

# Get specific fields
podman inspect --format '{{.State.Status}}' my-nginx
podman inspect --format '{{.NetworkSettings.IPAddress}}' my-nginx
podman inspect --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{end}}' my-nginx

# View resource usage statistics
podman stats my-nginx --no-stream
```

In Podman Desktop, click on a container name to open its detail view. This shows the container configuration, environment variables, ports, volumes, and real-time statistics.

## Managing Container Ports

View and manage port mappings for your containers.

```bash
# Check port mappings for a specific container
podman port my-nginx

# Run a container with multiple port mappings
podman run -d \
    --name my-app \
    -p 8080:80 \
    -p 8443:443 \
    docker.io/library/nginx:latest

# Verify the ports are accessible
curl http://localhost:8080
```

Podman Desktop shows port mappings in the container list and detail view. Mapped ports are displayed as clickable links that open in your browser.

## Managing Container Volumes

Attach persistent storage to containers.

```bash
# Create a named volume
podman volume create my-data

# Run a container with a volume mount
podman run -d \
    --name my-app-with-data \
    -v my-data:/app/data \
    -p 8080:80 \
    docker.io/library/nginx:latest

# Run a container with a bind mount
podman run -d \
    --name my-dev-app \
    -v $(pwd)/html:/usr/share/nginx/html:Z \
    -p 8080:80 \
    docker.io/library/nginx:latest

# List all volumes
podman volume ls
```

In Podman Desktop, the Volumes section in the sidebar lets you create, inspect, and delete volumes. When creating a container, you can add volume mounts through the configuration dialog.

## Managing Container Environment Variables

Set and inspect environment variables.

```bash
# Run with environment variables
podman run -d \
    --name my-configured-app \
    -e APP_ENV=production \
    -e LOG_LEVEL=info \
    -e DB_HOST=my-postgres \
    docker.io/library/nginx:latest

# View environment variables of a running container
podman exec my-configured-app env

# Run with an environment file
cat > app.env <<EOF
APP_ENV=production
LOG_LEVEL=info
DB_HOST=localhost
EOF

podman run -d \
    --name my-env-app \
    --env-file app.env \
    docker.io/library/nginx:latest
```

## Deleting Containers

Remove containers you no longer need.

```bash
# Remove a stopped container
podman rm my-nginx

# Force remove a running container
podman rm -f my-nginx

# Remove all stopped containers
podman container prune -f

# Remove all containers (running and stopped)
podman rm -f $(podman ps -aq)
```

In Podman Desktop, click the Delete button on a container row, or select multiple containers and use the bulk delete option. The interface asks for confirmation before deleting.

## Summary

Podman Desktop provides a comprehensive graphical interface for managing the complete container lifecycle. You can view all containers at a glance, create new ones with configured ports, volumes, and environment variables, control their lifecycle with start, stop, and restart actions, inspect detailed container information, and clean up unused containers. Every action available in the GUI has a corresponding CLI command, giving you flexibility to work whichever way you prefer.
