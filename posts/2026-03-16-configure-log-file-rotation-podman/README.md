# How to Configure Log File Rotation in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Logging, Configuration, Disk Management

Description: Learn how to configure automatic log file rotation in Podman using max-size and max-file options to manage disk space while retaining enough log history for debugging.

---

> Log size limiting is the mechanism that prevents your container log files from growing forever. In Podman, it is controlled with the max-size log option.

Without a size limit, container log files can grow unbounded until they consume all available disk space. Podman supports a built-in log size limit through the `max-size` log option, which works with the k8s-file log driver. The `json-file` driver name is accepted as an alias for k8s-file for scripting compatibility.

---

## How Log Size Limits Work in Podman

When a log size limit is configured, Podman does the following:

1. Writes logs to the primary log file.
2. When the file reaches `max-size`, the log file is truncated and reopened so the configured limit is not exceeded.
3. If you need retained log history, use journald retention settings or an external log collection/rotation strategy.

```bash
# Example: max-size=10mb limits the active log file:

# container-log         (current, capped at about 10MB)
# Total maximum: about 10MB per container log file
```

## Configure a Size Limit Per Container

```bash
# Basic size limit: 10MB file
podman run -d \
  --log-driver k8s-file \
  --log-opt max-size=10mb \
  --name web \
  nginx:latest

# Larger limit for high-volume services
podman run -d \
  --log-driver k8s-file \
  --log-opt max-size=100mb \
  --name api \
  my-api:latest

# Minimal limit for low-priority containers
podman run -d \
  --log-driver k8s-file \
  --log-opt max-size=5mb \
  --name cache \
  redis:latest

# Verify log settings
podman inspect --format '{{json .HostConfig.LogConfig}}' web | python3 -m json.tool
```

## Verify the Size Limit Is Working

```bash
# Generate logs to reach the configured limit
podman run -d \
  --log-driver k8s-file \
  --log-opt max-size=1mb \
  --name log-limit-test \
  alpine sh -c 'while true; do echo "$(date) - This is a log line with some padding to fill up space quickly: $(head -c 200 /dev/urandom | base64)"; sleep 0.01; done'

# Wait a moment, then check the log file
sleep 30
LOG_PATH=$(podman inspect --format '{{.HostConfig.LogConfig.Path}}' log-limit-test)
ls -lh "${LOG_PATH}"

# The active log file should stay at or below the configured limit:
# -rw-r--r-- 1 user user 1.0M ctr.log

# Clean up
podman rm -f log-limit-test
```

## Configure System-Wide Size Limit Defaults

Set a default log size limit for all new containers.

```bash
# For rootless Podman
mkdir -p ~/.config/containers

cat > ~/.config/containers/containers.conf << 'EOF'
[containers]
log_size_max = 10485760
EOF

# log_size_max is in bytes (10485760 = 10MB)

# For system-wide (root) configuration
# sudo vi /etc/containers/containers.conf

# Verify the active default log driver
podman info --format '{{.Host.LogDriver}}'
```

## Size Limits with Different Log Drivers

```bash
# k8s-file driver size limit
podman run -d \
  --log-driver k8s-file \
  --log-opt max-size=10mb \
  --name k8s-test \
  alpine sh -c 'while true; do echo "k8s log line"; sleep 0.1; done'

# json-file is an alias for k8s-file in Podman
podman run -d \
  --log-driver json-file \
  --log-opt max-size=10mb \
  --name json-test \
  alpine sh -c 'while true; do echo "json log line"; sleep 0.1; done'

# journald rotation (managed by journald, not Podman)
# Configure in /etc/systemd/journald.conf:
# SystemMaxUse=500M
# SystemMaxFileSize=50M
# MaxRetentionSec=1week
sudo systemctl restart systemd-journald
```

## Reading Limited Log Files

When using `podman logs`, Podman reads the current log stream available through the configured log driver.

```bash
# Read logs through Podman
podman logs web

# To read the raw k8s-file log file directly:
LOG_PATH=$(podman inspect --format '{{.HostConfig.LogConfig.Path}}' web)

# Read the current log file
cat "$LOG_PATH"

# Count total lines in the current log file
wc -l "$LOG_PATH"
```

## Monitor Log Size Health

```bash
#!/bin/bash
# check-log-size.sh - Verify log size limits for all containers

echo "Container Log Size Status"
echo "========================="

for c in $(podman ps --format '{{.Names}}'); do
  LOG_PATH=$(podman inspect --format '{{.HostConfig.LogConfig.Path}}' "$c" 2>/dev/null)
  DRIVER=$(podman inspect --format '{{.HostConfig.LogConfig.Type}}' "$c" 2>/dev/null)
  LIMIT=$(podman inspect --format '{{.HostConfig.LogConfig.Size}}' "$c" 2>/dev/null)

  if [ -n "$LOG_PATH" ] && [ -f "$LOG_PATH" ]; then
    CURRENT_SIZE=$(du -h "$LOG_PATH" | awk '{print $1}')

    echo "$c ($DRIVER):"
    echo "  Current: $CURRENT_SIZE"
    echo "  Limit: $LIMIT"
  fi
done
```

## Size Limits in Podman Compose

```yaml
# podman-compose.yml
services:
  web:
    image: nginx:latest
    logging:
      driver: json-file
      options:
        max-size: "10mb"

  api:
    image: my-api:latest
    logging:
      driver: k8s-file
      options:
        max-size: "50mb"

  database:
    image: postgres:16
    logging:
      driver: json-file
      options:
        max-size: "20mb"
```

## Sizing Guidelines

```bash
# Quick reference for log size settings:
#
# Development:
#   max-size: 5mb (5MB per container)
#
# Staging:
#   max-size: 20mb (20MB per container)
#
# Production (low volume):
#   max-size: 50mb (50MB per container)
#
# Production (high volume):
#   max-size: 100mb (100MB per container)
#
# Total disk budget = max_size * number_of_containers
# Example: 10 containers * 50mb = 500MB for k8s-file logs
```

## Summary

Log size limits in Podman are configured with `--log-opt max-size`. This option works with the k8s-file log driver, and the json-file driver name is accepted as an alias for k8s-file. Set the limit per container at creation time, or configure the system-wide default with `log_size_max` in `containers.conf`. Always calculate your total disk budget as `max-size * container-count` and monitor log size health to ensure it is working as expected.
