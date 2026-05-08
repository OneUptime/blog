# How to View Container Logs Since a Specific Time in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Logging

Description: Learn how to use the --since flag in Podman to view container logs from a specific point in time, making it easy to investigate incidents and correlate events.

---

> When you know roughly when an issue started, the --since flag lets you skip straight to the relevant log entries.

Incident investigation often starts with a timeframe. The `--since` flag in `podman logs` filters output to show only entries after a specified time, letting you focus on the window that matters.

---

## Basic --since Usage

The `--since` flag accepts both relative durations and absolute timestamps.

```bash
# View logs from the last 10 minutes

podman logs --since 10m my-container

# View logs from the last hour
podman logs --since 1h my-container

# View logs from the last 30 seconds
podman logs --since 30s my-container

# View logs from a specific timestamp without timezone
podman logs --since "2026-03-16T14:30:00" my-container

# View logs from a specific timestamp with timezone (RFC 3339 format)
podman logs --since "2026-03-16T14:30:00Z" my-container

# Unix timestamp
podman logs --since 1773936600 my-container
```

## Relative Time Formats

Podman supports several relative time formats with the `--since` flag.

```bash
# Seconds
podman logs --since 30s my-container

# Minutes
podman logs --since 15m my-container

# Hours
podman logs --since 2h my-container

# Combine --since with --timestamps for time context
podman logs --since 30m --timestamps my-container

# Combine --since with --tail to limit output volume
podman logs --since 1h --tail 200 my-container
```

## Investigate Time-Bound Incidents

Use `--since` for structured incident investigation.

```bash
# Step 1: Check when the problem was first reported (e.g., 14:30)
podman logs --since "2026-03-16T14:25:00" --timestamps my-container

# Step 2: Look for errors in that time window
podman logs --since "2026-03-16T14:25:00" my-container 2>&1 | grep -i error

# Step 3: Count errors per minute since the incident
podman logs --since "2026-03-16T14:25:00" --timestamps my-container 2>&1 | \
  grep -i error | \
  awk '{print substr($1,1,16)}' | \
  uniq -c

# Step 4: Check if the error rate has stabilized
podman logs --since 5m my-container 2>&1 | grep -c -i error
```

## Combine --since with --follow

Start following logs from a recent time window.

```bash
# Follow logs starting from 5 minutes ago
podman logs --since 5m -f my-container

# Follow logs from a specific time
podman logs --since "2026-03-16T15:00:00" -f my-container

# Follow with filter from a specific time
podman logs --since 10m -f my-container 2>&1 | grep --line-buffered -i "error\|warn"
```

## Check Multiple Containers for the Same Time Window

When investigating cross-service issues, check all related containers for the same timeframe.

```bash
# Define the incident time window
SINCE="2026-03-16T14:30:00"

# Check all running containers
for c in $(podman ps --format '{{.Names}}'); do
  ERROR_COUNT=$(podman logs --since "$SINCE" "$c" 2>&1 | grep -ci error)
  if [ "$ERROR_COUNT" -gt 0 ]; then
    echo "=== $c: $ERROR_COUNT errors since $SINCE ==="
    podman logs --since "$SINCE" "$c" 2>&1 | grep -i error | tail -5
    echo ""
  fi
done

# Check a specific set of services
for c in web api database cache; do
  echo "=== $c ==="
  podman logs --since 30m --timestamps "$c" 2>&1 | tail -10
  echo ""
done
```

## Use --since in Monitoring Scripts

Automate periodic log checks with `--since`.

```bash
#!/bin/bash
# check-recent-errors.sh - Run every 5 minutes via cron

CONTAINERS=("web" "api" "worker")
THRESHOLD=10
SINCE="5m"

for c in "${CONTAINERS[@]}"; do
  if podman ps --format '{{.Names}}' | grep -q "^${c}$"; then
    ERROR_COUNT=$(podman logs --since "$SINCE" "$c" 2>&1 | grep -ci error)
    if [ "$ERROR_COUNT" -gt "$THRESHOLD" ]; then
      echo "ALERT: $c has $ERROR_COUNT errors in the last $SINCE"
    fi
  fi
done
```

## Practical Examples

```bash
# Check what happened during a deploy (started 10 minutes ago)
podman logs --since 10m --timestamps deploy-container

# Review overnight logs (since midnight)
podman logs --since "2026-03-16T00:00:00" my-container 2>&1 | wc -l

# Check logs since the container was last restarted
START_TIME=$(podman inspect --format '{{.State.StartedAt}}' my-container)
podman logs --since "$START_TIME" my-container
```

## Summary

The `--since` flag is essential for time-bound log analysis. Use relative durations like `10m` or `2h` for quick checks, and absolute timestamps for precise incident investigation. Combine with `--timestamps` for context, `grep` for filtering, and loop over multiple containers to correlate events across services during incident response.
