# How to Rotate and Manage Docker Container Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Containers, DevOps, Logging, Monitoring, Storage

Description: Configure JSON-file driver limits, syslog and fluentd drivers, and implement log rotation to prevent disk exhaustion from runaway container logs.

Docker logs grow unbounded by default. A busy container can fill a disk in hours. This isn't a theoretical problem - it's a common production incident. Proper log rotation is essential infrastructure hygiene.

---

## The Problem: Unbounded Log Growth

By default, Docker uses the `json-file` logging driver with no size limits:

These commands show how to find and measure container log files. Without limits, logs can grow to consume all available disk space.

```bash
# Find the log file location for a container
docker inspect --format='{{.LogPath}}' mycontainer
# /var/lib/docker/containers/<id>/<id>-json.log

# Check log sizes for all containers
# Large values here indicate a potential disk space problem
sudo du -sh /var/lib/docker/containers/*/
# 2.1G    /var/lib/docker/containers/abc123.../
# 847M    /var/lib/docker/containers/def456.../
```

Without limits, logs grow until the disk fills, causing:
- Container crashes
- Docker daemon issues
- System instability
- Difficult recovery

---

## Solution 1: Configure json-file Driver Limits

### Per-Container Configuration

The simplest way to limit log size is to configure it when running a container. These options limit each log file to 10MB and keep a maximum of 3 files.

```bash
# Limit log size and number of files when running a container
docker run \
  --log-opt max-size=10m \   # Maximum size per log file
  --log-opt max-file=3 \     # Number of rotated files to keep
  myapp:latest
```

This creates:
- `<container-id>-json.log` (current, max 10MB)
- `<container-id>-json.log.1` (rotated)
- `<container-id>-json.log.2` (oldest)

### Docker Compose Configuration

In Docker Compose, the logging configuration can be set per service. The compress option reduces disk usage by compressing rotated log files.

```yaml
# docker-compose.yml with log rotation settings
services:
  api:
    image: myapp:latest
    logging:
      driver: json-file       # Use the default JSON file driver
      options:
        max-size: "10m"       # Rotate when log reaches 10MB
        max-file: "3"         # Keep 3 rotated files
        compress: "true"      # Compress rotated logs to save space

  worker:
    image: myworker:latest
    logging:
      driver: json-file
      options:
        max-size: "50m"       # Workers may generate more logs
        max-file: "5"         # Keep more history for debugging
```

### Daemon-Wide Configuration

Apply limits to all containers by default:

The daemon.json configuration applies log rotation settings to all new containers, ensuring no container can consume unlimited disk space.

```json
// /etc/docker/daemon.json - Global Docker daemon configuration
{
  "log-driver": "json-file",    // Default logging driver
  "log-opts": {
    "max-size": "10m",          // Default max size for all containers
    "max-file": "3",            // Default number of rotated files
    "compress": "true"          // Compress rotated files
  }
}
```

After modifying daemon.json, restart Docker to apply the changes.

```bash
# Restart Docker to apply daemon configuration changes
sudo systemctl restart docker
```

**Note:** Daemon defaults only apply to new containers. Existing containers keep their original settings.

---

## Solution 2: Syslog Driver

Send logs to syslog for centralized management:

The syslog driver sends container logs to a syslog server, enabling centralized log management and leveraging existing log infrastructure.

```bash
# Run container with syslog driver
docker run \
  --log-driver=syslog \                      # Use syslog instead of json-file
  --log-opt syslog-address=udp://logserver:514 \  # Syslog server address
  --log-opt tag="{{.Name}}" \                # Tag logs with container name
  myapp:latest
```

### Docker Compose with Syslog

This configuration sends logs to a remote syslog server using RFC 5424 format, which includes structured data and is widely supported.

```yaml
# docker-compose.yml with remote syslog configuration
services:
  api:
    image: myapp:latest
    logging:
      driver: syslog
      options:
        syslog-address: "udp://logs.example.com:514"  # Remote syslog server
        syslog-facility: "daemon"                      # Syslog facility code
        tag: "api/{{.Name}}/{{.ID}}"                   # Dynamic tag with container info
        syslog-format: "rfc5424"                       # Modern syslog format
```

### Local Syslog

For sending logs to the local syslog daemon via Unix socket, which is faster than network-based logging.

```yaml
# Send logs to local syslog daemon
services:
  api:
    image: myapp:latest
    logging:
      driver: syslog
      options:
        syslog-address: "unix:///dev/log"  # Local syslog socket
        tag: "docker-api"                   # Identifier in syslog
```

Configure rsyslog to handle rotation:

These rsyslog and logrotate configurations capture Docker logs in a dedicated file and rotate them automatically.

```bash
# /etc/rsyslog.d/docker.conf - Route Docker logs to dedicated file
# Match any program name starting with "docker-" and write to separate log file
:programname, startswith, "docker-" /var/log/docker-apps.log

# /etc/logrotate.d/docker-apps - Rotate Docker application logs
/var/log/docker-apps.log {
    daily            # Rotate daily
    rotate 7         # Keep 7 days of logs
    compress         # Compress rotated files
    delaycompress    # Don't compress the most recent rotated file
    missingok        # Don't error if log file is missing
    notifempty       # Don't rotate if log is empty
    postrotate
        # Tell rsyslog to reopen its file handles after rotation
        systemctl reload rsyslog > /dev/null 2>&1 || true
    endscript
}
```

---

## Solution 3: Fluentd/Fluent Bit Driver

For structured logging pipelines:

Fluentd provides powerful log routing and processing capabilities. This configuration sends Docker logs to a Fluentd collector that can route them to various destinations.

```yaml
# docker-compose.yml - Docker with Fluentd logging pipeline
services:
  api:
    image: myapp:latest
    logging:
      driver: fluentd                           # Use Fluentd driver
      options:
        fluentd-address: "localhost:24224"      # Fluentd collector address
        tag: "docker.{{.Name}}"                 # Tag for routing logs
        fluentd-async: "true"                   # Don't block app on log delivery

  fluentd:
    image: fluent/fluentd:v1.16
    ports:
      - "24224:24224"                           # Fluentd forward protocol port
    volumes:
      - ./fluentd/fluent.conf:/fluentd/etc/fluent.conf  # Configuration
      - ./logs:/var/log/fluentd                 # Log output directory
```

The Fluentd configuration defines input sources, processing, and output destinations. This example writes logs to files with buffering.

```xml
<!-- fluentd/fluent.conf - Fluentd configuration -->
<source>
  @type forward           <!-- Accept logs via forward protocol -->
  port 24224
</source>

<match docker.**>         <!-- Match all logs with docker.* tag -->
  @type file              <!-- Write to files -->
  path /var/log/fluentd/docker
  <buffer>
    @type file            <!-- Buffer to disk before writing -->
    path /var/log/fluentd/buffer
    flush_interval 10s    <!-- Flush buffer every 10 seconds -->
  </buffer>
  <format>
    @type json            <!-- Output in JSON format -->
  </format>
</match>
```

### Fluent Bit (Lighter Weight)

Fluent Bit is a lighter-weight alternative to Fluentd, suitable for resource-constrained environments. It reads Docker log files directly.

```yaml
# Fluent Bit - lightweight log processor
services:
  fluent-bit:
    image: fluent/fluent-bit:latest
    volumes:
      - ./fluent-bit.conf:/fluent-bit/etc/fluent-bit.conf
      # Read Docker log files directly (read-only access)
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    command: /fluent-bit/bin/fluent-bit -c /fluent-bit/etc/fluent-bit.conf
```

Fluent Bit configuration for tailing Docker JSON log files and outputting to files.

```ini
# fluent-bit.conf - Fluent Bit configuration
[INPUT]
    Name              tail              # Tail log files
    Path              /var/lib/docker/containers/*/*.log  # Docker log paths
    Parser            docker            # Parse Docker JSON format
    DB                /var/log/fluent-bit/docker.db       # Track read position
    Mem_Buf_Limit     50MB              # Memory buffer limit
    Skip_Long_Lines   On                # Skip lines exceeding buffer
    Refresh_Interval  10                # Check for new files every 10s

[OUTPUT]
    Name              file              # Write to files
    Match             *                 # Match all logs
    Path              /var/log/fluent-bit/
    Format            out_file          # Use default output format
```

---

## Solution 4: Loki Driver

Direct integration with Grafana Loki:

The Loki driver sends logs directly to Grafana Loki, enabling powerful log querying with LogQL alongside your Grafana metrics dashboards.

```yaml
# docker-compose.yml with Grafana Loki logging
services:
  api:
    image: myapp:latest
    logging:
      driver: loki                              # Use Loki driver
      options:
        loki-url: "http://loki:3100/loki/api/v1/push"  # Loki endpoint
        loki-batch-size: "400"                  # Batch size for efficiency
        loki-retries: "2"                       # Retry failed pushes
        loki-timeout: "1s"                      # Timeout per request
        # Labels attached to all logs from this container
        loki-external-labels: "container_name={{.Name}},image={{.ImageName}}"

  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"                             # Loki API port
    volumes:
      - loki-data:/loki                         # Persist log data

volumes:
  loki-data:  # Named volume for Loki storage
```

Install the Loki Docker driver:

The Loki Docker plugin must be installed before using the loki logging driver. This is a one-time setup step.

```bash
# Install Loki Docker driver plugin
# --alias loki allows using "loki" as the driver name
# --grant-all-permissions allows the plugin to access Docker socket
docker plugin install grafana/loki-docker-driver:latest --alias loki --grant-all-permissions
```

---

## Emergency: Reclaiming Space from Large Logs

When logs have already filled the disk:

### Truncate Logs (Risky but Fast)

These commands help identify and clear large log files in an emergency. Use with caution as truncating while a container is writing can cause issues.

```bash
# Find large log files (over 100MB)
sudo find /var/lib/docker/containers -name "*.log" -size +100M

# Truncate specific container log to 0 bytes
# This immediately frees disk space but loses log history
sudo truncate -s 0 /var/lib/docker/containers/<container_id>/<container_id>-json.log

# DANGER: Truncate ALL container logs (nuclear option)
# Only use in emergencies when disk is completely full
sudo sh -c 'truncate -s 0 /var/lib/docker/containers/*/*-json.log'
```

**Warning:** This can corrupt logs if the container is writing. Safer to stop the container first.

### Recreate Container with Limits

The safest approach is to stop the container, remove it (which deletes logs), and restart with proper log limits configured.

```bash
# Stop and remove container (also removes its log file)
docker stop myapp
docker rm myapp

# Start with log limits to prevent future growth
docker run --log-opt max-size=10m --log-opt max-file=3 myapp:latest
```

---

## Monitoring Log Usage

### Check Container Log Sizes

This script reports the log file size for each running container, sorted by size. Use it to identify containers that are generating excessive logs.

```bash
#!/bin/bash
# log-sizes.sh - Report log sizes for all running containers

echo "Container Log Sizes:"
echo "===================="

# Loop through all running container IDs
for container in $(docker ps -q); do
  # Get container name (remove leading slash)
  name=$(docker inspect --format='{{.Name}}' $container | sed 's/\///')
  # Get path to container's log file
  log_path=$(docker inspect --format='{{.LogPath}}' $container)

  if [ -f "$log_path" ]; then
    # Get human-readable size
    size=$(sudo du -sh "$log_path" 2>/dev/null | cut -f1)
    echo "$name: $size"
  fi
done | sort -k2 -h -r  # Sort by size, largest first
```

### Prometheus Metrics

Use cAdvisor to export container log sizes:

cAdvisor exports container metrics including log file sizes. This enables Prometheus-based monitoring and alerting on log growth.

```yaml
# docker-compose.yml with cAdvisor for container metrics
services:
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    volumes:
      - /:/rootfs:ro                     # Host filesystem (read-only)
      - /var/run:/var/run:ro             # Docker socket
      - /sys:/sys:ro                     # System metrics
      - /var/lib/docker/:/var/lib/docker:ro  # Docker data including logs
    ports:
      - "8080:8080"                      # Metrics endpoint
```

### Alert on Large Logs

This monitoring script checks for containers with logs exceeding a threshold and can be integrated with alerting systems.

```bash
#!/bin/bash
# alert-large-logs.sh - Alert when container logs exceed threshold

THRESHOLD_MB=500  # Alert if logs exceed 500MB

# Check each container's log file
for log in /var/lib/docker/containers/*/*-json.log; do
  # Get size in megabytes
  size_mb=$(sudo du -m "$log" | cut -f1)

  if [ "$size_mb" -gt "$THRESHOLD_MB" ]; then
    # Extract container ID from path
    container_id=$(basename $(dirname "$log"))
    # Get container name
    container_name=$(docker inspect --format='{{.Name}}' "$container_id" 2>/dev/null | sed 's/\///')

    echo "ALERT: $container_name has ${size_mb}MB of logs"
    # Send alert to monitoring system
    # curl -X POST -d "text=Large logs: $container_name (${size_mb}MB)" $SLACK_WEBHOOK
  fi
done
```

---

## Best Practices

### 1. Always Set Limits

Never run production containers without log limits:

YAML anchors allow you to define log configuration once and reuse it across all services, ensuring consistent log management.

```yaml
# Define reusable logging configuration with YAML anchor
x-logging: &default-logging
  driver: json-file
  options:
    max-size: "10m"   # 10MB per file
    max-file: "3"     # Keep 3 files = 30MB max per container

services:
  api:
    image: myapp
    logging: *default-logging  # Reference the anchor

  worker:
    image: myworker
    logging: *default-logging  # Same logging config
```

### 2. Log Levels in Production

Reduce log volume at the source:

Excessive logging not only fills disks but also impacts performance. Configure appropriate log levels for production environments.

```yaml
# Set production-appropriate log level
services:
  api:
    environment:
      - LOG_LEVEL=warn  # Not debug or info - reduces log volume significantly
```

### 3. Structured Logging

JSON logs are easier to process and filter:

Structured logging enables efficient log processing, filtering, and analysis. JSON format preserves data types and enables field-based queries.

```javascript
// Structured logging with explicit fields
// Use structured logging - each field can be indexed and searched
logger.info({ userId: 123, action: 'login' }, 'User logged in');

// Avoid string concatenation - harder to parse and search
// Not this - fields are embedded in text and hard to extract
logger.info(`User ${userId} logged in with action ${action}`);
```

### 4. Separate Log Concerns

Use different handlers for different log types:

Application logs can be written to mounted volumes for persistence while Docker captures stdout/stderr. This separation helps manage different retention needs.

```yaml
# Separate container stdout/stderr from application file logs
services:
  api:
    logging:
      driver: json-file         # Docker captures stdout/stderr
      options:
        max-size: "10m"
        max-file: "3"
    volumes:
      # Application writes detailed logs to mounted volume
      # These can have different retention than container logs
      - ./logs:/app/logs
```

---

## Log Driver Comparison

| Driver | Use Case | Pros | Cons |
|--------|----------|------|------|
| json-file | Default, simple | Built-in, docker logs works | Local only, manual rotation |
| syslog | Traditional infra | Standard, existing tools | Setup required |
| fluentd | Log aggregation | Flexible routing | Additional service |
| loki | Grafana stack | Great querying | Plugin installation |
| journald | Systemd systems | Native integration | Linux only |
| none | Disable logging | No disk usage | Lose all logs |

---

## Quick Reference

Common commands for inspecting and managing Docker logs.

```bash
# Check which log driver a container uses
docker inspect --format='{{.HostConfig.LogConfig.Type}}' container

# Check log driver options (max-size, max-file, etc.)
docker inspect --format='{{json .HostConfig.LogConfig.Config}}' container

# View logs with limits to avoid overwhelming output
docker logs --tail 100 container   # Last 100 lines
docker logs --since 1h container   # Last hour only

# Follow logs in real-time
docker logs -f container

# Truncate log file to reclaim disk space (emergency use)
sudo truncate -s 0 $(docker inspect --format='{{.LogPath}}' container)

# Check total disk usage by all container logs
sudo du -sh /var/lib/docker/containers/*/
```

---

## Summary

- Docker logs grow unbounded by default - always configure limits
- Use `max-size` and `max-file` options for the json-file driver
- Set daemon-wide defaults in `/etc/docker/daemon.json`
- Consider syslog, fluentd, or Loki for centralized logging
- Monitor log sizes and alert before disks fill
- Use log levels appropriately in production
- Truncating logs is an emergency measure, not a strategy

Log management is boring until it's not. Configure it once and forget about 3 AM disk space alerts.
