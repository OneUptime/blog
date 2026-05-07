# How to View Health Check Status of a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Health Check, Monitoring, Status

Description: Learn how to view and interpret the health check status of Podman containers for monitoring and debugging.

---

> Knowing how to view and interpret health check status is essential for monitoring your containerized services and diagnosing issues.

Once you have configured health checks on your Podman containers, you need to know how to check their status. Podman provides several ways to view health check results, from quick status queries to detailed log inspection.

---

## Quick Status Check with podman ps

The simplest way to see health status is with `podman ps`:

```bash
# List containers with their health status

podman ps --format "table {{.Names}}\t{{.Status}}"

# Example output:
# NAMES          STATUS
# my-web-app     Up 5 minutes (healthy)
# my-worker      Up 3 minutes (unhealthy)
# my-db          Up 10 minutes (health: starting)
```

## Detailed Health Status with podman inspect

Use `podman inspect` to get the full health check details:

```bash
# Get the current health status (healthy, unhealthy, or starting)
podman inspect --format='{{.State.Health.Status}}' my-web-app

# Get the full health check log as JSON
podman inspect --format='{{json .State.Health}}' my-web-app | python3 -m json.tool
```

The output includes:

```json
{
    "Status": "healthy",
    "FailingStreak": 0,
    "Log": [
        {
            "Start": "2026-03-17T10:00:00.000000000Z",
            "End": "2026-03-17T10:00:00.150000000Z",
            "ExitCode": 0,
            "Output": ""
        }
    ]
}
```

## Understanding Health States

```bash
# Check which state the container is in
STATUS=$(podman inspect --format='{{.State.Health.Status}}' my-app)

case $STATUS in
  "healthy")
    echo "Container is healthy and responding"
    ;;
  "unhealthy")
    echo "Container has failed consecutive health checks"
    ;;
  "starting")
    echo "Container has not passed a health check yet"
    ;;
esac
```

## Viewing Health Check Logs

```bash
# View the last health check output
podman inspect --format='{{json .State.Health.Log}}' my-web-app | python3 -c 'import json,sys; log=json.load(sys.stdin); print(log[-1]["Output"] if log else "")'

# View the exit code of the last health check
podman inspect --format='{{json .State.Health.Log}}' my-web-app | python3 -c 'import json,sys; log=json.load(sys.stdin); print(log[-1]["ExitCode"] if log else "")'

# View the current failing streak count
podman inspect --format='{{.State.Health.FailingStreak}}' my-web-app
```

## Monitoring Health Across Multiple Containers

```bash
# Script to check health of all containers with health checks
podman ps --format '{{.Names}}' | while read -r name; do
  status=$(podman inspect --format='{{.State.Health.Status}}' "$name" 2>/dev/null)
  if [ -n "$status" ]; then
    echo "$name: $status"
  fi
done
```

## Using Events to Watch Health Changes

```bash
# Watch for health status change events in real time
podman events --filter event=health_status
```

## Summary

Podman provides multiple ways to view health check status: `podman ps` for a quick overview, `podman inspect` for detailed results and logs, and `podman events` for real-time monitoring. The three health states are starting (no health check has passed yet), healthy (checks passing), and unhealthy (consecutive failures exceeded retries). Regularly monitoring these states helps you catch and resolve issues early.
