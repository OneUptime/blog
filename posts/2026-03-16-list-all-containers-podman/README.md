# How to List All Containers Including Stopped in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Management, Monitoring

Description: Learn how to list all containers in Podman including stopped, exited, and created containers for complete environment visibility.

---

> Viewing all containers, not just running ones, gives you complete visibility into your container environment and helps identify cleanup opportunities.

By default, `podman ps` only shows running containers. To see every container on your system, including stopped, exited, and created containers, you need the `--all` flag. This guide covers how to get a complete view of all containers.

---

## Listing All Containers

```bash
# List ALL containers (running, exited, created, initialized, paused)

podman ps --all

# Short flag form
podman ps -a
```

## Understanding Container States

Containers can be in several states:

```bash
# Show containers grouped by status
echo "=== Running ==="
podman ps -a --filter status=running --format "{{.Names}}"

echo "=== Exited ==="
podman ps -a --filter status=exited --format "{{.Names}}"

echo "=== Created ==="
podman ps -a --filter status=created --format "{{.Names}}"

echo "=== Initialized ==="
podman ps -a --filter status=initialized --format "{{.Names}}"

echo "=== Paused ==="
podman ps -a --filter status=paused --format "{{.Names}}"
```

## Showing All Container IDs

```bash
# Get IDs of all containers
podman ps -a -q

# Count all containers
podman ps -a -q | wc -l

# Count by state
echo "Running: $(podman ps --filter status=running -q | wc -l)"
echo "Exited: $(podman ps -a --filter status=exited -q | wc -l)"
echo "Created: $(podman ps -a --filter status=created -q | wc -l)"
echo "Initialized: $(podman ps -a --filter status=initialized -q | wc -l)"
```

## Custom Format for All Containers

```bash
# Show names, status, and exit codes
podman ps -a --format "table {{.Names}}\t{{.Status}}\t{{.ExitCode}}"

# Show containers with their images and creation time
podman ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Created}}\t{{.Status}}"

# Show containers with size information
podman ps -a --size --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"
```

## JSON Output for All Containers

```bash
# Get all containers as JSON
podman ps -a --format json

# Extract specific fields
podman ps -a --format json | jq '.[] | {name: .Names, status: .State, image: .Image}'

# Filter exited containers from JSON
podman ps -a --format json | jq '[.[] | select(.State == "exited")]'
```

## Sorting Container Output

```bash
# Sort by creation time (most recent first is default)
podman ps -a --sort created

# Sort by name
podman ps -a --sort names

# Sort by size
podman ps -a --sort size --size

# Sort by status
podman ps -a --sort status
```

## Full Details Without Truncation

```bash
# Show complete container IDs and commands
podman ps -a --no-trunc

# Combine with custom format
podman ps -a --no-trunc --format "table {{.ID}}\t{{.Names}}\t{{.Command}}"
```

## Showing External Storage Containers

```bash
# Include containers from external storage
podman ps -a --external
```

## Container Inventory Script

```bash
#!/bin/bash
# inventory.sh - Complete container inventory

echo "=========================================="
echo "Container Inventory - $(date)"
echo "=========================================="

TOTAL=$(podman ps -a -q | wc -l)
RUNNING=$(podman ps -q | wc -l)
STOPPED=$(podman ps -a --filter status=exited -q | wc -l)
CREATED=$(podman ps -a --filter status=created -q | wc -l)
INITIALIZED=$(podman ps -a --filter status=initialized -q | wc -l)
PAUSED=$(podman ps -a --filter status=paused -q | wc -l)

echo ""
echo "Summary:"
echo "  Total:   $TOTAL"
echo "  Running: $RUNNING"
echo "  Stopped: $STOPPED"
echo "  Created: $CREATED"
echo "  Initialized: $INITIALIZED"
echo "  Paused:  $PAUSED"
echo ""

if [ "$TOTAL" -gt 0 ]; then
  echo "All Containers:"
  podman ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
fi
```

## Finding Containers That Need Cleanup

```bash
# Find containers that exited with errors
podman ps -a --filter status=exited --format "{{.Names}}\t{{.ExitCode}}" | \
  awk -F'\t' '$2 != "0" {print "FAILED: " $1 " (exit code: " $2 ")"}'

# Find old containers (inspect creation time)
podman ps -a --format "{{.Names}}\t{{.Created}}" | sort -t$'\t' -k2

# Find containers consuming the most disk space
podman ps -a --size --format "table {{.Names}}\t{{.Size}}" --sort size
```

## All Containers with Pod Info

```bash
# Show all containers including their pod membership
podman ps -a --pod --format "table {{.Names}}\t{{.Pod}}\t{{.Status}}"
```

## Comparing with podman container list

The `podman container list` command is an alias for `podman ps`.

```bash
# These are equivalent
podman ps -a
podman container list -a
podman container ls -a
```

## Summary

The `podman ps -a` command gives you complete visibility into all containers on your system, regardless of their state. Use it to inventory your environment, find containers that need cleanup, identify failed containers by exit code, and maintain a healthy container system. Combine with `--format` for custom output and `--filter` for targeted queries.
