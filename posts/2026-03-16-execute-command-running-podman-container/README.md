# How to Execute a Command Inside a Running Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Exec

Description: Learn how to execute commands inside a running Podman container using podman exec, including practical examples for debugging, inspection, and administration.

---

> Running commands inside a live container is one of the most essential skills for container management and debugging.

When working with Podman containers, you will frequently need to run commands inside a container that is already up and running. Whether you need to check a log file, verify a configuration, or troubleshoot an issue, `podman exec` is the tool for the job. This guide walks you through the various ways to execute commands inside running Podman containers with practical, real-world examples.

---

## Understanding podman exec

The `podman exec` command runs a new process inside an already running container. Unlike `podman run`, which starts a new container, `podman exec` targets an existing one. The basic syntax is:

```bash
# Basic syntax

podman exec [options] <container> <command> [args...]
```

## Prerequisites

Before you begin, make sure you have a running container. Let us start one for demonstration purposes:

```bash
# Start a simple nginx container in the background
podman run -d --name my-web-server nginx:latest

# Verify the container is running
podman ps
```

You should see your container listed with a status of "Up."

## Running a Simple Command

The most straightforward use of `podman exec` is to run a single command:

```bash
# List files in the container's root directory
podman exec my-web-server ls /

# Check the container's hostname
podman exec my-web-server hostname

# View the nginx configuration
podman exec my-web-server cat /etc/nginx/nginx.conf
```

Each of these commands runs inside the container, executes, prints the output to your terminal, and then exits.

## Running Commands with Flags

You can pass flags to the command you are executing:

```bash
# List files with details
podman exec my-web-server ls -la /var/log/nginx/

# Check disk usage inside the container
podman exec my-web-server df -h

# View running processes
podman exec my-web-server cat /proc/1/cmdline
```

## Using the Interactive Flag

For commands that require input, use the `-i` (interactive) flag to keep stdin open:

```bash
# Pipe input into a command inside the container
echo "Hello from host" | podman exec -i my-web-server tee /tmp/message.txt

# Verify the file was created
podman exec my-web-server cat /tmp/message.txt
```

## Combining Interactive and TTY Flags

For a full interactive experience, combine `-i` with `-t` (pseudo-TTY):

```bash
# Open an interactive bash shell
podman exec -it my-web-server /bin/bash

# Once inside, you can run commands directly:
# root@container:/# ls /etc/nginx/
# root@container:/# exit
```

The `-it` combination is the most common way to get a shell inside a container for debugging.

## Executing Commands by Container ID

You do not have to use the container name. The container ID works just as well:

```bash
# Get the container ID
CONTAINER_ID=$(podman ps -q --filter name=my-web-server)

# Execute a command using the ID
podman exec "$CONTAINER_ID" whoami

# You can also use a unique prefix of the ID
podman exec "$(podman ps -q --filter name=my-web-server | cut -c1-12)" whoami
```

## Practical Debugging Examples

Here are some real-world scenarios where `podman exec` is invaluable:

```bash
# Check if a service is listening on the expected port
podman exec my-web-server cat /proc/net/tcp

# Test DNS resolution inside the container
podman exec my-web-server getent hosts google.com

# Check environment variables
podman exec my-web-server env

# Inspect network configuration
podman exec my-web-server cat /proc/net/route

# Check available memory
podman exec my-web-server cat /proc/meminfo
```

## Redirecting Output

You can redirect the output of exec commands just like any other shell command:

```bash
# Save the nginx config to a local file
podman exec my-web-server cat /etc/nginx/nginx.conf > ./nginx-backup.conf

# Append container logs to a file
podman exec my-web-server tail -20 /var/log/nginx/access.log >> ./access.log
```

## Error Handling

If the command fails inside the container, `podman exec` returns the exit code from that command:

```bash
# This will return exit code 1 if the file does not exist
podman exec my-web-server cat /nonexistent-file
echo "Exit code: $?"

# Use this in scripts for conditional logic
if podman exec my-web-server test -f /etc/nginx/nginx.conf; then
    echo "Nginx config exists"
else
    echo "Nginx config is missing"
fi
```

## Cleanup

When you are done experimenting, clean up the container:

```bash
# Stop and remove the container
podman stop my-web-server
podman rm my-web-server
```

## Summary

The `podman exec` command is essential for interacting with running containers. Use it with `-it` for interactive sessions, pipe data with `-i`, and leverage it for debugging, file inspection, and container administration. It works identically whether you reference containers by name or by ID.
