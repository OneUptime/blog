# How to Filter and Search Container Logs in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Logging, Debugging

Description: Learn how to filter, search, and navigate through Docker container logs in Portainer to quickly find the information you need.

## Introduction

Container logs can grow large quickly. Finding a specific error, request, or event in thousands of log lines requires effective filtering. Portainer's log viewer includes search functionality, and combined with Docker's built-in filtering options, you can quickly zero in on the log entries that matter.

## Prerequisites

- Portainer installed with a connected Docker environment
- A container with logs to search

## Step 1: Use Portainer's Log Search

In the log viewer:

1. Navigate to the container's logs.
2. Use the **Search** box in the log viewer toolbar.
3. Type your search term.
4. Optionally enable **Filter search results** to show only matching lines.

Common search terms:
```text
"ERROR"          → Find all error lines
"CRITICAL"       → Find critical issues
"timeout"        → Find timeout-related issues
"/api/checkout"  → Find logs for a specific API endpoint
"user_id=12345"  → Find logs for a specific user
```

## Step 2: Filter by Time Range

Portainer includes a **Date picker** and lets you choose how many lines to show. For precise time-based filtering or CLI automation, use Docker:

```bash
# Show logs from the last hour:

docker logs --since 1h my-container

# Show logs from a specific time:
docker logs --since "2026-03-20T10:00:00Z" my-container

# Show logs between two times:
docker logs --since "2026-03-20T10:00:00Z" --until "2026-03-20T11:00:00Z" my-container

# Show logs from last 30 minutes with timestamps:
docker logs --since 30m -t my-container
```

## Step 3: Using grep for Advanced Filtering

For more powerful filtering, use the Docker CLI combined with grep:

```bash
# Find all ERROR lines in the last hour:
docker logs --since 1h my-container 2>&1 | grep "ERROR"

# Case-insensitive search:
docker logs my-container 2>&1 | grep -Ei "error|exception|failed"

# Find lines containing "timeout" with 3 lines of context:
docker logs --since 24h my-container 2>&1 | grep -C 3 "timeout"

# Count error occurrences:
docker logs --since 24h my-container 2>&1 | grep -c "ERROR"

# Show unique error messages:
docker logs --since 24h my-container 2>&1 | \
    grep "ERROR" | \
    sed 's/[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}T[0-9]\{2\}:[0-9]\{2\}:[0-9]\{2\}Z/TIMESTAMP/g' | \
    sort | uniq -c | sort -rn | head -20
```

## Step 4: Filter Structured (JSON) Logs

For applications that output JSON logs, use jq for powerful filtering:

```bash
# Filter JSON logs by level:
docker logs my-container 2>&1 | jq 'select(.level == "error")'

# Find errors for a specific user:
docker logs my-container 2>&1 | jq 'select(.user_id == 12345)'

# Find slow requests (latency > 1000ms):
docker logs my-container 2>&1 | jq 'select(.latency_ms > 1000)'

# Show only specific fields:
docker logs my-container 2>&1 | \
    jq 'select(.level == "error") | {time: .timestamp, msg: .message, path: .path}'

# Output:
{
  "time": "2026-03-20T10:15:23Z",
  "msg": "Payment gateway timeout",
  "path": "/api/checkout"
}
```

## Step 5: Search Logs Across Multiple Containers

For a Compose stack, search all services at once:

```bash
# Search all containers in a compose stack:
docker compose logs 2>&1 | grep "ERROR"

# Search with timestamps and service labels:
docker compose logs --timestamps 2>&1 | grep -E "web.*ERROR|api.*ERROR"

# Find errors in the last hour across all services:
docker compose logs --since 1h 2>&1 | grep -Ei "error|failed|exception"
```

## Step 6: Create a Log Analysis Script

For regular log analysis, create a reusable script:

```bash
#!/bin/bash
# analyze-logs.sh
# Usage: ./analyze-logs.sh <container-name> [hours]

CONTAINER="${1:?Container name required}"
HOURS="${2:-1}"

echo "=== Log Analysis: ${CONTAINER} (last ${HOURS}h) ==="
echo ""

echo "--- Error Count by Type ---"
docker logs --since "${HOURS}h" "${CONTAINER}" 2>&1 | \
    grep -Ei "error|exception|failed" | \
    grep -oE '"message"[[:space:]]*:[[:space:]]*"[^"]*"' | \
    sort | uniq -c | sort -rn | head -10

echo ""
echo "--- HTTP Error Status Codes ---"
docker logs --since "${HOURS}h" "${CONTAINER}" 2>&1 | \
    grep -oE '"status"[[:space:]]*:[[:space:]]*[45][0-9]{2}' | \
    sort | uniq -c | sort -rn

echo ""
echo "--- Slowest Requests (>1s) ---"
docker logs --since "${HOURS}h" "${CONTAINER}" 2>&1 | \
    jq 'select(.latency_ms > 1000) | {path: .path, latency: .latency_ms}' 2>/dev/null | \
    head -20

echo ""
echo "--- Log Volume by Hour ---"
docker logs --since "${HOURS}h" -t "${CONTAINER}" 2>&1 | \
    grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}' | \
    sort | uniq -c
```

## Step 7: Centralized Log Search

For larger environments, use a centralized log aggregation stack. For a self-hosted Docker Compose example, you can run Loki, Grafana, and Grafana Alloy; Grafana recommends Helm or Tanka for production deployments:

```yaml
# loki-stack.yml: centralized logging for all containers
# Requires companion alloy-local-config.yaml and loki-config.yaml files.
services:
  # Grafana Alloy: collects Docker container logs
  alloy:
    image: grafana/alloy:latest
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./alloy-local-config.yaml:/etc/alloy/config.alloy:ro
    command: run --server.http.listen-addr=0.0.0.0:12345 --storage.path=/var/lib/alloy/data /etc/alloy/config.alloy

  # Loki: log aggregation and storage
  loki:
    image: grafana/loki:latest
    restart: unless-stopped
    volumes:
      - ./loki-config.yaml:/etc/loki/config.yaml:ro
    command: -config.file=/etc/loki/config.yaml
    ports:
      - "3100:3100"

  # Grafana: search and visualization
  grafana:
    image: grafana/grafana:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
```

With Grafana + Loki, you can search logs across all containers and build alert-oriented queries with LogQL. If your Alloy config promotes container names to a `container` label, queries can look like:

```text
# LogQL examples in Grafana:
{container="my-app"} |= "ERROR"
{container=~"api.*"} | json | latency_ms > 1000
sum(rate({container=~".+"} |= "timeout" [5m])) > 10
```

## Conclusion

Effective log filtering is key to fast debugging. Portainer's built-in search handles simple keyword filtering. For time-range filtering, JSON parsing, and cross-container search, combine Docker's CLI with grep and jq. For production environments with high log volume, invest in a centralized logging stack like Grafana Loki and deploy it with a production-ready method for your environment.
