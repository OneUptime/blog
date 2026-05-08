# How to Pause and Unpause a Container in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Lifecycle, Container Management

Description: Learn how to pause and unpause containers in Podman to temporarily freeze processes without stopping or restarting them.

---

> Pausing a container freezes all its processes in place, preserving their exact state without consuming CPU cycles.

Sometimes you need to temporarily suspend a container's activity without stopping it entirely. Podman's pause and unpause commands freeze all processes inside a container using cgroups, preserving their memory state while stopping CPU usage. This guide shows you how to use these commands effectively.

---

## Understanding Pause vs Stop

Pausing and stopping are fundamentally different:

- **Pause** freezes processes in memory (they retain their state but use zero CPU)
- **Stop** terminates processes entirely (they must reinitialize when started again)

Paused containers keep their network connections, file handles, and in-memory state intact.

## Pausing a Container

```bash
# Start a container

podman run -d --name my-app docker.io/library/nginx:latest

# Pause the container
podman pause my-app

# Check the status - it will show "Paused"
podman ps --filter name=my-app --format "{{.Names}} {{.Status}}"
```

## Unpausing a Container

```bash
# Resume the paused container
podman unpause my-app

# Verify it is running again
podman ps --filter name=my-app --format "{{.Names}} {{.Status}}"
```

## Pausing Multiple Containers

```bash
# Start several containers
podman run -d --name web-1 docker.io/library/nginx:latest
podman run -d --name web-2 docker.io/library/nginx:latest
podman run -d --name web-3 docker.io/library/nginx:latest

# Pause all of them
podman pause web-1 web-2 web-3

# Check status
podman ps --format "{{.Names}}\t{{.Status}}"

# Unpause all of them
podman unpause web-1 web-2 web-3

# Clean up
podman rm -f web-1 web-2 web-3
```

## Pausing All Running Containers

```bash
# Pause every running container
podman pause --all

# Unpause every paused container
podman unpause --all
```

## Listing Paused Containers

```bash
# Filter for paused containers only
podman ps --filter status=paused

# Show just names of paused containers
podman ps --filter status=paused --format "{{.Names}}"
```

## Practical Use Cases

### Temporarily Freeing CPU Resources

When you need CPU resources for a high-priority task, pause non-essential containers.

```bash
# Pause background services to free CPU
podman pause background-worker

# Run the CPU-intensive task
echo "Running intensive task..."

# Resume background services
podman unpause background-worker
```

### Creating Consistent Filesystem Snapshots

Pause a container to ensure a consistent state before taking a backup.

```bash
# Pause to ensure filesystem consistency
podman pause my-database

# Take a backup of the container's volume
tar -czf /tmp/db-backup.tar.gz /path/to/db/volume

# Resume the container
podman unpause my-database

echo "Backup completed while container was paused"
```

### Debugging and Inspection

Pause a container to inspect its state without it changing during inspection.

```bash
# Pause the container to freeze its state
podman pause my-app

# Inspect process and network state
podman top my-app
podman inspect my-app --format '{{.NetworkSettings.IPAddress}}'

# Resume after inspection
podman unpause my-app
```

## Behavior of Paused Containers

### Network Connections

Paused containers do not respond to network requests but maintain their connections.

```bash
# Start nginx and verify it works
podman run -d --name test-nginx -p 8080:80 docker.io/library/nginx:latest
sleep 2
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080

# Pause it - requests will time out
podman pause test-nginx
curl -s --max-time 3 http://localhost:8080 || echo "Request timed out (container paused)"

# Unpause - requests work again
podman unpause test-nginx
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080

# Clean up
podman rm -f test-nginx
```

### Exec in Paused Containers

You cannot execute commands in a paused container.

```bash
# This will fail
podman pause my-app
podman exec my-app echo "test" 2>&1 || echo "Cannot exec in paused container"
podman unpause my-app
```

## Scripting Pause/Unpause

```bash
#!/bin/bash
# maintenance.sh - Pause non-critical services during maintenance

NON_CRITICAL=("worker-1" "worker-2" "scheduler")
CRITICAL=("api" "database")

echo "Pausing non-critical services for maintenance..."
for svc in "${NON_CRITICAL[@]}"; do
  podman pause "$svc" 2>/dev/null && echo "Paused $svc"
done

echo "Performing maintenance..."
# ... maintenance tasks ...
sleep 10

echo "Resuming services..."
for svc in "${NON_CRITICAL[@]}"; do
  podman unpause "$svc" 2>/dev/null && echo "Resumed $svc"
done

echo "Maintenance complete"
```

## Summary

Pausing and unpausing containers in Podman gives you a lightweight way to temporarily freeze processes without losing their state. Use `podman pause` to suspend CPU usage while keeping memory state intact, and `podman unpause` to resume. This is ideal for freeing resources, taking consistent backups, and performing debugging without restarting containers.
