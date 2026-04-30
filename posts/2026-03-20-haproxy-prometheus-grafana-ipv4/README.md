# How to Monitor HAProxy IPv4 Metrics with Prometheus and Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HAProxy, Prometheus, Grafana, IPv4, Monitoring, Metric

Description: Export HAProxy statistics to Prometheus using the built-in Prometheus exporter endpoint, scrape metrics, and build Grafana dashboards for connection and traffic monitoring.

## Introduction

HAProxy 2.0+ includes a native Prometheus exporter endpoint that exposes detailed metrics about connections, traffic, backend health, and queue depths. Combined with Prometheus and Grafana, this provides comprehensive visibility into your HAProxy load balancer performance.

## Enabling Prometheus Exporter in HAProxy

```text
# /etc/haproxy/haproxy.cfg

global
    log /dev/log local0
    stats socket /run/haproxy/admin.sock mode 660 level admin

frontend prometheus_exporter
    # Prometheus scrape endpoint on monitoring network
    bind 10.0.0.5:8404
    mode http
    http-request use-service prometheus-exporter if { path /metrics }
    no log

frontend main_http
    bind 10.0.0.5:80
    mode http
    default_backend app_servers

backend app_servers
    mode http
    balance roundrobin
    server web1 10.0.1.1:80 check
    server web2 10.0.1.2:80 check
    server web3 10.0.1.3:80 check
```

```bash
# Restart HAProxy

sudo systemctl restart haproxy

# Test Prometheus endpoint
curl -s http://10.0.0.5:8404/metrics | head -30
```

## Prometheus Scrape Configuration

```yaml
# /etc/prometheus/prometheus.yml

scrape_configs:
  - job_name: 'haproxy'
    static_configs:
      - targets: ['10.0.0.5:8404']
        labels:
          environment: production
          role: load_balancer
    metrics_path: /metrics
    scrape_interval: 15s
```

## Key HAProxy Metrics

| Metric | Description |
|---|---|
| `haproxy_frontend_current_sessions` | Current frontend sessions |
| `haproxy_backend_current_sessions` | Current backend sessions |
| `haproxy_backend_connection_errors_total` | Failed backend connections |
| `haproxy_server_status` | Backend server status, with one time series per `state` label |
| `haproxy_backend_current_queue` | Current queued backend connections |
| `haproxy_frontend_bytes_in_total` | Total request bytes received |
| `haproxy_frontend_bytes_out_total` | Total response bytes sent |
| `haproxy_frontend_http_requests_total` | Total HTTP requests processed |

## Grafana Dashboard

```promql
# Active connections per frontend
haproxy_frontend_current_sessions{proxy="main_http"}

# Request rate per second
rate(haproxy_frontend_http_requests_total[5m])

# Backend server health
haproxy_server_status{state="UP"}

# HTTP error rate (4xx/5xx)
sum by (proxy) (rate(haproxy_frontend_http_responses_total{code=~"4xx|5xx"}[5m])) /
sum by (proxy) (rate(haproxy_frontend_http_requests_total[5m])) * 100

# Queue depth (indicates backend saturation)
haproxy_backend_current_queue > 0

# Backend session load
haproxy_backend_current_sessions

# Bandwidth in Mbps
rate(haproxy_frontend_bytes_in_total[5m]) * 8 / 1000000
```

## Alerting Rules

```yaml
# /etc/prometheus/rules/haproxy_alerts.yml

groups:
  - name: haproxy
    rules:
      - alert: HAProxyBackendDown
        expr: haproxy_backend_active_servers == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "HAProxy backend {{ $labels.proxy }} has no active servers"

      - alert: HAProxyHighQueueDepth
        expr: haproxy_backend_current_queue > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "HAProxy queue depth on {{ $labels.proxy }}: {{ $value }}"
```

## Conclusion

HAProxy 2.0+ exposes native Prometheus metrics at `/metrics` via a dedicated frontend. Configure a `frontend` bound to your monitoring network IP, enable it with `http-request use-service prometheus-exporter`, and run your application traffic proxies in `mode http` when you want HTTP request and response metrics. Scrape it with Prometheus using the standard `scrape_configs`. Build Grafana dashboards from `haproxy_frontend_*`, `haproxy_backend_*`, and `haproxy_server_status` metrics for complete visibility into load balancer health.
