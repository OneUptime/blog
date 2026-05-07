# How to Open a Terminal in a Container with Podman Desktop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Desktop, Terminal, Debugging

Description: Learn how to open an interactive terminal session inside a running container using Podman Desktop and the CLI.

---

> Opening a terminal inside a running container lets you inspect the filesystem, run diagnostic commands, and debug issues in real time without stopping the container.

Sometimes viewing logs is not enough to diagnose a problem. You need to get inside the container, look at files, check process states, test network connectivity, or run commands interactively. Podman Desktop makes it easy to open a terminal session inside any running container. This post covers how to do it through the GUI and CLI, plus practical debugging techniques.

---

## Prerequisites

Have a running container to connect to.

```bash
# Start a container for demonstration

podman run -d \
    --name my-web-server \
    -p 8080:80 \
    docker.io/library/nginx:alpine

# Verify it is running
podman ps
```

## Opening a Terminal in Podman Desktop

The graphical interface provides a built-in terminal for containers.

1. Click on "Containers" in the left sidebar
2. Find the running container in the list
3. Click on the container name to open its details
4. Click on the "Terminal" tab
5. An interactive shell opens inside the container

The terminal tab provides a full terminal emulator connected to the container. You can type commands, navigate the filesystem, and interact with the container environment.

## Opening a Terminal with the CLI

Use `podman exec` to start an interactive shell session.

```bash
# Open a shell in the Alpine-based demo container
podman exec -it my-web-server /bin/sh

# If your container image includes bash, you can use it instead
podman exec -it my-bash-container /bin/bash

# Open with a specific working directory
podman exec -it -w /etc/nginx my-web-server /bin/sh

# Open as a specific user
podman exec -it --user root my-web-server /bin/sh

# Open with additional environment variables
podman exec -it -e DEBUG=true my-web-server /bin/sh
```

## Running Single Commands

You do not always need a full interactive session. Run single commands directly.

```bash
# Check the container's operating system
podman exec my-web-server cat /etc/os-release

# View running processes
podman exec my-web-server ps aux

# Check disk usage
podman exec my-web-server df -h

# View environment variables
podman exec my-web-server env

# Check network configuration
podman exec my-web-server ip addr

# List files in a directory
podman exec my-web-server ls -la /usr/share/nginx/html/
```

## Debugging Filesystem Issues

Inspect files and directories inside the container.

```bash
# Open a shell and navigate
podman exec -it my-web-server /bin/sh

# Inside the container:
# Check the Nginx configuration
cat /etc/nginx/nginx.conf

# Look at the web root
ls -la /usr/share/nginx/html/

# Check file permissions
stat /usr/share/nginx/html/index.html

# Find large files
find / -type f -size +10M 2>/dev/null

# Check available disk space
df -h

# Exit the container shell
exit
```

## Debugging Network Issues

Test network connectivity from inside the container.

```bash
# Open a shell
podman exec -it my-web-server /bin/sh

# Inside the container:
# Check DNS resolution
nslookup google.com

# Test connectivity to another service
wget -qO- http://localhost:80 || echo "Connection failed"

# Check listening ports
netstat -tlnp 2>/dev/null || ss -tlnp

# Check the container's IP address
hostname -i

# Check routing table
ip route

# Exit the container
exit
```

## Debugging Application Issues

Inspect application-specific files and processes.

```bash
# Check Nginx error logs inside the container
podman exec my-web-server cat /var/log/nginx/error.log

# Check Nginx access logs
podman exec my-web-server tail -20 /var/log/nginx/access.log

# Test the Nginx configuration
podman exec my-web-server nginx -t

# Reload Nginx configuration without restart
podman exec my-web-server nginx -s reload

# Check if Nginx is actually running
podman exec my-web-server pgrep nginx
```

## Installing Debugging Tools

Minimal container images often lack debugging tools. Install them temporarily.

```bash
# Open a shell in an Alpine-based container
podman exec -it my-web-server /bin/sh

# Install common debugging tools
apk add --no-cache curl wget bind-tools net-tools strace

# Now use the installed tools
curl -I http://localhost:80
dig google.com
netstat -tlnp

# Exit when done (tools persist until container is recreated)
exit
```

For Debian/Ubuntu-based containers:

```bash
# Open a shell
podman exec -it my-debian-container /bin/bash

# Install debugging tools
apt-get update && apt-get install -y \
    curl wget dnsutils net-tools procps vim

# Use the tools
curl -I http://localhost:80
```

## Copying Files In and Out

Transfer files between the host and container.

```bash
# Copy a file from the container to the host
podman cp my-web-server:/etc/nginx/nginx.conf ./nginx.conf.backup

# Copy a file from the host into the container
podman cp ./custom-index.html my-web-server:/usr/share/nginx/html/index.html

# Copy an entire directory
podman cp my-web-server:/var/log/nginx/ ./nginx-logs/

# Copy a configuration file into the container
echo "<h1>Updated Content</h1>" > new-index.html
podman cp new-index.html my-web-server:/usr/share/nginx/html/index.html
```

## Running a Debug Container

If the main container lacks tools, attach a debug container to the same network.

```bash
# Run a debug container with full networking tools
podman run -it --rm \
    --network container:my-web-server \
    docker.io/library/alpine:latest \
    /bin/sh

# Inside the debug container, you share the network namespace
# so you can test connectivity to the main container
wget -qO- http://localhost:80
netstat -tlnp
```

## Terminal Tips in Podman Desktop

When using the built-in terminal in Podman Desktop:

- The terminal supports standard keyboard shortcuts for copy and paste
- You can resize the terminal pane by dragging the border
- The terminal stays connected as long as the container is running
- If the connection drops, click the Terminal tab again to reconnect
- Multiple terminal sessions can be opened from the CLI while one is open in the GUI

```bash
# You can have multiple exec sessions simultaneously
# Terminal 1 (in Podman Desktop GUI): monitoring logs
# Terminal 2 (from CLI): running commands
podman exec -it my-web-server /bin/sh
```

## Summary

Opening a terminal inside a container is a fundamental debugging technique. Podman Desktop provides a built-in Terminal tab for each container, giving you an interactive shell without leaving the GUI. The `podman exec -it` CLI command offers the same capability with additional options for user, working directory, and environment variables. Inside the container, you can inspect files, check processes, test network connectivity, view application logs, and install debugging tools. For containers without debugging utilities, you can attach a debug container that shares the same network namespace. Combining the Podman Desktop terminal with CLI exec commands gives you full flexibility for container debugging.
