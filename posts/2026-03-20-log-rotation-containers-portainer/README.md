# How to Set Up Log Rotation for Containers in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Log Rotation, Disk Management, Container Configuration, Maintenance

Description: Configure automatic log rotation for Docker containers to prevent disk exhaustion, using built-in json-file log driver options and global daemon settings in Portainer deployments.

## Introduction

Without log rotation, container log files grow indefinitely until they fill the disk. Docker's default `json-file` log driver supports built-in log rotation via `max-size` and `max-file` options. Configuring these prevents disk exhaustion while retaining enough recent logs for troubleshooting. This guide covers configuring log rotation globally and per-service in Portainer-managed environments.

## Step 1: Configure Global Log Rotation

Update `/etc/docker/daemon.json` with valid JSON:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3",
    "compress": "true"
  }
}
```

```bash
# Apply the changes

sudo systemctl restart docker

# Verify the default logging driver
docker info --format '{{.LoggingDriver}}'

# IMPORTANT: This only affects NEW containers
# Existing containers keep their current log configuration
# Recreate containers to apply the new settings
# Then inspect a recreated container to confirm its log config
docker inspect --format '{{json .HostConfig.LogConfig}}' <container>
```

## Step 2: Configure Log Rotation Per Service

Per-service settings override the daemon default:

```yaml
# docker-compose.yml - Log rotation per service
version: "3.8"

services:
  # High-volume API: smaller files, more rotations
  api:
    image: myapp/api:latest
    logging:
      driver: json-file
      options:
        max-size: "20m"     # 20MB per file
        max-file: "5"       # Keep 5 files = 100MB max
        compress: "true"    # Compress rotated files with gzip

  # Database: verbose but important logs
  postgres:
    image: postgres:15-alpine
    logging:
      driver: json-file
      options:
        max-size: "50m"     # Larger files for DB logs
        max-file: "10"      # Keep 10 files = 500MB max
        compress: "true"

  # Redis: low volume, minimal retention
  redis:
    image: redis:7-alpine
    logging:
      driver: json-file
      options:
        max-size: "5m"
        max-file: "2"      # Only 10MB total for Redis
        compress: "true"

  # Nginx: access logs can be very high volume
  nginx:
    image: nginx:alpine
    logging:
      driver: json-file
      options:
        max-size: "100m"    # Nginx access logs are large
        max-file: "5"       # 500MB max for nginx
        compress: "true"
```

## Step 3: Calculate Appropriate Rotation Settings

```bash
# Check current log sizes to understand your baseline
du -sh /var/lib/docker/containers/*/
# or summarized:
du -sh /var/lib/docker/containers/*/*-json.log* | sort -h | tail -20

# Check total Docker json-file log disk usage
find /var/lib/docker/containers -name '*-json.log*' -type f -exec du -ch {} + | tail -1

# Calculate log growth rate
CONTAINER_ID=$(docker ps -q --filter name=api)
LOG_PATH="/var/lib/docker/containers/$CONTAINER_ID/$CONTAINER_ID-json.log"

SIZE_BEFORE=$(stat -c%s "$LOG_PATH")
sleep 3600  # Wait 1 hour
SIZE_AFTER=$(stat -c%s "$LOG_PATH")
GROWTH_PER_HOUR=$(( (SIZE_AFTER - SIZE_BEFORE) / 1024 / 1024 ))

echo "API log growth: ${GROWTH_PER_HOUR}MB/hour"
echo "Daily growth: $(( GROWTH_PER_HOUR * 24 ))MB/day"
# Set max-size to ~2x hourly growth rate for useful troubleshooting window
```

## Step 4: Monitor Log File Sizes

```bash
#!/bin/bash
# monitor-log-sizes.sh - Alert on large container logs

MAX_LOG_SIZE_MB=200  # Alert threshold in MB

docker ps -q | while read id; do
  name=$(docker inspect "$id" --format '{{.Name}}')
  log_path=$(docker inspect "$id" \
    --format '/var/lib/docker/containers/{{.Id}}/{{.Id}}-json.log')

  if [ -f "$log_path" ]; then
    size_mb=$(du -m "$log_path" | cut -f1)

    if [ "$size_mb" -gt "$MAX_LOG_SIZE_MB" ]; then
      echo "ALERT: $name log file is ${size_mb}MB (threshold: ${MAX_LOG_SIZE_MB}MB)"
      echo "       Log path: $log_path"
    fi
  fi
done

# Check total Docker log disk usage
TOTAL=$(find /var/lib/docker/containers -name '*-json.log*' -type f -exec du -ch {} + | tail -1 | cut -f1)
echo "Total container log storage: $TOTAL"
```

## Step 5: Truncate Logs Without Restarting Containers

For emergency disk recovery without stopping containers, prefer built-in rotation first. Docker warns against managing `json-file` logs with external tools, so treat this as a last-resort host operation and truncate in place rather than replacing the file:

```bash
# Emergency-only: truncate a specific container log in place
CONTAINER_ID=$(docker ps -q --filter name=api)
LOG_PATH="/var/lib/docker/containers/$CONTAINER_ID/$CONTAINER_ID-json.log"

# Truncate to 0 bytes (container keeps running, just loses old logs)
truncate -s 0 "$LOG_PATH"

# For all containers at once (emergency disk recovery)
for id in $(docker ps -q); do
  log="/var/lib/docker/containers/$id/$id-json.log"
  if [ -f "$log" ]; then
    size=$(du -m "$log" | cut -f1)
    if [ "$size" -gt 100 ]; then
      echo "Truncating $log (${size}MB)"
      truncate -s 0 "$log"
    fi
  fi
done
```

## Step 6: Avoid logrotate for json-file Logs

Docker's documentation recommends avoiding external tools such as `logrotate` for `json-file` logs, because those files are meant to be managed by the Docker daemon. If you need different retention limits, update `daemon.json` or the service-level `logging` settings and recreate the containers. If you do not need `json-file` compatibility, Docker recommends the `local` logging driver because it rotates logs by default.

## Conclusion

Log rotation is essential disk management for containerized environments. Docker's built-in `max-size` and `max-file` options in the json-file driver are the simplest approach - no external tools needed. Set them globally in `daemon.json` for consistent behavior, then override per-service for high-volume containers. The `compress: "true"` option is often overlooked but can significantly reduce log storage for text-based logs. Monitor log sizes regularly and tune the rotation thresholds based on observed growth rates. Portainer's compose YAML makes it straightforward to apply different log retention policies to different services based on their criticality and volume.
