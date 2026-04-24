# How to Configure the Snapshot Interval in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Configuration, Snapshot, Performance, Monitoring

Description: A guide to configuring Portainer's environment snapshot interval to balance freshness with performance overhead.

## Overview

Portainer takes data snapshots of connected environments (Docker hosts, Kubernetes clusters) at a regular interval. A snapshot contains the summary information shown on the environment home page along with other basic environment information. The default interval is 5 minutes. Adjusting this interval lets you balance data freshness against the overhead of polling many environments.

## Prerequisites

- Portainer CE or Business Edition
- Admin access to Portainer

## Understanding Snapshots

Portainer snapshots capture:
- Summary information shown on an environment's home page
- For Docker environments, counts and basic details for containers, images, networks, volumes, services, and stacks
- For Kubernetes environments, basic cluster summary information such as version, node count, and capacity totals

These snapshots are what Portainer uses for environment overview data in the UI.

## Method 1: Configure via UI

1. Navigate to **Settings** → **General**
2. Find the **Snapshot interval** field under **Application settings**
3. Set the desired interval using duration format (default: `5m`)
4. Click **Save settings**

Common values:
- `30s` - High-frequency polling (heavier load)
- `5m` - Default, good starting point for most environments
- `15m` - Lower-frequency for many environments or limited resources
- `1h` - Hourly, for static or less dynamic environments

## Method 2: Configure via API

```bash
PORTAINER_URL="https://portainer.example.com:9443"
API_KEY="your-admin-access-token"

# Set snapshot interval to 2 minutes

curl -X PUT \
  "${PORTAINER_URL}/api/settings" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"SnapshotInterval":"2m"}'

# Verify
curl -s -H "X-API-Key: ${API_KEY}" \
  "${PORTAINER_URL}/api/settings" \
  | jq -r '.SnapshotInterval'
```

## Method 3: Set at Startup via Flag

```bash
docker run -d \
  -p 9443:9443 \
  -p 8000:8000 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --snapshot-interval 2m
```

## Performance Considerations

| Environments | Recommended Interval | Notes |
|---|---|---|
| 1-5 | 30s-5m | `5m` default is usually fine |
| 5-20 | 5m-10m | Slightly increased to reduce load |
| 20-50 | 10m-15m | Balance freshness vs overhead |
| 50+ | 15m-30m | Higher interval to reduce snapshot overhead |
| Remote environments | 5m+ | Network latency makes frequent snapshots more expensive |

## Impact of Snapshot Interval on Portainer

```bash
# High-frequency snapshotting effects:
# - More up-to-date environment summary data in the dashboard
# - Higher CPU/memory on Portainer server
# - More API calls to Docker/Kubernetes endpoints
# - Higher network traffic to remote environments

# Low-frequency snapshotting effects:
# - Dashboard may show stale environment summary data
# - Lower resource consumption
# - Better for environments with many endpoints
```

## Triggering Manual Snapshot

For supported non-Edge, non-Azure environments, Portainer 2.x supports triggering a manual snapshot refresh:

```bash
# Force snapshot of a specific endpoint
ENDPOINT_ID=1
curl -X POST \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/snapshot" \
  -H "X-API-Key: ${API_KEY}"
```

## Monitoring Snapshot Performance

```bash
# Check Portainer logs for snapshot-related errors
docker logs portainer 2>&1 | grep -i "snapshot"

# Monitor Portainer memory usage
docker stats portainer --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

## Conclusion

The snapshot interval is a tuning knob that directly affects the trade-off between data freshness and system load. For small deployments (1-5 environments), the default 5-minute interval is a good starting point. For larger deployments with many remote endpoints, increasing the interval to 10-15 minutes can reduce load while still providing reasonably up-to-date environment summary data in the Portainer dashboard.
