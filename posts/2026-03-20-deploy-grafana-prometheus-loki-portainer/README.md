# How to Deploy the Grafana-Prometheus-Loki Stack via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Grafana, Prometheus, Loki, Observability

Description: Learn how to deploy the complete Grafana observability stack (Grafana, Prometheus, Loki, Promtail, Node Exporter, cAdvisor) as a single Portainer stack for metrics, logs, and dashboards.

## The Modern Observability Stack

```bash
Metrics: Node Exporter + cAdvisor → Prometheus → Grafana
Logs:    Promtail (Docker logs)   → Loki       → Grafana
                                               ↑
                                    Single pane of glass
```

## Complete Stack via Portainer

**Stacks → Add Stack → observability**

```yaml
version: "3.8"

services:
  prometheus:
    image: prom/prometheus:latest
    restart: unless-stopped
    ports:
      - "9090:9090"
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'
      - '--web.enable-lifecycle'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus

  loki:
    image: grafana/loki:3.0.0
    restart: unless-stopped
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml
    volumes:
      - loki_data:/loki

  promtail:
    image: grafana/promtail:3.0.0
    restart: unless-stopped
    command: -config.file=/etc/promtail/config.yml
    volumes:
      - ./promtail-config.yml:/etc/promtail/config.yml:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /run/docker.sock:/run/docker.sock:ro

  node-exporter:
    image: prom/node-exporter:latest
    restart: unless-stopped
    pid: host
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    restart: unless-stopped
    privileged: true
    devices:
      - /dev/kmsg
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro

  grafana:
    image: grafana/grafana:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana-provisioning:/etc/grafana/provisioning:ro

volumes:
  prometheus_data:
  loki_data:
  grafana_data:
```

## Prometheus Configuration

```yaml
# prometheus.yml

global:
  scrape_interval: 15s

scrape_configs:
  - job_name: node-exporter
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: cadvisor
    static_configs:
      - targets: ['cadvisor:8080']

  - job_name: prometheus
    static_configs:
      - targets: ['localhost:9090']
```

## Grafana Provisioning: Auto-Configure Data Sources

```yaml
# grafana-provisioning/datasources/datasources.yml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    isDefault: true
  - name: Loki
    type: loki
    url: http://loki:3100
```

## Auto-Import Dashboards

```yaml
# grafana-provisioning/dashboards/dashboards.yml
apiVersion: 1
providers:
  - name: default
    type: file
    options:
      path: /etc/grafana/provisioning/dashboards
```

Download community dashboards into `grafana-provisioning/dashboards/`:
- `1860` - Node Exporter Full
- `14282` - cAdvisor Container Metrics
- `13639` - Loki Log Dashboard

## Accessing the Stack

| Service | URL |
|---------|-----|
| Grafana | `http://server:3000` |
| Prometheus | `http://server:9090` |
| Loki API | `http://server:3100` |

## Conclusion

The Grafana-Prometheus-Loki observability stack via Portainer provides full-stack observability: CPU/memory/disk metrics from Node Exporter and cAdvisor, container logs from Promtail/Loki, and unified visualization in Grafana. All components are managed as a single Portainer stack, making updates, restarts, and log viewing consistent across the entire observability platform.
