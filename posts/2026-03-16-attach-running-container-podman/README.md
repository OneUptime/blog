# How to Attach to a Running Container in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Attach, Debugging

Description: Learn how to attach your terminal to a running Podman container's main process to view its output and interact with it in real time.

---

> Attaching to a container connects your terminal directly to its main process, giving you live access to its stdin, stdout, and stderr.

While `podman exec` creates a new process inside a container, `podman attach` connects your terminal to the container's existing main process (PID 1). This is useful for viewing live output, interacting with interactive applications, and debugging startup issues. This guide explains how to use `podman attach` effectively.

---

## Understanding Attach vs Exec

The key difference between attach and exec:

```bash
# exec: Creates a NEW process inside the container

podman exec -it my-app /bin/bash

# attach: Connects to the EXISTING main process (PID 1)
podman attach my-app
```

When you attach, you see exactly what the container's main process outputs. Use the default detach sequence, Ctrl+P followed by Ctrl+Q, to leave the container running. Pressing Ctrl+C may stop the container if the main process handles that signal.

## Basic Attach

```bash
# Start a container that produces output
podman run -d --name my-logger alpine /bin/sh -c "while true; do date; sleep 2; done"

# Attach to see the live output
podman attach my-logger
# You will see dates printing every 2 seconds
# Press Ctrl+C to stop (this will also stop the container)
```

## Attaching to an Interactive Container

For containers running interactive processes, attach lets you resume interaction:

```bash
# Start an interactive container in detached mode
podman run -dit --name my-shell alpine /bin/sh

# Attach to interact with the shell
podman attach my-shell
# You now have a shell prompt
# Type commands as normal
# / # ls
# / # whoami
```

## Attach with No stdin

If you only want to observe output without being able to send input:

```bash
# Start a container producing output
podman run -d --name web-server nginx:latest

# Attach in read-only mode (no stdin)
podman attach --no-stdin --sig-proxy=false web-server
# You will see nginx access/error logs
# Press Ctrl+C to detach
```

## Attach with Custom Signal Handling

By default, Ctrl+C sends SIGINT to the container's main process in non-TTY mode. You can disable signal proxying:

```bash
# Attach without proxying signals
podman attach --sig-proxy=false my-logger
# Now Ctrl+C detaches without sending SIGINT to the process
# The container continues running
```

This is important for non-TTY containers: with `--sig-proxy=false`, pressing Ctrl+C will detach you from the container without sending SIGINT to its main process. You can also use the default detach sequence, Ctrl+P followed by Ctrl+Q, to leave the container running.

## Attach to See Container Startup

Attach is particularly useful for debugging container startup:

```bash
# Start a container and immediately attach
podman run -d --name my-node node:latest node -e "
setInterval(() => {
    console.log(new Date().toISOString() + ' - Server heartbeat');
}, 1000);
console.log('Server starting...');
"

# Attach to see the startup messages
podman attach --sig-proxy=false my-node
# Output:
# Server starting...
# 2026-03-16T10:00:01.000Z - Server heartbeat
# 2026-03-16T10:00:02.000Z - Server heartbeat
```

## Attach to Multiple Containers

You can attach to multiple containers from different terminal windows:

```bash
# Terminal 1: Attach to the web server
podman attach --sig-proxy=false web-server

# Terminal 2: Attach to the database
podman attach --sig-proxy=false my-db

# Terminal 3: Attach to the worker
podman attach --sig-proxy=false my-worker
```

## Practical Use Cases

### Monitoring Application Logs

```bash
# Start an application container
podman run -d --name my-api python:3 python -c "
import time, sys
print('API server starting on port 8080', flush=True)
while True:
    print(f'{time.strftime(\"%H:%M:%S\")} - Request processed', flush=True)
    time.sleep(3)
"

# Attach to monitor logs in real time
podman attach --sig-proxy=false my-api
```

### Debugging Container Crashes

```bash
# If a container keeps restarting, attach to see the error
podman run -d --name crash-test --restart=on-failure alpine /bin/sh -c "echo 'Starting...'; sleep 2; exit 1"

# Quickly attach to see the output before it crashes
podman attach crash-test
```

### Interactive Database Client

```bash
# Create a shared network
podman network create redis-net

# Start a Redis container on the shared network
podman run -d --name my-redis --network redis-net redis:latest

# Start redis-cli in a detached interactive container on the same network
podman run -dit --name redis-cli --network redis-net redis:latest redis-cli -h my-redis

# Attach to use redis-cli interactively
podman attach redis-cli
# my-redis:6379> SET mykey "hello"
# OK
# my-redis:6379> GET mykey
# "hello"
```

## Cleanup

```bash
podman stop my-logger my-shell web-server my-node my-api crash-test my-redis redis-cli 2>/dev/null
podman rm my-logger my-shell web-server my-node my-api crash-test my-redis redis-cli 2>/dev/null
podman network rm redis-net 2>/dev/null
```

## Summary

The `podman attach` command connects your terminal to a container's main process, which is different from `podman exec` that starts new processes. Use Ctrl+P followed by Ctrl+Q to detach while leaving the container running, or use `--sig-proxy=false` when observing non-TTY output without forwarding Ctrl+C to the container process. Attach is ideal for monitoring live output, debugging startup issues, and resuming interactive sessions.
