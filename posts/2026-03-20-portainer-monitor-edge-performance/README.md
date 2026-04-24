# How to Monitor Edge Device Performance in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Edge Computing, Monitoring, DevOps

Description: Learn how to monitor CPU, memory, and container health on remote edge devices using Portainer's built-in stats and external monitoring integrations.

## Introduction

Visibility into edge device performance is critical for maintaining reliable operations. Portainer provides built-in container statistics and host details, but for long-term trending and alerting, you'll want to complement it with external monitoring. This guide covers both approaches.

## Prerequisites

- Portainer with edge environments connected
- Basic understanding of Docker container metrics
- Optional: Prometheus and Grafana for long-term monitoring

## Built-in Portainer Edge Monitoring

### Viewing Container Stats on an Edge Device

1. In Portainer, navigate to **Environments** (called **Endpoints** in older releases).
2. Click on a connected edge environment.
3. Navigate to **Containers**.
4. Click a running container, then select **Stats**.

This shows real-time:
- CPU usage percentage
- Memory usage and limit
- Network I/O (bytes in/out)
- Block I/O (disk reads/writes)

### Viewing Host-Level Details

On Docker Standalone edge environments:
1. Go to **Host > Details**.
2. View host details such as CPU count, total memory, engine details, and physical disks for the underlying host.

## Setting Up Prometheus + Grafana on Edge Devices

For persistent metrics and alerting, deploy a monitoring stack via Portainer Edge Stacks:

```yaml
# monitoring-stack.yml

# Deploy this as an Edge Stack to your monitoring group
version: "3.8"

services:
  # Node Exporter: collects host-level metrics
  node-exporter:
    image: prom/node-exporter:v1.7.0
    restart: always
    network_mode: host
    pid: host
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'

  # cAdvisor: collects container-level metrics
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:v0.47.0
    restart: always
    privileged: true
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    devices:
      - /dev/kmsg

  # Local Prometheus: scrapes and stores metrics
  prometheus:
    image: prom/prometheus:v2.51.0
    restart: always
    ports:
      - "9090:9090"
    extra_hosts:
      - "host.docker.internal=host-gateway"
    environment:
      - PORTAINER_EDGE_ID=${PORTAINER_EDGE_ID}
      - SITE=${SITE:-unknown}
    volumes:
      - prometheus_data:/prometheus
      - /etc/edge-configs:/etc/prometheus:ro
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      # Keep 15 days of local metrics
      - '--storage.tsdb.retention.time=15d'

  # Grafana: visualization
  grafana:
    image: grafana/grafana:10.3.0
    restart: always
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  prometheus_data:
  grafana_data:
```

## Prometheus Configuration for Edge

Place this at `/etc/edge-configs/prometheus.yml` on the edge device. In Portainer Business Edition, you can distribute it with Edge Configurations:

```yaml
# prometheus.yml - scrape config for edge device monitoring
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    device_id: '${PORTAINER_EDGE_ID}'
    site: '${SITE}'

rule_files:
  - /etc/prometheus/alert-rules.yml

scrape_configs:
  # Scrape host metrics from node exporter
  - job_name: 'node'
    static_configs:
      - targets: ['host.docker.internal:9100']

  # Scrape container metrics from cAdvisor
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
```

## Alerting on Edge Performance Issues

Place alerting rules at `/etc/edge-configs/alert-rules.yml`:

```yaml
# alert-rules.yml - deploy as an edge configuration
groups:
  - name: edge-device-alerts
    rules:
      # Alert if CPU usage > 85% for 5 minutes
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"

      # Alert if available memory < 200MB
      - alert: LowMemory
        expr: node_memory_MemAvailable_bytes < 200 * 1024 * 1024
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Low memory on {{ $labels.instance }}"

      # Alert if disk > 90% full
      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 < 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Low disk space on {{ $labels.instance }}"
```

## Aggregating Metrics Centrally

For fleet-wide dashboards, configure each edge Prometheus to remote-write to Grafana Cloud or another Prometheus-compatible remote write endpoint. If you use another Prometheus server as the receiver, start it with `--web.enable-remote-write-receiver`:

```yaml
# Add to prometheus.yml on edge devices
remote_write:
  - url: "https://prometheus.internal.mycompany.com/api/v1/write"
    basic_auth:
      username: edge_writer
      password: "replace-with-write-password"
    # Samples sent here include the external_labels defined above.
```

## Best Practices

- **Deploy monitoring as a baseline stack** to all edge groups from day one.
- **Use local retention** (15-30 days) to handle connectivity gaps.
- **Set memory limits** on monitoring containers to avoid starving application containers.
- **Use remote_write sparingly** - send only high-priority metrics over limited bandwidth.

## Conclusion

Portainer's built-in stats provide immediate visibility into edge container health, while a Prometheus + Grafana stack deployed via Edge Stacks gives you long-term trending, alerting, and fleet-wide dashboards. Together, these tools ensure you can detect and respond to performance issues on edge devices before they impact operations.
