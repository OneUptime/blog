# How to Monitor HAProxy and Nginx on IPv4 with Prometheus and Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HAProxy, Nginx, Prometheus, Grafana, Monitoring, IPv4, Metric, Docker

Description: Learn how to set up Prometheus metrics collection from HAProxy and Nginx on IPv4, and visualize traffic, latency, and error rates in Grafana dashboards.

---

Monitoring your load balancers is critical for understanding traffic patterns, detecting performance issues, and alerting on backend health. This guide covers configuring HAProxy and Nginx to expose Prometheus metrics, and building Grafana dashboards.

---

## Architecture

```text
HAProxy / Nginx → Prometheus Exporter → Prometheus → Grafana
                  (metrics endpoint)      (scrape)    (dashboards)
```

---

## Part 1: HAProxy with Prometheus

### Enable HAProxy Stats and Prometheus Exporter

```ini
# /etc/haproxy/haproxy.cfg

global
    log /dev/log local0
    stats socket /run/haproxy/admin.sock mode 660 level admin

frontend http_front
    mode http
    bind *:80
    default_backend http_back

backend http_back
    mode http
    balance roundrobin
    server web1 192.168.1.10:8080 check
    server web2 192.168.1.11:8080 check

# Prometheus metrics endpoint (HAProxy 2.0+)
frontend prometheus
    bind *:8405
    mode http
    http-request use-service prometheus-exporter if { path /metrics }
    no log
```

```bash
sudo systemctl restart haproxy

# Test metrics endpoint
curl http://localhost:8405/metrics | head -20
```

---

## Part 2: Nginx with Prometheus Exporter

### Enable Nginx Stub Status

```nginx
# /etc/nginx/conf.d/status.conf
server {
    listen 127.0.0.1:8080;
    
    location /nginx_status {
        stub_status;
        access_log off;
        allow 127.0.0.1;
        deny all;
    }
}
```

### Run nginx-prometheus-exporter

```bash
# Using Docker
docker run -d \
  --name nginx-exporter \
  --network host \
  nginx/nginx-prometheus-exporter:latest \
  --nginx.scrape-uri=http://127.0.0.1:8080/nginx_status \
  --web.listen-address=:9113

# Test metrics
curl http://localhost:9113/metrics | grep "nginx_"
```

---

## Part 3: Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - /etc/prometheus/alert_rules.yml

scrape_configs:
  - job_name: 'haproxy'
    static_configs:
      - targets: ['192.168.1.5:8405']
    metrics_path: /metrics

  - job_name: 'nginx'
    static_configs:
      - targets: ['192.168.1.5:9113']

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
```

```bash
# Run Prometheus
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v /etc/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml \
  -v /etc/prometheus/alert_rules.yml:/etc/prometheus/alert_rules.yml \
  prom/prometheus:latest
```

---

## Part 4: Docker Compose Setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  haproxy:
    image: haproxy:2.8
    ports:
      - "80:80"
      - "8405:8405"
    volumes:
      - ./haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg

  nginx:
    image: nginx:latest
    network_mode: host
    volumes:
      - ./status.conf:/etc/nginx/conf.d/status.conf:ro

  nginx-exporter:
    image: nginx/nginx-prometheus-exporter:latest
    command:
      - --nginx.scrape-uri=http://127.0.0.1:8080/nginx_status
      - --web.listen-address=:9113
    network_mode: host
    depends_on:
      - nginx

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./alert_rules.yml:/etc/prometheus/alert_rules.yml:ro
      - prometheus_data:/prometheus

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
    volumes:
      - grafana_data:/var/lib/grafana
    depends_on:
      - prometheus

volumes:
  prometheus_data:
  grafana_data:
```

---

## Part 5: Key Prometheus Queries

### HAProxy Metrics

```promql
# Total requests per second
rate(haproxy_frontend_http_requests_total[5m])

# Backend error rate
sum by (proxy) (rate(haproxy_backend_http_responses_total{code=~"5.."}[5m])) /
sum by (proxy) (rate(haproxy_backend_http_responses_total[5m])) * 100

# Active connections
haproxy_frontend_current_sessions

# Server UP status (1=UP, 0=not UP)
haproxy_server_status{state="UP"}
```

### Nginx Metrics

```promql
# Requests per second
rate(nginx_http_requests_total[5m])

# Active connections
nginx_connections_active

# Accepted connections per second
rate(nginx_connections_accepted[5m])

# Waiting connections
nginx_connections_waiting
```

---

## Part 6: Grafana Dashboard Setup

1. Open Grafana at http://localhost:3000 (admin/admin123)
2. Add Prometheus as data source: Connections → Data sources → Add new data source
3. URL: `http://prometheus:9090`
4. Import dashboards:
   - HAProxy: Dashboard ID **12693**
   - Nginx: Dashboard ID **10393**

---

## Alerting Rules

```yaml
# alert_rules.yml
groups:
  - name: haproxy
    rules:
      - alert: HAProxyServerDown
        expr: haproxy_server_status{state="DOWN"} == 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "HAProxy server {{ $labels.server }} in backend {{ $labels.proxy }} is DOWN"

      - alert: HighErrorRate
        expr: |
          (
            sum by (proxy) (rate(haproxy_backend_http_responses_total{code=~"5.."}[5m]))
            /
            sum by (proxy) (rate(haproxy_backend_http_responses_total[5m]))
          ) * 100 > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Error rate above 5% on {{ $labels.proxy }}"
```

---

## Best Practices

1. **Monitor both frontends and backends** in HAProxy - separate metrics for each
2. **Alert on backend health** not just request rates - a server going DOWN matters more
3. **Use recording rules** for expensive queries to improve dashboard performance
4. **Set retention** on Prometheus to match your storage budget
5. **Use Grafana alerting** or Alertmanager for on-call notifications

---

## Conclusion

Prometheus + Grafana provides rich observability for HAProxy and useful traffic and connection visibility for Nginx. Enable the Prometheus metrics endpoints, configure scraping, and import pre-built dashboards for immediate visibility into traffic, connections, errors, and backend health.

---

*Complement your metrics monitoring with [OneUptime](https://oneuptime.com) - uptime monitoring and incident management.*
