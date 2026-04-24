# How to Set Up cAdvisor for Container Metrics with Portainer - Container Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, cAdvisor, Metric, Prometheus, Monitoring

Description: Learn how to deploy cAdvisor as a Portainer stack to collect detailed container performance metrics, expose them to Prometheus, and create useful dashboards for your Docker environment.

## Introduction

cAdvisor (Container Advisor) is Google's open-source tool for analyzing resource usage and performance of running containers. It exposes detailed per-container metrics including CPU usage, memory consumption, network I/O, and disk I/O in Prometheus-compatible format. Deploying cAdvisor through Portainer gives you visibility into every container's resource usage patterns.

## Prerequisites

- Portainer CE or BE connected to a Docker Standalone environment
- Prometheus deployed (see the Prometheus/Grafana deployment guide)
- Docker host with access to system metrics

## Step 1: Deploy cAdvisor as a Portainer Stack

Navigate to **Stacks** → **Add Stack** in Portainer.

Name: `cadvisor`

```yaml
version: "3.8"

services:
  cadvisor:
    image: ghcr.io/google/cadvisor:v0.56.2
    container_name: cadvisor
    restart: unless-stopped
    privileged: true    # Required to read cgroup and hardware metrics
    devices:
      - /dev/kmsg:/dev/kmsg    # Kernel message buffer access
    volumes:
      - /:/rootfs:ro                          # Read-only root filesystem
      - /var/run:/var/run:ro                  # Docker socket area
      - /sys:/sys:ro                          # Kernel sysfs
      - /var/lib/docker/:/var/lib/docker:ro   # Docker volume data
      - /dev/disk/:/dev/disk:ro               # Disk devices
      - /etc/machine-id:/etc/machine-id:ro    # Host machine ID
    command:
      - "--housekeeping_interval=10s"         # Metric collection frequency
      - "--docker_only=true"                  # Only report Docker containers
      - "--store_container_labels=true"       # Store container labels as metric labels
      - "--disable_metrics=percpu,sched,tcp,udp"    # Reduce cardinality
    networks:
      - monitoring
    ports:
      - "127.0.0.1:8080:8080"    # Optional local host access to the cAdvisor UI and metrics

networks:
  monitoring:
    external: true
    name: monitoring
```

## Step 2: Verify cAdvisor is Running

```bash
# Check cAdvisor web UI

curl http://localhost:8080/

# Check metrics endpoint
curl -s http://localhost:8080/metrics | head -50

# Look for container-specific metrics
curl -s http://localhost:8080/metrics | grep "container_cpu_usage_seconds_total" | head -5

# Expected output:
# container_cpu_usage_seconds_total{container_label_com_docker_compose_service="nginx",...} 3.24
```

## Step 3: Configure Prometheus to Scrape cAdvisor

```yaml
# Add to prometheus.yml scrape_configs
scrape_configs:
  - job_name: "cadvisor"
    scrape_interval: 15s
    static_configs:
      - targets: ["cadvisor:8080"]    # Container name on monitoring network
    metric_relabel_configs:
      # Drop high-cardinality metrics to reduce storage
      - source_labels: [__name__]
        regex: "container_tasks_state|container_memory_failures_total"
        action: drop
      # Only keep Docker Compose-managed containers
      - source_labels: [container_label_com_docker_compose_service]
        regex: ""
        action: drop
```

```bash
# Reload Prometheus configuration (requires --web.enable-lifecycle)
curl -X POST http://localhost:9090/-/reload

# Verify cAdvisor target is up
curl -s http://localhost:9090/api/v1/targets | \
  jq '.data.activeTargets[] | select(.labels.job=="cadvisor") | {health, lastError}'
```

## Step 4: Key cAdvisor Metrics

```text
CPU Metrics:
  container_cpu_usage_seconds_total     - Total CPU time used
  container_cpu_system_seconds_total    - CPU time in kernel space
  container_cpu_user_seconds_total      - CPU time in user space

Memory Metrics:
  container_memory_usage_bytes          - Current memory usage (including cache)
  container_memory_working_set_bytes    - Current working set memory
  container_spec_memory_limit_bytes     - Configured memory limit for the container
  container_memory_rss                  - RSS memory (actual in-use memory)

Network Metrics:
  container_network_receive_bytes_total    - Bytes received
  container_network_transmit_bytes_total   - Bytes transmitted
  container_network_receive_errors_total   - Receive errors

Disk I/O Metrics:
  container_fs_reads_bytes_total     - Bytes read from filesystem
  container_fs_writes_bytes_total    - Bytes written to filesystem
```

## Step 5: Useful Prometheus Queries

```promql
# CPU usage per container (CPU cores used, rate over 5 minutes)
rate(container_cpu_usage_seconds_total{image!=""}[5m])

# Top 5 containers by memory usage
topk(5, container_memory_working_set_bytes{image!=""})

# Memory usage as percentage of limit
container_memory_working_set_bytes{image!=""} / container_spec_memory_limit_bytes{image!=""} * 100

# Network receive rate (bytes per second)
rate(container_network_receive_bytes_total[5m])

# Containers using more than 80% of their memory limit
(container_memory_working_set_bytes{image!=""} / container_spec_memory_limit_bytes{image!=""}) > 0.8
```

## Step 6: Import cAdvisor Grafana Dashboard

In Grafana, go to **Dashboards** → **New** → **Import dashboard**, paste dashboard ID `21743`, select your Prometheus data source, and click **Import**.

The dashboard shows:
- CPU usage per container
- Memory usage per container
- Memory cached per container
- Network traffic per container
- Container restarts

## Step 7: Alert on Container Resource Issues

```yaml
# Add to prometheus.yml under rule_files section
# Create /opt/monitoring/alerts.yml:

groups:
  - name: container_alerts
    rules:
      # Alert if container uses > 90% of its memory limit
      - alert: ContainerMemoryHigh
        expr: (container_memory_working_set_bytes{image!=""} / container_spec_memory_limit_bytes{image!=""}) > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Container {{ $labels.name }} memory usage above 90%"
          description: "Container is using {{ $value | humanizePercentage }} of its memory limit"

      # Alert if container restarts repeatedly
      - alert: ContainerFrequentRestarts
        expr: changes(container_start_time_seconds{image!=""}[1h]) > 3
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Container {{ $labels.name }} is restarting frequently"
```

## Conclusion

cAdvisor provides deep per-container metrics that are essential for understanding resource consumption in Portainer-managed environments. The key metrics to monitor are `container_memory_working_set_bytes` (working set memory), CPU rate calculations, and network I/O. Deploy with `--docker_only=true` and selective metric disabling to reduce Prometheus storage requirements, and use the Grafana dashboard import to quickly visualize container performance without building dashboards from scratch.
