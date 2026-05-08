# How to Run Compose in Detached Mode with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, podman-compose, Detached, Background

Description: Learn how to run podman-compose services in detached mode for background operation and manage them without blocking your terminal.

---

> Detached mode runs your compose services in the background, freeing your terminal for other tasks while containers keep running.

Running `podman-compose up` without the `-d` flag starts services in the foreground, streaming all logs to your terminal and stopping when you press Ctrl+C. Detached mode starts services in the background, letting you continue working while containers run independently.

---

## Starting in Detached Mode

```bash
# Start all services in the background

podman-compose up -d

# Output shows containers being created and started
```

## Foreground vs Detached

```bash
# Foreground - logs stream to terminal, Ctrl+C stops services
podman-compose up

# Detached - services run in background, terminal is free
podman-compose up -d
```

## Checking Service Status

```bash
# List compose services and their status
podman-compose ps

# Show all containers including stopped ones
podman ps -a

# Detailed container info
podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

## Viewing Logs After Detaching

```bash
# View logs from all services
podman-compose logs

# Follow logs in real time
podman-compose logs -f

# View logs from a specific service
podman-compose logs -f web

# View last 50 lines
podman-compose logs --tail 50
```

## Running One-Off Commands

```bash
# Execute a command in a running service
podman-compose exec web sh

# Run a one-off container that exits after completion
podman-compose run --rm api python manage.py migrate
```

## Restarting Services

```bash
# Restart all services
podman-compose restart

# Restart a specific service
podman-compose restart web

# Restart with a custom timeout
podman-compose restart -t 30 db
```

## Stopping Without Removing

```bash
# Stop services but keep containers (can start again)
podman-compose stop

# Start stopped services
podman-compose start

# Stop and remove containers
podman-compose down
```

## Detached Mode in Scripts

```bash
#!/bin/bash
# deploy.sh - start services and verify health

# Start services in the background
podman-compose up -d

# Wait for services to stabilize
sleep 5

# Check that all services are running
RUNNING=$(podman-compose ps --format json | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(sum(1 for c in data if 'Up' in c.get('Status', '')))
")

echo "$RUNNING services running"

# Show the status
podman-compose ps
```

## Detaching from Foreground Mode

```bash
# If you started in foreground mode and want to detach:
# Press Ctrl+C to stop (this also stops containers)

# Better approach: always start detached and use logs -f
podman-compose up -d
podman-compose logs -f
# Now Ctrl+C only stops the log stream, not the containers
```

## Summary

Run `podman-compose up -d` to start services in the background. Use `podman-compose logs -f` to follow output, `podman-compose ps` to check status, and `podman-compose down` to stop and remove containers. Detached mode is the standard approach for development and deployment workflows.
