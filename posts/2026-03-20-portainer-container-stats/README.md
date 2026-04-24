# How to Monitor Container CPU and Memory Stats in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Monitoring, DevOps

Description: Learn how to view real-time CPU, memory, network, and disk I/O statistics for Docker containers using Portainer's built-in stats view.

## Introduction

Portainer includes a real-time container statistics view powered by Docker's stats API. This gives you instant visibility into CPU usage, memory consumption, network traffic, and disk I/O for any running container - directly in the web browser, without needing external monitoring tools.

## Prerequisites

- Portainer installed with a connected Docker environment
- A running container to monitor

## Step 1: Access Container Stats

1. Navigate to **Containers** in Portainer.
2. Click on a container name.
3. Click the **Stats** button at the top of the container details page.

## Step 2: Understand the Stats Display

The stats view shows real-time metrics refreshing every few seconds:

### CPU Usage

```text
CPU Usage: 12.4%

# This represents the container's CPU usage as a percentage
# of the host's CPU capacity
# On multi-core hosts, this can exceed 100%
# For a 4-core host: 400% CPU = using all 4 cores fully
# For a 2-CPU limit: 200% CPU = using both allocated CPUs fully
```

### Memory Usage

```text
Memory Usage: 256 MiB / 512 MiB  (50%)

# "256 MiB" = memory currently in use by the container
# "512 MiB" = memory limit set for the container
# "(50%)" = percentage of limit in use

# If no limit is set:
Memory Usage: 256 MiB / 62.9 GiB (0.4%)  (shows total host RAM)
```

### Network I/O

```text
Network I/O: 1.2 GB / 450 MB
# "1.2 GB" = data received (inbound)
# "450 MB" = data transmitted (outbound)
# These are cumulative since container start
```

### Block I/O (Disk)

```text
Block I/O: 2.5 GB / 1.1 GB
# "2.5 GB" = data read from disk
# "1.1 GB" = data written to disk
# Cumulative since container start
```

## Step 3: Reading Stats Over Time

The Portainer stats view shows real-time values but doesn't persist history. For trend analysis, you need external tools. But for quick spot checks:

```bash
# Docker CLI: view stats for all running containers:
docker stats

# View stats for specific containers:
docker stats web-server database redis

# One-time snapshot (not live):
docker stats --no-stream

# Custom format:
docker stats --no-stream \
  --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"

# Output example:
NAME          CPU %   MEM USAGE / LIMIT   NET I/O        BLOCK I/O
web-server    2.1%    128MiB / 512MiB     1.2GB / 450MB  2.5GB / 1.1GB
database      15.3%   2.1GiB / 4GiB       250MB / 180MB  45GB / 12GB
redis         0.3%    45MiB / 256MiB      5.2MB / 3.1MB  0B / 0B
```

## Step 4: Identify Resource Issues

### High CPU Usage

If CPU usage is consistently high relative to the number of CPUs available to the container:

1. Check if the container has a CPU limit - it may be throttled.
2. Look for infinite loops or high-load queries.
3. Consider adding a CPU limit to prevent starvation of other containers.
4. Scale horizontally if one container can't keep up.

```yaml
# Add CPU limit to prevent runaway CPU:
services:
  app:
    image: myorg/app:latest
    cpus: 2.0    # Limit to 2 CPU cores
```

### Memory Growing Over Time (Possible Memory Leak)

```bash
# Monitor memory over time:
while true; do
  docker stats --no-stream --format "{{.Name}} {{.MemUsage}}" my-app
  sleep 30
done

# If memory grows continuously under a similar workload, the app may have a memory leak
```

Actions:
1. Set a memory limit so the container can be killed if it exceeds the limit, and add a restart policy if you want it to restart automatically.
2. File a bug with the application team.
3. Schedule periodic restarts as a workaround.

### High Network I/O

High network traffic may indicate:
- Unexpected data processing (check what's being transferred)
- A monitoring or logging agent that's too verbose
- DDoS or unexpected traffic

### High Block I/O

Excessive disk I/O may indicate:
- Database not using enough memory (increase `shared_buffers`)
- Log rotation not configured (logs filling disk)
- Excessive swapping (add more memory or increase swap limit)

## Step 5: Setting Up Persistent Monitoring

For historical data and alerting, deploy Prometheus + Grafana alongside cAdvisor:

```yaml
# monitoring-stack.yml
services:
  cadvisor:
    image: ghcr.io/google/cadvisor:v0.55.1
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    privileged: true
    devices:
      - /dev/kmsg:/dev/kmsg

  prometheus:
    image: prom/prometheus:v3.11.2
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus

  grafana:
    image: grafana/grafana:13.0.1
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  prometheus_data:
  grafana_data:
```

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
```

With Grafana's Docker dashboard, you get historical CPU, memory, network, and I/O graphs for all containers.

## Step 6: Resource Utilization Baseline

Before setting limits, observe baseline utilization:

```bash
# Monitor for 5 minutes, sample every 10 seconds
for i in $(seq 30); do
  docker stats --no-stream --format \
    "{{.CPUPerc}}\t{{.MemUsage}}" my-app
  sleep 10
done
```

Use the 95th percentile values to set your resource limits with a safety margin.

## Conclusion

Portainer's real-time stats view provides immediate visibility into container resource usage for spot-checking and debugging. For production environments, complement it with Prometheus and Grafana for historical trending, alerting, and fleet-wide dashboards. Understanding CPU throttling, memory leak patterns, and I/O bottlenecks through stats helps you right-size resource limits and catch performance issues before they impact users.
