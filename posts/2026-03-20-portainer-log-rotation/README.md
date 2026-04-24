# How to Set Up Log Rotation for Containers in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Log Rotation, Docker, Json-file, Disk Management, Container Logging

Description: Learn how to configure log rotation for Docker containers managed by Portainer to prevent log files from consuming all disk space.

---

Docker's default `json-file` log driver writes container logs to the host disk without any size limit by default. Without log rotation, containers running for weeks or months can fill up the disk. This guide covers configuring rotation per-container, globally, and for existing deployments.

## Default Behavior

On a default Linux Docker Engine host, Docker writes `json-file` logs to:

```text
/var/lib/docker/containers/{container-id}/{container-id}-json.log
```

```bash
# Check current log file sizes

du -sh /var/lib/docker/containers/*/*.log | sort -rh | head -10
```

## Per-Container Log Rotation in a Stack

Configure rotation in your Portainer stack's `logging` section:

```yaml
services:
  api:
    image: my-api:latest
    logging:
      driver: json-file
      options:
        max-size: "50m"     # Rotate when log file reaches 50 MB
        max-file: "5"       # Keep up to 5 rotated files (total: 250 MB)
        compress: "true"    # Compress rotated files with gzip

  nginx:
    image: nginx:alpine
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  postgres:
    image: postgres:15
    logging:
      driver: json-file
      options:
        max-size: "20m"
        max-file: "10"
```

## Global Log Rotation for All Containers

Set defaults for all containers on a Linux Docker host in `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "5",
    "compress": "true"
  }
}
```

On systemd-based hosts, restart Docker to apply: `sudo systemctl restart docker`

This applies to all new containers. Existing containers are unaffected - they must be recreated to pick up the new settings.

## Applying to Existing Containers

Existing containers keep their original log settings. Recreate them to apply new defaults:

```bash
# For a Portainer-managed stack, update the stack:
# 1. Edit the stack and add logging section
# 2. Click "Update the stack" - this recreates affected containers

# For individual containers, stop and recreate:
docker stop my-container
docker rm my-container
docker run \
  --name my-container \
  --log-driver json-file \
  --log-opt max-size=50m \
  --log-opt max-file=5 \
  --log-opt compress=true \
  my-image:tag
```

## Checking Effective Log Settings

Verify a container's log configuration:

```bash
docker inspect $(docker ps -qf name=api) | \
  jq '.[0].HostConfig.LogConfig'

# Expected output:
# {
#   "Type": "json-file",
#   "Config": {
#     "max-file": "5",
#     "max-size": "50m",
#     "compress": "true"
#   }
# }
```

## Size Calculation

Plan storage based on container count and log verbosity:

| Service Type | Log Volume | Recommended Settings |
|-------------|-----------|---------------------|
| Web server | Low | `50m`, 3 files = 150 MB max |
| API service | Medium | `50m`, 5 files = 250 MB max |
| Worker/job | High | `100m`, 10 files = 1 GB max |
| Debug build | Very High | `200m`, 5 files = 1 GB max |

## Alternative: Local Systemd Journal

Use the `journald` driver to integrate with systemd's journal, which handles rotation via `journald.conf`:

```yaml
logging:
  driver: journald
  options:
    tag: "my-app-api"
```

Then configure journald retention in `/etc/systemd/journald.conf`:

```ini
[Journal]
SystemMaxUse=1G        # Total journal size limit
SystemMaxFileSize=100M # Per-file size limit
MaxRetentionSec=30day  # Keep logs for 30 days
```

## Disk Space Monitoring

Alert when log storage exceeds a threshold using OneUptime or a simple script:

```bash
#!/bin/bash
# check-log-disk-usage.sh

LOG_DIR="/var/lib/docker/containers"
THRESHOLD_GB=10

USED_GB=$(du -sB1G "$LOG_DIR" | cut -f1)
if [ "$USED_GB" -gt "$THRESHOLD_GB" ]; then
  echo "WARNING: Docker logs using ${USED_GB}GB (threshold: ${THRESHOLD_GB}GB)"
  # Find largest log files
  du -sh "$LOG_DIR"/*/*.log | sort -rh | head -5
fi
```
