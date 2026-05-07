# How to Use Podman with Prometheus for Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Prometheus, Monitoring, Metric, Observability

Description: Learn how to use Podman to run Prometheus and monitor containerized applications, collecting metrics from containers, host systems, and application endpoints.

---

> Running Prometheus in Podman containers gives you a complete monitoring stack that collects, stores, and queries metrics from your containerized applications and infrastructure.

Prometheus is the de facto standard for monitoring cloud-native applications. It scrapes metrics endpoints at regular intervals, stores time-series data efficiently, and provides a powerful query language for analysis. Running Prometheus itself inside a Podman container simplifies deployment and ensures consistency across environments. Combined with container-level metrics from Podman, you get comprehensive visibility into both your applications and their runtime environment.

---

## Running Prometheus in a Container

Start with a basic Prometheus deployment:

```bash
mkdir -p ~/prometheus/{config,data}
```

Create the Prometheus configuration:

```yaml
# ~/prometheus/config/prometheus.yml

global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node'
    static_configs:
      - targets: ['host.containers.internal:9100']

  - job_name: 'podman'
    static_configs:
      - targets: ['host.containers.internal:9882']
```

Run Prometheus:

```bash
podman run -d \
  --name prometheus \
  --restart always \
  -p 9090:9090 \
  -v ~/prometheus/config:/etc/prometheus:ro,Z \
  -v ~/prometheus/data:/prometheus:Z \
  prom/prometheus:latest \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/prometheus \
  --storage.tsdb.retention.time=30d \
  --web.enable-lifecycle
```

Access the Prometheus UI at `http://localhost:9090`.

## Monitoring the Host with Node Exporter

Add Node Exporter to collect host-level metrics:

```bash
podman run -d \
  --name node-exporter \
  --restart always \
  --pid host \
  --network host \
  -v /:/host:ro,rslave \
  quay.io/prometheus/node-exporter:latest \
  --path.rootfs=/host
```

## Exposing Podman Metrics

To expose Podman container metrics through a Prometheus exporter, enable the Podman API socket first:

```bash
# Enable Podman API socket
systemctl --user enable --now podman.socket

# Run a metrics exporter for Podman
podman run -d \
  --name podman-exporter \
  --restart always \
  -e CONTAINER_HOST=unix:///run/podman/podman.sock \
  -p 9882:9882 \
  -v $XDG_RUNTIME_DIR/podman/podman.sock:/run/podman/podman.sock \
  --userns=keep-id:uid=65534 \
  --security-opt label=disable \
  quay.io/navidys/prometheus-podman-exporter:latest \
  --collector.enhance-metrics
```

## Creating a Monitoring Stack with Compose

Deploy a monitoring stack with Compose:

```yaml
# monitoring-compose.yml
services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: always
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/config:/etc/prometheus:ro
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'

  node-exporter:
    image: quay.io/prometheus/node-exporter:latest
    container_name: node-exporter
    restart: always
    network_mode: host
    pid: host
    volumes:
      - /:/host:ro,rslave
    command:
      - '--path.rootfs=/host'

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    restart: always
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager/config:/etc/alertmanager:ro

volumes:
  prometheus-data:
```

## Instrumenting Your Application

Add Prometheus metrics to your application. Here is a Python example using the prometheus_client library:

```python
# app.py
from flask import Flask, request
from prometheus_client import (
    Counter, Histogram, Gauge,
    generate_latest, CONTENT_TYPE_LATEST
)
import time

app = Flask(__name__)

# Define metrics
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

REQUEST_DURATION = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 5.0]
)

ACTIVE_REQUESTS = Gauge(
    'http_active_requests',
    'Number of active HTTP requests'
)

@app.before_request
def before_request():
    request.start_time = time.time()
    ACTIVE_REQUESTS.inc()

@app.after_request
def after_request(response):
    duration = time.time() - request.start_time
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.path,
        status=response.status_code
    ).inc()
    REQUEST_DURATION.labels(
        method=request.method,
        endpoint=request.path
    ).observe(duration)
    ACTIVE_REQUESTS.dec()
    return response

@app.route('/metrics')
def metrics():
    return generate_latest(), 200, {'Content-Type': CONTENT_TYPE_LATEST}

@app.route('/api/data')
def get_data():
    return {'status': 'ok', 'data': [1, 2, 3]}

@app.route('/health')
def health():
    return {'status': 'healthy'}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)
```

Containerize it:

```dockerfile
FROM python:3.12-slim

RUN pip install --no-cache-dir flask prometheus_client

COPY app.py /app/app.py
WORKDIR /app

EXPOSE 3000
CMD ["python3", "app.py"]
```

Add the application to your Prometheus config:

```yaml
scrape_configs:
  - job_name: 'myapp'
    static_configs:
      - targets: ['host.containers.internal:3000']
    metrics_path: /metrics
    scrape_interval: 10s
```

## Alerting Rules

Configure Prometheus alerting rules:

```yaml
# prometheus/config/alerts.yml
groups:
  - name: container_alerts
    rules:
      - alert: ContainerHighCPU
        expr: rate(podman_container_cpu_seconds_total[5m]) > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Container {{ $labels.name }} has high CPU usage"

      - alert: ContainerHighMemory
        expr: podman_container_mem_usage_bytes / podman_container_mem_limit_bytes > 0.9
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Container {{ $labels.name }} is using >90% of memory limit"

      - alert: ContainerRestarting
        expr: changes(podman_container_started_seconds[1h]) > 3
        labels:
          severity: warning
        annotations:
          summary: "Container {{ $labels.name }} has restarted more than 3 times in the last hour"

      - alert: ApplicationHighLatency
        expr: histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m]))) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "95th percentile latency is above 1 second"
```

Reference the alerts file in your Prometheus configuration:

```yaml
rule_files:
  - "alerts.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['host.containers.internal:9093']
```

## Useful PromQL Queries

Query container and application metrics:

```promql
# CPU usage per container (last 5 minutes)
rate(podman_container_cpu_seconds_total[5m])

# Memory usage per container
podman_container_mem_usage_bytes

# HTTP request rate by endpoint
sum by (endpoint) (rate(http_requests_total[5m]))

# 95th percentile response time
histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))

# Error rate (5xx responses)
sum(rate(http_requests_total{status=~"5.."}[5m]))
/ sum(rate(http_requests_total[5m]))

# Container network I/O
rate(podman_container_net_input_total[5m])
+ rate(podman_container_net_output_total[5m])
```

## Reloading Configuration

Reload Prometheus configuration without restarting:

```bash
# Using the lifecycle API
curl -X POST http://localhost:9090/-/reload

# Or send SIGHUP to the container
podman kill --signal HUP prometheus
```

## Conclusion

Prometheus and Podman together provide a comprehensive monitoring solution for containerized environments. Running Prometheus in a container ensures your monitoring infrastructure is as portable and reproducible as the applications it monitors. With Node Exporter for host metrics, Podman exporter for container metrics, and application-level instrumentation, you get full-stack observability. Alerting rules keep you informed of issues before they impact users, and PromQL gives you the power to query and analyze metrics in any way you need.
