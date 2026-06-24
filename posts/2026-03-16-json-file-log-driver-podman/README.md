# How to Use the json-file Log Driver with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Logging, JSON

Description: Learn how to configure and use the json-file log driver in Podman for Docker-compatible JSON log output, including log rotation and programmatic parsing.

---

> In Podman, the json-file log driver is an alias for the k8s-file driver, which stores each log line with a timestamp, stream identifier, log tag, and message.

The json-file log driver name is accepted by Podman for Docker CLI compatibility, but Podman writes the logs using its k8s-file format. Each line contains the timestamp, stream (stdout or stderr), log tag, and log message.

---

## Enable the json-file Log Driver

```bash
# Run a container with the json-file log driver

podman run -d \
  --log-driver json-file \
  --name web \
  nginx:latest

# Verify the log driver
podman inspect --format '{{.HostConfig.LogConfig.Type}}' web

# View logs normally (podman logs still works)
podman logs web
```

## Understand the Log Format

```bash
# Find the log file location
podman inspect --format '{{.LogPath}}' web

# View the raw log file
head -5 "$(podman inspect --format '{{.LogPath}}' web)"

# Each line uses the k8s-file format:
# 2026-03-16T14:30:01.123456789Z stdout F 172.17.0.1 - - [16/Mar/2026:14:30:01 +0000] "GET / HTTP/1.1" 200 615

# Split the first line into timestamp, stream, tag, and message
head -1 "$(podman inspect --format '{{.LogPath}}' web)" | awk '{msg=$0; sub(/^[^ ]+ [^ ]+ [^ ]+ /, "", msg); print "time=" $1 "\nstream=" $2 "\ntag=" $3 "\nmessage=" msg}'
```

The log structure contains:
- **time**: RFC 3339 timestamp with nanosecond precision.
- **stream**: Either "stdout" or "stderr".
- **tag**: "F" for a full log line or "P" for a partial log line.
- **log**: The actual log message.

## Configure Log Size Limits

Prevent log files from growing indefinitely with size limits.

```bash
# Set maximum log file size
podman run -d \
  --log-driver json-file \
  --log-opt max-size=10mb \
  --name web \
  nginx:latest

# Note: In Podman, json-file is aliased to the k8s-file driver.
# The max-size option is supported, but Docker's max-file option is not.

# Check the current log file size
LOG_PATH=$(podman inspect --format '{{.LogPath}}' web)
ls -lh "$LOG_PATH"
```

## Parse Logs Programmatically

The k8s-file format makes logs easy to process with standard tools.

```bash
# Extract just the log messages
awk '{msg=$0; sub(/^[^ ]+ [^ ]+ [^ ]+ /, "", msg); print msg}' "$(podman inspect --format '{{.LogPath}}' web)"

# Filter by stream (stdout only)
awk '$2 == "stdout" {msg=$0; sub(/^[^ ]+ [^ ]+ [^ ]+ /, "", msg); print msg}' "$(podman inspect --format '{{.LogPath}}' web)"

# Filter by stream (stderr only)
awk '$2 == "stderr" {msg=$0; sub(/^[^ ]+ [^ ]+ [^ ]+ /, "", msg); print msg}' "$(podman inspect --format '{{.LogPath}}' web)"

# Extract timestamps and messages
awk '{msg=$0; sub(/^[^ ]+ [^ ]+ [^ ]+ /, "", msg); print $1 "\t" $2 "\t" msg}' "$(podman inspect --format '{{.LogPath}}' web)"

# Filter by time range
awk '$1 > "2026-03-16T14:00:00.000000000Z" && $1 < "2026-03-16T15:00:00.000000000Z" {msg=$0; sub(/^[^ ]+ [^ ]+ [^ ]+ /, "", msg); print msg}' "$(podman inspect --format '{{.LogPath}}' web)"

# Count entries by stream type
awk '{print $2}' "$(podman inspect --format '{{.LogPath}}' web)" | sort | uniq -c
```

## Search Logs

```bash
# Search for errors in the log messages
awk '{msg=$0; sub(/^[^ ]+ [^ ]+ [^ ]+ /, "", msg)} tolower(msg) ~ /error/ {print msg}' "$(podman inspect --format '{{.LogPath}}' web)"

# Search with context (timestamp + message)
awk '{msg=$0; sub(/^[^ ]+ [^ ]+ [^ ]+ /, "", msg)} tolower(msg) ~ /error/ {print $1, msg}' "$(podman inspect --format '{{.LogPath}}' web)"

# Count errors
awk '{msg=$0; sub(/^[^ ]+ [^ ]+ [^ ]+ /, "", msg)} tolower(msg) ~ /error/ {count++} END {print count+0}' "$(podman inspect --format '{{.LogPath}}' web)"

# Search the current log file
LOG_PATH=$(podman inspect --format '{{.LogPath}}' web)
awk '{msg=$0; sub(/^[^ ]+ [^ ]+ [^ ]+ /, "", msg)} tolower(msg) ~ /error/ {print msg}' "$LOG_PATH"
```

## Process Logs with Python

For more complex analysis, use Python to process logs.

```bash
# Quick analysis script
LOG_PATH=$(podman inspect --format '{{.LogPath}}' web)

python3 << PYEOF
errors = 0
warnings = 0
total = 0

with open("$LOG_PATH") as f:
    for line in f:
        parts = line.rstrip("\n").split(" ", 3)
        if len(parts) < 4:
            continue
        timestamp, stream, tag, msg = parts
        total += 1
        message = msg.lower()
        if "error" in message:
            errors += 1
        if "warn" in message:
            warnings += 1

print(f"Total entries: {total}")
print(f"Errors: {errors}")
print(f"Warnings: {warnings}")
PYEOF
```

## Set as Default Log Driver

```bash
# Configure json-file as the default for all new containers
mkdir -p ~/.config/containers

cat >> ~/.config/containers/containers.conf << 'EOF'
[containers]
log_driver = "json-file"
log_size_max = 10485760
EOF

# The log_size_max value is in bytes (10485760 = 10MB)
# Note: json-file is aliased to k8s-file in Podman

# Verify the configuration
podman info --format '{{.Host.LogDriver}}'
```

## Use in Podman Compose

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
      driver: json-file
      options:
        max-size: "50mb"
```

## Summary

The json-file log driver name is supported by Podman as an alias to the k8s-file driver, making it useful for scripts that expect Docker-style driver names. Configure the `max-size` option to limit log file size and prevent disk exhaustion. The resulting log file uses Podman's Kubernetes-compatible format, which can be parsed with tools like `awk` and Python.
