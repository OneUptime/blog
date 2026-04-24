# How to Deploy Prometheus and Grafana via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Prometheus, Grafana, Monitoring, Metric

Description: Learn how to deploy a complete Prometheus and Grafana monitoring stack via Portainer to collect and visualize metrics from your Docker host and containers.

## Overview

Prometheus scrapes metrics from exporters and services. Grafana visualizes those metrics with dashboards. Together they form the most popular open-source monitoring stack for containerized environments.

## Architecture

```bash
Docker Host → Node Exporter → Prometheus (scrape) → Grafana (query + display)
Containers  → cAdvisor     ↗
Applications → /metrics    ↗
```

## Deploy the Stack in Portainer

Go to **Stacks → Add Stack** and paste:

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    restart: unless-stopped
    volumes:
      - prometheus_data:/prometheus
      - /opt/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    ports:
      - "9090:9090"
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    restart: unless-stopped
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
    ports:
      - "3000:3000"
    networks:
      - monitoring
    depends_on:
      - prometheus

  node-exporter:
    image: prom/node-exporter:latest
    restart: unless-stopped
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - monitoring

  cadvisor:
    image: ghcr.io/google/cadvisor:v0.55.0
    restart: unless-stopped
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    privileged: true
    devices:
      - /dev/kmsg
    networks:
      - monitoring

volumes:
  prometheus_data:
  grafana_data:

networks:
  monitoring:
    name: monitoring
```

## Prometheus Configuration

Create `/opt/monitoring/prometheus.yml` on the Docker host before deploying:

```yaml
# prometheus.yml

global:
  scrape_interval: 15s
  evaluation_interval: 15s

storage:
  tsdb:
    retention:
      time: 30d

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
```

## Setting Environment Variables

In Portainer's stack editor, under **Environment Variables**:

```text
GRAFANA_PASSWORD=a-strong-password
```

## Accessing the Services

After deployment:
- Prometheus: `http://server:9090`
- Grafana: `http://server:3000` (admin / the value you set for `GRAFANA_PASSWORD`)

## Configuring Grafana

1. **Add Data Source**: Prometheus URL = `http://prometheus:9090`
2. **Import Dashboards**:
   - Dashboard ID `1860` - Node Exporter Full
   - Dashboard ID `893` - Docker and System Monitoring

## Conclusion

This Prometheus + Grafana + cAdvisor + Node Exporter stack deployed via Portainer gives you comprehensive monitoring of both the Docker host and all containers within minutes. Portainer's stack management lets you update, restart, and view logs for all monitoring components from a single interface.
