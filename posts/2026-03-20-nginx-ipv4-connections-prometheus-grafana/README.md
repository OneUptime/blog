# How to Monitor Nginx IPv4 Connections with Prometheus and Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, Prometheus, Grafana, IPv4, Monitoring, Observability

Description: Learn how to expose Nginx IPv4 connection metrics, scrape them with Prometheus, and visualize connection states and request rates in Grafana dashboards.

## Introduction

Monitoring Nginx connection metrics is essential for understanding traffic patterns, detecting anomalies, and capacity planning. This guide covers setting up Nginx status metrics, scraping them with Prometheus via the `nginx-prometheus-exporter`, and building a Grafana dashboard for IPv4 connection visibility.

## Prerequisites

- Nginx installed (1.18+)
- Prometheus installed and running
- Grafana installed and connected to Prometheus
- `nginx-prometheus-exporter` binary or Docker image

## Step 1: Enable Nginx Stub Status

Enable the `stub_status` module in your Nginx configuration:

```nginx
# /etc/nginx/conf.d/status.conf

server {
    listen 127.0.0.1:8080;  # Bind to loopback only for security
    server_name _;

    location /nginx_status {
        stub_status on;
        access_log off;
        allow 127.0.0.1;
        deny all;
    }
}
```

Reload Nginx:

```bash
nginx -t && systemctl reload nginx
```

Verify the status endpoint:

```bash
curl http://127.0.0.1:8080/nginx_status
```

Output:
```text
Active connections: 42
server accepts handled requests
 1234 1234 5678
Reading: 2 Writing: 10 Waiting: 30
```

## Step 2: Deploy nginx-prometheus-exporter

Run the exporter to convert stub_status metrics to Prometheus format:

```bash
# Binary
nginx-prometheus-exporter \
  --nginx.scrape-uri=http://127.0.0.1:8080/nginx_status \
  --web.listen-address=:9113
```

Or via Docker:

```bash
docker run -d \
  --name nginx-exporter \
  --network host \
  nginx/nginx-prometheus-exporter:latest \
  --nginx.scrape-uri=http://127.0.0.1:8080/nginx_status
```

The exporter exposes metrics at `http://localhost:9113/metrics`.

## Step 3: Configure Prometheus Scrape

Add the Nginx exporter to your Prometheus configuration:

```yaml
# /etc/prometheus/prometheus.yml
scrape_configs:
  - job_name: 'nginx'
    static_configs:
      - targets: ['localhost:9113']
    scrape_interval: 15s
    metrics_path: /metrics
```

Reload Prometheus:

```bash
systemctl reload prometheus
# or
curl -X POST http://localhost:9090/-/reload
```

## Step 4: Available Nginx Metrics

The exporter exposes:

| Metric | Description |
|---|---|
| `nginx_connections_active` | Current active connections |
| `nginx_connections_reading` | Connections reading request |
| `nginx_connections_writing` | Connections writing response |
| `nginx_connections_waiting` | Idle keepalive connections |
| `nginx_http_requests_total` | Total requests processed |

## Step 5: Build Grafana Dashboard

Create a new dashboard with the following panels:

### Active Connections Panel

```text
# PromQL query
nginx_connections_active
```

Panel type: Stat / Time series

### Connection States Panel

```text
# PromQL - stacked by connection state
nginx_connections_reading
nginx_connections_writing
nginx_connections_waiting
```

Panel type: Time series with stack mode

### Request Rate Panel

```text
# Requests per second (rate over 5 minute window)
rate(nginx_http_requests_total[5m])
```

Panel type: Time series

### Connection Trends Alert Panel

Set an alert when active connections exceed a threshold:

```yaml
# Prometheus alerting rule
groups:
  - name: nginx
    rules:
      - alert: NginxHighActiveConnections
        expr: nginx_connections_active > 1000
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Nginx active connections high ({{ $value }})"
```

## Step 6: Separate IPv4 and IPv6 Metrics

For servers with both IPv4 and IPv6, use separate Nginx status endpoints and exporters:

```nginx
server {
    listen 127.0.0.1:8080;  # IPv4 only
    location /nginx_status { stub_status on; }
}
```

Run separate exporters for each and label them in Prometheus:

```yaml
scrape_configs:
  - job_name: 'nginx-ipv4'
    static_configs:
      - targets: ['localhost:9113']
    relabel_configs:
      - target_label: ip_version
        replacement: ipv4
```

## Best Practices

- Bind the `stub_status` endpoint to loopback only.
- Set scrape intervals of 15-30 seconds for Nginx metrics.
- Alert on sustained high waiting connections, which may indicate keepalive misconfiguration.
- Use recording rules to pre-compute expensive queries.
- Import the community Nginx dashboard (ID: 9614) from Grafana.com for a quick start.

## Conclusion

Monitoring Nginx IPv4 connections with Prometheus and Grafana provides real-time visibility into connection states and request throughput. The `nginx-prometheus-exporter` bridges the gap between Nginx's built-in status module and the Prometheus ecosystem, enabling rich dashboards and alerting.
