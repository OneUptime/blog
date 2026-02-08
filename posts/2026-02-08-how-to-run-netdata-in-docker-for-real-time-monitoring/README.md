# How to Run Netdata in Docker for Real-Time Monitoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Netdata, Monitoring, Real-Time, Observability, DevOps, Metrics

Description: Deploy Netdata in Docker to get real-time, per-second monitoring of your systems, containers, and applications with zero configuration.

---

Netdata is a real-time monitoring agent that collects thousands of metrics per second and displays them in a beautiful, interactive dashboard. Unlike most monitoring tools that scrape at 15 or 60 second intervals, Netdata collects data every single second. It auto-discovers running services, containers, and system components, then starts monitoring them without any configuration. You install it, and it works.

This guide shows you how to run Netdata in Docker, monitor your containers and host system, set up alerts, and stream data to a central Netdata parent for multi-host visibility.

## What Makes Netdata Different

Most monitoring tools require you to define what to monitor, configure exporters, and build dashboards. Netdata takes the opposite approach. It ships with over 800 collectors that automatically detect running services. If you have MySQL running, Netdata finds it and starts collecting query rates, connection counts, and cache hit ratios. Same for Nginx, Redis, PostgreSQL, Docker containers, and hundreds of other services.

The dashboard renders entirely in the browser using the collected data, giving you interactive charts that you can zoom, pan, and drill into. Everything happens in real time with no page refreshes.

## Quick Start

Run Netdata with full host visibility using a single Docker command.

```bash
# Run Netdata with access to host metrics and Docker container metrics
docker run -d \
  --name netdata \
  --pid=host \
  --network=host \
  --restart unless-stopped \
  --cap-add SYS_PTRACE \
  --cap-add SYS_ADMIN \
  --security-opt apparmor=unconfined \
  -v netdataconfig:/etc/netdata \
  -v netdatalib:/var/lib/netdata \
  -v netdatacache:/var/cache/netdata \
  -v /:/host/root:ro,rslave \
  -v /etc/passwd:/host/etc/passwd:ro \
  -v /etc/group:/host/etc/group:ro \
  -v /etc/localtime:/host/etc/localtime:ro \
  -v /proc:/host/proc:ro \
  -v /sys:/host/sys:ro \
  -v /etc/os-release:/host/etc/os-release:ro \
  -v /var/log:/host/var/log:ro \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  netdata/netdata:stable
```

Open `http://localhost:19999` in your browser. You should immediately see hundreds of charts covering CPU, memory, disk I/O, network, and every detected service.

## Docker Compose Setup

For a more manageable deployment, use Docker Compose.

```yaml
# docker-compose.yml - Netdata monitoring stack
version: "3.8"

services:
  netdata:
    image: netdata/netdata:stable
    hostname: docker-host
    restart: unless-stopped
    pid: host
    network_mode: host
    cap_add:
      - SYS_PTRACE
      - SYS_ADMIN
    security_opt:
      - apparmor:unconfined
    volumes:
      # Netdata configuration and data persistence
      - netdata-config:/etc/netdata
      - netdata-lib:/var/lib/netdata
      - netdata-cache:/var/cache/netdata

      # Host filesystem access for system monitoring (read-only)
      - /:/host/root:ro,rslave
      - /etc/passwd:/host/etc/passwd:ro
      - /etc/group:/host/etc/group:ro
      - /etc/localtime:/host/etc/localtime:ro
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /etc/os-release:/host/etc/os-release:ro
      - /var/log:/host/var/log:ro

      # Docker socket for container monitoring
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      # Set the claimed room for Netdata Cloud (optional)
      # - NETDATA_CLAIM_TOKEN=your-claim-token
      # - NETDATA_CLAIM_URL=https://app.netdata.cloud
      - TZ=UTC

volumes:
  netdata-config:
  netdata-lib:
  netdata-cache:
```

```bash
# Start Netdata
docker compose up -d

# Verify it is running
curl -s http://localhost:19999/api/v1/info | python3 -m json.tool | head -20
```

## Understanding the Dashboard

The Netdata dashboard organizes metrics into sections. At the top, you see system overview charts: CPU usage, memory, disk I/O, and network traffic. Below that, each detected service gets its own section with relevant metrics.

For Docker containers, navigate to the "Containers" section. You will see per-container metrics including CPU usage, memory consumption, network I/O, and block I/O. Netdata reads these directly from the cgroup filesystem, so the overhead is negligible.

## Monitoring Docker Containers

Netdata automatically discovers and monitors all Docker containers when you mount the Docker socket. Each container appears with its own set of metrics.

```bash
# List all charts Netdata has for Docker containers
curl -s http://localhost:19999/api/v1/charts | \
  python3 -c "import sys,json; charts=json.load(sys.stdin)['charts']; [print(k) for k in charts if 'cgroup' in k or 'docker' in k.lower()]" | head -20
```

For each container, Netdata tracks CPU usage (user and system), memory usage (RSS, cache, mapped), network bytes sent and received, and disk read/write operations.

## Custom Alerts

Netdata ships with hundreds of pre-configured alerts, but you can add your own. Extract the default config and modify it.

```bash
# Copy the default health configuration out of the container
docker cp netdata:/etc/netdata/health.d/ ./health.d/

# Or edit directly inside the container
docker compose exec netdata /etc/netdata/edit-config health.d/custom.conf
```

Here is an example custom alert that fires when a Docker container uses more than 1GB of memory.

```yaml
# custom.conf - Custom Netdata health alert

# Alert when any container exceeds 1GB memory usage
alarm: container_high_memory
on: cgroup_*.mem.usage
lookup: average -1m unaligned
units: MiB
every: 30s
warn: $this > 512
crit: $this > 1024
info: Container memory usage exceeds threshold
to: sysadmin
```

## Configuring Notification Channels

Netdata can send alerts through email, Slack, PagerDuty, Telegram, Discord, and more. Edit the health alarm notify configuration.

```bash
# Edit the notification configuration
docker compose exec netdata /etc/netdata/edit-config health_alarm_notify.conf
```

For Slack notifications, set these values in the config file.

```bash
# Slack notification settings
SEND_SLACK="YES"
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
DEFAULT_RECIPIENT_SLACK="#monitoring-alerts"
```

## Streaming to a Central Parent

In multi-host environments, you can stream metrics from child Netdata instances to a central parent for unified visibility.

On the parent node, configure it to accept streaming connections.

```ini
# stream.conf on the parent - Accept incoming streams
[API_KEY_HERE]
    enabled = yes
    default history = 3600
    default memory mode = dbengine
    health enabled by default = auto
    allow from = *
```

On each child node, configure streaming to the parent.

```ini
# stream.conf on the child - Send metrics to the parent
[stream]
    enabled = yes
    destination = parent-host:19999
    api key = API_KEY_HERE
```

## Exporting Metrics to Prometheus

Netdata exposes a Prometheus-compatible endpoint, so you can scrape it with Prometheus for long-term storage.

```yaml
# prometheus.yml - Scrape Netdata metrics
scrape_configs:
  - job_name: "netdata"
    metrics_path: "/api/v1/allmetrics"
    params:
      format: ["prometheus"]
    static_configs:
      - targets: ["localhost:19999"]
```

## Performance Impact

Netdata is designed to be low-overhead despite its per-second collection. On modern hardware, it typically uses 1-3% of a single CPU core and 100-300MB of RAM. The dbengine storage backend compresses metrics efficiently, storing weeks of per-second data in a few gigabytes.

If you need to reduce resource usage further, you can increase the collection interval or disable specific collectors.

```ini
# netdata.conf - Reduce collection frequency
[global]
    update every = 2
```

## Cleanup

```bash
# Remove Netdata and all data
docker compose down -v
```

## Conclusion

Netdata provides the most detailed real-time view of your infrastructure that you can get from a single tool. Its zero-configuration approach means you get comprehensive monitoring the moment you deploy it. The Docker setup gives you full visibility into both the host system and every running container. For teams that need long-term storage, alerting workflows, and incident management beyond what Netdata provides, consider integrating with [OneUptime](https://oneuptime.com) to build a complete observability stack.
