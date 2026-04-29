# How to Monitor IPv6 Load Balancer Health

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Load Balancer, Monitoring, Health Check, Prometheus, Alerting

Description: A guide to monitoring IPv6 load balancer health, backend server availability, and traffic metrics using Prometheus, HAProxy stats, and custom health checks.

Monitoring IPv6 load balancer health involves tracking backend server availability, connection distribution, response times, and error rates. This guide covers monitoring approaches for common IPv6 load balancers.

## HAProxy IPv6 Statistics

```text
# Enable HAProxy stats in /etc/haproxy/haproxy.cfg

frontend stats
    bind [::1]:8404     # IPv6 loopback for stats
    stats enable
    stats uri /stats
    stats refresh 10s
    stats auth admin:password
```

```bash
# Access stats page
curl -6 http://[::1]:8404/stats

# Get stats via CSV format
curl -s http://[::1]:8404/stats?csv | head -5

# Key metrics in CSV:
# - scur: current sessions
# - slim: max sessions
# - stot: total sessions
# - bin/bout: bytes in/out
# - ereq/econ/eresp: error counts
# - status: server status (UP/DOWN/MAINT)
```

## Prometheus Monitoring for IPv6 Load Balancers

### HAProxy Exporter

```bash
# Install haproxy_exporter
sudo apt-get install prometheus-haproxy-exporter

# Configure to scrape HAProxy stats
/etc/default/prometheus-haproxy-exporter:
ARGS="--haproxy.scrape-uri=http://localhost:8404/stats?csv"
```

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'haproxy'
    static_configs:
      - targets: ['[::1]:9101']    # IPv6 exporter address

  - job_name: 'ipvs'
    static_configs:
      - targets: ['[::1]:9100']    # Node exporter (includes IPVS metrics)
```

### IPVS Metrics via Node Exporter

```bash
# Node exporter collects IPVS stats automatically
# Start with IPVS collector enabled
node_exporter --collector.ipvs

# Key IPVS metrics:
# node_ipvs_connections_total - total connections handled
# node_ipvs_incoming_bytes_total - bytes received
# node_ipvs_outgoing_bytes_total - bytes sent
# node_ipvs_backend_connections_active - active connections per backend
```

## Custom IPv6 Health Check Script

```bash
#!/bin/bash
# ipv6-lb-health.sh - Check IPv6 load balancer backend health

LB_VIP="2001:db8::1"
BACKENDS=(
  "2001:db8::a"
  "2001:db8::b"
  "2001:db8::c"
)
PORT=80
HEALTH_PATH="/health"
TIMEOUT=5

check_backend() {
  local addr=$1
  local status=$(curl -6 -s -o /dev/null -w "%{http_code}" \
    --max-time $TIMEOUT \
    http://[$addr]$HEALTH_PATH)
  echo "$status"
}

echo "=== IPv6 Load Balancer Health Check ==="
echo "VIP: $LB_VIP"
echo ""

# Check each backend
for backend in "${BACKENDS[@]}"; do
  status=$(check_backend $backend)
  if [ "$status" = "200" ]; then
    echo "PASS: $backend (HTTP $status)"
  else
    echo "FAIL: $backend (HTTP $status)"
  fi
done

echo ""
echo "=== VIP Connectivity ==="
status=$(curl -6 -s -o /dev/null -w "%{http_code}" \
  --max-time $TIMEOUT \
  http://[$LB_VIP]$HEALTH_PATH)
echo "VIP: HTTP $status"
```

## Grafana Dashboard Queries

```promql
# HAProxy: Backend server availability
haproxy_server_status{backend="web_servers"} == 1

# IPVS: Active connections per backend
node_ipvs_backend_connections_active{local_address="2001:db8::1", local_port="443"}

# Average response time per backend for IPv6 traffic
haproxy_backend_response_time_average_seconds{backend="web_servers"}

# Error rate
rate(haproxy_backend_http_responses_total{code="5xx"}[5m]) /
rate(haproxy_backend_http_responses_total[5m])
```

## Alerting Rules

```yaml
# /etc/prometheus/alerts/lb-ipv6.yml

groups:
- name: ipv6-lb
  rules:
  # Alert when a backend is down
  - alert: IPv6BackendDown
    expr: haproxy_server_status == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "IPv6 backend {{ $labels.server }} is DOWN"

  # Alert when all backends in a pool are down
  - alert: IPv6AllBackendsDown
    expr: |
      sum by (backend) (haproxy_server_status == bool 1) == 0
    for: 30s
    labels:
      severity: critical
    annotations:
      summary: "All backends in {{ $labels.backend }} are DOWN"

  # Alert on high error rate
  - alert: IPv6LBHighErrorRate
    expr: |
      rate(haproxy_backend_http_responses_total{code="5xx"}[5m]) > 0.05
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High error rate on IPv6 backend {{ $labels.backend }}"
```

## Testing Monitor Effectiveness

```bash
# Simulate a backend failure
sudo ip -6 addr del 2001:db8::a/64 dev eth0

# Verify monitoring detects it within health check interval
watch -n 2 'curl -s http://[::1]:8404/stats?csv | grep server1'

# Verify traffic shifted to remaining backends
curl -6 -v http://[2001:db8::1]/
```

Comprehensive IPv6 load balancer monitoring enables proactive detection of backend failures, traffic anomalies, and performance degradation before they impact users.
