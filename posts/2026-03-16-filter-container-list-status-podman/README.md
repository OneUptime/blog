# How to Filter Container List by Status in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Management, Filtering

Description: Learn how to filter Podman container listings by status to quickly find running, stopped, paused, or created containers.

---

> Filtering containers by status lets you quickly zero in on containers that need attention, whether they are running, stopped, or in an error state.

When managing many containers, you need to filter the list to find specific ones. The `--filter status=` option in `podman ps` lets you show only containers in a particular state. This guide covers all status filters and practical usage patterns.

---

## Available Status Filters

Podman containers can be in these states:

- `created` - Container has been created but never started
- `initialized` - Container storage has been initialized but the container is not running
- `running` - Container is currently running
- `paused` - Container processes are frozen
- `exited` - Container has stopped (process exited)
- `unknown` - Container state cannot be determined

## Filtering Running Containers

```bash
# Show only running containers

podman ps -a --filter status=running

# Get just the names of running containers
podman ps -a --filter status=running --format "{{.Names}}"

# Count running containers
podman ps -a --filter status=running -q | wc -l
```

## Filtering Stopped/Exited Containers

```bash
# Show only exited containers
podman ps -a --filter status=exited

# Show exited containers with their exit codes
podman ps -a --filter status=exited --format "table {{.Names}}\t{{.Status}}\t{{.ExitCode}}"

# Find containers that exited with errors (non-zero exit code)
podman ps -a --filter status=exited --format "{{.Names}} {{.ExitCode}}" | \
  awk '$2 != 0 {print $1 " exited with code " $2}'
```

## Filtering Created Containers

```bash
# Show containers that were created but never started
podman ps -a --filter status=created

# Show with creation time
podman ps -a --filter status=created --format "table {{.Names}}\t{{.Created}}"
```

## Filtering Paused Containers

```bash
# Show only paused containers
podman ps -a --filter status=paused

# List paused container names
podman ps -a --filter status=paused --format "{{.Names}}"
```

## Combining Multiple Status Filters

Use multiple `--filter` flags to match containers in any of the specified states.

```bash
# Show containers that are either running or paused
podman ps -a --filter status=running --filter status=paused

# Show common non-running containers (exited + created)
podman ps -a --filter status=exited --filter status=created

# Show everything except running
podman ps -a --filter status=exited --filter status=created --filter status=initialized --filter status=paused --filter status=unknown
```

## Practical Examples

### Finding Failed Containers

```bash
# List containers that exited with non-zero codes
podman ps -a --filter status=exited --format "{{.Names}}\t{{.ExitCode}}" | \
  awk -F'\t' '$2 != "0"'

# Get logs from failed containers
for name in $(podman ps -a --filter status=exited --format "{{.Names}}\t{{.ExitCode}}" | awk -F'\t' '$2 != "0" {print $1}'); do
  echo "=== Logs for $name ==="
  podman logs --tail 10 "$name"
  echo ""
done
```

### Restarting All Exited Containers

```bash
# Restart every exited container
podman ps -a --filter status=exited -q | xargs -r podman start

# Verify they are running now
podman ps
```

### Cleaning Up by Status

```bash
# Remove all exited containers
podman ps -a --filter status=exited -q | xargs -r podman rm

# Remove all created (never started) containers
podman ps -a --filter status=created -q | xargs -r podman rm

# Remove containers in an unknown state
podman ps -a --filter status=unknown -q | xargs -r podman rm -f
```

### Status Dashboard

```bash
#!/bin/bash
# dashboard.sh - Container status dashboard

echo "Container Status Dashboard"
echo "========================="
echo ""

for status in running paused exited created initialized unknown; do
  COUNT=$(podman ps -a --filter status=$status -q | wc -l)
  if [ "$COUNT" -gt 0 ]; then
    echo "[$status] ($COUNT containers)"
    podman ps -a --filter status=$status --format "  - {{.Names}} ({{.Image}})"
    echo ""
  fi
done
```

### Monitoring Status Changes

```bash
# Watch for status changes every 5 seconds
watch -n 5 'echo "Running:"; podman ps --format "  {{.Names}}"; echo ""; echo "Exited:"; podman ps -a --filter status=exited --format "  {{.Names}} (exit: {{.ExitCode}})"'
```

## Combining Status with Other Filters

```bash
# Running containers from a specific image
podman ps -a --filter status=running --filter ancestor=docker.io/library/nginx:latest

# Exited containers with a specific label
podman ps -a --filter status=exited --filter label=app=web

# Running containers with a specific name pattern
podman ps -a --filter status=running --filter name=web
```

## JSON Output with Status Filter

```bash
# Get exited containers as JSON
podman ps -a --filter status=exited --format json | jq '.'

# Extract specific fields from running containers
podman ps -a --filter status=running --format json | \
  jq '.[] | {name: .Names, image: .Image, uptime: .Status}'
```

## Summary

Filtering containers by status with `--filter status=` is essential for targeted container management. Use it to find running services, identify failed containers, clean up exited ones, and build monitoring dashboards. Combine with other filters and custom formats for powerful container queries.
