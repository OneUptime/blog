# How to Self-Host a Monitoring Stack with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Monitoring, Prometheus, Grafana, Self-Hosted, Observability

Description: Deploy a complete monitoring stack with Prometheus, Grafana, and Node Exporter using Portainer to observe your home lab infrastructure.

## Introduction

A monitoring stack gives you real-time visibility into your infrastructure's health - CPU, memory, disk, network, and container metrics. This guide deploys the industry-standard Prometheus + Grafana stack, along with Node Exporter for host metrics and cAdvisor for container metrics, all managed through Portainer.

## Prerequisites

- Portainer installed and running
- Basic knowledge of Docker networking
- At least 1GB RAM for the monitoring stack

## Step 1: Deploy the Complete Monitoring Stack

```yaml
# docker-compose.yml - Complete Monitoring Stack

version: "3.8"

networks:
  monitoring_network:
    driver: bridge

volumes:
  prometheus_data:
  grafana_data:
  alertmanager_data:

services:
  # Prometheus - metrics collection and storage
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"
      # Retain 15 days of metrics
      - "--storage.tsdb.retention.time=15d"
      - "--web.enable-lifecycle"
    volumes:
      - /opt/monitoring/prometheus:/etc/prometheus
      - prometheus_data:/prometheus
    networks:
      - monitoring_network
    depends_on:
      - node_exporter
      - cadvisor

  # Grafana - visualization and dashboards
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      # Change admin credentials
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=secure_grafana_password
      - GF_USERS_ALLOW_SIGN_UP=false
      # Anonymous access for read-only dashboards
      - GF_AUTH_ANONYMOUS_ENABLED=false
      # SMTP for alerts
      - GF_SMTP_ENABLED=true
      - GF_SMTP_HOST=smtp.gmail.com:587
      - GF_SMTP_USER=your-email@gmail.com
      - GF_SMTP_PASSWORD=your-app-password
      - GF_SMTP_FROM_ADDRESS=grafana@yourdomain.com
    volumes:
      - grafana_data:/var/lib/grafana
      - /opt/monitoring/grafana/provisioning:/etc/grafana/provisioning
    networks:
      - monitoring_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.grafana.rule=Host(`grafana.yourdomain.com`)"
      - "traefik.http.routers.grafana.entrypoints=websecure"
      - "traefik.http.routers.grafana.tls.certresolver=letsencrypt"
      - "traefik.http.services.grafana.loadbalancer.server.port=3000"

  # Node Exporter - host system metrics
  node_exporter:
    image: prom/node-exporter:latest
    container_name: node_exporter
    restart: unless-stopped
    ports:
      - "9100:9100"
    command:
      - "--path.rootfs=/host"
      # Enable additional collectors
      - "--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)"
    volumes:
      # Read-only access to host filesystem
      - /:/host:ro,rslave
    networks:
      - monitoring_network
    pid: host

  # cAdvisor - container resource metrics
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: cadvisor
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:rw
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    privileged: true
    devices:
      - /dev/kmsg:/dev/kmsg
    networks:
      - monitoring_network

  # Alertmanager - alert routing
  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    restart: unless-stopped
    ports:
      - "9093:9093"
    volumes:
      - /opt/monitoring/alertmanager:/etc/alertmanager
      - alertmanager_data:/alertmanager
    command:
      - "--config.file=/etc/alertmanager/alertmanager.yml"
    networks:
      - monitoring_network
```

## Step 2: Configure Prometheus

```yaml
# /opt/monitoring/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

# Load alert rules
rule_files:
  - "alerts/*.yml"

# Scrape targets
scrape_configs:
  # Prometheus self-monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Host metrics
  - job_name: 'node_exporter'
    static_configs:
      - targets: ['node_exporter:9100']

  # Container metrics
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']

  # Portainer metrics (if available)
  - job_name: 'portainer'
    static_configs:
      - targets: ['portainer:9000']
    metrics_path: '/metrics'

  # Additional services
  - job_name: 'services'
    static_configs:
      - targets:
          - 'nginx:9113'
          - 'postgres_exporter:9187'
          - 'redis_exporter:9121'
```

## Step 3: Configure Alertmanager

```yaml
# /opt/monitoring/alertmanager/alertmanager.yml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alertmanager@yourdomain.com'
  smtp_auth_username: 'your-email@gmail.com'
  smtp_auth_password: 'your-app-password'

# Alert routing rules
route:
  group_by: ['alertname', 'cluster']
  group_wait: 10s
  group_interval: 10m
  repeat_interval: 1h
  receiver: 'email-alerts'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'

receivers:
  - name: 'email-alerts'
    email_configs:
      - to: 'admin@yourdomain.com'
        send_resolved: true

  - name: 'slack-alerts'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/T.../B.../...'
        channel: '#alerts'
        send_resolved: true

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'your-pagerduty-integration-key'
        send_resolved: true
```

## Step 4: Create Alert Rules

```yaml
# /opt/monitoring/prometheus/alerts/host.yml
groups:
  - name: host_alerts
    rules:
      # High CPU usage
      - alert: HighCpuUsage
        expr: 100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is {{ $value }}%"

      # Low disk space
      - alert: LowDiskSpace
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 < 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Low disk space on {{ $labels.instance }}"
          description: "{{ $labels.mountpoint }} has {{ $value }}% free"

      # Container restart
      - alert: ContainerRestarting
        expr: changes(container_start_time_seconds{name!=""}[15m]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Container {{ $labels.name }} is restarting"
```

## Step 5: Import Grafana Dashboards

Import popular community dashboards:

1. Go to Grafana > **Dashboards** > **Import**
2. Enter dashboard ID from grafana.com

```bash
Dashboard IDs to import:
- 1860  → Node Exporter Full (host metrics)
- 893   → Docker and system monitoring
- 11600 → Docker Container & Host Metrics
```

## Step 6: Auto-Provision Grafana Datasources

```yaml
# /opt/monitoring/grafana/provisioning/datasources/prometheus.yml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
```

## Conclusion

Your home lab now has enterprise-grade monitoring with Prometheus and Grafana. You can visualize CPU, memory, disk, and network metrics across all hosts and containers, set up alerts for critical thresholds, and share dashboards with your team. Portainer makes it easy to update these monitoring containers and verify their health status. The monitoring stack itself takes about 200-500MB of memory while providing invaluable visibility into your infrastructure.
