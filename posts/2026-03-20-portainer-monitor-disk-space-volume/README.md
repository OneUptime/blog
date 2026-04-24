# How to Monitor Disk Space per Volume in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Volumes, Monitoring, Storage

Description: Learn how to monitor disk space usage per volume in Portainer to prevent storage exhaustion and keep your containerized workloads healthy.

## Introduction

Running containers without monitoring disk space can lead to unexpected failures, data loss, or degraded application performance. Portainer provides built-in tools to inspect volume metadata and attachments, and combined with Docker and host-level commands, you can maintain full visibility into your storage consumption.

## Prerequisites

- Portainer CE or BE installed and running
- At least one Docker environment connected to Portainer
- Sufficient permissions to view volumes and open a container console

## Viewing Volume Usage in Portainer UI

### Step 1: Navigate to Volumes

1. Log in to your Portainer instance.
2. From the left sidebar, select your **Environment** (e.g., local Docker).
3. Click on **Volumes** in the left navigation menu.

You will see a list of volumes and their metadata, such as name, driver, and creation date.

### Step 2: Inspect an Individual Volume

Click on any volume name to open its details page. Here you can see:

- **Driver**: e.g., `local`
- **Mount Point**: for local Docker volumes, the path on the host where Docker stores the data
- **Containers using this volume**: when Portainer can determine which containers are currently attached

> Note: Portainer does not show real-time disk usage numbers in the volume list by default. Use the methods below to get actual byte consumption.

## Checking Disk Usage from the Container Console

You can open a shell inside a running container that uses the volume and inspect the mounted path:

```bash
# Inside the container shell (open via Portainer > Container > Console)

du -sh /data

# Example output:
# 1.8G    /data

# If you also want to see the capacity of the backing filesystem:
# df -h /data
```

## Using the Portainer Exec / Console Feature

1. Go to **Containers** and click your container.
2. Click **Console** → **Connect**.
3. Run `du -sh /data` to estimate the size of a mounted volume path. If you also want to see the backing filesystem capacity, run `df -h /data`.

## Monitoring Disk Usage via the Docker API (via Portainer API)

You can also query disk usage programmatically using the Docker System API routed through Portainer. For recurring automation, use a Portainer access token in the `X-API-Key` header:

```bash
PORTAINER_URL="https://portainer.example.com"
PORTAINER_API_KEY="your-access-token"

# Get disk usage info for environment ID 1
curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
  "${PORTAINER_URL}/api/endpoints/1/docker/system/df" | jq .

# The Volumes array in the response includes UsageData.Size per volume
```

The response includes a `Volumes` array where each entry has a `UsageData.Size` field showing Docker's reported byte consumption for that volume.

## Automating Volume Usage Alerts

You can write a simple monitoring script that alerts when a volume exceeds a threshold:

```bash
#!/bin/bash
# monitor-volumes.sh - Alert when volume usage exceeds threshold

PORTAINER_URL="https://portainer.example.com"
PORTAINER_API_KEY="your-access-token"
ENDPOINT_ID=1
THRESHOLD_GB=10  # Alert if volume exceeds 10 GB
THRESHOLD_BYTES=$((THRESHOLD_GB * 1073741824))

# Fetch disk usage data
USAGE=$(curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/system/df")

# Parse volumes and check size (size is in bytes)
echo "$USAGE" | jq -r '.Volumes[]? | "\(.Name) \(.UsageData.Size // 0)"' | while read -r name size; do
  if [ "$size" -gt "$THRESHOLD_BYTES" ]; then
    size_gb=$(echo "scale=2; $size / 1073741824" | bc)
    echo "ALERT: Volume $name is using ${size_gb}GB (threshold: ${THRESHOLD_GB}GB)"
    # Add notification logic here (e.g., curl to Slack webhook)
  fi
done
```

## Using Host-Level Commands

If you have SSH access to the Docker host, you can check the size of the path Docker reports for each volume:

```bash
# List all Docker volumes with their disk usage on the host
docker volume ls -q | while read -r volume; do
  mountpoint=$(docker volume inspect -f '{{ .Mountpoint }}' "$volume")
  sudo du -sh "$mountpoint"
done

# Example output:
# 2.1G   /var/lib/docker/volumes/myapp_postgres_data/_data
# 512M   /var/lib/docker/volumes/myapp_redis_data/_data
# 50M    /var/lib/docker/volumes/myapp_uploads/_data

# Check a specific volume
sudo du -sh "$(docker volume inspect -f '{{ .Mountpoint }}' myapp_postgres_data)"
```

## Setting Up Ongoing Monitoring with Prometheus

For production environments, Portainer does not expose per-volume Prometheus metrics directly, and cAdvisor's `container_fs_*` metrics are labeled by filesystem `device` rather than Docker volume name. To alert per volume, export Docker `system/df` or `du` results into Prometheus with a custom exporter, then alert on that custom metric.

```yaml
# Example alert after exporting a custom docker_volume_usage_bytes metric
groups:
  - name: docker_volume_alerts
    rules:
      - alert: VolumeHighUsage
        expr: docker_volume_usage_bytes{volume!=""} > 10737418240  # 10GiB
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Docker volume {{ $labels.volume }} is using {{ $value | humanize }}B"
```

## Conclusion

Monitoring disk space per volume in Portainer is essential for maintaining reliable container workloads. Use the Portainer UI for quick inspections, the Docker API for programmatic access, and host-level commands for precise directory-size checks. For production environments, integrate Prometheus and AlertManager to receive proactive alerts before storage issues impact your services.
