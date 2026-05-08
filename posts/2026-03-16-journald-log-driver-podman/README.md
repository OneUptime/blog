# How to Use the journald Log Driver with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Logging, journald, Systemd

Description: Learn how to configure Podman to use the journald log driver, query container logs with journalctl, and leverage structured metadata for advanced log filtering.

---

> The journald log driver integrates container logs directly into the systemd journal, giving you structured metadata and powerful querying with journalctl.

The journald log driver sends container stdout and stderr to the systemd journal instead of writing to log files. This provides structured logging with automatic metadata like container name and ID, and lets you use the full power of `journalctl` for querying.

---

## Enable the journald Log Driver

```bash
# Run a container with the journald log driver

podman run -d \
  --log-driver journald \
  --name web \
  nginx:latest

# Verify the log driver is set
podman inspect --format '{{.HostConfig.LogConfig.Type}}' web

# Set journald as the default for all containers
mkdir -p ~/.config/containers
cat >> ~/.config/containers/containers.conf << 'EOF'
[containers]
log_driver = "journald"
EOF
```

## View Logs with podman logs

The `podman logs` command still works with the journald driver.

```bash
# Standard log viewing
podman logs web

# Follow logs in real time
podman logs -f web

# View last 20 lines
podman logs --tail 20 web

# View with timestamps
podman logs --timestamps web
```

## Query Logs with journalctl

The real advantage of journald is querying with `journalctl`.

```bash
# View logs by container name
journalctl CONTAINER_NAME=web --no-pager

# View logs by container ID
CONTAINER_ID=$(podman inspect --format '{{.Id}}' web)
journalctl CONTAINER_ID_FULL="$CONTAINER_ID" --no-pager

# Follow logs in real time
journalctl CONTAINER_NAME=web -f

# View last 50 entries
journalctl CONTAINER_NAME=web -n 50 --no-pager

# View logs since a specific time
journalctl CONTAINER_NAME=web --since "2026-03-16 14:00:00" --no-pager

# View logs in a time range
journalctl CONTAINER_NAME=web \
  --since "2026-03-16 14:00:00" \
  --until "2026-03-16 15:00:00" \
  --no-pager
```

## Use Structured Metadata

journald stores rich metadata with each log entry that you can use for filtering.

```bash
# View all metadata fields for container logs
journalctl CONTAINER_NAME=web -n 1 -o verbose

# Common metadata fields available:
# CONTAINER_NAME - Container name
# CONTAINER_ID - Truncated container ID
# CONTAINER_ID_FULL - Full container ID
# CONTAINER_TAG - Custom tag if set

# Filter by multiple criteria
journalctl CONTAINER_NAME=web PRIORITY=3 --no-pager  # Only error-level

# View logs in JSON format for parsing
journalctl CONTAINER_NAME=web -o json --no-pager | head -5

# View logs in JSON with pretty printing
journalctl CONTAINER_NAME=web -o json-pretty -n 1 --no-pager
```

## Configure Custom Tags

Tags help organize and filter container logs in the journal.

```bash
# Set a custom tag for the container
podman run -d \
  --log-driver journald \
  --log-opt tag="api" \
  --name api \
  my-api:latest

# Query by tag
journalctl CONTAINER_TAG=api --no-pager

# Use template variables in tags:
# {{.Name}}      - Container name
# {{.ID}}        - Container ID (truncated)
# {{.FullID}}    - Full container ID
# {{.ImageName}} - Image name
```

## Combine Container and System Logs

One of journald's strengths is combining container logs with host system logs.

```bash
# View container and host logs together, sorted by time
journalctl --since "5 minutes ago" --no-pager

# View stdout transport entries, including container output
journalctl _TRANSPORT=stdout --no-pager | tail -20

# Correlate container events with system events
journalctl --since "2026-03-16 14:00:00" \
  --until "2026-03-16 14:10:00" \
  --no-pager | grep -E "(web|kernel|oom)"
```

## Export journald Logs

Export container logs from the journal in various formats.

```bash
# Export as plain text
journalctl CONTAINER_NAME=web --no-pager > web-logs.txt

# Export as JSON for processing
journalctl CONTAINER_NAME=web -o json --no-pager > web-logs.json

# Export in a specific time range
journalctl CONTAINER_NAME=web \
  --since "2026-03-16 14:00:00" \
  --until "2026-03-16 15:00:00" \
  -o json --no-pager > incident-logs.json

# Export and process with jq
journalctl CONTAINER_NAME=web -o json --no-pager | \
  jq -r '.MESSAGE' | head -20
```

## Configure journald Retention

Control how long container logs are kept in the journal.

```bash
# Check current journal disk usage
journalctl --disk-usage

# View journald configuration
cat /etc/systemd/journald.conf

# Key settings to adjust:
# SystemMaxUse=500M     - Maximum disk space for journal
# SystemMaxFileSize=50M - Maximum size per journal file
# MaxRetentionSec=1month - Maximum retention time

# Clean up old journal entries
sudo journalctl --vacuum-time=7d   # Remove entries older than 7 days
sudo journalctl --vacuum-size=200M  # Reduce journal to 200MB
```

## Use journald with Podman Compose

```yaml
# podman-compose.yml
services:
  web:
    image: nginx:latest
    logging:
      driver: journald
      options:
        tag: "web"

  api:
    image: my-api:latest
    logging:
      driver: journald
      options:
        tag: "api"
```

## Summary

The journald log driver integrates Podman container logs into the systemd journal, providing structured metadata, powerful querying with `journalctl`, and the ability to correlate container events with system events. Use custom tags for organized filtering, export logs in JSON format for processing, and configure journal retention to manage disk space. The `podman logs` command continues to work transparently with journald as the backend.
