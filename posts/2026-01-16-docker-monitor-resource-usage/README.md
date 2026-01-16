# How to Monitor Docker Container Resource Usage in Real Time

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Monitoring, DevOps, Performance, Observability

Description: Learn how to monitor Docker container CPU, memory, network, and disk I/O usage in real time using docker stats, cAdvisor, and other monitoring tools.

---

Understanding how your containers consume resources is essential for capacity planning, troubleshooting performance issues, and setting appropriate resource limits. Docker provides built-in tools for real-time monitoring, and several third-party solutions offer more advanced capabilities.

## Docker Stats: Built-in Monitoring

The `docker stats` command provides a live stream of resource usage for running containers.

```bash
# Monitor all running containers
docker stats

# Monitor specific containers
docker stats web api database

# One-time snapshot (no streaming)
docker stats --no-stream

# Custom format
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

### Understanding the Output

```
CONTAINER ID   NAME      CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O        PIDS
a1b2c3d4e5f6   web       2.34%     45.2MiB / 512MiB      8.83%     1.45MB / 892kB    12.3MB / 0B      12
b2c3d4e5f6a7   api       15.67%    234MiB / 1GiB         22.85%    45.6MB / 23.1MB   156MB / 89MB     45
c3d4e5f6a7b8   postgres  5.12%     156MiB / 2GiB         7.62%     12.3MB / 8.9MB    1.2GB / 456MB    23
```

| Column | Description |
|--------|-------------|
| CPU % | Percentage of host CPU used |
| MEM USAGE / LIMIT | Current memory / memory limit |
| MEM % | Percentage of limit used |
| NET I/O | Network received / transmitted |
| BLOCK I/O | Disk read / write |
| PIDS | Number of processes |

### Custom Output Formats

Format the output to show only what you need.

```bash
# Show only name and memory
docker stats --format "{{.Name}}: {{.MemUsage}}"

# JSON output for scripting
docker stats --format '{"name":"{{.Name}}","cpu":"{{.CPUPerc}}","memory":"{{.MemPerc}}"}' --no-stream

# Table format with specific columns
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemPerc}}\t{{.NetIO}}"
```

Available placeholders:
- `{{.Container}}` - Container ID
- `{{.Name}}` - Container name
- `{{.ID}}` - Short container ID
- `{{.CPUPerc}}` - CPU percentage
- `{{.MemUsage}}` - Memory usage
- `{{.MemPerc}}` - Memory percentage
- `{{.NetIO}}` - Network I/O
- `{{.BlockIO}}` - Block I/O
- `{{.PIDs}}` - Number of PIDs

## Docker System Commands

Get overall Docker resource usage on the host.

```bash
# Disk usage summary
docker system df

# Detailed disk usage
docker system df -v

# System-wide information
docker system info
```

Example `docker system df` output:

```
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          25        10        8.5GB     4.2GB (49%)
Containers      15        8         2.1GB     1.8GB (85%)
Local Volumes   12        5         15.3GB    8.7GB (56%)
Build Cache     45        0         3.2GB     3.2GB (100%)
```

## Inspect Container Details

Get detailed resource configuration and usage for a specific container.

```bash
# Memory limit and usage
docker inspect --format='{{.HostConfig.Memory}}' my-container

# All resource limits
docker inspect --format='
Memory Limit: {{.HostConfig.Memory}}
CPU Shares: {{.HostConfig.CpuShares}}
CPU Quota: {{.HostConfig.CpuQuota}}
CPU Period: {{.HostConfig.CpuPeriod}}
' my-container

# Current state including OOM killed status
docker inspect --format='{{.State.OOMKilled}}' my-container
```

## Monitoring with cAdvisor

cAdvisor (Container Advisor) provides detailed resource monitoring with a web UI and metrics export.

```bash
# Run cAdvisor as a container
docker run -d \
  --name cadvisor \
  --privileged \
  -p 8080:8080 \
  -v /:/rootfs:ro \
  -v /var/run:/var/run:ro \
  -v /sys:/sys:ro \
  -v /var/lib/docker/:/var/lib/docker:ro \
  gcr.io/cadvisor/cadvisor:latest
```

Access the web UI at `http://localhost:8080` to see:
- Per-container CPU, memory, network, and filesystem usage
- Historical graphs
- Container hierarchy and relationships

### cAdvisor with Docker Compose

```yaml
version: '3.8'

services:
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    privileged: true
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    restart: unless-stopped
```

## Prometheus Integration

Export Docker metrics to Prometheus for long-term storage and alerting.

### Enable Docker Metrics Endpoint

Configure the Docker daemon to expose metrics.

```json
{
  "metrics-addr": "127.0.0.1:9323",
  "experimental": true
}
```

Add this to `/etc/docker/daemon.json` and restart Docker.

### Prometheus Configuration

The following Prometheus configuration scrapes metrics from Docker and cAdvisor.

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  # Docker daemon metrics
  - job_name: 'docker'
    static_configs:
      - targets: ['localhost:9323']

  # cAdvisor metrics
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
```

### Complete Monitoring Stack with Docker Compose

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    privileged: true
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro

volumes:
  prometheus_data:
  grafana_data:
```

## Command-Line Monitoring Scripts

### Watch Container Stats

This script monitors containers and alerts when thresholds are exceeded.

```bash
#!/bin/bash
# monitor-containers.sh

# Threshold settings
CPU_THRESHOLD=80
MEM_THRESHOLD=80

while true; do
  docker stats --no-stream --format \
    "{{.Name}},{{.CPUPerc}},{{.MemPerc}}" | while IFS=',' read name cpu mem; do

    # Remove % sign and convert to number
    cpu_val=${cpu%\%}
    mem_val=${mem%\%}

    # Check thresholds
    if (( $(echo "$cpu_val > $CPU_THRESHOLD" | bc -l) )); then
      echo "WARNING: $name CPU at $cpu_val%"
    fi

    if (( $(echo "$mem_val > $MEM_THRESHOLD" | bc -l) )); then
      echo "WARNING: $name Memory at $mem_val%"
    fi
  done

  sleep 10
done
```

### Export Stats to CSV

```bash
#!/bin/bash
# export-stats.sh

OUTPUT_FILE="docker-stats-$(date +%Y%m%d-%H%M%S).csv"

echo "timestamp,container,cpu,memory,mem_percent,net_in,net_out" > "$OUTPUT_FILE"

for i in {1..60}; do
  TIMESTAMP=$(date +%Y-%m-%d_%H:%M:%S)

  docker stats --no-stream --format "{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}},{{.NetIO}}" | \
  while read line; do
    echo "$TIMESTAMP,$line" >> "$OUTPUT_FILE"
  done

  sleep 60
done
```

## Monitoring Events

Track container lifecycle events in real time.

```bash
# Watch all Docker events
docker events

# Filter for specific event types
docker events --filter 'event=start'
docker events --filter 'event=die'
docker events --filter 'event=oom'

# Watch events for specific container
docker events --filter 'container=web'

# Format output
docker events --format '{{.Time}} {{.Actor.Attributes.name}} {{.Action}}'
```

## Key Metrics to Monitor

| Metric | Warning Sign | Action |
|--------|--------------|--------|
| CPU % consistently > 80% | Container is CPU-bound | Scale horizontally or increase CPU limit |
| Memory % > 90% | Risk of OOM kill | Increase memory limit or optimize app |
| Memory % increasing over time | Memory leak | Investigate and fix application |
| High BLOCK I/O | Disk bottleneck | Use faster storage or optimize I/O |
| PIDs growing | Process leak | Investigate spawned processes |

## Summary

Docker provides multiple layers of resource monitoring:

1. **`docker stats`** - Quick real-time overview
2. **`docker system df`** - Host-level disk usage
3. **`docker events`** - Lifecycle event tracking
4. **cAdvisor** - Detailed metrics with web UI
5. **Prometheus + Grafana** - Long-term storage, visualization, and alerting

Start with `docker stats` for quick checks, and deploy a full monitoring stack (Prometheus, cAdvisor, Grafana) for production environments where historical data and alerting are essential.
