# How to View Container Resource Usage in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Monitoring, Resource Usage, CPU, Memory, Performance

Description: Monitor container CPU, memory, network, and disk I/O resource usage in real time using Portainer's built-in stats view and understand how to identify resource-hungry containers.

---

Understanding how much CPU, memory, and network bandwidth your containers consume is essential for capacity planning and troubleshooting performance issues. Portainer provides real-time resource stats for every running container.

## Viewing Stats for a Single Container

1. Navigate to **Containers** in the left sidebar
2. Click on the container name to open its details
3. Select the **Stats** tab

You will see live charts for:
- **CPU usage** - percentage of host CPU consumed (can exceed 100% on multi-core)
- **Memory usage** - actual memory vs. limit (if set)
- **Network I/O** - bytes received and transmitted per second
- **Block I/O** - disk read and write bytes

## Understanding the Stats Display

The Portainer stats view mirrors `docker stats`:

```text
CONTAINER     CPU%     MEM USAGE / LIMIT     MEM%    NET I/O          BLOCK I/O
api-service   2.34%    256MiB / 512MiB       50.0%   1.5MB / 800KB    10MB / 5MB
```

- **CPU%** - a value over 100% means the container is using multiple cores
- **MEM USAGE / LIMIT** - shows actual usage vs configured limit
- **MEM%** - if no limit is set, this is percentage of total host memory

## Viewing Stats for All Containers

For a fleet view, use the Portainer API or query Docker directly:

```bash
# Real-time stats for all containers via Docker CLI

docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
```

## Identifying Resource-Heavy Containers

Sort containers by resource usage to find offenders:

```bash
# Sort by CPU usage, highest first
docker stats --no-stream --format "{{.CPUPerc}}\t{{.Name}}" | sort -rn | head -10

# Sort by memory usage (column 1 is usage, column 4 is the container name)
docker stats --no-stream --format "{{.MemUsage}}\t{{.Name}}" | \
  awk '{print $1, $4}' | sort -k1 -rh | head -10
```

## Setting Up Alerts for Resource Overuse

Deploy cAdvisor and Prometheus to get alertable metrics:

```yaml
# monitoring-stack.yml
services:
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:v0.47.2
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:rw
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    ports:
      - "8080:8080"
    restart: unless-stopped
```

Add a Prometheus alert rule:

```yaml
# alerts.yml
groups:
  - name: container-resources
    rules:
      - alert: ContainerHighMemory
        # Alert when a container uses over 90% of its memory limit
        expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.9
        for: 5m
        labels:
          severity: warning
```

## Memory Limit Enforcement

Set memory limits to protect the host from runaway containers:

```yaml
services:
  webapp:
    image: myapp:1.2.3
    deploy:
      resources:
        limits:
          memory: 512M    # Container is killed if it exceeds this
        reservations:
          memory: 128M    # Minimum guaranteed memory
```

When a container exceeds its memory limit, it receives an OOMKill. You'll see this in Portainer's container status as `OOMKilled`.

## Summary

Portainer's built-in stats view gives you immediate visibility into container resource consumption. For production monitoring, complement Portainer with cAdvisor and Prometheus to get historical data, trend analysis, and alerting for resource exhaustion before it affects service availability.
