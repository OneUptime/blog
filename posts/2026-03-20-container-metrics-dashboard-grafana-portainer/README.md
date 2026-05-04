# How to Build a Container Metrics Dashboard with Grafana and Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Grafana, Prometheus, Docker, Monitoring, Dashboard

Description: Learn how to deploy Prometheus and Grafana alongside Portainer to build a container metrics dashboard with real-time visualizations.

---

Combining Portainer, Prometheus, and Grafana gives you a complete container observability stack - Portainer for management, Prometheus for metrics collection, and Grafana for visualization.

---

## Deploy the Observability Stack via Portainer

Create a new stack in Portainer (**Stacks** → **Add stack**):

```yaml
version: "3.8"

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - prometheus-data:/prometheus
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.retention.time=15d"

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=changeme
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on:
      - prometheus

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: cadvisor
    restart: unless-stopped
    privileged: true
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    expose:
      - "8080"

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    restart: unless-stopped
    pid: host
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - "--path.procfs=/host/proc"
      - "--path.sysfs=/host/sys"
      - "--path.rootfs=/rootfs"
      - "--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)"
    expose:
      - "9100"

volumes:
  prometheus-data:
  grafana-data:
```

---

## Prometheus Configuration

```yaml
# prometheus.yml (stored next to docker-compose or as a volume)

global:
  scrape_interval: 15s

scrape_configs:
  - job_name: cadvisor
    static_configs:
      - targets: ["cadvisor:8080"]

  - job_name: node
    static_configs:
      - targets: ["node-exporter:9100"]
```

---

## Import a Grafana Dashboard

1. Open Grafana at `http://<host>:3000`
2. Go to **Dashboards** → **Import**
3. Enter dashboard ID `14282` (Docker and system monitoring) or `1860` (Node Exporter)
4. Select the Prometheus data source and click **Import**

---

## Key Metrics Panels to Build

```promql
# Container CPU usage rate
rate(container_cpu_usage_seconds_total{name!=""}[5m]) * 100

# Container memory usage
container_memory_usage_bytes{name!=""} / 1024 / 1024

# Network receive bytes per second
rate(container_network_receive_bytes_total{name!=""}[5m])

# Running containers count
count(container_last_seen{name!=""})
```

---

## Summary

Deploy Prometheus, cAdvisor, Node Exporter, and Grafana as a Portainer stack. Configure Prometheus to scrape cAdvisor for container metrics and Node Exporter for host metrics. Import community dashboards in Grafana (IDs 14282 or 1860) to immediately visualize container CPU, memory, network, and disk usage.
