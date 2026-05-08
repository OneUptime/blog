# How to Troubleshoot Missing Container Logs in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Logging, Troubleshooting

Description: Learn how to diagnose and fix issues where Podman container logs are empty or missing, covering log driver problems, application output configuration, and storage issues.

---

> Missing container logs are usually caused by the application writing to files instead of stdout, the wrong log driver, or the container being removed.

When `podman logs` returns nothing, it does not necessarily mean the application is silent. The logs might be going somewhere else, the log driver might not support reading, or the log files might have been cleaned up. This guide helps you systematically find the cause.

---

## Step 1: Verify the Container Exists

```bash
# Check if the container exists (including stopped containers)

podman ps -a | grep my-container

# If not found, the container and its logs were removed
# Check if it was recently removed
podman events --filter event=remove --since 1h

# If the container was removed with podman rm, logs are gone
# Use podman rm without -v to keep volumes (but logs are still removed)
```

## Step 2: Check the Log Driver

Some log drivers do not support `podman logs`.

```bash
# Check which log driver the container uses
podman inspect --format '{{.HostConfig.LogConfig.Type}}' my-container

# Log driver support for podman logs:
# k8s-file:    YES - podman logs works
# json-file:   YES - alias for k8s-file
# journald:    YES - podman logs works
# passthrough: NO  - logs go to terminal, not stored
# passthrough-tty: NO - logs go to terminal, not stored
# none:        NO  - logs are discarded

# If using passthrough, passthrough-tty, or none, podman logs will always be empty
# Switch to a different driver if you need logs:
podman run -d --log-driver k8s-file --name my-container my-image:latest
```

## Step 3: Check the Log File Directly

Bypass `podman logs` and check the raw log file. This only applies to file-backed log drivers such as `k8s-file` and `json-file`; the `journald` driver stores logs in the system journal instead.

```bash
# Find the log file path
podman inspect --format '{{.LogPath}}' my-container

# Check if the file exists and has content
LOG_PATH=$(podman inspect --format '{{.LogPath}}' my-container)
ls -la "$LOG_PATH"

# View the raw log file
cat "$LOG_PATH"

# Check if the file is empty
if [ ! -s "$LOG_PATH" ]; then
  echo "Log file is empty - the application may not be writing to stdout/stderr"
fi

# Check if rotated log files exist
ls -la "${LOG_PATH}"*
```

## Step 4: Verify the Application Writes to stdout/stderr

Many applications write to log files instead of stdout/stderr.

```bash
# Check if the application writes to files inside the container
podman exec my-container find /var/log -type f -name "*.log" 2>/dev/null
podman exec my-container find /app -type f -name "*.log" 2>/dev/null

# Check common log file locations
podman exec my-container ls -la /var/log/ 2>/dev/null
podman exec my-container ls -la /tmp/ 2>/dev/null

# View the application's log file if found
podman exec my-container cat /var/log/app.log

# Check if the process has open file descriptors pointing to files
podman exec my-container ls -la /proc/1/fd/ 2>/dev/null
```

If the application writes to files, you have two options:

```bash
# Option 1: Symlink log files to stdout/stderr in your Dockerfile
# RUN ln -sf /dev/stdout /var/log/app.log
# RUN ln -sf /dev/stderr /var/log/app-error.log

# Option 2: Configure your application or entrypoint to tail the log file to stdout
tail -F /var/log/app.log
```

## Step 5: Check for Buffering Issues

Application output buffering can delay or prevent logs from appearing.

```bash
# Python buffers stdout by default. Disable it:
podman run -d -e PYTHONUNBUFFERED=1 my-python-app:latest

# For C/C++ applications that use stdio, wrap the command with stdbuf:
podman run -d --entrypoint stdbuf my-c-app:latest -oL -eL /app/start.sh

# For Node.js, logs are usually unbuffered by default
# But check if the app uses a logging library that buffers

# General fix: use stdbuf to disable buffering
podman run -d --entrypoint stdbuf my-image:latest -oL -eL /app/start.sh
```

## Step 6: Check Disk Space

Full disks prevent new log writes.

```bash
# Check host disk space
df -h

# Check container storage usage
podman system df

# Check if the log partition has space
LOG_PATH=$(podman inspect --format '{{.LogPath}}' my-container)
if [ -n "$LOG_PATH" ]; then
  df -h "$(dirname "$LOG_PATH")"
fi

# Clean up unused container data if disk is full
podman system prune -f
```

## Step 7: Check Log Size Limits

If log rotation is too aggressive, logs might be rotated away before you read them.

```bash
# Check log size limits
podman inspect --format '{{json .HostConfig.LogConfig}}' my-container | python3 -m json.tool

# Check containers.conf defaults, such as log_size_max, if configured
grep -R "log_size_max" /usr/share/containers/containers.conf \
  /etc/containers/containers.conf \
  "$HOME/.config/containers/containers.conf" 2>/dev/null

# If max-size is very small (e.g., 1k), logs rotate immediately
# Increase the limit
podman run -d --log-opt max-size=50m my-image:latest
```

## Step 8: Check journald (if using journald driver)

```bash
# Verify journald has the logs
journalctl CONTAINER_NAME=my-container --no-pager -n 20

# Check if journald is running and healthy
systemctl status systemd-journald

# Check journal disk usage and limits
journalctl --disk-usage

# Check if rate limiting is dropping messages
journalctl -u systemd-journald | grep -i "suppressed"

# If rate limiting is the issue, adjust limits
# Edit /etc/systemd/journald.conf:
# RateLimitIntervalSec=0
# RateLimitBurst=0
sudo systemctl restart systemd-journald
```

## Step 9: Check Container State

A container that never started never produces logs.

```bash
# Check if the container actually ran
podman inspect --format '{{.State.Status}}' my-container
podman inspect --format '{{.State.StartedAt}}' my-container

# If StartedAt is empty or zero, the container never started
# Check for creation errors
podman inspect --format '{{.State.Error}}' my-container

# Check if the container is paused
podman inspect --format '{{.State.Paused}}' my-container
```

## Diagnostic Script

```bash
#!/bin/bash
# diagnose-missing-logs.sh - Find out why container logs are missing
# Usage: ./diagnose-missing-logs.sh <container-name>

CONTAINER="$1"

if [ -z "$CONTAINER" ]; then
  echo "Usage: $0 <container-name>"
  exit 1
fi

echo "=== Diagnosing missing logs for: $CONTAINER ==="

# Check container exists
if ! podman inspect "$CONTAINER" &>/dev/null; then
  echo "ISSUE: Container '$CONTAINER' does not exist"
  echo "  It may have been removed. Logs are gone."
  exit 1
fi

# Check log driver
DRIVER=$(podman inspect --format '{{.HostConfig.LogConfig.Type}}' "$CONTAINER")
echo "Log driver: $DRIVER"
if [ "$DRIVER" = "none" ] || [ "$DRIVER" = "passthrough" ] || [ "$DRIVER" = "passthrough-tty" ]; then
  echo "ISSUE: Log driver '$DRIVER' does not store logs"
  echo "  Recreate the container with --log-driver k8s-file or journald"
  exit 1
fi

# Check log file
LOG_PATH=$(podman inspect --format '{{.LogPath}}' "$CONTAINER")
echo "Log path: $LOG_PATH"
if [ -z "$LOG_PATH" ]; then
  echo "No log file path reported. This is expected for non-file log drivers such as journald."
elif [ ! -f "$LOG_PATH" ]; then
  echo "ISSUE: Log file does not exist at $LOG_PATH"
elif [ ! -s "$LOG_PATH" ]; then
  echo "ISSUE: Log file exists but is empty"
  echo "  The application may write to files instead of stdout/stderr"
else
  SIZE=$(ls -lh "$LOG_PATH" | awk '{print $5}')
  LINES=$(wc -l < "$LOG_PATH")
  echo "Log file: $SIZE, $LINES lines"
fi

# Check container state
STATUS=$(podman inspect --format '{{.State.Status}}' "$CONTAINER")
echo "Container status: $STATUS"

# Check disk space for file-backed logs
if [ -n "$LOG_PATH" ]; then
  DISK_AVAIL=$(df -h "$(dirname "$LOG_PATH")" | tail -1 | awk '{print $4}')
  echo "Available disk: $DISK_AVAIL"
fi

echo "=== Done ==="
```

## Summary

Missing container logs in Podman are caused by a limited set of issues: the container was removed, the log driver does not support reading (passthrough/passthrough-tty/none), the application writes to files instead of stdout, output is buffered, disk space is exhausted, or log rotation is too aggressive. Use the diagnostic script to systematically check each possibility, and always configure appropriate log drivers and size limits when creating containers.
