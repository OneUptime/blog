# How to Deploy the Grafana-Prometheus-Loki Stack via Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Grafana, Prometheus, Loki, Observability, Self-Hosted

Description: Deploy the complete Grafana observability stack (Grafana, Prometheus, and Loki) via Portainer for unified metrics and log monitoring in a single stack deployment.

## Introduction

Grafana, Prometheus, and Loki form the modern open-source observability stack: Prometheus for metrics collection, Loki for log aggregation, and Grafana for unified visualization of both. This guide deploys all three plus supporting agents as a single Portainer stack.

## Deploy the Complete Stack

Save the files shown below under `/opt/observability` on the Docker host, then in Portainer create a stack named `observability`:

```yaml
version: "3.8"

services:
  # Prometheus - metrics collection and storage
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=15d'
      - '--web.enable-lifecycle'
    volumes:
      - /opt/observability/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - /opt/observability/alert-rules.yml:/etc/prometheus/alert-rules.yml:ro
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    extra_hosts:
      - "host.docker.internal:host-gateway"
    networks:
      - observability
    restart: unless-stopped

  # Loki - log aggregation
  loki:
    image: grafana/loki:latest
    container_name: loki
    command: -config.file=/etc/loki/config.yaml
    volumes:
      - /opt/observability/loki-config.yaml:/etc/loki/config.yaml:ro
      - loki_data:/loki
    ports:
      - "3100:3100"
    networks:
      - observability
    restart: unless-stopped

  # Grafana - unified visualization
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin_password
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_PLUGINS_PREINSTALL=grafana-clock-panel,grafana-piechart-panel
    volumes:
      - grafana_data:/var/lib/grafana
      - /opt/observability/grafana/provisioning:/etc/grafana/provisioning:ro
      - /opt/observability/grafana/dashboards:/var/lib/grafana/dashboards:ro
    ports:
      - "3000:3000"
    depends_on:
      - prometheus
      - loki
    networks:
      - observability
    restart: unless-stopped

  # Node Exporter - host metrics
  node-exporter:
    image: quay.io/prometheus/node-exporter:latest
    container_name: node-exporter
    command:
      - '--path.rootfs=/host'
    volumes:
      - /:/host:ro,rslave
    network_mode: host
    pid: host
    restart: unless-stopped

  # cAdvisor - container metrics
  cadvisor:
    image: ghcr.io/google/cadvisor:latest
    container_name: cadvisor
    privileged: true
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:rw
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    ports:
      - "8080:8080"
    networks:
      - observability
    restart: unless-stopped

  # Grafana Alloy - log shipper
  alloy:
    image: grafana/alloy:latest
    container_name: alloy
    command:
      - 'run'
      - '--storage.path=/var/lib/alloy/data'
      - '/etc/alloy/config.alloy'
    volumes:
      - /opt/observability/alloy-config.alloy:/etc/alloy/config.alloy:ro
      - alloy_data:/var/lib/alloy/data
      - /var/run/docker.sock:/var/run/docker.sock:ro
    depends_on:
      - loki
    networks:
      - observability
    restart: unless-stopped

  # Alertmanager - alert routing
  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    command:
      - '--config.file=/etc/alertmanager/config.yml'
    volumes:
      - /opt/observability/alertmanager.yml:/etc/alertmanager/config.yml:ro
    ports:
      - "9093:9093"
    networks:
      - observability
    restart: unless-stopped

networks:
  observability:
    driver: bridge

volumes:
  prometheus_data:
  loki_data:
  grafana_data:
  alloy_data:
```

## Grafana Provisioning

Create `/opt/observability/grafana/provisioning/datasources/all.yaml`:

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    isDefault: true
    access: proxy

  - name: Loki
    type: loki
    url: http://loki:3100
    access: proxy
```

Create `/opt/observability/grafana/provisioning/dashboards/dashboards.yaml`:

```yaml
apiVersion: 1

providers:
  - name: Default
    type: file
    options:
      path: /var/lib/grafana/dashboards
    updateIntervalSeconds: 30
```

## Prometheus Configuration

Create `/opt/observability/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - "/etc/prometheus/alert-rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node'
    static_configs:
      - targets: ['host.docker.internal:9100']

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
```

Create `/opt/observability/loki-config.yaml`:

```yaml
auth_enabled: false

server:
  http_listen_port: 3100

common:
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: inmemory
  replication_factor: 1
  path_prefix: /loki

schema_config:
  configs:
    - from: 2020-05-15
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

storage_config:
  filesystem:
    directory: /loki/chunks
```

Create `/opt/observability/alloy-config.alloy`:

```alloy
discovery.docker "linux" {
  host = "unix:///var/run/docker.sock"
}

discovery.relabel "docker_logs" {
  targets = []

  rule {
    source_labels = ["__meta_docker_container_name"]
    regex         = "/(.*)"
    target_label  = "container"
  }
}

loki.source.docker "default" {
  host          = "unix:///var/run/docker.sock"
  targets       = discovery.docker.linux.targets
  labels        = {"job" = "docker"}
  relabel_rules = discovery.relabel.docker_logs.rules
  forward_to    = [loki.write.local.receiver]
}

loki.write "local" {
  endpoint {
    url = "http://loki:3100/loki/api/v1/push"
  }
}
```

Create `/opt/observability/alertmanager.yml`:

```yaml
route:
  group_by: ['alertname']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: default

receivers:
  - name: default
```

Create `/opt/observability/alert-rules.yml`:

```yaml
groups:
  - name: observability
    rules:
      - alert: InstanceDown
        expr: up == 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Instance {{ $labels.instance }} down"
          description: "{{ $labels.job }} on {{ $labels.instance }} has been unreachable for more than 5 minutes."
```

## Accessing the Stack

After deployment:

| Service | URL |
|---------|-----|
| Grafana | `http://<host>:3000` |
| Prometheus | `http://<host>:9090` |
| Alertmanager | `http://<host>:9093` |
| cAdvisor | `http://<host>:8080` |

Log in to Grafana with `admin/admin_password`, then import dashboard ID **1860** for Node Exporter metrics and explore your container logs from the Explore tab using Loki. Before relying on notifications, replace the placeholder `default` receiver in `alertmanager.yml` with your email, Slack, or webhook integration.

## Conclusion

The Grafana-Prometheus-Loki observability stack deployed via Portainer provides unified metrics and log monitoring in a single coherent deployment. Auto-provisioned data sources mean Grafana is connected to both Prometheus and Loki immediately after startup. This stack gives you metrics, logs, and working alert evaluation in one place, and you can wire Alertmanager to your preferred notification channel by updating `alertmanager.yml`.
