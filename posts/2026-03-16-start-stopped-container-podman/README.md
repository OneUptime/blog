# How to Start a Stopped Container in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Lifecycle, Container Management

Description: Learn how to start stopped or created containers in Podman, including interactive mode, attaching to output, and starting multiple containers.

---

> Starting a stopped container preserves all its configuration and data, letting you resume work without recreating anything from scratch.

When a container stops, either because its process finished or you stopped it manually, it retains its filesystem, configuration, and any changes made during its run. The `podman start` command brings these containers back to life. This guide covers common ways to start containers in Podman.

---

## Basic Container Start

Start a stopped container by name or ID.

```bash
# Create a container first

podman create --name my-web -p 8080:80 docker.io/library/nginx:latest

# Start the container
podman start my-web

# Verify it is running
podman ps --filter name=my-web
```

## Starting with Attached Output

Use the `--attach` flag to see the container's stdout and stderr as it starts.

```bash
# Create a container that produces output
podman create --name greeter docker.io/library/alpine:latest \
  echo "Hello from a restarted container"

# Start and see the output
podman start --attach greeter
```

## Starting in Interactive Mode

For containers that need an interactive terminal, use `--attach` with `--interactive`.

```bash
# Create an interactive container
podman create --name my-shell -it docker.io/library/alpine:latest /bin/sh

# Start it interactively
podman start --attach --interactive my-shell
```

The shorthand flags also work:

```bash
# Short form of --attach --interactive
podman start -ai my-shell
```

## Starting by Container ID

You can start containers using their full or partial ID.

```bash
# Create a container and capture its ID
CONTAINER_ID=$(podman create docker.io/library/alpine:latest sleep 300)
echo "Container ID: $CONTAINER_ID"

# Start using the full ID
podman start "$CONTAINER_ID"

# Verify it is running
podman ps

# Clean up
podman rm -f "$CONTAINER_ID"
```

## Starting Multiple Containers

Start several containers in a single command.

```bash
# Create multiple containers
podman create --name svc-redis docker.io/library/redis:7
podman create --name svc-nginx docker.io/library/nginx:latest

# Start all of them at once
podman start svc-redis svc-nginx

# Verify all are running
podman ps --format "{{.Names}}\t{{.Status}}"

# Clean up
podman rm -f svc-redis svc-nginx
```

## Starting All Stopped Containers

Combine `podman ps` filtering with `podman start` to start all stopped containers.

```bash
# Start all containers that are in "exited" state
podman ps -a --filter status=exited -q | xargs -r podman start

# Start all containers in "created" state
podman ps -a --filter status=created -q | xargs -r podman start
```

## Checking Container Logs After Start

After starting a container, check its logs to verify it is working correctly.

```bash
# Start a container
podman start my-web

# View the logs
podman logs my-web

# Follow the logs in real time
podman logs -f my-web
```

## Start with Checkpoint Restore

If you previously checkpointed a container, restore it with `podman container restore`.

```bash
# Create and start a container with a long-running process
podman run -d --name checkpoint-test docker.io/library/alpine:latest sleep 3600

# Checkpoint the container (saves its state)
podman container checkpoint checkpoint-test

# Restore and start from the checkpoint
podman container restore checkpoint-test

# Verify it is running again
podman ps --filter name=checkpoint-test

# Clean up
podman rm -f checkpoint-test
```

## Troubleshooting Start Failures

When a container fails to start, investigate the cause.

```bash
# Check the container's last known state
podman inspect my-container --format '{{.State.Status}} - {{.State.Error}}'

# View logs from the previous run
podman logs my-container

# Check events related to the container
podman events --filter container=my-container --since 1h
```

## Scripting Container Startup

```bash
#!/bin/bash
# start-services.sh - Start application containers in order

SERVICES=("db" "cache" "api" "web")

for svc in "${SERVICES[@]}"; do
  echo "Starting $svc..."
  podman start "$svc" 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "$svc started successfully"
  else
    echo "Failed to start $svc"
    exit 1
  fi
  sleep 2  # Brief pause between services
done

echo "All services running:"
podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

## Summary

The `podman start` command resumes stopped or created containers with all their original configuration intact. Use `--attach` to see output, `--interactive` for terminal access, and pass multiple container names to start several at once. Check logs and inspect state when troubleshooting startup issues.
