# How to Download Container Logs from Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Logging, DevOps

Description: Learn how to download and export Docker container logs from Portainer for offline analysis, sharing with teams, or archival purposes.

## Introduction

There are times when you need to share container logs with a team member, attach them to a bug report, or archive them for compliance purposes. Portainer provides a log download feature, and this guide also covers how to export logs via Docker CLI and automate log archival.

## Prerequisites

- Portainer installed with a connected Docker environment
- Access to a container with logs to export

## Step 1: Download Logs from Portainer UI

1. Navigate to **Containers** in Portainer.
2. Click on the container name.
3. Click **Logs**.
4. Use the date picker and line limit controls to choose the logs you want to export.
5. Click the **Download logs** button in the log viewer toolbar.
6. Save the downloaded log file.

The downloaded file contains the log lines currently displayed in the viewer.

Note: If Portainer doesn't show a download button, use the copy-to-clipboard option and paste into a file, or use the Docker CLI method below.

## Step 2: Export Logs via Docker CLI

For more control over the export:

```bash
# Export all logs to a file:

docker logs my-container > my-container-logs.txt 2>&1

# Include timestamps:
docker logs -t my-container > my-container-logs-timestamped.txt 2>&1

# Export only the last 1000 lines:
docker logs --tail 1000 my-container > my-container-recent-logs.txt 2>&1

# Export logs from a specific time range:
docker logs --since "2026-03-20T10:00:00" --until "2026-03-20T11:00:00" \
    my-container > incident-logs.txt 2>&1

# Compress the output for large logs:
docker logs my-container 2>&1 | gzip > my-container-logs.txt.gz

# Note: docker logs returns the container's stdout and stderr together.
# Shell redirection here only separates the Docker CLI's own output streams.
```

## Step 3: Access Log Files Directly on the Host

For the `json-file` logging driver, Docker stores logs as JSON files on the host. Docker recommends using the Docker CLI or API when possible, because these files are intended for exclusive access by the Docker daemon:

```bash
# Find the log file location:
LOG_PATH=$(docker inspect my-container --format='{{.LogPath}}')
echo "${LOG_PATH}"
# Example output on a Linux host:
# /var/lib/docker/containers/<container-id>/<container-id>-json.log

# View the raw log file:
sudo cat "${LOG_PATH}"

# If jq is installed, extract just the log messages from the JSON:
sudo jq -r '.log' "${LOG_PATH}"

# Extract with timestamps:
sudo jq -r '[.time, .log] | @tsv' "${LOG_PATH}"

# Copy log file to current directory:
sudo cp "${LOG_PATH}" "./my-container-$(date +%Y%m%d).json.log"
```

## Step 4: Automate Log Collection

For regular log archival or incident response:

```bash
#!/bin/bash
# collect-logs.sh
# Collects logs from all running containers

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_DIR="/var/log/container-exports/${TIMESTAMP}"
mkdir -p "${OUTPUT_DIR}"

echo "Collecting container logs..."

for container_id in $(docker ps -q); do
    container_name=$(docker inspect --format '{{.Name}}' "${container_id}" | tr -d '/')
    log_file="${OUTPUT_DIR}/${container_name}.log"

    echo "  Exporting: ${container_name}"
    docker logs -t "${container_id}" > "${log_file}" 2>&1
done

# Create a tarball
tar -czf "/var/log/container-exports/logs-${TIMESTAMP}.tar.gz" -C "${OUTPUT_DIR}" .
rm -rf "${OUTPUT_DIR}"

echo "Logs exported to: /var/log/container-exports/logs-${TIMESTAMP}.tar.gz"
```

```bash
# Schedule with cron: daily log archive at midnight
# 0 0 * * * /opt/scripts/collect-logs.sh
```

## Step 5: Export Logs for Incident Reports

When you need to share logs for an incident postmortem:

```bash
#!/bin/bash
# incident-report-logs.sh
# Exports logs from the last 2 hours for an incident report

INCIDENT_ID="${1:-$(date +%Y%m%d_%H%M%S)}"
OUTPUT_FILE="incident-${INCIDENT_ID}-logs.tar.gz"
TMPDIR=$(mktemp -d)

echo "Creating incident log package: ${OUTPUT_FILE}"

# Get logs from all containers for the last 2 hours
for container_id in $(docker ps -aq); do
    container_name=$(docker inspect --format '{{.Name}}' "${container_id}" | tr -d '/')
    state=$(docker inspect --format '{{.State.Status}}' "${container_id}")

    echo "  Including: ${container_name} (${state})"

    # Logs for the last 2 hours
    docker logs -t --since "2h" "${container_id}" \
        > "${TMPDIR}/${container_name}.log" 2>&1

    # Container inspect JSON
    docker inspect "${container_id}" \
        > "${TMPDIR}/${container_name}-inspect.json"
done

# Package everything
tar -czf "${OUTPUT_FILE}" -C "${TMPDIR}" .
rm -rf "${TMPDIR}"

echo ""
echo "Incident log package: ${OUTPUT_FILE}"
echo "Size: $(du -sh ${OUTPUT_FILE} | cut -f1)"
echo "Attach this file to your incident report."
```

## Step 6: Download Logs via Portainer API

For automated log collection without Docker CLI access, Portainer can proxy Docker API requests. If you request both `stdout` and `stderr` together, Docker may return a multiplexed stream, so downloading one stream at a time is safer for plain-text files. If your Portainer instance uses its default self-signed certificate, trust the certificate first or add `-k` to `curl` for ad hoc testing:

```bash
# Portainer API: get container logs
PORTAINER_URL="https://portainer:9443"
API_KEY="your-api-key"
ENDPOINT_ID=1
CONTAINER_ID="abc123def456"

# Download the last 1000 stdout log lines with timestamps
curl -s \
  -H "X-API-Key: ${API_KEY}" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${CONTAINER_ID}/logs?stdout=1&stderr=0&timestamps=1&tail=1000" \
  > container-stdout.txt

# Download stderr separately if needed
curl -s \
  -H "X-API-Key: ${API_KEY}" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${CONTAINER_ID}/logs?stdout=0&stderr=1&timestamps=1&tail=1000" \
  > container-stderr.txt

echo "Logs downloaded: container-stdout.txt and container-stderr.txt"
```

## Log Format Considerations

When sharing logs, include context:

```bash
=== Container Log Export ===
Container:   my-app
Image:       myorg/myapp:2.1.0
Exported:    2026-03-20T10:30:00Z
Time range:  Last 2 hours (since 2026-03-20T08:30:00Z)
Lines:       1,247
Host:        prod-server-01
============================

2026-03-20T10:00:00Z INFO: Application startup
2026-03-20T10:00:01Z INFO: Database connected
...
```

Add this header context when sharing logs with teams or attaching to tickets.

## Conclusion

Downloading container logs from Portainer is straightforward through the UI, and even more flexible via Docker CLI for time-range filtering, format control, and automation. For regular archival, implement a scheduled log collection script. For incident response, use the incident report script to package logs with container inspect data for a complete diagnostic package.
