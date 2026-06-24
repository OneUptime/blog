# How to Use the --snapshot-interval Flag in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, CLI Flags, Performance, Snapshot, Configuration, Docker

Description: Learn how to use the --snapshot-interval flag to control how frequently Portainer polls Docker environments for state changes, balancing freshness with resource usage.

---

Portainer takes environment data snapshots on the schedule set by `--snapshot-interval`. The flag uses duration strings such as `15s`, `5m`, or `1h`, and the default is `5m`. This guide explains when and how to change it.

## Default Behavior

```bash
# Default: snapshot environments every 5 minutes

docker run -d \
  --name portainer \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
# Equivalent to:
docker run -d \
  --name portainer \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --snapshot-interval 5m
```

## When to Increase the Interval

Increase the interval to reduce load in these scenarios:

- Hosts with hundreds of containers (large snapshot payloads)
- Hosts where less frequent snapshots help reduce CPU and memory use
- High-latency connections between Portainer and managed environments
- Environments that do not change frequently

```bash
# Snapshot every 15 minutes
docker run -d \
  --name portainer \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --snapshot-interval 15m
```

## When to Decrease the Interval

Decrease the interval if you need snapshot data to refresh more often in the UI:

```bash
# Snapshot every 15 seconds (more responsive dashboard data)
docker run -d \
  --name portainer \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --snapshot-interval 15s
```

Note: Very short intervals increase CPU and memory usage on the Portainer server and the managed environments being snapshotted.

## Effect on UI Data Freshness

The snapshot interval directly affects how old snapshot-based dashboard data can be:

| Interval | Approximate Maximum Snapshot Age | Use Case |
|---|---|---|
| 15s | 15 seconds | Active development environments |
| 1m | 1 minute | Frequently changing environments |
| 5m | 5 minutes | Default - most use cases |
| 1h | 1 hour | Read-mostly monitoring dashboards |

## Docker Compose Configuration

```yaml
services:
  portainer:
    image: portainer/portainer-ce:latest
    restart: unless-stopped
    command:
      - --snapshot-interval=2m
    ports:
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

volumes:
  portainer_data:
```

## Force a Manual Snapshot Refresh

For immediate refresh without waiting for the next scheduled snapshot, use the Portainer API with an admin access token. `POST /api/endpoints/{id}/snapshot` snapshots one environment, and `POST /api/endpoints/snapshot` snapshots all environments.
