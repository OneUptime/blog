# How to Kill a Container with a Specific Signal in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Lifecycle, Signal

Description: Learn how to send specific signals to container processes in Podman using the kill command for graceful shutdowns, config reloads, and process management.

---

> Sending specific signals to containers gives you fine-grained control over application behavior, from graceful shutdowns to configuration reloads.

The `podman kill` command sends a signal to the main process running inside a container. While `podman stop` sends the container's configured stop signal (SIGTERM by default) followed by SIGKILL after the timeout, `podman kill` lets you send any Unix signal. This guide covers how to use signals effectively with Podman containers.

---

## Basic Kill Command

By default, `podman kill` sends SIGKILL to the container.

```bash
# Start a container

podman run -d --name my-app docker.io/library/alpine:latest sleep 3600

# Kill with SIGKILL (default)
podman kill my-app

# Check status
podman ps -a --filter name=my-app --format "{{.Names}} {{.Status}}"

# Clean up
podman rm my-app
```

## Sending a Specific Signal

Use the `--signal` (or `-s`) flag to specify the signal.

```bash
# Send SIGTERM for graceful shutdown
podman kill --signal SIGTERM my-app

# Send SIGINT (same as Ctrl+C)
podman kill -s SIGINT my-app

# Send SIGHUP for config reload
podman kill -s SIGHUP my-app
```

You can also use signal numbers:

```bash
# On most Linux architectures, SIGTERM is signal 15
podman kill -s 15 my-app

# On most Linux architectures, SIGHUP is signal 1
podman kill -s 1 my-app

# On most Linux architectures, SIGUSR1 is signal 10
podman kill -s 10 my-app
```

## Common Signals and Their Uses

### SIGTERM (15) - Graceful Shutdown

```bash
# Start Nginx
podman run -d --name nginx-server docker.io/library/nginx:latest

# Request graceful shutdown
podman kill -s SIGTERM nginx-server

# Clean up
podman rm nginx-server
```

### SIGHUP (1) - Reload Configuration

Many services reload their configuration on SIGHUP.

```bash
# Start Nginx
podman run -d --name nginx-reload \
  -v /tmp/nginx.conf:/etc/nginx/nginx.conf:z,ro \
  docker.io/library/nginx:latest

# After updating the config file, reload Nginx
podman kill -s SIGHUP nginx-reload

# Verify Nginx is still running with new config
podman ps --filter name=nginx-reload

# Clean up
podman rm -f nginx-reload
```

### SIGUSR1 (10) - Application-Defined Action

```bash
# Some applications use SIGUSR1 for log rotation or status dumps
podman run -d --name custom-app docker.io/library/alpine:latest \
  sh -c 'trap "echo Received SIGUSR1" USR1; while true; do sleep 1; done'

sleep 2

# Send SIGUSR1
podman kill -s SIGUSR1 custom-app

# Check the logs
podman logs custom-app

# Clean up
podman rm -f custom-app
```

### SIGINT (2) - Interrupt

```bash
# Send Ctrl+C equivalent to a container
podman run -d --name interruptable docker.io/library/alpine:latest \
  sh -c 'trap "echo Interrupted; exit 0" INT; while true; do sleep 1; done'

sleep 2

# Send SIGINT
podman kill -s SIGINT interruptable

# Check the logs
podman logs interruptable

# Clean up
podman rm interruptable
```

### SIGQUIT (3) - Quit with Core Dump

```bash
# Send SIGQUIT (some apps dump thread stacks)
podman kill -s SIGQUIT my-java-app
```

## Kill vs Stop

Understanding the difference between `kill` and `stop`:

```bash
# podman stop: sends the configured stop signal, waits for timeout, then SIGKILL
# - Graceful shutdown with fallback
podman stop -t 30 my-app

# podman kill: sends exactly the signal you specify, no fallback
# - Immediate, precise signal delivery
podman kill -s SIGTERM my-app
```

## Killing Multiple Containers

```bash
# Kill multiple containers at once
podman kill -s SIGTERM container-1 container-2 container-3

# Kill all running and paused containers
podman kill --all

# Kill all running and paused containers with a specific signal
podman kill -s SIGTERM --all
```

## Signal Handling in Containers

Write containers that handle signals properly.

```bash
# Create a signal-aware container
podman run -d --name signal-demo docker.io/library/alpine:latest \
  sh -c '
    cleanup() {
      echo "SIGTERM received, cleaning up..."
      # Save state, close connections, etc.
      exit 0
    }
    reload() {
      echo "SIGHUP received, reloading config..."
    }
    trap cleanup TERM
    trap reload HUP
    echo "PID 1 running, waiting for signals..."
    while true; do sleep 1; done
  '

sleep 2

# Test SIGHUP
podman kill -s SIGHUP signal-demo
sleep 1
podman logs signal-demo

# Test SIGTERM
podman kill -s SIGTERM signal-demo
podman logs signal-demo

# Clean up
podman rm signal-demo
```

## Using Kill in Health Check Scripts

```bash
#!/bin/bash
# health-monitor.sh - Monitor and signal unhealthy containers

CONTAINER="my-web-app"

# Check if the app is responding
if ! curl -sf http://localhost:8080/health > /dev/null 2>&1; then
  echo "Health check failed, sending SIGHUP to reload..."
  podman kill -s SIGHUP "$CONTAINER"

  sleep 10

  # Check again
  if ! curl -sf http://localhost:8080/health > /dev/null 2>&1; then
    echo "Still unhealthy, sending SIGTERM..."
    podman kill -s SIGTERM "$CONTAINER"
  fi
fi
```

## Summary

The `podman kill` command provides precise signal delivery to container processes. Use SIGTERM for graceful shutdown, SIGHUP for configuration reloads, SIGUSR1/SIGUSR2 for application-defined actions, and SIGKILL as a last resort. Unlike `podman stop`, which sends the container's configured stop signal and falls back to SIGKILL after the timeout, `podman kill` sends exactly the signal you specify, giving you full control over process management.
