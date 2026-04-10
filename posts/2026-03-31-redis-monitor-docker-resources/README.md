# How to Monitor Redis Docker Container Resource Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Docker, Monitoring

Description: Learn how to monitor Redis Docker container resource usage including CPU, memory, network I/O, and disk throughput using Docker stats, cAdvisor, and Prometheus.

---

Monitoring Redis container resources helps you identify when your Redis instance is memory-bound, CPU-constrained, or experiencing I/O bottlenecks. This guide covers tools and metrics for container-level resource monitoring.

## Docker Stats

Built-in Docker resource monitoring:

```bash
# Real-time stats for Redis container
docker stats redis

# Output:
# CONTAINER   CPU %   MEM USAGE / LIMIT   MEM %   NET I/O   BLOCK I/O
# redis       0.5%    512MiB / 2GiB       25.0%   1.2GB/800MB  50MB/30MB

# One-time snapshot (no stream)
docker stats redis --no-stream

# JSON output for scripting
docker stats redis --no-stream --format '{{json .}}'
```

## Resource Constraints and Monitoring

Set resource limits for predictable behavior:

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    deploy:
      resources:
        limits:
          memory: 2g
          cpus: "2.0"
        reservations:
          memory: 1g
          cpus: "0.5"
    volumes:
      - redis-data:/data
```

## Automated Resource Monitoring Script

```bash
#!/bin/bash
# monitor-redis-docker.sh
CONTAINER="${1:-redis}"
ALERT_MEMORY_PCT=80
LOG="/var/log/redis-docker-monitor.log"

while true; do
  STATS=$(docker stats "$CONTAINER" --no-stream --format \
    "{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}},{{.NetIO}},{{.BlockIO}}")

  CPU=$(echo "$STATS" | cut -d, -f1 | tr -d '%')
  MEM_PCT=$(echo "$STATS" | cut -d, -f3 | tr -d '%')
  MEM_USAGE=$(echo "$STATS" | cut -d, -f2)
  NET_IO=$(echo "$STATS" | cut -d, -f4)

  TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  echo "$TIMESTAMP cpu=${CPU}% mem=${MEM_PCT}% mem_usage=$MEM_USAGE net_io=$NET_IO" >> "$LOG"

  # Alert on high memory
  MEM_INT=$(echo "$MEM_PCT" | cut -d. -f1)
  if [ "$MEM_INT" -gt "$ALERT_MEMORY_PCT" ]; then
    echo "ALERT: Redis container memory at ${MEM_PCT}%"
  fi

  sleep 30
done
```

## cAdvisor for Container Metrics

Deploy cAdvisor for detailed container metrics:

```yaml
version: "3.8"
services:
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    ports:
      - "8080:8080"
    command:
      - --docker_only=true
```

## Prometheus Metrics from cAdvisor

Key Prometheus queries for Redis container:

```text
# Memory usage percentage
container_memory_usage_bytes{name="redis"} /
container_spec_memory_limit_bytes{name="redis"} * 100

# CPU usage rate
rate(container_cpu_usage_seconds_total{name="redis"}[5m]) * 100

# Network receive rate
rate(container_network_receive_bytes_total{name="redis"}[5m])

# Disk read/write rate
rate(container_fs_reads_bytes_total{name="redis"}[5m])
rate(container_fs_writes_bytes_total{name="redis"}[5m])
```

## Correlating Container and Redis Metrics

```bash
#!/bin/bash
echo "=== Container Resources ==="
docker stats redis --no-stream

echo ""
echo "=== Redis Application Metrics ==="
docker exec redis redis-cli INFO memory | grep -E "used_memory_human:|mem_fragmentation_ratio:"
docker exec redis redis-cli INFO stats | grep -E "total_commands_processed:|instantaneous_ops_per_sec:"
docker exec redis redis-cli INFO clients | grep connected_clients
```

## OOM Kill Detection

```bash
# Check if container was OOM killed
docker inspect redis --format='OOMKilled: {{.State.OOMKilled}}'

# Check container exit code (137 = OOM kill)
docker inspect redis --format='ExitCode: {{.State.ExitCode}}'

# System OOM log
dmesg | grep -i "oom\|killed process" | tail -10
```

## Summary

Redis Docker container monitoring should track CPU percentage, memory usage relative to container limits, network I/O for throughput, and block I/O for persistence overhead. Combine `docker stats` for quick checks with cAdvisor and Prometheus for time-series monitoring and alerting. Set explicit resource limits in your Compose files and watch for OOM kills (exit code 137) that indicate you need to increase the memory limit.
