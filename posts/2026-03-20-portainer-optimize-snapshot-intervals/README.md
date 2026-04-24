# How to Optimize Docker Snapshot Intervals for Performance - Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Snapshot Interval, Performance, Optimization, Docker, Configuration

Description: Learn how to tune the Portainer Docker snapshot interval to balance UI freshness with system performance for your specific deployment scale.

---

The snapshot interval controls how often Portainer refreshes snapshot data for directly connected Docker environments. The right interval depends on your deployment size, how critical current summary data is, and your server's resources.

## What Snapshots Contain

Each snapshot captures summary data for a Docker environment, including:

- All running and stopped containers
- All images, volumes, and networks
- Summary counts for containers, images, volumes, services, stacks, and nodes
- Engine information such as Docker version, CPU count, and total memory

Portainer stores this snapshot data in its BoltDB database. Portainer uses it for Home/dashboard summary information, while detailed operations still go through the Portainer server, which proxies requests to the underlying Docker or Kubernetes API.

## Default and Recommended Intervals

```text
# Default: 5 minutes

portainer/portainer-ce:latest
# Equivalent to:
portainer/portainer-ce:latest --snapshot-interval 5m
```

| Deployment Size | Recommended Interval | Rationale |
|-----------------|---------------------|-----------|
| 1–10 containers | 30–60s | Fine; minimal overhead |
| 10–50 containers | 60–120s | Shorter intervals are still practical |
| 50–200 containers | 120–300s | Reduces database write pressure |
| 200+ containers | 300–600s | Significant resource savings |

Edge Agent Async environments use separate poll and snapshot interval settings.

## Setting the Snapshot Interval

Pass the flag when starting Portainer:

```bash
docker run -d \
  --name portainer \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --snapshot-interval 3m
```

In a Docker Compose or Portainer stack:

```yaml
services:
  portainer:
    image: portainer/portainer-ce:latest
    command:
      - --snapshot-interval=3m
      - --log-level=WARN
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    ports:
      - "9443:9443"
```

## Measuring Snapshot Overhead

Check the resource cost of snapshots on your system:

```bash
# Enable debug logging temporarily while testing intervals
docker stop portainer
docker rm portainer
docker run -d --name portainer \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -p 9443:9443 \
  portainer/portainer-ce:latest \
  --log-level DEBUG \
  --log-mode NOCOLOR

# Watch for snapshot-related log lines
docker logs -f portainer 2>&1 | grep -i snapshot

# Check Portainer's own resource usage
docker stats --no-stream portainer
```

Use `docker stats` to compare Portainer's CPU and memory usage while testing different intervals. Debug logs are useful for spotting snapshot-related errors, but Portainer does not document a fixed per-snapshot timing log format.

## Impact on UI Freshness

With longer snapshot intervals, the Home dashboard and other snapshot-backed summary data may show stale information:

| Interval | Data Age at Worst Case |
|----------|----------------------|
| 30s | Up to 30 seconds stale |
| 120s | Up to 2 minutes stale |
| 300s | Up to 5 minutes stale |

For most overview use cases, 2–5 minute staleness is acceptable. For actions that need live state, use a detailed Portainer view or check the Docker CLI.

## Per-Environment Snapshot Control

Portainer's main snapshot interval is a global setting, not a per-environment toggle. In Portainer Business Edition, Edge Agent Async environments have separate per-environment snapshot settings:

1. Go to **Environments > Add environment**.
2. Choose **Docker Standalone > Edge Agent Async**, then expand **More settings**.
3. Adjust the **Snapshot** interval for that environment before creating it.

## Combining with Low Log Level

Reduce I/O overhead by combining a longer interval with a lower log level:

```bash
docker run -d \
  --name portainer \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --snapshot-interval 3m \
  --log-level WARN \
  --log-mode NOCOLOR
```

`--log-level WARN` reduces log verbosity. `--log-mode` only changes log formatting (`PRETTY`, `NOCOLOR`, or `JSON`) - it does not redirect logs away from stdout.
