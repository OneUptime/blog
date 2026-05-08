# How to Run an Interactive Container with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Interactive

Description: Learn how to run interactive containers with Podman for debugging, testing, and development using shell access and TTY allocation.

---

> Interactive containers give you a shell inside a containerized environment for hands-on debugging, testing, and exploration.

Interactive containers are essential for development and debugging. They let you explore a container's filesystem, test commands, install packages, and troubleshoot issues in real time. This guide covers how to run interactive containers effectively with Podman.

---

## Basic Interactive Container

The `-it` flags give you an interactive terminal inside a container:

```bash
# Run an interactive Alpine container

podman run -it alpine sh

# Run an interactive Ubuntu container
podman run -it ubuntu:22.04 bash

# Run an interactive Fedora container
podman run -it fedora bash
```

The flags:
- `-i` (interactive) - Keeps STDIN open so you can type commands.
- `-t` (tty) - Allocates a pseudo-terminal for proper formatting.

## Auto-Remove on Exit

Use `--rm` to automatically delete the container when you exit:

```bash
# Container is removed after you exit the shell
podman run -it --rm alpine sh

# This prevents accumulation of stopped containers
podman run -it --rm ubuntu:22.04 bash
```

Without `--rm`, exited containers remain on disk and appear in `podman ps -a`.

## Interactive Container with a Specific Shell

Different images come with different shells:

```bash
# Alpine uses sh (ash) by default - bash is not included
podman run -it --rm alpine sh

# Install bash in Alpine if needed
podman run -it --rm alpine sh -c "apk add bash && bash"

# Debian/Ubuntu have bash
podman run -it --rm ubuntu:22.04 bash

# Python image provides python shell
podman run -it --rm python:3.12 python3

# Node.js image provides node REPL
podman run -it --rm node:24 node
```

## Exploring a Container's Filesystem

Use interactive mode to inspect what is inside an image:

```bash
# Explore the Nginx image
podman run -it --rm nginx bash

# Inside the container:
ls /etc/nginx/              # Nginx configuration
cat /etc/nginx/nginx.conf   # Main config file
ls /usr/share/nginx/html/   # Default web root
cat /etc/os-release         # Base OS information
exit
```

## Interactive Container with Port Mapping

Run an interactive container with network access:

```bash
# Interactive Python container with port access
podman run -it --rm -p 8000:8000 python:3.12 bash

# Inside the container, start a quick server:
# python3 -m http.server 8000

# From another terminal, test:
# curl http://localhost:8000
```

## Interactive Container with Volume Mounts

Mount your local directory for interactive development:

```bash
# Mount current directory into the container
podman run -it --rm -v $(pwd):/workspace -w /workspace node:24 bash

# Inside the container:
# ls                    - see your local files
# npm install           - install dependencies
# npm test              - run tests
# exit                  - changes to /workspace persist on host
```

## Debugging a Running Container

Get an interactive shell inside an already running container:

```bash
# Start a container in the background
podman run -d --name web nginx

# Open an interactive shell in the running container
podman exec -it web bash

# Inside the running container:
nginx -T                   # Inspect Nginx configuration
curl localhost             # Test the service internally
exit                        # Exit without stopping the container

# The container keeps running after you exit exec
podman ps

# Check container logs from the host
podman logs web
```

## Running Interactive Commands

Run a specific command interactively without a persistent shell:

```bash
# Run a one-off command
podman run -it --rm alpine ping -c 3 google.com

# Test DNS resolution
podman run -it --rm alpine nslookup google.com

# Check a specific tool version
podman run -it --rm golang:1.26 go version

# Run database migrations interactively
podman run -it --rm \
    --network my-network \
    -e DATABASE_URL=postgres://postgres:secret@db:5432/myapp \
    myapp:latest npm run migrate
```

## Interactive Container with Environment Variables

Pass configuration into interactive sessions:

```bash
# Set environment variables
podman run -it --rm \
    -e NODE_ENV=development \
    -e DEBUG=app:* \
    node:24 bash

# Inside:
# echo $NODE_ENV    - development
# echo $DEBUG       - app:*
```

## Detaching from an Interactive Container

You can detach from an interactive container without stopping it:

```bash
# Run an interactive container
podman run -it --name my-session alpine sh

# Press Ctrl+P then Ctrl+Q to detach
# The container keeps running in the background

# Reattach later
podman attach my-session

# Or get a new shell
podman exec -it my-session sh
```

## Interactive Troubleshooting Toolkit

Use a debug container with common networking tools:

```bash
# Run a container with troubleshooting tools
podman run -it --rm --network host nicolaka/netshoot bash

# Inside, you have access to:
# curl, wget, dig, nslookup, ping, traceroute,
# tcpdump, netstat, ss, ip, iptables, and more

# Debug DNS issues
# dig google.com

# Check network connectivity
# ping -c 3 10.89.0.2

# Scan ports
# nmap -p 80,443 target-host
```

## Quick Reference

| Command | Purpose |
|---|---|
| `podman run -it --rm <image> sh` | Interactive shell with auto-cleanup |
| `podman run -it --rm <image> bash` | Interactive bash session |
| `podman exec -it <name> bash` | Shell into running container |
| `podman attach <name>` | Reattach to interactive container |
| Ctrl+P, Ctrl+Q | Detach without stopping |

## Summary

Interactive containers are your primary tool for debugging and exploration. Use `-it` for an interactive terminal, `--rm` for automatic cleanup, and `podman exec -it` to shell into running containers. Whether you are exploring an image's filesystem, debugging a service, or running one-off commands, interactive mode gives you direct hands-on access to the containerized environment.
