# How to Use the k8s-file Log Driver with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Logging, Kubernetes

Description: Learn how to use Podman's default k8s-file log driver, which stores logs in Kubernetes-compatible format, including configuration options and log file management.

---

> The k8s-file driver stores logs in a format compatible with Kubernetes log conventions.

The k8s-file log driver writes container logs to files using a format that mirrors how Kubernetes stores container logs. Each line is prefixed with a timestamp, stream identifier (stdout/stderr), and a log tag. Podman uses journald by default when the systemd journal is readable and writable; otherwise, it uses k8s-file. You can also select k8s-file explicitly with `--log-driver k8s-file`.

---

## Verify or Select the Driver

```bash
# Check the current default log driver for this system

podman info --format '{{.Host.LogDriver}}'
# Output may be: journald or k8s-file

# Use the k8s-file driver explicitly unless it is already the default
podman run -d --log-driver k8s-file --name web nginx:latest

# Confirm the driver for a running container
podman inspect --format '{{.HostConfig.LogConfig.Type}}' web
```

## Understand the k8s-file Format

```bash
# Find the log file location
podman inspect --format '{{.HostConfig.LogConfig.Path}}' web

# View raw log file contents
cat "$(podman inspect --format '{{.HostConfig.LogConfig.Path}}' web)" | head -5

# Format of each line:
# 2026-03-16T14:30:01.123456789+00:00 stdout F 172.17.0.1 - - [16/Mar/2026:14:30:01 +0000] "GET / HTTP/1.1" 200 615

# Fields:
# - Timestamp (RFC 3339 with nanoseconds)
# - Stream (stdout or stderr)
# - Log tag (F = full line, P = partial line)
# - Log message
```

The `F` and `P` tags indicate whether the line is a complete (Full) log entry or a Partial line that was split due to length.

## Configure k8s-file Options

```bash
# Set maximum log file size
podman rm -f web

podman run -d \
  --log-driver k8s-file \
  --log-opt max-size=10m \
  --name web \
  nginx:latest

# Note: The max-file option (number of rotated log files) is not
# currently supported by Podman's k8s-file driver. Only max-size is supported.

# Check the log file size
LOG_PATH=$(podman inspect --format '{{.HostConfig.LogConfig.Path}}' web)
ls -lh "$LOG_PATH"
```

## Parse k8s-file Logs

```bash
# Extract just the log messages (field 4 onward)
cat "$(podman inspect --format '{{.HostConfig.LogConfig.Path}}' web)" | awk '{$1=$2=$3=""; print substr($0,4)}'

# Filter by stream type
# stdout only
cat "$(podman inspect --format '{{.HostConfig.LogConfig.Path}}' web)" | awk '$2 == "stdout"'

# stderr only
cat "$(podman inspect --format '{{.HostConfig.LogConfig.Path}}' web)" | awk '$2 == "stderr"'

# Extract timestamps
cat "$(podman inspect --format '{{.HostConfig.LogConfig.Path}}' web)" | awk '{print $1}' | head -10

# Count entries by stream
cat "$(podman inspect --format '{{.HostConfig.LogConfig.Path}}' web)" | awk '{print $2}' | sort | uniq -c

# Search for errors
cat "$(podman inspect --format '{{.HostConfig.LogConfig.Path}}' web)" | grep -i error
```

## Handle Partial Lines

The k8s-file format marks partial lines with `P` and complete lines with `F`.

```bash
# Find partial lines
cat "$(podman inspect --format '{{.HostConfig.LogConfig.Path}}' web)" | awk '$3 == "P"'

# Reassemble partial lines (join P lines until an F line)
cat "$(podman inspect --format '{{.HostConfig.LogConfig.Path}}' web)" | awk '
  $3 == "P" {
    partial = partial substr($0, index($0,$4))
    next
  }
  $3 == "F" {
    if (partial != "") {
      print partial substr($0, index($0,$4))
      partial = ""
    } else {
      print substr($0, index($0,$4))
    }
  }
'
```

## Manage Log Files

```bash
# Check disk usage of all container log files
for c in $(podman ps -a --format '{{.Names}}'); do
  LOG_PATH=$(podman inspect --format '{{.HostConfig.LogConfig.Path}}' "$c" 2>/dev/null)
  if [ -n "$LOG_PATH" ] && [ -f "$LOG_PATH" ]; then
    SIZE=$(ls -lh "$LOG_PATH" | awk '{print $5}')
    echo "$c: $SIZE ($LOG_PATH)"
  fi
done

# Find the largest log files
for c in $(podman ps -a --format '{{.Names}}'); do
  LOG_PATH=$(podman inspect --format '{{.HostConfig.LogConfig.Path}}' "$c" 2>/dev/null)
  if [ -n "$LOG_PATH" ] && [ -f "$LOG_PATH" ]; then
    ls -l "$LOG_PATH"
  fi
done | sort -k5 -n -r | head -10
```

## Compare with Other Drivers

```bash
# k8s-file vs json-file format comparison

# k8s-file format:
# 2026-03-16T14:30:01.123+00:00 stdout F Hello from container

# json-file format:
# {"log":"Hello from container\n","stream":"stdout","time":"2026-03-16T14:30:01.123Z"}

# k8s-file advantages:
# - Human-readable without parsing
# - Lower storage overhead (no JSON syntax)
# - Kubernetes-compatible
# - Handles partial lines explicitly

# k8s-file disadvantages:
# - Less structured than JSON for programmatic parsing
# - Not the same on-disk format as Docker's json-file logs
```

## Set as Default with Custom Options

```bash
# Configure k8s-file with defaults in containers.conf
mkdir -p ~/.config/containers

cat >> ~/.config/containers/containers.conf << 'EOF'
[containers]
log_driver = "k8s-file"
log_size_max = 10485760
EOF

# The log_size_max value is in bytes (10485760 = 10MB)
```

## Use in Podman Compose

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
      driver: k8s-file
      options:
        max-size: "50m"
```

## Summary

The k8s-file driver stores logs in a Kubernetes-compatible text format with timestamps, stream identifiers, and partial-line markers. It is human-readable, has lower overhead than JSON, and supports size limits via `max-size`. Use `awk` to parse the structured fields, and configure `max-size` to prevent unbounded log growth.
