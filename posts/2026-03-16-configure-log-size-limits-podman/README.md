# How to Configure Log Size Limits for Podman Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Logging, Configuration, Disk Management

Description: Learn how to set log size limits in Podman to prevent container logs from consuming all available disk space, using per-container and system-wide configuration.

---

> Without log size limits, a single chatty container can fill your entire disk. Setting limits is a production requirement, not an option.

Container logs grow continuously as long as the container runs. A busy web server or a verbose application can generate gigabytes of logs in hours. Podman provides log size limits to cap how much disk space logs can consume per container.

---

## Check Current Log Sizes

Before setting limits, understand your current log disk usage.

```bash
# Check log file size for a specific container using a file-based log driver

LOG_PATH=$(podman inspect --format '{{.LogPath}}' my-container)
if [ -n "$LOG_PATH" ] && [ -f "$LOG_PATH" ]; then
  ls -lh "$LOG_PATH"
else
  echo "No container log file found. The container may be using journald."
fi

# Check log sizes for all containers using file-based logs
for c in $(podman ps -a --format '{{.Names}}'); do
  LOG_PATH=$(podman inspect --format '{{.LogPath}}' "$c" 2>/dev/null)
  if [ -n "$LOG_PATH" ] && [ -f "$LOG_PATH" ]; then
    SIZE=$(du -h "$LOG_PATH" | awk '{print $1}')
    echo "$c: $SIZE"
  fi
done | sort -t: -k2 -h -r

# Check total disk usage of file-based container logs
TOTAL_KB=$(for c in $(podman ps -a --format '{{.Names}}'); do
  LOG_PATH=$(podman inspect --format '{{.LogPath}}' "$c" 2>/dev/null)
  if [ -n "$LOG_PATH" ] && [ -f "$LOG_PATH" ]; then
    du -k "$LOG_PATH"
  fi
done | awk '{sum += $1} END {print sum}')
numfmt --from-unit=1024 --to=iec "${TOTAL_KB:-0}" 2>/dev/null || echo "${TOTAL_KB:-0}K"
```

## Set Log Size Limits Per Container

```bash
# Set a 10MB log size limit
podman run -d \
  --log-opt max-size=10m \
  --name web \
  nginx:latest

# Set a 100MB limit
podman run -d \
  --log-opt max-size=100m \
  --name api \
  my-api:latest

# Set a 1GB limit
podman run -d \
  --log-opt max-size=1g \
  --name worker \
  my-worker:latest

# Size units: b (bytes), k (kilobytes), m (megabytes), g (gigabytes)
```

## Set Log Size Limits for File-Based Logs

Podman supports `max-size` for file-based container logs. When the log reaches the limit, Podman truncates and reopens the log file; it does not retain multiple rotated files with Docker's `max-file` option.

```bash
# Keep the log file at 10MB or less
podman run -d \
  --log-opt max-size=10m \
  --name web \
  nginx:latest

# Keep the log file at 50MB or less
podman run -d \
  --log-opt max-size=50m \
  --name api \
  my-api:latest

# Verify the settings
podman inspect --format '{{json .HostConfig.LogConfig}}' web | python3 -m json.tool
```

## Set System-Wide Log Size Limits

Configure default limits that apply to all new containers.

```bash
# For rootless Podman
mkdir -p ~/.config/containers

cat > ~/.config/containers/containers.conf << 'EOF'
[containers]
log_size_max = 10485760
EOF
# log_size_max is in bytes: 10485760 = 10MB

# For root Podman (system-wide)
# Edit /etc/containers/containers.conf with the same settings

# Test with a new container (should use the default limit)
podman run -d --name test alpine sh -c 'while true; do echo "log line"; sleep 0.1; done'

# Verify the setting on the new container
podman inspect --format '{{.HostConfig.LogConfig.Size}}' test
```

## Different Limits for Different Log Drivers

Each log driver handles size limits slightly differently.

```bash
# k8s-file driver with size limit
podman run -d \
  --log-driver k8s-file \
  --log-opt max-size=10m \
  --name test-k8s \
  alpine sh -c 'while true; do echo "test"; sleep 0.01; done'

# json-file driver with size limit
# In Podman, json-file is an alias for k8s-file
podman run -d \
  --log-driver json-file \
  --log-opt max-size=10m \
  --name test-json \
  alpine sh -c 'while true; do echo "test"; sleep 0.01; done'

# journald driver (size managed by journald, not max-size)
# Use journald.conf to control size:
# /etc/systemd/journald.conf:
#   SystemMaxUse=500M
```

## Monitor Log Growth

Track log file growth to determine appropriate limits. This script is for containers using file-based logging, such as `k8s-file`.

```bash
#!/bin/bash
# monitor-log-growth.sh - Track log growth over time

CONTAINER="$1"
INTERVAL="${2:-60}"  # Check every 60 seconds by default

LOG_PATH=$(podman inspect --format '{{.LogPath}}' "$CONTAINER")
if [ -z "$LOG_PATH" ]; then
  echo "No container log file found. The container may be using journald."
  exit 1
fi

echo "Monitoring log growth for $CONTAINER"
echo "Log file: $LOG_PATH"
echo "---"

PREV_SIZE=0
while true; do
  if [ -f "$LOG_PATH" ]; then
    CURRENT_SIZE=$(stat -f%z "$LOG_PATH" 2>/dev/null || stat -c%s "$LOG_PATH" 2>/dev/null)
    GROWTH=$((CURRENT_SIZE - PREV_SIZE))
    echo "$(date '+%H:%M:%S') Size: $(numfmt --to=iec $CURRENT_SIZE 2>/dev/null || echo ${CURRENT_SIZE}B) Growth: +${GROWTH}B"
    PREV_SIZE=$CURRENT_SIZE
  fi
  sleep "$INTERVAL"
done
```

## Calculate Appropriate Limits

```bash
# Estimate log generation rate
# Run for 1 minute and measure output
podman run --rm my-image:latest timeout 60 sh -c 'my-app' 2>&1 | wc -c
# Result in bytes per minute

# Formula for sizing:
# max_size = (bytes_per_minute * minutes_of_retention)
#
# Example: 100KB/min, want 24 hours retention:
# 100 * 1024 * 60 * 24 = ~147MB
# Set max-size=150m

# For production, common settings:
# Low-volume services:  max-size=10m
# Medium services:      max-size=50m
# High-volume services: max-size=100m
```

## Log Size in Podman Compose

```yaml
# podman-compose.yml
services:
  web:
    image: nginx:latest
    logging:
      driver: k8s-file
      options:
        max-size: "10m"

  api:
    image: my-api:latest
    logging:
      driver: json-file
      options:
        max-size: "50m"

  worker:
    image: my-worker:latest
    logging:
      driver: k8s-file
      options:
        max-size: "100m"
```

## Summary

Log size limits are essential for production Podman deployments. Set `max-size` per container or system-wide via `containers.conf` to cap individual log file sizes. Monitor log growth rates to determine appropriate limits, and use different settings for high-volume versus low-volume services. Without these limits, a single container can fill your disk.
