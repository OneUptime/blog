# How to Collect Docker Metrics with cAdvisor

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, cAdvisor, Metrics, Monitoring, Observability

Description: Learn how to use cAdvisor to collect Docker container metrics including CPU, memory, network, and filesystem usage for monitoring and analysis.

---

cAdvisor (Container Advisor) provides container-level resource usage and performance metrics. This guide covers deploying cAdvisor for Docker monitoring and integrating with Prometheus.

## Basic Setup

```yaml
version: '3.8'

services:
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:v0.47.2
    privileged: true
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
```

## Volume Mounts Explained

| Path | Purpose |
|------|---------|
| /:/rootfs:ro | Access host filesystem |
| /var/run:/var/run:ro | Docker socket access |
| /sys:/sys:ro | Kernel/cgroup metrics |
| /var/lib/docker:/var/lib/docker:ro | Docker storage info |

## Prometheus Integration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
    metric_relabel_configs:
      - source_labels: [name]
        regex: '(.+)'
        target_label: container_name
```

## Key Metrics

### CPU
- `container_cpu_usage_seconds_total`
- `container_cpu_system_seconds_total`
- `container_cpu_user_seconds_total`

### Memory
- `container_memory_usage_bytes`
- `container_memory_working_set_bytes`
- `container_memory_cache`

### Network
- `container_network_receive_bytes_total`
- `container_network_transmit_bytes_total`

### Filesystem
- `container_fs_usage_bytes`
- `container_fs_reads_bytes_total`
- `container_fs_writes_bytes_total`

## Production Configuration

```yaml
version: '3.8'

services:
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:v0.47.2
    restart: unless-stopped
    privileged: true
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    command:
      - --housekeeping_interval=30s
      - --docker_only=true
      - --disable_metrics=percpu,sched,tcp,udp,disk,diskIO,hugetlb,referenced_memory
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.5'
```

## Useful PromQL Queries

```promql
# CPU usage percentage
rate(container_cpu_usage_seconds_total{name!=""}[5m]) * 100

# Memory usage percentage
container_memory_working_set_bytes / container_spec_memory_limit_bytes * 100

# Network receive rate
rate(container_network_receive_bytes_total[5m])

# Container count
count(container_last_seen{name!=""})
```

cAdvisor provides essential container metrics with minimal configuration. Integrate with Prometheus for storage and Grafana for visualization as described in our post on [Prometheus and Grafana for Docker](https://oneuptime.com/blog/post/2026-01-16-docker-prometheus-grafana/view).

