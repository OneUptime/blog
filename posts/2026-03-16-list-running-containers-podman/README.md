# How to List Running Containers in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Management, Monitoring

Description: Learn how to list and view running containers in Podman with various output formats and filtering options.

---

> Listing running containers is the starting point for container management, giving you a quick overview of what is active on your system.

The `podman ps` command displays running containers with details like names, IDs, images, status, and port mappings. This guide covers common ways to list and inspect running containers in Podman.

---

## Basic Container Listing

```bash
# List all running containers

podman ps
```

This shows a table with columns for Container ID, Image, Command, Created, Status, Ports, and Names.

## Understanding the Output

```bash
# Sample output:
# CONTAINER ID  IMAGE                             COMMAND     CREATED        STATUS        PORTS                 NAMES
# a1b2c3d4e5f6  docker.io/library/nginx:latest    nginx -g... 5 minutes ago  Up 5 minutes  0.0.0.0:8080->80/tcp  web-server
# f6e5d4c3b2a1  docker.io/library/redis:7         redis-se... 10 minutes ago Up 10 minutes 0.0.0.0:6379->6379/tcp redis-cache
```

## Showing Only Container IDs

Use the `--quiet` (or `-q`) flag to show only container IDs.

```bash
# Show just the IDs of running containers
podman ps -q
```

This is useful for piping into other commands:

```bash
# Count running containers
podman ps -q | wc -l

# Stop all running containers
podman ps -q | xargs -r podman stop
```

## Showing Container Sizes

```bash
# Include container size information
podman ps --size

# Or use the short flag
podman ps -s
```

## Showing the Latest Container

```bash
# Show only the most recently created container, across all states
podman ps --latest

# Or use the short flag
podman ps -l
```

## Limiting Output

```bash
# Show only the last N created containers, across all states
podman ps --last 5

# Or use the short flag
podman ps -n 5
```

## Displaying Full Command

By default, long commands are truncated. Use `--no-trunc` to see the full output.

```bash
# Show full container IDs and commands without truncation
podman ps --no-trunc
```

## Using Table Format

```bash
# Default table format
podman ps

# Custom table columns
podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Table with specific columns
podman ps --format "table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.RunningFor}}"
```

## JSON Output

```bash
# Get running containers as JSON
podman ps --format json

# Pretty-print JSON (pipe through jq if available)
podman ps --format json | jq '.'

# Extract specific fields with jq
podman ps --format json | jq '.[].Names'
```

## Showing Pod Information

If you use Podman pods, include pod information in the listing.

```bash
# Show pod-related columns
podman ps --pod

# List containers with their pod IDs
podman ps --format "table {{.Names}}\t{{.Pod}}\t{{.Status}}"
```

## Combining with Watch for Live Updates

```bash
# Watch container status in real time (refreshes every 2 seconds)
watch -n 2 podman ps

# Watch with custom format
watch -n 2 'podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'
```

## Quick Status Check Script

```bash
#!/bin/bash
# status.sh - Quick container status overview

echo "=== Running Containers ==="
RUNNING=$(podman ps -q | wc -l)
echo "Total running: $RUNNING"
echo ""

if [ "$RUNNING" -gt 0 ]; then
  podman ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
else
  echo "No containers are currently running"
fi
```

## Comparing ps with stats

```bash
# ps shows container information
podman ps --format "table {{.Names}}\t{{.Status}}"

# stats shows resource usage of running containers
podman stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

## Summary

The `podman ps` command is your primary tool for viewing running containers. Use `-q` for IDs only, `--format` for custom output, `--no-trunc` for full details, and `--size` for disk usage information. Combine it with `watch` for live monitoring and pipe output to other commands for automated management.
