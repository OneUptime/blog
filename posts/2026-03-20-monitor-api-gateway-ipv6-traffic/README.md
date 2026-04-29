# How to Monitor API Gateway IPv6 Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Gateway, IPv6, Monitoring, Prometheus, Grafana, Observability

Description: Set up monitoring dashboards and alerting for IPv6 traffic flowing through your API gateway using Prometheus, Grafana, and access log analysis.

## Introduction

Monitoring IPv6 API gateway traffic separately from IPv4 helps you detect asymmetric failures, IPv6-specific latency, and adoption rates. This guide covers log-based analysis, Prometheus metrics, and Grafana dashboards.

## Step 1: Parse IPv6 Addresses in NGINX Access Logs

Configure NGINX to log the full client address and IP version.

```nginx
# nginx.conf - custom log format capturing IP version

log_format api_extended '$remote_addr [$time_local] '
                         '"$request" $status $body_bytes_sent '
                         '"$http_referer" "$http_user_agent" '
                         '$request_time $upstream_response_time '
                         '$upstream_addr';

server {
    access_log /var/log/nginx/api_access.log api_extended;
}
```

Parse and count IPv6 vs IPv4 requests:

```bash
# Count IPv6 requests (client address - first field - contains a colon)
awk '$1 ~ /:/' /var/log/nginx/api_access.log | wc -l

# Count IPv4 requests
awk '$1 ~ /^[0-9]+\./' /var/log/nginx/api_access.log | wc -l

# Top 10 IPv6 client prefixes (/64)
awk '{print $1}' /var/log/nginx/api_access.log | \
  grep ':' | \
  awk -F: 'BEGIN{OFS=":"}{print $1,$2,$3,$4,"::/64"}' | \
  sort | uniq -c | sort -rn | head -10
```

## Step 2: Expose Prometheus Metrics from Kong

Kong's Prometheus plugin exposes per-route metrics for status codes, latency, and bandwidth. It does not natively label metrics by IP family, so we add that dimension via custom middleware in the next step.

```bash
# Enable Prometheus plugin on Kong globally
curl -X POST http://[::1]:8001/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "name": "prometheus",
    "config": {
      "per_consumer": true,
      "status_code_metrics": true,
      "latency_metrics": true,
      "bandwidth_metrics": true,
      "upstream_health_metrics": true
    }
  }'
```

## Step 3: Add Custom IPv6 Metrics with OpenTelemetry

```python
# otel_middleware.py - add IPv6 metric labels in a Python API
import ipaddress
from opentelemetry import metrics

meter = metrics.get_meter("api-gateway")

request_counter = meter.create_counter(
    "api_requests_total",
    description="Total API requests by IP version"
)

request_latency = meter.create_histogram(
    "api_request_latency_ms",
    description="API request latency in milliseconds by IP version",
    unit="ms"
)

def get_ip_version(ip: str) -> str:
    """Return 'ipv6' or 'ipv4' for a given address string."""
    try:
        addr = ipaddress.ip_address(ip)
        return "ipv6" if isinstance(addr, ipaddress.IPv6Address) else "ipv4"
    except ValueError:
        return "unknown"

def track_request(client_ip: str, route: str, status: int, latency_ms: float):
    ip_version = get_ip_version(client_ip)
    attrs = {
        "ip_version": ip_version,
        "route": route,
        "status": str(status)
    }
    request_counter.add(1, attrs)
    request_latency.record(latency_ms, attrs)
```

## Step 4: Grafana Dashboard - IPv6 Traffic Panel

Create a Grafana dashboard panel using PromQL to visualize IPv6 traffic share.

```promql
# Requests per second split by IP version (custom OpenTelemetry metric)
sum(rate(api_requests_total[5m])) by (ip_version)

# IPv6 traffic percentage
(
  sum(rate(api_requests_total{ip_version="ipv6"}[5m]))
  /
  sum(rate(api_requests_total[5m]))
) * 100

# P99 latency for IPv6 requests
histogram_quantile(0.99,
  sum(rate(api_request_latency_ms_bucket{ip_version="ipv6"}[5m]))
  by (le, route)
)
```

## Step 5: Alert on IPv6 Error Rate Spike

```yaml
# prometheus-alerts.yaml
groups:
  - name: ipv6-api-alerts
    rules:
      - alert: IPv6ErrorRateHigh
        expr: |
          (
            sum(rate(api_requests_total{status=~"5..",ip_version="ipv6"}[5m]))
            /
            sum(rate(api_requests_total{ip_version="ipv6"}[5m]))
          ) > 0.05
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "IPv6 API error rate above 5%"
          description: "IPv6 5xx rate is {{ $value | humanizePercentage }}"
```

## Conclusion

Effective IPv6 API gateway monitoring requires tagging metrics by IP version so you can compare latency, error rates, and traffic share between IPv4 and IPv6. Setting up these dashboards in Grafana alongside OneUptime's synthetic checks gives you both black-box and white-box visibility into IPv6 API health.
