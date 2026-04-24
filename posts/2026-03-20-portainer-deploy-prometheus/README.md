# How to Deploy Prometheus via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Prometheus, Monitoring, Metric, Self-Hosted

Description: Deploy Prometheus via Portainer with persistent storage, scrape configuration for common targets, and alert rules for infrastructure monitoring.

## Introduction

Prometheus is a leading open-source monitoring and alerting system that collects metrics from configured targets, stores them in a time-series database, and evaluates alert rules. Deploying via Portainer with configuration files stored on the Docker host makes it easy to manage scrape targets and alert rules.

## Deploy as a Stack

In Portainer, create a stack named `prometheus` and bind configuration files from the Docker host (for example, `/opt/prometheus`):

```yaml
version: "3.8"

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.enable-lifecycle'              # Allow config reload via API
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
    extra_hosts:
      - 'host.docker.internal:host-gateway'
    volumes:
      - /opt/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - /opt/prometheus/rules:/etc/prometheus/rules:ro
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:9090/-/healthy || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 3

  # Node Exporter for host metrics
  node-exporter:
    image: quay.io/prometheus/node-exporter:latest
    container_name: node-exporter
    command:
      - '--path.rootfs=/host'
      - '--collector.filesystem.mount-points-exclude=^/(dev|proc|sys|var/lib/docker/.+|var/lib/kubelet/.+)($$|/)'
    volumes:
      - /:/host:ro,rslave
    network_mode: host
    pid: host
    restart: unless-stopped

  # cAdvisor for container metrics
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: cadvisor
    privileged: true
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:rw
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    ports:
      - "8080:8080"
    restart: unless-stopped

volumes:
  prometheus_data:
```

## Prometheus Configuration

Create `/opt/prometheus/prometheus.yml` on the Docker host:

```yaml
# prometheus.yml - global configuration

global:
  scrape_interval: 15s      # Default scrape interval
  evaluation_interval: 15s  # Rule evaluation interval
  
  # External labels added to metrics
  external_labels:
    datacenter: home-lab
    environment: production

# Load alert rules
rule_files:
  - "/etc/prometheus/rules/*.yml"

# TSDB retention configuration
storage:
  tsdb:
    retention:
      time: 30d
      size: 10GB

# Optional Alertmanager configuration
# alerting:
#   alertmanagers:
#     - static_configs:
#         - targets: ['alertmanager:9093']

# Scrape configurations
scrape_configs:
  # Prometheus self-monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Node Exporter (host metrics)
  - job_name: 'node'
    static_configs:
      - targets:
          - 'host.docker.internal:9100'
          - '192.168.1.11:9100'
          - '192.168.1.12:9100'

  # cAdvisor (container metrics)
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']

  # Optional application metrics via HTTP
  # - job_name: 'myapp'
  #   metrics_path: /metrics
  #   static_configs:
  #     - targets: ['myapp:8000']
  #   relabel_configs:
  #     - source_labels: [__address__]
  #       target_label: instance

  # Optional Blackbox Exporter (external URL monitoring)
  # - job_name: 'blackbox'
  #   metrics_path: /probe
  #   params:
  #     module: [http_2xx]
  #   static_configs:
  #     - targets:
  #         - https://example.com
  #         - https://api.example.com/health
  #   relabel_configs:
  #     - source_labels: [__address__]
  #       target_label: __param_target
  #     - source_labels: [__param_target]
  #       target_label: instance
  #     - target_label: __address__
  #       replacement: blackbox-exporter:9115
```

## Alert Rules

Create `/opt/prometheus/rules/host-alerts.yml` on the Docker host:

```yaml
groups:
  - name: host
    rules:
      - alert: InstanceDown
        expr: up == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Host {{ $labels.instance }} is down"

      - alert: HighCPU
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 90
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High CPU on {{ $labels.instance }}: {{ $value }}%"

      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 < 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Low disk space on {{ $labels.instance }}: {{ $value }}%"
```

## Querying Prometheus

```bash
# Query via HTTP API
curl 'http://localhost:9090/api/v1/query?query=node_memory_MemAvailable_bytes'

# Range query (last 1 hour with 15s step)
curl -G 'http://localhost:9090/api/v1/query_range' \
  --data-urlencode 'query=rate(http_requests_total[5m])' \
  --data-urlencode "start=$(($(date +%s)-3600))" \
  --data-urlencode "end=$(date +%s)" \
  --data-urlencode 'step=15s'

# Reload configuration without restart
curl -X POST http://localhost:9090/-/reload
```

## Conclusion

Prometheus deployed via Portainer provides a robust monitoring foundation for your infrastructure. The configuration-file approach makes it easy to add new scrape targets and alert rules without container restarts (using the live reload API). Combined with Grafana for visualization and Alertmanager for notifications, it forms a complete observability stack.
