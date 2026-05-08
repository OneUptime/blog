# How to View Container Logs in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Logging

Description: A complete guide to viewing container logs in Podman, covering basic log viewing, output filtering, and log inspection for both running and stopped containers.

---

> Container logs are your first line of defense when debugging application issues. Podman makes accessing them straightforward.

Every process running inside a container writes to stdout and stderr, and Podman captures this output as container logs. This guide covers all the ways to view and work with these logs.

---

## Basic Log Viewing

The `podman logs` command is the primary way to view container output.

```bash
# View all logs from a container

podman logs my-container

# View logs using the container ID
podman logs a1b2c3d4e5f6

# View logs from a stopped container (logs persist after stop)
podman ps -a  # Find the container name or ID
podman logs stopped-container
```

## Separate stdout and stderr

Podman captures both stdout and stderr. You can filter them.

```bash
# View only stdout
podman logs my-container 2>/dev/null

# View only stderr
podman logs my-container 1>/dev/null

# Redirect stdout and stderr to separate files
podman logs my-container > stdout.log 2> stderr.log
```

## View Logs for Specific Container States

```bash
# View logs from the most recently created container
podman logs $(podman ps -lq)

# View logs from all containers with a specific name pattern
for c in $(podman ps -a --format '{{.Names}}' | grep web); do
  echo "=== Logs for $c ==="
  podman logs "$c"
done

# View logs from a pod's containers
podman pod ps  # List pods
podman pod logs -c container-name my-pod  # Logs from a specific container in a pod
```

## Control Log Output

Manage the volume of log output you see.

```bash
# View only the last 100 lines
podman logs --tail 100 my-container

# View logs since a specific time
podman logs --since 2026-03-16T10:00:00 my-container

# View logs from the last 30 minutes
podman logs --since 30m my-container

# View logs up until a specific time
podman logs --until 2026-03-16T11:00:00 my-container

# Add timestamps to log output
podman logs --timestamps my-container
```

## View Logs with Format Context

Combine log viewing with container metadata for better context.

```bash
# Check the container's log driver before viewing logs
podman inspect --format '{{.HostConfig.LogConfig.Type}}' my-container

# View the log file path on disk for file-based log drivers
log_path=$(podman inspect --format '{{.HostConfig.LogConfig.Path}}' my-container)
echo "$log_path"

# Check log file size
[ -n "$log_path" ] && ls -lh "$log_path"

# View raw log file directly (format depends on the log driver)
[ -n "$log_path" ] && cat "$log_path"
```

## Combine Logs with Other Commands

Pipe log output to other tools for analysis.

```bash
# Count the number of log lines
podman logs my-container 2>&1 | wc -l

# Search for errors in logs
podman logs my-container 2>&1 | grep -i error

# View unique log messages
podman logs my-container 2>&1 | sort -u

# Count occurrences of each log level
podman logs my-container 2>&1 | grep -oP '(INFO|WARN|ERROR|DEBUG)' | sort | uniq -c | sort -rn

# Extract timestamps and messages
podman logs --timestamps my-container 2>&1 | awk '{print $1, $2}'
```

## View Logs for Init Containers in Pods

When working with pods that have init containers, you can inspect each container's logs separately.

```bash
# List containers in a pod
podman ps -a --filter pod=my-pod --format '{{.Names}}'

# View logs from a specific container in a pod
podman logs my-pod-container-name

# View logs from all containers in a pod
for c in $(podman ps -a --filter pod=my-pod --format '{{.Names}}'); do
  echo "=== $c ==="
  podman logs "$c" 2>&1 | tail -20
done
```

## Summary

The `podman logs` command provides comprehensive access to container output. Use `--tail`, `--since`, and `--until` to control the time range, add `--timestamps` for timing context, and pipe output to standard Unix tools for analysis. Logs persist even after a container stops, making post-mortem debugging straightforward.
