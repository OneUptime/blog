# How to Limit Docker Container Log File Size

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Containers, Logs, Logging, Storage, DevOps, Log Rotation

Description: Configure Docker container log size limits to prevent log files from filling up your disk using logging drivers, daemon settings, and Compose options.

---

Docker containers write logs to JSON files on the host filesystem by default. There is no size limit. A busy application can produce gigabytes of logs in a matter of hours, filling up the disk and potentially crashing your entire system. This is one of the most common causes of Docker host disk space issues, and it is entirely preventable.

This guide shows you how to set log size limits at every level, from individual containers to global daemon configuration.

## The Problem: Unbounded Log Growth

By default, Docker uses the `json-file` logging driver. Every line your application writes to stdout or stderr gets stored as a JSON entry on the host.

```bash
# Find where Docker stores container logs
docker inspect --format '{{.LogPath}}' my-container
```

This returns a path like:

```
/var/lib/docker/containers/a1b2c3d4.../a1b2c3d4...-json.log
```

Check the size of a container's log file:

```bash
# Check the log file size for a specific container
ls -lh $(docker inspect --format '{{.LogPath}}' my-container)

# Check log sizes for all containers
docker ps -q | while read id; do
    name=$(docker inspect --format '{{.Name}}' "$id" | sed 's/\///')
    logpath=$(docker inspect --format '{{.LogPath}}' "$id")
    if [ -f "$logpath" ]; then
        size=$(ls -lh "$logpath" | awk '{print $5}')
        echo "$size  $name"
    fi
done | sort -rh
```

## Method 1: Per-Container Log Options

Set log limits when starting individual containers with `--log-opt`.

```bash
# Limit log size to 10MB with 3 rotated files
docker run -d \
  --name web \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  nginx:latest
```

This configuration:
- `max-size=10m` - Each log file grows up to 10 megabytes
- `max-file=3` - Docker keeps 3 rotated files

Total maximum disk usage for logs from this container: 10MB x 3 = 30MB.

When the active log file reaches 10MB, Docker rotates it and starts a new one. When all 3 slots are full, the oldest file gets deleted.

```bash
# Use larger limits for verbose applications
docker run -d \
  --name api \
  --log-opt max-size=50m \
  --log-opt max-file=5 \
  myapp-api:latest
```

## Method 2: Docker Compose Log Configuration

Set log limits in your `docker-compose.yml` file.

```yaml
# docker-compose.yml with log limits on all services
services:
  web:
    image: nginx:latest
    ports:
      - "80:80"
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  api:
    image: myapp-api:latest
    ports:
      - "3000:3000"
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "5"

  worker:
    image: myapp-worker:latest
    logging:
      driver: json-file
      options:
        max-size: "20m"
        max-file: "3"
```

You can also use YAML anchors to apply the same logging config across multiple services:

```yaml
# docker-compose.yml with shared logging configuration
x-logging: &default-logging
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"

services:
  web:
    image: nginx:latest
    logging: *default-logging

  api:
    image: myapp-api:latest
    logging: *default-logging

  worker:
    image: myapp-worker:latest
    logging: *default-logging
```

## Method 3: Global Daemon Configuration

Set default log limits for all containers by configuring the Docker daemon. This is the most effective approach because it covers every container, including those started without explicit log options.

```bash
# Create or edit the Docker daemon configuration
sudo nano /etc/docker/daemon.json
```

Add the logging configuration:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Apply the changes by restarting the Docker daemon:

```bash
# Restart Docker to apply the new configuration
sudo systemctl restart docker
```

Verify the configuration:

```bash
# Check the current daemon logging configuration
docker info --format '{{.LoggingDriver}}'
docker info | grep -A 5 "Logging Driver"
```

Important: The daemon configuration applies only to newly created containers. Existing containers keep their original log settings. To apply the new limits to existing containers, recreate them.

## Method 4: Alternative Logging Drivers

The `json-file` driver is not the only option. Other drivers handle log management differently.

### local Driver

The `local` driver is optimized for performance and includes built-in rotation.

```json
{
  "log-driver": "local",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

The `local` driver uses a compressed format that takes less disk space than `json-file`. However, `docker logs` still works normally.

### journald Driver

On systemd-based systems, send logs to journald which has its own size management.

```json
{
  "log-driver": "journald"
}
```

Configure journald's disk limits separately:

```ini
# /etc/systemd/journald.conf
[Journal]
SystemMaxUse=500M
SystemMaxFileSize=50M
MaxRetentionSec=7day
```

```bash
# Apply journald configuration
sudo systemctl restart systemd-journald
```

### syslog Driver

Send logs to syslog for centralized log management.

```bash
# Run a container with syslog logging
docker run -d \
  --log-driver syslog \
  --log-opt syslog-address=udp://logserver:514 \
  --log-opt syslog-facility=daemon \
  --log-opt tag="myapp" \
  myapp:latest
```

## Checking Current Log Settings

Verify what log configuration a running container uses.

```bash
# Check the logging driver and options for a container
docker inspect --format '{{.HostConfig.LogConfig.Type}}' my-container
docker inspect --format '{{json .HostConfig.LogConfig}}' my-container | jq .
```

Output:

```json
{
  "Type": "json-file",
  "Config": {
    "max-file": "3",
    "max-size": "10m"
  }
}
```

## Dealing with Existing Large Log Files

If you already have containers with oversized logs, you need to handle them before applying limits.

```bash
# Find the largest container log files
find /var/lib/docker/containers -name "*-json.log" -exec ls -lh {} \; | sort -k5 -rh | head -10
```

To truncate a log file without restarting the container:

```bash
# Truncate the log file for a running container (data is lost)
truncate -s 0 $(docker inspect --format '{{.LogPath}}' my-container)
```

This clears the log file instantly. The container keeps running and new logs are written from the start of the file.

```bash
#!/bin/bash
# truncate-all-logs.sh - Truncate log files for all containers
# Usage: sudo ./truncate-all-logs.sh

echo "Truncating Docker container logs..."

docker ps -q | while read id; do
    logpath=$(docker inspect --format '{{.LogPath}}' "$id")
    name=$(docker inspect --format '{{.Name}}' "$id" | sed 's/\///')
    if [ -f "$logpath" ]; then
        size=$(stat -f%z "$logpath" 2>/dev/null || stat -c%s "$logpath" 2>/dev/null)
        size_mb=$((size / 1048576))
        truncate -s 0 "$logpath"
        echo "Truncated $name: ${size_mb}MB freed"
    fi
done
```

## Sizing Log Limits Appropriately

Choose log limits based on your application's behavior and debugging needs.

| Application Type | Suggested max-size | Suggested max-file | Total Max |
|-----------------|-------------------|-------------------|-----------|
| Low-traffic web server | 10m | 3 | 30MB |
| Active API service | 50m | 5 | 250MB |
| High-throughput worker | 100m | 5 | 500MB |
| Verbose debug builds | 200m | 3 | 600MB |
| Minimal sidecar | 5m | 2 | 10MB |

The goal is keeping enough logs for effective debugging while preventing disk exhaustion.

## Monitoring Log Disk Usage

Set up monitoring to track log consumption over time.

```bash
#!/bin/bash
# log-monitor.sh - Monitor Docker log disk usage
# Add to cron: */15 * * * * /path/to/log-monitor.sh

THRESHOLD_MB=500

TOTAL_BYTES=0
docker ps -q | while read id; do
    logpath=$(docker inspect --format '{{.LogPath}}' "$id" 2>/dev/null)
    if [ -f "$logpath" ]; then
        size=$(stat -f%z "$logpath" 2>/dev/null || stat -c%s "$logpath" 2>/dev/null)
        TOTAL_BYTES=$((TOTAL_BYTES + size))
    fi
done

TOTAL_MB=$((TOTAL_BYTES / 1048576))

if [ "$TOTAL_MB" -gt "$THRESHOLD_MB" ]; then
    echo "WARNING: Docker container logs using ${TOTAL_MB}MB (threshold: ${THRESHOLD_MB}MB)"
fi
```

## Disabling Logging Entirely

For containers that produce logs you never need, disable logging completely.

```bash
# Run a container with no logging
docker run -d --log-driver none --name noisy-sidecar myapp-sidecar:latest
```

In Docker Compose:

```yaml
services:
  sidecar:
    image: myapp-sidecar:latest
    logging:
      driver: none
```

Note that `docker logs` will not work for containers with logging disabled.

## Conclusion

Unbounded Docker logs are a ticking time bomb for disk space. Set the global daemon configuration in `/etc/docker/daemon.json` to apply limits to all new containers. Use `max-size` and `max-file` options to control rotation. For existing containers with bloated logs, truncate the files and then recreate the containers with proper limits. Monitor log disk usage proactively, and you will never be surprised by a full disk caused by container logs.
