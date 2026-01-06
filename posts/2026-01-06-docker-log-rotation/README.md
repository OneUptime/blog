# How to Rotate and Manage Docker Container Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Containers, DevOps, Logging, Monitoring, Storage

Description: Configure JSON-file driver limits, syslog and fluentd drivers, and implement log rotation to prevent disk exhaustion from runaway container logs.

Docker logs grow unbounded by default. A busy container can fill a disk in hours. This isn't a theoretical problem - it's a common production incident. Proper log rotation is essential infrastructure hygiene.

---

## The Problem: Unbounded Log Growth

By default, Docker uses the `json-file` logging driver with no size limits:

```bash
# Find log file location
docker inspect --format='{{.LogPath}}' mycontainer
# /var/lib/docker/containers/<id>/<id>-json.log

# Check log size
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

```bash
# Limit log size and number of files
docker run \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  myapp:latest
```

This creates:
- `<container-id>-json.log` (current, max 10MB)
- `<container-id>-json.log.1` (rotated)
- `<container-id>-json.log.2` (oldest)

### Docker Compose Configuration

```yaml
services:
  api:
    image: myapp:latest
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
        compress: "true"  # Compress rotated logs

  worker:
    image: myworker:latest
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "5"
```

### Daemon-Wide Configuration

Apply limits to all containers by default:

```json
// /etc/docker/daemon.json
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
# Restart Docker to apply
sudo systemctl restart docker
```

**Note:** Daemon defaults only apply to new containers. Existing containers keep their original settings.

---

## Solution 2: Syslog Driver

Send logs to syslog for centralized management:

```bash
docker run \
  --log-driver=syslog \
  --log-opt syslog-address=udp://logserver:514 \
  --log-opt tag="{{.Name}}" \
  myapp:latest
```

### Docker Compose with Syslog

```yaml
services:
  api:
    image: myapp:latest
    logging:
      driver: syslog
      options:
        syslog-address: "udp://logs.example.com:514"
        syslog-facility: "daemon"
        tag: "api/{{.Name}}/{{.ID}}"
        syslog-format: "rfc5424"
```

### Local Syslog

```yaml
services:
  api:
    image: myapp:latest
    logging:
      driver: syslog
      options:
        syslog-address: "unix:///dev/log"
        tag: "docker-api"
```

Configure rsyslog to handle rotation:

```bash
# /etc/rsyslog.d/docker.conf
:programname, startswith, "docker-" /var/log/docker-apps.log

# /etc/logrotate.d/docker-apps
/var/log/docker-apps.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    postrotate
        systemctl reload rsyslog > /dev/null 2>&1 || true
    endscript
}
```

---

## Solution 3: Fluentd/Fluent Bit Driver

For structured logging pipelines:

```yaml
# docker-compose.yml
services:
  api:
    image: myapp:latest
    logging:
      driver: fluentd
      options:
        fluentd-address: "localhost:24224"
        tag: "docker.{{.Name}}"
        fluentd-async: "true"

  fluentd:
    image: fluent/fluentd:v1.16
    ports:
      - "24224:24224"
    volumes:
      - ./fluentd/fluent.conf:/fluentd/etc/fluent.conf
      - ./logs:/var/log/fluentd
```

```xml
<!-- fluentd/fluent.conf -->
<source>
  @type forward
  port 24224
</source>

<match docker.**>
  @type file
  path /var/log/fluentd/docker
  <buffer>
    @type file
    path /var/log/fluentd/buffer
    flush_interval 10s
  </buffer>
  <format>
    @type json
  </format>
</match>
```

### Fluent Bit (Lighter Weight)

```yaml
services:
  fluent-bit:
    image: fluent/fluent-bit:latest
    volumes:
      - ./fluent-bit.conf:/fluent-bit/etc/fluent-bit.conf
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    command: /fluent-bit/bin/fluent-bit -c /fluent-bit/etc/fluent-bit.conf
```

```ini
# fluent-bit.conf
[INPUT]
    Name              tail
    Path              /var/lib/docker/containers/*/*.log
    Parser            docker
    DB                /var/log/fluent-bit/docker.db
    Mem_Buf_Limit     50MB
    Skip_Long_Lines   On
    Refresh_Interval  10

[OUTPUT]
    Name              file
    Match             *
    Path              /var/log/fluent-bit/
    Format            out_file
```

---

## Solution 4: Loki Driver

Direct integration with Grafana Loki:

```yaml
services:
  api:
    image: myapp:latest
    logging:
      driver: loki
      options:
        loki-url: "http://loki:3100/loki/api/v1/push"
        loki-batch-size: "400"
        loki-retries: "2"
        loki-timeout: "1s"
        loki-external-labels: "container_name={{.Name}},image={{.ImageName}}"

  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - loki-data:/loki

volumes:
  loki-data:
```

Install the Loki Docker driver:
```bash
docker plugin install grafana/loki-docker-driver:latest --alias loki --grant-all-permissions
```

---

## Emergency: Reclaiming Space from Large Logs

When logs have already filled the disk:

### Truncate Logs (Risky but Fast)

```bash
# Find large log files
sudo find /var/lib/docker/containers -name "*.log" -size +100M

# Truncate specific container log
sudo truncate -s 0 /var/lib/docker/containers/<container_id>/<container_id>-json.log

# Truncate all container logs (nuclear option)
sudo sh -c 'truncate -s 0 /var/lib/docker/containers/*/*-json.log'
```

**Warning:** This can corrupt logs if the container is writing. Safer to stop the container first.

### Recreate Container with Limits

```bash
# Stop and remove container
docker stop myapp
docker rm myapp

# Start with log limits
docker run --log-opt max-size=10m --log-opt max-file=3 myapp:latest
```

---

## Monitoring Log Usage

### Check Container Log Sizes

```bash
#!/bin/bash
# log-sizes.sh

echo "Container Log Sizes:"
echo "===================="

for container in $(docker ps -q); do
  name=$(docker inspect --format='{{.Name}}' $container | sed 's/\///')
  log_path=$(docker inspect --format='{{.LogPath}}' $container)
  if [ -f "$log_path" ]; then
    size=$(sudo du -sh "$log_path" 2>/dev/null | cut -f1)
    echo "$name: $size"
  fi
done | sort -k2 -h -r
```

### Prometheus Metrics

Use cAdvisor to export container log sizes:

```yaml
services:
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    ports:
      - "8080:8080"
```

### Alert on Large Logs

```bash
#!/bin/bash
# alert-large-logs.sh

THRESHOLD_MB=500

for log in /var/lib/docker/containers/*/*-json.log; do
  size_mb=$(sudo du -m "$log" | cut -f1)
  if [ "$size_mb" -gt "$THRESHOLD_MB" ]; then
    container_id=$(basename $(dirname "$log"))
    container_name=$(docker inspect --format='{{.Name}}' "$container_id" 2>/dev/null | sed 's/\///')
    echo "ALERT: $container_name has ${size_mb}MB of logs"
    # Send to monitoring system
  fi
done
```

---

## Best Practices

### 1. Always Set Limits

Never run production containers without log limits:

```yaml
# Default in all compose files
x-logging: &default-logging
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"

services:
  api:
    image: myapp
    logging: *default-logging

  worker:
    image: myworker
    logging: *default-logging
```

### 2. Log Levels in Production

Reduce log volume at the source:

```yaml
services:
  api:
    environment:
      - LOG_LEVEL=warn  # Not debug or info
```

### 3. Structured Logging

JSON logs are easier to process and filter:

```javascript
// Use structured logging
logger.info({ userId: 123, action: 'login' }, 'User logged in');

// Not string concatenation
logger.info(`User ${userId} logged in with action ${action}`);
```

### 4. Separate Log Concerns

Use different handlers for different log types:

```yaml
services:
  api:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    volumes:
      # Application logs to file
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

```bash
# Check log driver
docker inspect --format='{{.HostConfig.LogConfig.Type}}' container

# Check log options
docker inspect --format='{{json .HostConfig.LogConfig.Config}}' container

# View logs with limits
docker logs --tail 100 container
docker logs --since 1h container

# Follow logs
docker logs -f container

# Truncate log file
sudo truncate -s 0 $(docker inspect --format='{{.LogPath}}' container)

# Check total log disk usage
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
