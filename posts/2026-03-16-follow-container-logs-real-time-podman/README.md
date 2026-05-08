# How to Follow Container Logs in Real-Time with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Logging, Monitoring

Description: Learn how to stream and follow container logs in real-time using Podman, including filtering live output and monitoring multiple containers simultaneously.

---

> Following logs in real-time is the fastest way to understand what your containerized application is doing right now.

When debugging live issues or monitoring application behavior, you need to see log output as it happens. Podman provides the `--follow` flag to stream logs in real-time, similar to `tail -f` for regular files.

---

## Basic Real-Time Log Following

```bash
# Follow logs from a running container

podman logs --follow my-container

# Short form using -f flag
podman logs -f my-container

# Follow logs and show only the new output (skip historical logs)
podman logs -f --tail 0 my-container

# Follow logs starting from the last 10 lines
podman logs -f --tail 10 my-container

# Follow logs with timestamps
podman logs -f --timestamps my-container
```

Press `Ctrl+C` to stop following logs. The container continues running.

## Follow Logs with Filtering

Combine real-time following with grep to filter for specific patterns.

```bash
# Follow logs and filter for errors
podman logs -f my-container 2>&1 | grep --line-buffered -i error

# Follow logs and filter for multiple patterns
podman logs -f my-container 2>&1 | grep --line-buffered -iE '(error|warn|critical)'

# Follow logs and exclude noisy messages
podman logs -f my-container 2>&1 | grep --line-buffered -v "health check"

# Follow logs and highlight matches with color
podman logs -f my-container 2>&1 | grep --line-buffered --color=always -i error
```

The `--line-buffered` flag on grep is important when piping from `podman logs -f`. Without it, grep may buffer output and you will not see results in real time.

## Follow Logs from Multiple Containers

Monitor several containers at once using different approaches.

```bash
# Method 1: Use tmux or multiple terminal windows
# Terminal 1:
podman logs -f web-container
# Terminal 2:
podman logs -f api-container

# Method 2: Background processes with prefixed output
podman logs -f web 2>&1 | sed 's/^/[web] /' &
podman logs -f api 2>&1 | sed 's/^/[api] /' &
# Press Enter to get your prompt back
# Use 'kill %1 %2' or 'fg' to manage background jobs

# Method 3: Use a simple script for labeled output
for container in web api worker; do
  podman logs -f "$container" 2>&1 | sed "s/^/[$container] /" &
done
wait  # Wait for all background processes (Ctrl+C to stop all)
```

## Follow Logs Since a Specific Time

Start following from a point in time rather than the beginning.

```bash
# Follow logs starting from 5 minutes ago
podman logs -f --since 5m my-container

# Follow logs starting from a specific timestamp
podman logs -f --since "2026-03-16T14:30:00" my-container

# Follow logs from the last hour with timestamps
podman logs -f --since 1h --timestamps my-container
```

## Follow Pod Logs

When working with Podman pods, follow logs from containers within the pod.

```bash
# Follow logs from a specific container in a pod
podman pod logs -f -c web my-pod

# Follow all containers in a pod
podman pod logs -f my-pod
```

## Real-Time Log Analysis

Process live logs for metrics and alerting.

```bash
# Count errors per minute in real time
podman logs -f my-container 2>&1 | grep --line-buffered -i error | while read -r line; do
  echo "$(date '+%H:%M:%S') ERROR: $line"
done

# Monitor request rates (for web servers with access logs)
podman logs -f web 2>&1 | grep --line-buffered "HTTP" | while read -r line; do
  echo "$(date '+%H:%M:%S') $line"
done

# Alert on specific patterns
podman logs -f my-container 2>&1 | grep --line-buffered "CRITICAL" | while read -r line; do
  echo "ALERT at $(date): $line"
  # Add notification command here (e.g., curl to a webhook)
done
```

## Follow Logs in a Script

Use log following in automation scripts with proper signal handling.

```bash
#!/bin/bash
# follow-logs.sh - Follow container logs with cleanup

CONTAINER="$1"
LOGFILE="/var/log/container-${CONTAINER}.log"

# Trap Ctrl+C to clean up
cleanup() {
  echo "Stopping log capture..."
  kill "$LOG_PID" 2>/dev/null
  exit 0
}
trap cleanup SIGINT SIGTERM

# Follow logs and write to both terminal and file
podman logs -f --timestamps "$CONTAINER" 2>&1 | tee -a "$LOGFILE" &
LOG_PID=$!

# Wait for the background process
wait "$LOG_PID"
```

## Summary

The `podman logs -f` command streams container output in real-time. Combine it with `--tail 0` to skip historical output, use `grep --line-buffered` for real-time filtering, and run multiple follow processes in the background with prefixed labels to monitor several containers at once. Always use `--line-buffered` when piping live log output through filters.
