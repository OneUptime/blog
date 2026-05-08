# How to Run Your First Container with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Getting Started

Description: Learn how to run your first container with Podman, from pulling images to running and managing containers with practical examples.

---

> Running your first container with Podman is the gateway to containerized development and deployment.

Podman is a daemonless container engine that provides a Docker-compatible command-line interface. If you have used Docker before, you will feel right at home. If containers are new to you, this guide starts from the very beginning and walks you through running your first container. This guide assumes you have Podman installed and a machine running.

---

## Verifying Your Setup

Before running a container, make sure Podman is working:

```bash
# Check Podman version

podman --version

# Check that the Podman machine is running (macOS/Windows)
podman machine ls

# Verify Podman can connect to the container runtime
podman info --format "{{.Host.OS}}"
```

## Running Your First Container

The `podman run` command pulls an image (if not already available) and starts a container:

```bash
# Run a simple hello-world container
podman run hello-world
```

This command does several things:
1. Checks if the `hello-world` image exists locally.
2. Pulls the image using Podman's configured short-name resolution if not found.
3. Creates a container from the image.
4. Starts the container.
5. The container prints a message and exits.

## Running an Interactive Container

Start a container and get a shell inside it:

```bash
# Run an Alpine Linux container interactively
podman run -it --rm alpine sh
```

The flags mean:
- `-i` - Keep STDIN open (interactive).
- `-t` - Allocate a pseudo-TTY (terminal).
- `--rm` - Automatically remove the container when it exits.

Inside the container, try some commands:

```bash
# Inside the container
whoami          # root
hostname        # random container ID
cat /etc/os-release  # Alpine Linux
ls /             # container filesystem
exit            # leave the container
```

## Running a Web Server

Start a practical container running a web server:

```bash
# Run Nginx in the foreground
podman run -p 8080:80 nginx
```

Open a new terminal and test it:

```bash
# Access the web server
curl http://localhost:8080

# You should see the Nginx welcome page HTML
```

Press `Ctrl+C` in the first terminal to stop the container.

## Running a Container in the Background

Use the `-d` flag to run a container in detached mode:

```bash
# Run Nginx in the background
podman run -d -p 8080:80 --name my-web nginx

# Verify it is running
podman ps

# Access the web server
curl http://localhost:8080

# View container logs
podman logs my-web

# Stop the container
podman stop my-web

# Remove the container
podman rm my-web
```

## Pulling Images

You can pull images before running them:

```bash
# Pull an image using short-name resolution
podman pull nginx

# Pull a specific version
podman pull node:20-alpine

# Pull from a specific registry
podman pull docker.io/library/postgres:16

# List downloaded images
podman images
```

## Basic Container Management

Essential commands for managing containers:

```bash
# List running containers
podman ps

# List all containers (including stopped)
podman ps -a

# Stop a running container
podman stop my-web

# Start a stopped container
podman start my-web

# Restart a container
podman restart my-web

# Remove a stopped container
podman rm my-web

# Force-remove a running container
podman rm -f my-web
```

## Running with a Specific Image Version

Always specify image versions for reproducibility:

```bash
# Run a specific version of Node.js
podman run -it --rm node:20-alpine node --version

# Run a specific PostgreSQL version
podman run -d --name db -e POSTGRES_PASSWORD=secret postgres:16

# Run Ubuntu 22.04 LTS
podman run -it --rm ubuntu:22.04 bash
```

## Viewing Container Output

Check what your container is doing:

```bash
# Run a container that produces output
podman run -d --name ticker alpine sh -c "while true; do date; sleep 5; done"

# View the logs
podman logs ticker

# Follow the logs in real-time
podman logs -f ticker

# Show only the last 10 lines
podman logs --tail 10 ticker

# Clean up
podman rm -f ticker
```

## Executing Commands in a Running Container

Run commands inside an already running container:

```bash
# Start a container
podman run -d --name web nginx

# Execute a command inside it
podman exec web cat /etc/nginx/nginx.conf

# Get an interactive shell
podman exec -it web bash

# Check the Nginx version inside the container
podman exec web nginx -v

# Clean up
podman rm -f web
```

## Quick Reference

| Command | Purpose |
|---|---|
| `podman run <image>` | Run a container |
| `podman run -it --rm <image> sh` | Interactive container with auto-cleanup |
| `podman run -d -p 8080:80 <image>` | Detached with port mapping |
| `podman ps` | List running containers |
| `podman stop <name>` | Stop a container |
| `podman rm <name>` | Remove a container |
| `podman logs <name>` | View container logs |

## Summary

Running your first container with Podman is as simple as `podman run`. From there, you can run interactive shells, background services, web servers, and databases. The key flags to remember are `-it` for interactive use, `-d` for background mode, `-p` for port mapping, and `--rm` for automatic cleanup. As you become comfortable with these basics, you can explore more advanced features like volumes, networks, and multi-container setups.
