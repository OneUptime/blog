# How to View Logs from Multiple Containers in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Logging, Monitoring

Description: Learn techniques for viewing and merging logs from multiple Podman containers simultaneously, including labeled output, chronological merging, and pod-level log viewing.

---

> When debugging distributed applications, you need to see logs from multiple containers at once to understand the full picture.

Modern applications often consist of multiple containers working together. When an issue spans services, viewing logs from a single container is not enough. This guide covers practical approaches to viewing and correlating logs across multiple Podman containers.

---

## View Logs from All Running Containers

```bash
# Quick view: last 5 lines from every running container

for c in $(podman ps --format '{{.Names}}'); do
  echo "=== $c ==="
  podman logs --tail 5 "$c" 2>&1
  echo ""
done

# One-liner version
podman ps --format '{{.Names}}' | xargs -I{} sh -c 'echo "=== {} ===" && podman logs --tail 5 {} 2>&1 && echo ""'
```

## Labeled Multi-Container Logs

Prefix each log line with the container name for easy identification.

```bash
# View logs from specific containers with labels
podman logs --names web api worker

# With timestamps and labels
podman logs --timestamps --names web api worker

# Follow multiple containers in real time with labels
podman logs -f --names web api worker
# Press Ctrl+C to stop all
```

## Merge and Sort Logs Chronologically

Combine logs from multiple containers and sort them by time.

```bash
# Merge timestamped logs and sort by time
{
  podman logs --timestamps web 2>&1 | sed 's/^[^ ]*/& [web]/'
  podman logs --timestamps api 2>&1 | sed 's/^[^ ]*/& [api]/'
  podman logs --timestamps db  2>&1 | sed 's/^[^ ]*/& [db]/'
} | sort

# Merge logs from a specific time window
SINCE="2026-03-16T14:00:00"
{
  podman logs --timestamps --since "$SINCE" web 2>&1 | sed 's/^[^ ]*/& [web]/'
  podman logs --timestamps --since "$SINCE" api 2>&1 | sed 's/^[^ ]*/& [api]/'
} | sort

# Merge and filter for errors
{
  podman logs --timestamps web 2>&1 | sed 's/^[^ ]*/& [web]/'
  podman logs --timestamps api 2>&1 | sed 's/^[^ ]*/& [api]/'
} | sort | grep -i error
```

## View Logs from a Pod

Podman pods group containers together, making it natural to view their logs collectively.

```bash
# List containers in a pod
podman ps --filter pod=my-pod --format '{{.Names}}'

# View logs from all containers in a pod
podman pod logs --tail 20 --names my-pod

# Follow all pod containers with labels
podman pod logs -f --names my-pod
```

## Filter Multi-Container Logs by Pattern

```bash
# Find which containers have errors
for c in $(podman ps --format '{{.Names}}'); do
  ERROR_COUNT=$(podman logs --since 1h "$c" 2>&1 | grep -ci error)
  if [ "$ERROR_COUNT" -gt 0 ]; then
    echo "$c: $ERROR_COUNT errors"
  fi
done

# Search for a specific request ID across all containers
REQUEST_ID="req-abc123"
for c in $(podman ps --format '{{.Names}}'); do
  MATCHES=$(podman logs "$c" 2>&1 | grep -c "$REQUEST_ID")
  if [ "$MATCHES" -gt 0 ]; then
    echo "=== $c ($MATCHES matches) ==="
    podman logs "$c" 2>&1 | grep "$REQUEST_ID"
  fi
done
```

## Create a Multi-Container Log Viewer Script

```bash
#!/bin/bash
# multi-logs.sh - View logs from multiple containers
# Usage: ./multi-logs.sh [--follow] [--since TIME] container1 container2 ...

FOLLOW=""
SINCE=""
CONTAINERS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --follow|-f) FOLLOW="-f" ;;
    --since) SINCE="--since $2"; shift ;;
    *) CONTAINERS+=("$1") ;;
  esac
  shift
done

# If no containers specified, use all running containers
if [ ${#CONTAINERS[@]} -eq 0 ]; then
  mapfile -t CONTAINERS < <(podman ps --format '{{.Names}}')
fi

# Assign colors to containers
COLORS=(31 32 33 34 35 36)

for i in "${!CONTAINERS[@]}"; do
  c="${CONTAINERS[$i]}"
  color="${COLORS[$((i % ${#COLORS[@]}))]}"
  # shellcheck disable=SC2086
  podman logs $FOLLOW $SINCE "$c" 2>&1 | \
    sed "s/^/\x1b[${color}m[$c]\x1b[0m /" &
done
wait
```

## Export Multi-Container Logs

Save combined logs for later analysis or sharing.

```bash
# Export merged logs to a file
{
  echo "Log export: $(date -Iseconds)"
  echo "Containers: web, api, worker"
  echo "---"
  for c in web api worker; do
    podman logs --timestamps "$c" 2>&1 | sed "s/^[^ ]*/& [$c]/"
  done | sort
} > combined-logs.txt

# Export as structured data
for c in web api worker; do
  podman logs --timestamps "$c" 2>&1 | jq -R --arg container "$c" '{container:$container, log:.}'
done > combined-logs.jsonl
```

## Summary

Viewing logs from multiple Podman containers can be done with `podman logs` and shell scripting. Use `--names` or `sed` to label each container's output, merge timestamped logs and `sort` them for chronological ordering, and use `podman pod logs` for grouped pod viewing. For real-time monitoring, use `podman logs -f` or `podman pod logs -f` with labeled output. Always use `--timestamps` when merging logs from different containers to maintain proper chronological order.
