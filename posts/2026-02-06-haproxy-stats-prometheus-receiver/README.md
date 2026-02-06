# How to Collect HAProxy Stats Socket Metrics via the Collector Prometheus Receiver Scrape Config

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, HAProxy, Prometheus, Metrics

Description: Collect HAProxy stats socket metrics using the OpenTelemetry Collector Prometheus receiver to monitor frontends, backends, and server health.

HAProxy exposes detailed metrics about frontends, backends, and individual servers through its stats interface. The Prometheus endpoint format makes it straightforward to scrape with the OpenTelemetry Collector's Prometheus receiver. This gives you load balancer metrics alongside your application telemetry.

## Enabling the HAProxy Prometheus Endpoint

Configure HAProxy to expose a Prometheus metrics endpoint:

```
# haproxy.cfg
global
    log stdout format raw local0

defaults
    mode http
    log global
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

# Prometheus metrics endpoint
frontend stats
    bind *:8404
    http-request use-service prometheus-exporter if { path /metrics }
    stats enable
    stats uri /stats
    stats refresh 10s

frontend http_front
    bind *:80
    default_backend servers

backend servers
    balance roundrobin
    server s1 backend1:8080 check
    server s2 backend2:8080 check
```

Verify the metrics endpoint:

```bash
curl http://localhost:8404/metrics
```

## Key HAProxy Metrics

HAProxy exposes hundreds of metrics. Here are the most important ones:

```
# Frontend metrics
haproxy_frontend_current_sessions      - Active connections on frontend
haproxy_frontend_bytes_in_total        - Total bytes received
haproxy_frontend_bytes_out_total       - Total bytes sent
haproxy_frontend_http_requests_total   - Total HTTP requests
haproxy_frontend_request_errors_total  - Request errors

# Backend metrics
haproxy_backend_current_sessions       - Active connections to backend
haproxy_backend_response_time_average  - Average response time
haproxy_backend_http_responses_total   - Response count by status code
haproxy_backend_connection_errors_total - Backend connection errors

# Server metrics
haproxy_server_status                  - Server health (1=UP, 0=DOWN)
haproxy_server_current_sessions        - Active connections per server
haproxy_server_response_time_average   - Response time per server
haproxy_server_weight                  - Server weight in load balancing
```

## Collector Configuration

```yaml
# otel-collector-config.yaml
receivers:
  prometheus/haproxy:
    config:
      scrape_configs:
        - job_name: "haproxy"
          scrape_interval: 15s
          static_configs:
            - targets: ["haproxy:8404"]
          metrics_path: /metrics
          # Only keep the metrics we care about
          metric_relabel_configs:
            - source_labels: [__name__]
              regex: 'haproxy_(frontend|backend|server)_.*'
              action: keep

processors:
  batch:
    timeout: 10s
    send_batch_size: 500

  # Add resource attributes
  resource:
    attributes:
      - key: service.name
        value: haproxy
        action: upsert
      - key: service.type
        value: load-balancer
        action: upsert

  # Rename metrics to follow OpenTelemetry conventions
  metricstransform:
    transforms:
      - include: haproxy_frontend_current_sessions
        action: update
        new_name: haproxy.frontend.connections.active
      - include: haproxy_backend_response_time_average
        action: update
        new_name: haproxy.backend.response_time.avg

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [prometheus/haproxy]
      processors: [resource, metricstransform, batch]
      exporters: [otlp]
```

## Monitoring Multiple HAProxy Instances

For multiple HAProxy instances, add each as a target:

```yaml
receivers:
  prometheus/haproxy:
    config:
      scrape_configs:
        - job_name: "haproxy"
          scrape_interval: 15s
          static_configs:
            - targets:
                - "haproxy-1:8404"
                - "haproxy-2:8404"
                - "haproxy-3:8404"
              labels:
                cluster: "production"
```

Or use DNS-based service discovery:

```yaml
scrape_configs:
  - job_name: "haproxy"
    dns_sd_configs:
      - names: ["haproxy.service.consul"]
        type: SRV
        port: 8404
```

## Docker Compose Example

```yaml
version: "3.8"

services:
  haproxy:
    image: haproxy:latest
    volumes:
      - ./haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg
    ports:
      - "80:80"
      - "8404:8404"

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"

  backend1:
    image: nginx:latest

  backend2:
    image: nginx:latest
```

## Setting Up Alerts

Create alerts based on HAProxy metrics:

```yaml
# Example alert rules
# Backend server down
- alert: HAProxyServerDown
  condition: haproxy_server_status == 0
  for: 1m
  severity: critical
  message: "Server {{ server }} in backend {{ backend }} is DOWN"

# High error rate
- alert: HAProxyHighErrorRate
  condition: rate(haproxy_frontend_request_errors_total[5m]) > 10
  severity: warning

# Connection queue building up
- alert: HAProxyQueueBacklog
  condition: haproxy_backend_current_queue > 50
  for: 2m
  severity: warning

# Response time spike
- alert: HAProxySlowResponses
  condition: haproxy_backend_response_time_average > 5000
  for: 5m
  severity: warning
```

## Using the Stats Socket for Additional Data

The Prometheus endpoint covers most use cases, but the stats socket provides additional runtime information:

```bash
# Enable the stats socket
echo "stats socket /var/run/haproxy.sock mode 660 level admin" >> haproxy.cfg

# Query the socket
echo "show stat" | socat /var/run/haproxy.sock stdio
echo "show info" | socat /var/run/haproxy.sock stdio
```

For metrics not available through Prometheus, you can write a custom script that queries the stats socket and exports to the Collector:

```python
import socket
import csv
import io

def get_haproxy_stats(socket_path="/var/run/haproxy.sock"):
    """Query HAProxy stats socket and parse CSV response."""
    sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    sock.connect(socket_path)
    sock.send(b"show stat\n")

    data = b""
    while True:
        chunk = sock.recv(4096)
        if not chunk:
            break
        data += chunk

    sock.close()

    # Parse CSV response
    reader = csv.DictReader(io.StringIO(data.decode()))
    stats = list(reader)
    return stats
```

## Summary

HAProxy's built-in Prometheus exporter provides comprehensive metrics about frontends, backends, and individual servers. The OpenTelemetry Collector's Prometheus receiver scrapes these metrics at a configurable interval and exports them via OTLP. Focus on key metrics like server health status, response times, error rates, and connection counts. Use metric relabeling to filter out metrics you do not need and keep your data volume manageable.
